import { Router } from "express";
import { verifyJWT, requireStaff } from "../middlewares/auth.middleware.js";
import {
  raiseDispute,
  getMyDisputes,
  getDisputeById,
  respondToDispute,
  escalateDispute,
  resolveDispute,
} from "../controllers/dispute.controller.js";

const router = Router();

// All dispute routes require logged-in user
router.use(verifyJWT);

router.post("/", raiseDispute);
router.get("/", getMyDisputes);
router.get("/:id", getDisputeById);
router.post("/:id/respond", respondToDispute);
router.post("/:id/escalate", escalateDispute);
router.patch("/:id/resolve", requireStaff, resolveDispute);

export default router;
