import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { createReport, getMyReports } from "../controllers/report.controller.js";

const router = Router();

router.use(verifyJWT);

router.post("/", createReport);
router.get("/my-reports", getMyReports);

export default router;
