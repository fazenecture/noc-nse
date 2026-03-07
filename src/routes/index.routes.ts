import { Router } from "express";
import NSEController from "../controller/controller";
import dashboardRouter from "../dashboard/routes";

const router = Router();

const { fetchOIDifferenceDataController } = new NSEController();

router.get("/data", fetchOIDifferenceDataController);

router.use("/dashboard", dashboardRouter);

export default router;
