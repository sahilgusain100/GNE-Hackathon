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

export default router;
