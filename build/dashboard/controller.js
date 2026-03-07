"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const custom_error_handler_1 = __importDefault(require("../utils/custom.error.handler"));
const error_handler_1 = __importDefault(require("../utils/error.handler"));
const service_1 = __importDefault(require("./service"));
const enums_1 = require("./types/enums");
class DashboardController extends service_1.default {
    constructor() {
        super(...arguments);
        // ─── 1. Scanner Table ─────────────────────────────────────────────────────────
        // GET /api/dashboard/scanner
        // ?date ?instrument ?buildup_type ?min_contract_change ?sort_by ?sort_order ?page ?limit
        this.getScannerController = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { date, instrument, buildup_type, min_contract_change, sort_by, sort_order, page, limit, } = req.query;
                const data = yield this.getScannerService({
                    date: this.str(date),
                    instrument: this.str(instrument),
                    buildup_type: this.str(buildup_type),
                    min_contract_change: this.num(min_contract_change),
                    sort_by: this.str(sort_by),
                    sort_order: sort_order === enums_1.SortOrder.ASC ? enums_1.SortOrder.ASC : enums_1.SortOrder.DESC,
                    page: this.int(page, 1),
                    limit: this.int(limit, 50),
                });
                res.status(200).send({ success: true, data });
                return;
            }
            catch (err) {
                (0, custom_error_handler_1.default)(res, err);
            }
        });
        // ─── 2. Surge Feed ────────────────────────────────────────────────────────────
        // GET /api/dashboard/surges
        // ?date ?min_surge_percent ?require_positive_oi ?limit
        this.getSurgesController = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { date, min_surge_percent, require_positive_oi, limit } = req.query;
                const data = yield this.getSurgesService({
                    date: this.str(date),
                    min_surge_percent: (_a = this.num(min_surge_percent)) !== null && _a !== void 0 ? _a : 150,
                    require_positive_oi: require_positive_oi !== undefined
                        ? this.bool(require_positive_oi)
                        : true,
                    limit: this.int(limit, 20),
                });
                res.status(200).send({ success: true, data });
            }
            catch (err) {
                (0, custom_error_handler_1.default)(res, err);
            }
        });
        // ─── 3. Distribution Chart ────────────────────────────────────────────────────
        // GET /api/dashboard/distribution
        // Single day: ?date ?instrument   |   Range: ?from ?to ?instrument
        this.getDistributionController = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { date, instrument, from, to } = req.query;
                const data = yield this.getDistributionService({
                    date: this.str(date),
                    instrument: this.str(instrument),
                    from: this.str(from),
                    to: this.str(to),
                });
                res.status(200).send({ success: true, data });
            }
            catch (err) {
                (0, custom_error_handler_1.default)(res, err);
            }
        });
        // ─── 4. OI + Price Trend Overlay ─────────────────────────────────────────────
        // GET /api/dashboard/trend/:symbol
        // ?from ?to ?expiry_date ?instrument
        this.getTrendController = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { symbol } = req.params;
                const { from, to, expiry_date, instrument } = req.query;
                const data = yield this.getTrendService({
                    symbol,
                    from: this.str(from),
                    to: this.str(to),
                    expiry_date: this.str(expiry_date),
                    instrument: this.str(instrument),
                });
                res.status(200).send({ success: true, data });
            }
            catch (err) {
                (0, custom_error_handler_1.default)(res, err);
            }
        });
        // ─── 5. Absorption Score Tracker ──────────────────────────────────────────────
        // GET /api/dashboard/absorption
        // ?date ?instrument ?min_score ?sort_by ?limit
        this.getAbsorptionController = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { date, instrument, min_score, sort_by, limit } = req.query;
                const data = yield this.getAbsorptionService({
                    date: this.str(date),
                    instrument: this.str(instrument),
                    min_score: this.num(min_score),
                    sort_by: sort_by === enums_1.AbsorptionSortBy.VOLUME_CHANGE_PCT
                        ? enums_1.AbsorptionSortBy.VOLUME_CHANGE_PCT
                        : enums_1.AbsorptionSortBy.ABSORPTION_SCORE,
                    limit: this.int(limit, 20),
                });
                res.status(200).send({ success: true, data });
            }
            catch (err) {
                (0, custom_error_handler_1.default)(res, err);
            }
        });
        // ─── 6. FutSpot Spread Monitor ────────────────────────────────────────────────
        // GET /api/dashboard/spread
        // ?date ?instrument ?sort_by ?outlier_only
        this.getSpreadController = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { date, instrument, sort_by, outlier_only } = req.query;
                const data = yield this.getSpreadService({
                    date: this.str(date),
                    instrument: this.str(instrument),
                    sort_by: sort_by === enums_1.SpreadSortBy.SPREAD_ABS
                        ? enums_1.SpreadSortBy.SPREAD_ABS
                        : enums_1.SpreadSortBy.SPREAD_PERCENT,
                    outlier_only: this.bool(outlier_only),
                });
                res.status(200).send({ success: true, data });
            }
            catch (err) {
                (0, custom_error_handler_1.default)(res, err);
            }
        });
        // ─── 7. Volume-to-OI Screener ─────────────────────────────────────────────────
        // GET /api/dashboard/volume-oi
        // ?date ?instrument ?min_ratio ?max_ratio ?sort_by
        this.getVolumeOIController = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { date, instrument, min_ratio, max_ratio, sort_by } = req.query;
                const data = yield this.getVolumeOIService({
                    date: this.str(date),
                    instrument: this.str(instrument),
                    min_ratio: this.num(min_ratio),
                    max_ratio: this.num(max_ratio),
                    sort_by: sort_by === enums_1.VolumeOISortBy.VOLUME_CHANGE_PCT
                        ? enums_1.VolumeOISortBy.VOLUME_CHANGE_PCT
                        : enums_1.VolumeOISortBy.VOLUME_TO_OI,
                });
                res.status(200).send({ success: true, data });
            }
            catch (err) {
                (0, custom_error_handler_1.default)(res, err);
            }
        });
        // ─── 8. Multi-Day Buildup Streaks ─────────────────────────────────────────────
        // GET /api/dashboard/streaks
        // ?as_of ?instrument ?min_streak_days ?buildup_type
        this.getStreaksController = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { as_of, instrument, min_streak_days, buildup_type } = req.query;
                const data = yield this.getStreaksService({
                    as_of: this.str(as_of),
                    instrument: this.str(instrument),
                    min_streak_days: this.int(min_streak_days, 3),
                    buildup_type: buildup_type,
                });
                res.status(200).send({ success: true, data });
            }
            catch (err) {
                (0, custom_error_handler_1.default)(res, err);
            }
        });
        // ─── 9. Expiry Cycle Analysis ─────────────────────────────────────────────────
        // GET /api/dashboard/expiry-cycle
        // ?symbol (required) ?expiry_date (required) ?instrument
        this.getExpiryCycleController = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { symbol, expiry_date, instrument } = req.query;
                if (!symbol || !expiry_date) {
                    throw new error_handler_1.default({
                        status_code: 400,
                        message: "symbol and expiry_date are required query params",
                    });
                }
                const data = yield this.getExpiryCycleService({
                    symbol: symbol,
                    expiry_date: expiry_date,
                    instrument: this.str(instrument),
                });
                res.status(200).send({ success: true, data });
            }
            catch (err) {
                (0, custom_error_handler_1.default)(res, err);
            }
        });
        // ─── 10. Cross-Expiry Comparison ──────────────────────────────────────────────
        // GET /api/dashboard/cross-expiry/:symbol
        // ?date ?instrument
        this.getCrossExpiryController = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { symbol } = req.params;
                const { date, instrument } = req.query;
                const data = yield this.getCrossExpiryService({
                    symbol,
                    date: this.str(date),
                    instrument: this.str(instrument),
                });
                res.status(200).send({ success: true, data });
            }
            catch (err) {
                (0, custom_error_handler_1.default)(res, err);
            }
        });
        // ─── Utility: available dates ─────────────────────────────────────────────────
        // GET /api/dashboard/dates ?instrument
        this.getAvailableDatesController = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const data = yield this.getAvailableDatesService({
                    instrument: this.str(req.query.instrument),
                });
                res.status(200).send({ success: true, data });
            }
            catch (err) {
                (0, custom_error_handler_1.default)(res, err);
            }
        });
        // ─── Utility: available symbols ───────────────────────────────────────────────
        // GET /api/dashboard/symbols ?instrument
        this.getAvailableSymbolsController = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const data = yield this.getAvailableSymbolsService({
                    instrument: this.str(req.query.instrument),
                });
                res.status(200).send({ success: true, data });
            }
            catch (err) {
                (0, custom_error_handler_1.default)(res, err);
            }
        });
    }
}
exports.default = DashboardController;
//# sourceMappingURL=controller.js.map