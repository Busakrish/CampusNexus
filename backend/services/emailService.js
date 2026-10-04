const nodemailer = require('nodemailer');

let transporterInstance = null;

function getTransporter() {
  if (transporterInstance) return transporterInstance;

  const service = process.env.SMTP_SERVICE;
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (service && user && pass) {
    // Convenient presets like 'gmail', 'outlook', 'yahoo'
    transporterInstance = nodemailer.createTransport({
      service: service,
      auth: { user, pass }
    });
    console.log(`[EmailService] Configured with service: ${service} (${user})`);
  } else if (host && user && pass) {
    // Standard custom SMTP
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;
    transporterInstance = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false
      }
    });
    console.log(`[EmailService] Configured with SMTP host: ${host}:${port} (${user})`);
  } else {
    // Fallback development transport
    transporterInstance = nodemailer.createTransport({
      streamTransport: true,
      newline: 'windows',
      buffer: true
    });
    console.log('[EmailService] Notice: No SMTP credentials found in .env. OTP will be printed to server terminal.');
  }

  return transporterInstance;
}

/**
 * Send 6-Digit Registration OTP to recipient email address
 */
async function sendRegistrationOtpEmail(recipientEmail, otp, name = 'Student') {
  const expiryMinutes = 10;
  const fromAddress = process.env.SMTP_FROM || '"CampusNexus Portal" <no-reply@campusnexus.edu>';

  console.log('\n======================================================');
  console.log('📧 [EMAIL DISPATCHED via Nodemailer]');
  console.log(`To:        ${recipientEmail}`);
  console.log(`Subject:   Verify Your CampusNexus Registration (${otp})`);
  console.log(`User:      ${name}`);
  console.log(`🔐 OTP:    ${otp} (Expires in ${expiryMinutes} minutes)`);
  console.log('======================================================\n');

  try {
    const transporter = getTransporter();
    const info = await transporter.sendMail({
      from: fromAddress,
      to: recipientEmail,
      subject: `Your CampusNexus Registration Code: ${otp}`,
      text: `Hello ${name},\n\nYour CampusNexus 6-digit email verification code is: ${otp}\n\nThis code is valid for ${expiryMinutes} minutes. If you did not create an account, you can safely ignore this message.`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; }
            .card { max-width: 520px; margin: 20px auto; background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
            .header { text-align: center; margin-bottom: 24px; }
            .brand { font-size: 24px; font-weight: 800; color: #0f172a; }
            .brand-accent { color: #0284c7; }
            .otp-box { background: #f0f9ff; border: 2px dashed #0284c7; border-radius: 10px; padding: 20px; text-align: center; margin: 24px 0; }
            .otp-code { font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0369a1; font-family: Consolas, monospace; }
            .footer { font-size: 12px; color: #94a3b8; text-align: center; margin-top: 28px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <div class="brand">❖ Campus<span class="brand-accent">Nexus</span></div>
              <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Student Organization &amp; Event Platform</p>
            </div>
            <p style="font-size: 15px; color: #334155;">Hello <strong>${name}</strong>,</p>
            <p style="font-size: 14px; color: #475569; line-height: 1.5;">
              Thank you for registering on CampusNexus. Please use the verification code below to verify your email address and activate your account:
            </p>
            <div class="otp-box">
              <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #0284c7; letter-spacing: 1.5px; margin-bottom: 6px;">One-Time Verification Code</div>
              <div class="otp-code">${otp}</div>
            </div>
            <p style="font-size: 13px; color: #64748b; line-height: 1.4;">
              ⏱️ This code will expire in <strong>${expiryMinutes} minutes</strong>.<br>
              🔒 Never share this code with anyone. CampusNexus staff will never ask for your code.
            </p>
            <div class="footer">
              CampusNexus Academic Management System &bull; Secure Email Dispatch
            </div>
          </div>
        </body>
        </html>
      `
    });

    return { success: true, messageId: info.messageId, deliveredTo: recipientEmail };
  } catch (err) {
    console.error('⚠️ [Nodemailer] SMTP dispatch notice:', err.message);
    return { success: false, error: err.message, deliveredTo: recipientEmail };
  }
}

/**
 * Send Event Admission Pass & QR Code to Student's Email
 */
async function sendEventTicketEmail({ recipientEmail, studentName = 'Student', event, ticket, registration }) {
  const fromAddress = process.env.SMTP_FROM || '"CampusNexus Events" <no-reply@campusnexus.edu>';
  const eventDate = event.startDate ? new Date(event.startDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : 'TBA';
  const eventTime = event.startDate ? new Date(event.startDate).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  }) : '';

  const venue = event.venue || event.location || 'Campus Main Auditorium';
  const priceDisplay = ticket.price > 0 ? `$${ticket.price}` : 'Free Admission';

  console.log('\n======================================================');
  console.log('🎟️ [EVENT TICKET EMAIL DISPATCHED]');
  console.log(`To:        ${recipientEmail}`);
  console.log(`Event:     ${event.eventName}`);
  console.log(`Ticket ID: ${ticket.ticketId}`);
  console.log(`Attendee:  ${studentName}`);
  console.log('======================================================\n');

  try {
    const transporter = getTransporter();

    // Prepare QR Code attachment
    const attachments = [];
    let qrSrc = ticket.qrCode;

    if (ticket.qrCode && ticket.qrCode.startsWith('data:image/')) {
      const base64Data = ticket.qrCode.replace(/^data:image\/\w+;base64,/, '');
      attachments.push({
        filename: `ticket-${ticket.ticketId}-qr.png`,
        content: Buffer.from(base64Data, 'base64'),
        cid: 'ticketqrcode@campusnexus'
      });
      qrSrc = 'cid:ticketqrcode@campusnexus';
    }

    const info = await transporter.sendMail({
      from: fromAddress,
      to: recipientEmail,
      subject: `🎟️ Ticket Confirmed: ${event.eventName} [${ticket.ticketId}]`,
      text: `Hello ${studentName},\n\nYour registration for "${event.eventName}" is confirmed!\n\nTicket ID: ${ticket.ticketId}\nEvent Date: ${eventDate} at ${eventTime}\nVenue: ${venue}\nTicket Type: ${ticket.ticketType} (${priceDisplay})\n\nPlease present your QR pass at the entrance.`,
      attachments,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; }
            .ticket-card { max-width: 560px; margin: 20px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
            .ticket-header { background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color: #ffffff; padding: 28px 24px; text-align: center; }
            .badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px; }
            .event-title { font-size: 22px; font-weight: 800; margin: 0 0 6px; }
            .ticket-body { padding: 28px 24px; }
            .info-grid { display: table; width: 100%; margin-bottom: 24px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 20px; }
            .info-col { display: table-cell; width: 50%; vertical-align: top; padding: 6px 10px; }
            .label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 2px; }
            .value { font-size: 14px; font-weight: 600; color: #0f172a; }
            .qr-section { text-align: center; background: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; margin-bottom: 20px; }
            .qr-code-img { width: 220px; height: 220px; background: #ffffff; padding: 8px; border-radius: 8px; border: 1px solid #cbd5e1; display: inline-block; }
            .ticket-id { font-family: Consolas, monospace; font-size: 16px; font-weight: 800; color: #0284c7; letter-spacing: 2px; margin-top: 8px; }
            .footer { font-size: 12px; color: #94a3b8; text-align: center; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="ticket-card">
            <div class="ticket-header">
              <div class="badge">❖ Official Admission Pass</div>
              <h1 class="event-title">${event.eventName}</h1>
              <div style="font-size: 13px; opacity: 0.9;">CampusNexus Event System</div>
            </div>

            <div class="ticket-body">
              <p style="font-size: 15px; color: #334155; margin-top: 0;">
                Hello <strong>${studentName}</strong>, your registration is confirmed! Here is your entry pass:
              </p>

              <div class="info-grid">
                <div class="info-col">
                  <div class="label">📅 Date &amp; Time</div>
                  <div class="value">${eventDate}<br>${eventTime}</div>
                </div>
                <div class="info-col">
                  <div class="label">📍 Venue / Location</div>
                  <div class="value">${venue}</div>
                </div>
              </div>

              <div class="info-grid">
                <div class="info-col">
                  <div class="label">🎟️ Ticket Type</div>
                  <div class="value">${ticket.ticketType} (${priceDisplay})</div>
                </div>
                <div class="info-col">
                  <div class="label">👤 Attendee</div>
                  <div class="value">${studentName}</div>
                </div>
              </div>

              <!-- QR Code Section -->
              <div class="qr-section">
                <div style="font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">
                  Scan At Entrance For Check-In
                </div>
                <img src="${qrSrc}" alt="Event Ticket QR Code" class="qr-code-img" />
                <div class="ticket-id">${ticket.ticketId}</div>
                <div style="font-size: 12px; color: #64748b; margin-top: 6px;">
                  Registration ID: <strong>${registration.registrationId}</strong> &bull; Status: <span style="color: #16a34a; font-weight: 700;">Valid</span>
                </div>
              </div>

              <p style="font-size: 12px; color: #64748b; text-align: center; line-height: 1.4; margin-bottom: 0;">
                💡 <em>Tip: You can present this QR code directly from your phone screen to the volunteer at the door for fast check-in.</em>
              </p>
            </div>

            <div style="background: #f8fafc; padding: 16px; border-top: 1px solid #e2e8f0;" class="footer">
              CampusNexus Academic &amp; Student Events &bull; Verified Digital Admission
            </div>
          </div>
        </body>
        </html>
      `
    });

    return { success: true, messageId: info.messageId, deliveredTo: recipientEmail };
  } catch (err) {
    console.error('⚠️ [Nodemailer] Event ticket email dispatch error:', err.message);
    return { success: false, error: err.message, deliveredTo: recipientEmail };
  }
}

/**
 * Send Merchandise Purchase Receipt & Invoice to Customer Email
 */
async function sendMerchandiseReceiptEmail({ recipientEmail, customerName = 'Student', order, payment }) {
  const fromAddress = process.env.SMTP_FROM || '"CampusNexus Store" <no-reply@campusnexus.edu>';
  const orderDate = new Date(order.createdAt || Date.now()).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const orderTime = new Date(order.createdAt || Date.now()).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const pickupLocation = (order.shippingAddress && order.shippingAddress.campusLocation) || 'Campus Store & Student Center';

  console.log('\n======================================================');
  console.log('🛍️ [MERCHANDISE RECEIPT EMAIL DISPATCHED]');
  console.log(`To:        ${recipientEmail}`);
  console.log(`Order ID:  #${order.orderId}`);
  console.log(`Customer:  ${customerName}`);
  console.log(`Total:     $${order.totalAmount}`);
  console.log('======================================================\n');

  try {
    const transporter = getTransporter();

    const itemsRowsHtml = (order.items || []).map(item => `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 12px 8px; font-weight: 600; color: #1e293b;">
          ${item.name}
          ${item.size || item.variant ? `<br><span style="font-size: 11px; color: #64748b; font-weight: normal;">Size: ${item.size || 'Standard'} &bull; Style: ${item.variant || 'Default'}</span>` : ''}
        </td>
        <td style="padding: 12px 8px; text-align: center; color: #475569;">${item.quantity}</td>
        <td style="padding: 12px 8px; text-align: right; color: #475569;">$${(item.unitPrice || 0).toFixed(2)}</td>
        <td style="padding: 12px 8px; text-align: right; font-weight: 700; color: #0f172a;">$${((item.unitPrice || 0) * (item.quantity || 1)).toFixed(2)}</td>
      </tr>
    `).join('');

    const info = await transporter.sendMail({
      from: fromAddress,
      to: recipientEmail,
      subject: `🛍️ Order Receipt: #${order.orderId} - CampusNexus Store`,
      text: `Hello ${customerName},\n\nThank you for your order #${order.orderId}!\nTotal Amount: $${(order.totalAmount || 0).toFixed(2)}\nPayment Status: Paid/Verified\nPickup Location: ${pickupLocation}\n\nPlease present this receipt to collect your items.`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; }
            .receipt-card { max-width: 580px; margin: 20px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
            .header { background: #0f172a; color: #ffffff; padding: 28px 24px; text-align: center; }
            .brand { font-size: 22px; font-weight: 800; letter-spacing: 0.5px; }
            .brand-accent { color: #38bdf8; }
            .content { padding: 28px 24px; }
            .badge-paid { display: inline-block; background: #dcfce7; color: #166534; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
            .meta-table { width: 100%; margin: 18px 0 24px; border-collapse: collapse; }
            .meta-table td { padding: 4px 0; font-size: 13px; color: #64748b; }
            .meta-table td strong { color: #0f172a; }
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px; }
            .items-table th { background: #f8fafc; padding: 10px 8px; text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; border-bottom: 2px solid #e2e8f0; }
            .total-box { background: #f8fafc; border-radius: 10px; padding: 16px 20px; border: 1px solid #e2e8f0; margin-bottom: 24px; }
            .pickup-box { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 10px; padding: 16px; margin-bottom: 20px; }
            .footer { font-size: 12px; color: #94a3b8; text-align: center; padding: 16px; background: #f8fafc; border-top: 1px solid #f1f5f9; }
          </style>
        </head>
        <body>
          <div class="receipt-card">
            <div class="header">
              <div class="brand">❖ Campus<span class="brand-accent">Nexus</span> Store</div>
              <p style="font-size: 13px; color: #94a3b8; margin: 4px 0 0;">Official Merchandise Receipt &amp; Tax Invoice</p>
            </div>

            <div class="content">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <span class="badge-paid">✓ Payment Verified</span>
                <span style="font-family: monospace; font-weight: 800; color: #0284c7; font-size: 15px;">#${order.orderId}</span>
              </div>

              <p style="font-size: 15px; color: #334155; margin: 12px 0 16px;">
                Hello <strong>${customerName}</strong>, thank you for your order! Here is your official purchase receipt:
              </p>

              <table class="meta-table">
                <tr>
                  <td>Date &amp; Time: <strong>${orderDate} at ${orderTime}</strong></td>
                  <td style="text-align: right;">Payment Method: <strong>${(payment && payment.paymentMethod) || 'Electronic (Simulated)'}</strong></td>
                </tr>
                <tr>
                  <td>Customer Email: <strong>${recipientEmail}</strong></td>
                  <td style="text-align: right;">Order Status: <strong>${order.status}</strong></td>
                </tr>
              </table>

              <!-- Order Items Table -->
              <table class="items-table">
                <thead>
                  <tr>
                    <th>Item Description</th>
                    <th style="text-align: center;">Qty</th>
                    <th style="text-align: right;">Unit Price</th>
                    <th style="text-align: right;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsRowsHtml}
                </tbody>
              </table>

              <!-- Total Amount Highlight -->
              <div class="total-box">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-size: 15px; font-weight: 700; color: #334155;">Total Amount Paid</span>
                  <span style="font-size: 22px; font-weight: 800; color: #0f172a;">$${(order.totalAmount || 0).toFixed(2)}</span>
                </div>
              </div>

              <!-- Pickup / Delivery Info -->
              <div class="pickup-box">
                <div style="font-weight: 700; color: #0369a1; font-size: 13px; margin-bottom: 4px;">📦 Pickup &amp; Fulfillment Instructions:</div>
                <div style="font-size: 13px; color: #0c4a6e; line-height: 1.4;">
                  Please present this email or order number <strong>#${order.orderId}</strong> at <strong>${pickupLocation}</strong> to collect your merchandise.
                </div>
              </div>

              <p style="font-size: 12px; color: #64748b; text-align: center; margin-bottom: 0;">
                If you have any questions regarding this order, please contact student store support.
              </p>
            </div>

            <div class="footer">
              CampusNexus Academic Store &bull; Automatic Electronic Invoice
            </div>
          </div>
        </body>
        </html>
      `
    });

    return { success: true, messageId: info.messageId, deliveredTo: recipientEmail };
  } catch (err) {
    console.error('⚠️ [Nodemailer] Merchandise receipt email dispatch error:', err.message);
    return { success: false, error: err.message, deliveredTo: recipientEmail };
  }
}

/**
 * Send Membership Confirmation & Welcome Receipt Email to Student
 */
async function sendMembershipReceiptEmail({ recipientEmail, studentName = 'Student', organization, membership, payment }) {
  const fromAddress = process.env.SMTP_FROM || '"CampusNexus Memberships" <no-reply@campusnexus.edu>';
  const orgName = (organization && organization.name) || 'Student Organization';
  const orgCode = (organization && organization.code) || 'CAMPUS';
  const tier = membership.membershipType || 'General';
  const isPremium = tier.toLowerCase() === 'premium';

  const validFrom = new Date(membership.startDate || Date.now()).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  const validUntil = new Date(membership.endDate || Date.now()).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const duesPaid = membership.feeAmount > 0 ? `$${membership.feeAmount.toFixed(2)}` : 'Complimentary / Free';

  console.log('\n======================================================');
  console.log('🎖️ [MEMBERSHIP CONFIRMATION EMAIL DISPATCHED]');
  console.log(`To:           ${recipientEmail}`);
  console.log(`Organization: ${orgName}`);
  console.log(`Tier:         ${tier} Membership`);
  console.log(`Member ID:    #${membership.membershipId}`);
  console.log(`Dues Paid:    ${duesPaid}`);
  console.log('======================================================\n');

  try {
    const transporter = getTransporter();

    const benefitsList = (membership.benefits && membership.benefits.length > 0)
      ? membership.benefits
      : (isPremium
          ? ['All General Member Perks', 'Priority Event Reservations & VIP Seating', 'Exclusive 20% Merchandise Discount', 'Executive Voting Rights & Leadership Eligibility', 'Access to Private Workshops & Mentorship']
          : ['Official Club Voting Rights', 'Event Registration Discounts', 'Access to Club General Meetings & Workspace']);

    const benefitsHtml = benefitsList.map(b => `
      <li style="padding: 4px 0; color: #334155;">✓ ${b}</li>
    `).join('');

    const info = await transporter.sendMail({
      from: fromAddress,
      to: recipientEmail,
      subject: `🎖️ Membership Confirmed: ${orgName} [${tier} Tier]`,
      text: `Hello ${studentName},\n\nCongratulations! Your ${tier} membership with "${orgName}" is now active.\n\nMembership ID: #${membership.membershipId}\nValid: ${validFrom} to ${validUntil}\nDues Paid: ${duesPaid}\nStatus: Active/Verified\n\nThank you for being an active part of our campus community!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; }
            .card { max-width: 580px; margin: 20px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.07); border: 1px solid #e2e8f0; }
            .header { background: ${isPremium ? 'linear-gradient(135deg, #854d0e 0%, #ca8a04 50%, #eab308 100%)' : 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'}; color: #ffffff; padding: 30px 24px; text-align: center; }
            .badge-tier { display: inline-block; background: rgba(255,255,255,0.25); padding: 4px 14px; border-radius: 20px; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 8px; }
            .title { font-size: 24px; font-weight: 800; margin: 0 0 4px; }
            .content { padding: 28px 24px; }
            .member-badge { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 18px; margin-bottom: 22px; text-align: center; }
            .member-id { font-family: Consolas, monospace; font-size: 18px; font-weight: 800; color: #15803d; letter-spacing: 2px; }
            .grid { display: table; width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .col { display: table-cell; width: 50%; padding: 8px 10px; border-bottom: 1px solid #f1f5f9; }
            .label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; }
            .val { font-size: 14px; font-weight: 600; color: #0f172a; margin-top: 2px; }
            .benefits-box { background: #f8fafc; border-radius: 10px; padding: 18px; border: 1px solid #e2e8f0; margin-bottom: 20px; }
            .footer { font-size: 12px; color: #94a3b8; text-align: center; padding: 16px; background: #f8fafc; border-top: 1px solid #f1f5f9; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <div class="badge-tier">${isPremium ? '★ PREMIUM VIP MEMBERSHIP' : '❖ OFFICIAL CLUB MEMBERSHIP'}</div>
              <h1 class="title">${orgName}</h1>
              <div style="font-size: 13px; opacity: 0.9;">Organization Code: <strong>${orgCode}</strong></div>
            </div>

            <div class="content">
              <div class="member-badge">
                <div style="font-size: 11px; text-transform: uppercase; color: #166534; font-weight: 700; letter-spacing: 1px; margin-bottom: 4px;">Verified Active Member</div>
                <div class="member-id">#${membership.membershipId}</div>
                <div style="font-size: 12px; color: #15803d; margin-top: 4px;">Status: <strong>Active / Verified</strong></div>
              </div>

              <p style="font-size: 15px; color: #334155; margin: 0 0 16px;">
                Hello <strong>${studentName}</strong>, your membership dues have been received and your club profile is activated!
              </p>

              <div class="grid">
                <div class="col">
                  <div class="label">👤 Member Name</div>
                  <div class="val">${studentName}</div>
                </div>
                <div class="col">
                  <div class="label">🎖️ Membership Tier</div>
                  <div class="val" style="color: ${isPremium ? '#a16207' : '#0284c7'}; font-weight: 700;">${tier} Member</div>
                </div>
              </div>

              <div class="grid">
                <div class="col">
                  <div class="label">📅 Validity Period</div>
                  <div class="val">${validFrom} – ${validUntil}</div>
                </div>
                <div class="col">
                  <div class="label">💳 Annual Dues Paid</div>
                  <div class="val">${duesPaid} ${(payment && payment.paymentMethod) ? `(${payment.paymentMethod})` : ''}</div>
                </div>
              </div>

              <!-- Included Benefits -->
              <div class="benefits-box">
                <div style="font-weight: 700; color: #0f172a; font-size: 13px; margin-bottom: 8px;">🎁 Your Membership Privileges &amp; Benefits:</div>
                <ul style="margin: 0; padding-left: 18px; font-size: 13px; line-height: 1.6;">
                  ${benefitsHtml}
                </ul>
              </div>

              <p style="font-size: 12px; color: #64748b; text-align: center; margin-bottom: 0;">
                You can now register for member-exclusive events and access organization resources.
              </p>
            </div>

            <div class="footer">
              CampusNexus Student Organization Management System &bull; Official Digital Membership Receipt
            </div>
          </div>
        </body>
        </html>
      `
    });

    return { success: true, messageId: info.messageId, deliveredTo: recipientEmail };
  } catch (err) {
    console.error('⚠️ [Nodemailer] Membership receipt email dispatch error:', err.message);
    return { success: false, error: err.message, deliveredTo: recipientEmail };
  }
}

module.exports = {
  sendRegistrationOtpEmail,
  sendEventTicketEmail,
  sendMerchandiseReceiptEmail,
  sendMembershipReceiptEmail
};
