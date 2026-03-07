"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controller_1 = __importDefault(require("./controller"));
const router = (0, express_1.Router)();
const { getScannerController, getSurgesController, getDistributionController, getTrendController, getAbsorptionController, getSpreadController, getVolumeOIController, getStreaksController, getExpiryCycleController, getCrossExpiryController, getAvailableDatesController, getAvailableSymbolsController, getAvailableExpiryDatesController } = new controller_1.default();
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
router.get("/expiry-dates", getAvailableExpiryDatesController);
exports.default = router;
//# sourceMappingURL=routes.js.map