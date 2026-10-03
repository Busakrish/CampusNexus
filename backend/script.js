require("dotenv").config();
const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const models = require("./models");

const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === "production";
const app = express();

// ---------- Middleware ----------
app.use(
  cors({
    // Only needed if the frontend is opened from another port (e.g. VS Code Live Server on 5500)
    origin: (process.env.CORS_ORIGINS || "http://localhost:5500,http://127.0.0.1:5500,http://localhost:3000")
      .split(",")
      .map((s) => s.trim()),
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Serve ../frontend from this server too (open http://localhost:<PORT>/login.html, no CORS involved)
const frontendDir = path.join(__dirname, "..", "frontend");
if (fs.existsSync(frontendDir)) app.use(express.static(frontendDir));

// ---------- Health ----------
app.get("/api/health", (req, res) => {
  const states = ["disconnected", "connected", "connecting", "disconnecting"];
  res.json({ success: true, status: "ok", db: states[mongoose.connection.readyState] });
});

// ---------- Auto-mount routes ----------
// Every file in ./routes is mounted at /api/<filename>  (routes/events.js -> /api/events).
// Each file must export an express.Router().
const routesDir = path.join(__dirname, "routes");
if (fs.existsSync(routesDir)) {
  fs.readdirSync(routesDir)
    .filter((f) => f.endsWith(".js") && !f.startsWith("_"))
    .forEach((file) => {
      const name = path.basename(file, ".js");
      app.use(`/api/${name}`, require(path.join(routesDir, file)));
      console.log(`route mounted: /api/${name}`);
    });
}

// ---------- 404 for unknown API routes ----------
app.use("/api", (req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// ---------- Central error handler ----------
app.use((err, req, res, next) => {
  if (err.name === "ValidationError") {
    const errors = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]));
    return res.status(400).json({ success: false, message: "Validation failed", errors });
  }
  if (err.name === "CastError") {
    return res.status(400).json({ success: false, message: `Invalid value for ${err.path}` });
  }
  if (err.code === 11000) {
    const fields = Object.keys(err.keyPattern || {});
    return res.status(409).json({ success: false, message: `Duplicate value for: ${fields.join(", ")}`, fields });
  }
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    success: false,
    message: status >= 500 && isProd ? "Internal server error" : err.message || "Internal server error",
  });
});

// ---------- Start ----------
async function start() {
  await connectDB();
  // Build every index (including the partial unique ones) before accepting traffic
  await Promise.all(Object.values(models).map((m) => m.init()));
  const server = app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down...`);
    server.close(async () => {
      await mongoose.connection.close();
      process.exit(0);
    });
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

if (require.main === module) start();
module.exports = app;
