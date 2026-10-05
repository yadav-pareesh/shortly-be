import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { corsOptions } from "./middleware/cors";
import { errorMiddleware } from "./utils/errorHandler";
import urlRoutes from "./routes/urls";
import { redirectUrl } from "./controllers/urlController";
import prisma from "./lib/prisma";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Parsing Middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors(corsOptions));
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ limit: "10kb", extended: true }));

// Request logging middleware
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check
app.get("/health", (_req, res) => {
  res.json({ success: true, message: "Server is running", timestamp: new Date().toISOString() });
});

// API Routes
app.use("/api/urls", urlRoutes);

// Direct short link redirect: GET /:shortCode
app.get("/:shortCode", redirectUrl);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
    statusCode: 404,
  });
});

// Centralized error middleware
app.use(errorMiddleware);

// Start server
const server = app.listen(PORT, () => {
  console.log(`[Shortly API] Server running on http://localhost:${PORT}`);
  console.log(`[Shortly API] Environment: ${process.env.NODE_ENV || "development"}`);
});

// Graceful shutdown
const shutdown = async () => {
  console.log("[Shortly API] Shutting down gracefully...");
  server.close(async () => {
    try {
      await prisma.$disconnect();
    } catch {}
    console.log("[Shortly API] Server closed.");
    process.exit(0);
  });
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// Cleanup expired URLs every hour
setInterval(async () => {
  try {
    const { urlService } = await import("./services/urlService");
    const deleted = await urlService.cleanupExpiredUrls();
    if (deleted > 0) {
      console.log(`[Shortly API] Cleaned up ${deleted} expired URLs`);
    }
  } catch (error) {
    console.error("[Shortly API] Error cleaning up expired URLs:", error);
  }
}, 60 * 60 * 1000);
