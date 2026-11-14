import { Router } from "express";
import { verifyJWT, requireStaff } from "../middlewares/auth.middleware.js";
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
router.get("/tickets", getAllTickets);
router.patch("/tickets/:id/assign", assignTicket);
router.patch("/tickets/:id/status", updateTicketStatus);
router.get("/disputes", getAllDisputes);
router.get("/reports", getAllReports);
router.patch("/reports/:id", updateReportStatus);
router.post("/artisan-verify/:id", toggleArtisanVerification);

export default router;
