import { Router } from "express";
import { verifyJWT, requireAdmin, requireStaff } from "../middlewares/auth.middleware.js";
import {
  createStaff,
  listStaff,
  updateStaff,
} from "../controllers/staff-management.controller.js";
import {
  getSupportStats,
  getAllTickets,
  assignTicket,
  updateTicketStatus,
  getAllDisputes,
  getAllReports,
  updateReportStatus,
  toggleArtisanVerification,
} from "../controllers/admin-support.controller.js";
import {
  getArtisansVerificationQueue,
  getArtisanVerificationDetail,
  getAdminAadhaarDocument,
  approveArtisanVerification,
  rejectArtisanVerification,
  markArtisanSuspicious,
  restoreArtisanAccount,
  reviewArtisanAppeal,
  deactivateArtisanAccount,
} from "../controllers/admin-verification.controller.js";

const router = Router();

// Restricted to admin and support staff
router.use(verifyJWT, requireStaff);

router.get("/stats", getSupportStats);
router.get("/staff", requireAdmin, listStaff);
router.post("/staff", requireAdmin, createStaff);
router.patch("/staff/:id", requireAdmin, updateStaff);
router.get("/tickets", getAllTickets);
router.patch("/tickets/:id/assign", assignTicket);
router.patch("/tickets/:id/status", updateTicketStatus);
router.get("/disputes", getAllDisputes);
router.get("/reports", getAllReports);
router.patch("/reports/:id", updateReportStatus);
router.post("/artisan-verify/:id", requireAdmin, toggleArtisanVerification);

// Artisan Aadhaar Verification & Account Moderation Routes
router.get("/artisan-verification", getArtisansVerificationQueue);
router.get("/artisan-verification/queue", getArtisansVerificationQueue);
router.get("/artisan-verification/:id", getArtisanVerificationDetail);
router.get("/artisan-verification/:id/document/:side", getAdminAadhaarDocument);
router.post("/artisan-verification/:id/approve", requireAdmin, approveArtisanVerification);
router.post("/artisan-verification/:id/reject", requireAdmin, rejectArtisanVerification);
router.post("/artisan-verification/:id/mark-suspicious", requireAdmin, markArtisanSuspicious);
router.post("/artisan-verification/:id/restore", requireAdmin, restoreArtisanAccount);
router.post("/artisan-verification/:id/appeal-review", requireAdmin, reviewArtisanAppeal);
router.post("/artisan-verification/:id/deactivate", requireAdmin, deactivateArtisanAccount);

export default router;
