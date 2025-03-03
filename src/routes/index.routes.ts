import { Router } from "express";
import NSEController from "../controller/controller";

const router = Router();

const { fetchOIDifferenceDataController } = new NSEController();

router.get("/data", fetchOIDifferenceDataController);

export default router;
