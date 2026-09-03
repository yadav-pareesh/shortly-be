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

// Middleware
app.use(helmet());
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
  res.json({ success: true, message: "Server is running" });
});

// Routes
app.use("/api/urls", urlRoutes);
app.get("/:shortCode", redirectUrl);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
    statusCode: 404,
  });
});

// Error middleware
app.use(errorMiddleware);

// Start server
const server = app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully");
  server.close(async () => {
    await prisma.$disconnect();
    console.log("Database connection closed");
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down gracefully");
  await prisma.$disconnect();
  process.exit(0);
});

// Cleanup expired URLs every hour
setInterval(async () => {
  try {
    const { urlService } = await import("./services/urlService");
    const deleted = await urlService.cleanupExpiredUrls();
    if (deleted > 0) {
      console.log(`🗑️  Cleaned up ${deleted} expired URLs`);
    }
  } catch (error) {
    console.error("Error cleaning up expired URLs:", error);
  }
}, 60 * 60 * 1000);