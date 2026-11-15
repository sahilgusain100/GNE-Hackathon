import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";
import artisanRoutes from "./routes/artisan.routes.js";
import expertRoutes from "./routes/expert.routes.js";
import marketplaceRoutes from "./routes/marketplace.routes.js";
import industryRoutes from "./routes/industry.routes.js";
import customerRoutes from "./routes/customer.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import voiceRoutes from "./routes/voice-registration.routes.js";
import supportRoutes from "./routes/support.routes.js";
import disputeRoutes from "./routes/dispute.routes.js";
import reviewRoutes from "./routes/review.routes.js";
import reportRoutes from "./routes/report.routes.js";
import adminSupportRoutes from "./routes/admin-support.routes.js";

const app = express();

const allowedOrigins = Array.from(
  new Set(
    [
      process.env.CORS_ORIGIN,
      "http://localhost:5173",
      "http://localhost:3000",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:3000",
      "https://gne-hackathon.vercel.app",
      "https://gne-hackathon-awan.vercel.app",
    ]
      .filter(Boolean)
      .map((candidate) => candidate.replace(/\/$/, ""))
  )
);

app.use(
  cors({
    origin: (origin, callback) => {
      const normalizedOrigin = origin ? origin.replace(/\/$/, "") : origin;

      // Allow requests with no origin (like mobile apps, curl, or Postman)
      if (!origin || allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive in dev to avoid CORS blocking
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());

// Static file serving for uploads and public assets
app.use("/public", express.static(path.resolve("public")));
app.use("/uploads", express.static(path.resolve("public/uploads")));

// Health check endpoints
app.get("/", (req, res) => {
  res.json({
    status: "online",
    message: "SkillBridge API is running smoothly",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

if (process.env.VERCEL) {
  app.use(async (req, res, next) => {
    if (!req.path.startsWith("/api/") || req.path === "/api/health") {
      return next();
    }

    try {
      await connectDB();
      return next();
    } catch (error) {
      console.error("API request could not connect to MongoDB:", error.message);
      return res.status(503).json({
        success: false,
        message: "The service is temporarily unavailable. Please try again.",
      });
    }
  });
}

// Main API Routes
app.use("/api/auth", authRoutes);
app.use("/api/v1/auth", authRoutes);

app.use("/api/artisan", artisanRoutes);
app.use("/api/v1/artisan", artisanRoutes);

app.use("/api/industry", industryRoutes);
app.use("/api/v1/industry", industryRoutes);

app.use("/api/expert", expertRoutes);
app.use("/api/v1/expert", expertRoutes);

app.use("/api/marketplace", marketplaceRoutes);
app.use("/api/v1/marketplace", marketplaceRoutes);

app.use("/api/customer", customerRoutes);
app.use("/api/v1/customer", customerRoutes);

app.use("/api/payment", paymentRoutes);
app.use("/api/v1/payment", paymentRoutes);

app.use("/api/voice", voiceRoutes);
app.use("/api/v1/voice", voiceRoutes);

app.use("/api/support", supportRoutes);
app.use("/api/v1/support", supportRoutes);

app.use("/api/disputes", disputeRoutes);
app.use("/api/v1/disputes", disputeRoutes);

app.use("/api/reviews", reviewRoutes);
app.use("/api/v1/reviews", reviewRoutes);

app.use("/api/reports", reportRoutes);
app.use("/api/v1/reports", reportRoutes);

app.use("/api/admin/support", adminSupportRoutes);
app.use("/api/v1/admin/support", adminSupportRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

export default app;
