/**
 * CampusNexus HTML5 Camera & File QR Scanner Utility
 * Features:
 *  - Bulletproof Camera Stream Acquisition with automatic multi-tier fallback
 *  - Native BarcodeDetector + Universal Embedded jsQR Canvas Decoder
 *  - Device Enumeration (Camera Switching)
 *  - Drag-and-Drop Image File / Screenshot QR decoding
 *  - Clean error diagnosis (Permissions, In-use devices, Secure Origin checks)
 */
class CampusQRScanner {
  constructor(videoElement, canvasElement, onScanSuccess, onScanError) {
    this.video = videoElement;
    this.canvas = canvasElement || document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    this.onScanSuccess = onScanSuccess;
    this.onScanError = onScanError || console.error;
    this.stream = null;
    this.isScanning = false;
    this.animationFrameId = null;
    this.lastScannedCode = null;
    this.lastScanTime = 0;
    this.scanCooldownMs = 2500;
    this.processingFrame = false;
    this.availableCameras = [];

    // Check BarcodeDetector native support
    this.hasBarcodeDetector = ('BarcodeDetector' in window);
    if (this.hasBarcodeDetector) {
      try {
        this.barcodeDetector = new window.BarcodeDetector({ formats: ['qr_code'] });
      } catch (e) {
        this.hasBarcodeDetector = false;
      }
    }

    this._ensureJsQRLoaded();
  }

  _ensureJsQRLoaded() {
    if (window.jsQR) return Promise.resolve();
    return new Promise((resolve) => {
      const existing = document.querySelector('script[src*="jsqr"]');
      if (existing) {
        existing.addEventListener('load', resolve);
        return;
      }
      const script = document.createElement('script');
      script.src = '/js/libs/jsqr.min.js';
      script.onload = () => resolve();
      script.onerror = () => resolve();
      document.head.appendChild(script);
    });
  }

  async getAvailableCameras() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return [];
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.availableCameras = devices.filter(d => d.kind === 'videoinput');
      return this.availableCameras;
    } catch (e) {
      return [];
    }
  }

  async startCamera(deviceId = null, facingMode = 'environment') {
    if (this.isScanning) {
      this.stopCamera();
    }

    await this._ensureJsQRLoaded();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const isHttp = window.location.protocol === 'http:' && !['localhost', '127.0.0.1'].includes(window.location.hostname);
      if (isHttp) {
        throw new Error('Camera access requires HTTPS or localhost origin. Please use http://localhost:5000 or upload a QR image.');
      }
      throw new Error('Your browser does not support camera capture. Please use the image upload option or enter ticket ID.');
    }

    let stream = null;
    let lastError = null;

    // Strategy 1: Specific deviceId if requested
    if (deviceId) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: deviceId } },
          audio: false
        });
      } catch (e) {
        lastError = e;
      }
    }

    // Strategy 2: Ideal Facing Mode & Resolution
    if (!stream) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280, min: 480 },
            height: { ideal: 720, min: 360 }
          },
          audio: false
        });
      } catch (e) {
        lastError = e;
      }
    }

    // Strategy 3: Loose facingMode
    if (!stream) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facingMode },
          audio: false
        });
      } catch (e) {
        lastError = e;
      }
    }

    // Strategy 4: Basic generic video constraint (works on 100% of standard webcams)
    if (!stream) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      } catch (e) {
        lastError = e;
      }
    }

    if (!stream) {
      this._diagnoseAndThrowError(lastError);
    }

    this.stream = stream;
    this.video.srcObject = this.stream;
    this.video.setAttribute('playsinline', 'true');
    this.video.setAttribute('autoplay', 'true');
    this.video.muted = true;

    // Ensure video metadata is loaded before starting scan loop
    await new Promise((resolve) => {
      if (this.video.readyState >= 2) {
        resolve();
      } else {
        this.video.onloadedmetadata = () => resolve();
        setTimeout(resolve, 1200); // safety fallback
      }
    });

    try {
      await this.video.play();
    } catch (playErr) {
      console.warn('Video play deferred:', playErr);
    }

    this.isScanning = true;
    this._scanLoop();
    return true;
  }

  _diagnoseAndThrowError(err) {
    if (!err) throw new Error('Could not access camera.');

    const name = err.name || '';
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      throw new Error('Camera access permission was denied. Please allow camera permissions in your browser address bar (lock icon).');
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      throw new Error('No physical camera or webcam was found on this computer. You can use the "Upload QR Image" option below.');
    }
    if (name === 'NotReadableError' || name === 'TrackStartError') {
      throw new Error('Camera is currently in use by another app (e.g. Zoom, Teams, Skype, or another tab). Close other applications and try again.');
    }
    if (name === 'OverconstrainedError') {
      throw new Error('Camera does not satisfy the requested constraints.');
    }
    if (name === 'SecurityError') {
      throw new Error('Camera blocked due to browser security settings.');
    }
    throw new Error(err.message || 'Camera failed to start.');
  }

  stopCamera() {
    this.isScanning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        try { track.stop(); } catch (e) {}
      });
      this.stream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
    }
  }

  async _scanLoop() {
    if (!this.isScanning) return;

    if (this.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && !this.processingFrame) {
      this.processingFrame = true;
      try {
        const now = Date.now();
        let detectedCode = null;

        // 1. Native BarcodeDetector
        if (this.hasBarcodeDetector && this.barcodeDetector) {
          try {
            const barcodes = await this.barcodeDetector.detect(this.video);
            if (barcodes && barcodes.length > 0) {
              detectedCode = barcodes[0].rawValue;
            }
          } catch (e) {}
        }

        // 2. High-accuracy jsQR Canvas Decoder
        if (!detectedCode) {
          detectedCode = this._decodeFromCanvas();
        }

        if (detectedCode) {
          const isCooldownPassed = (now - this.lastScanTime >= this.scanCooldownMs);
          const isDifferentCode = (detectedCode !== this.lastScannedCode);

          if (isDifferentCode || isCooldownPassed) {
            this.lastScannedCode = detectedCode;
            this.lastScanTime = now;
            this._playBeep();
            if (this.onScanSuccess) {
              this.onScanSuccess(detectedCode);
            }
          }
        }
      } catch (e) {
      } finally {
        this.processingFrame = false;
      }
    }

    if (this.isScanning) {
      this.animationFrameId = requestAnimationFrame(() => this._scanLoop());
    }
  }

  _decodeFromCanvas() {
    if (!this.video || !this.video.videoWidth || !this.video.videoHeight) return null;

    const width = this.video.videoWidth;
    const height = this.video.videoHeight;

    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }

    this.ctx.drawImage(this.video, 0, 0, width, height);

    if (window.jsQR) {
      try {
        const imageData = this.ctx.getImageData(0, 0, width, height);
        const code = window.jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth'
        });
        if (code && code.data && code.data.trim()) {
          return code.data.trim();
        }
      } catch (e) {}
    }
    return null;
  }

  async scanImageFile(file) {
    await this._ensureJsQRLoaded();
    return new Promise((resolve, reject) => {
      if (!file) return reject(new Error('No file provided.'));
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = async () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(img, 0, 0);

            let detectedCode = null;

            if (this.hasBarcodeDetector && this.barcodeDetector) {
              try {
                const barcodes = await this.barcodeDetector.detect(img);
                if (barcodes && barcodes.length > 0) detectedCode = barcodes[0].rawValue;
              } catch (err) {}
            }

            if (!detectedCode && window.jsQR) {
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const result = window.jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'attemptBoth'
              });
              if (result && result.data) detectedCode = result.data;
            }

            if (detectedCode) {
              this._playBeep();
              if (this.onScanSuccess) this.onScanSuccess(detectedCode);
              resolve(detectedCode);
            } else {
              reject(new Error('No QR code detected in image. Please ensure the QR is clear and well-lit.'));
            }
          } catch (err) {
            reject(err);
          }
        };
        img.onerror = () => reject(new Error('Failed to load image file.'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Failed to read file.'));
      reader.readAsDataURL(file);
    });
  }

  _playBeep() {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      const audioCtx = new AudioContextClass();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {}
  }
}

window.CampusQRScanner = CampusQRScanner;
