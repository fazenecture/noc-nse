import { Router } from "express";
import DashboardController from "./controller";

const router = Router();

const {
  getScannerController,
  getSurgesController,
  getDistributionController,
  getTrendController,
  getAbsorptionController,
  getSpreadController,
  getVolumeOIController,
  getStreaksController,
  getExpiryCycleController,
  getCrossExpiryController,
  getAvailableDatesController,
  getAvailableSymbolsController,
  getAvailableExpiryDatesController
} = new DashboardController();

// ─── Scanner APIs ─────────────────────────────────────────────────────────────
router.get("/scanner", getScannerController);
router.get("/surges", getSurgesController);
router.get("/distribution", getDistributionController);
router.get("/absorption", getAbsorptionController);
router.get("/spread", getSpreadController);
router.get("/volume-oi", getVolumeOIController);
router.get("/streaks", getStreaksController);
router.get("/expiry-cycle", getExpiryCycleController);

// ─── Symbol-specific ──────────────────────────────────────────────────────────
router.get("/trend/:symbol", getTrendController);
router.get("/cross-expiry/:symbol", getCrossExpiryController);

// ─── Utilities ────────────────────────────────────────────────────────────────
router.get("/dates", getAvailableDatesController);
router.get("/symbols", getAvailableSymbolsController);
router.get("/expiry-dates", getAvailableExpiryDatesController)

export default router;
