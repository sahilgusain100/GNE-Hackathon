import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import {
  createTicket,
  getMyTickets,
  getTicketById,
  replyToTicket,
  closeTicket,
  reopenTicket,
  rateTicket,
  uploadSupportAttachments,
} from "../controllers/support.controller.js";

const router = Router();

// All support routes require logged-in user
router.use(verifyJWT);

// Attachment / Evidence File Upload
router.post("/upload", upload.array("files", 10), uploadSupportAttachments);

router.post("/tickets", createTicket);
router.get("/tickets", getMyTickets);
router.get("/tickets/:id", getTicketById);
router.post("/tickets/:id/messages", replyToTicket);
router.patch("/tickets/:id/close", closeTicket);
router.patch("/tickets/:id/reopen", reopenTicket);
router.post("/tickets/:id/rate", rateTicket);

export default router;
