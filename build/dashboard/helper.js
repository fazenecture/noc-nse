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
const db_1 = __importDefault(require("./db"));
class DashboardHelper extends db_1.default {
    constructor() {
        super(...arguments);
        // ─── Request param parsers (used in controller) ───────────────────────────────
        this.str = (v) => typeof v === "string" && v ? v : undefined;
        this.num = (v) => v !== undefined ? parseFloat(v) : undefined;
        this.bool = (v) => v === "true";
        this.int = (v, def) => v !== undefined ? parseInt(v) : def;
        // ─── Resolve date: use provided or fall back to latest in DB ─────────────────
        this.resolveDate = (date, instrument) => __awaiter(this, void 0, void 0, function* () {
            return (date !== null && date !== void 0 ? date : (yield this.getLatestDate({
                instrument,
            })));
        });
        // ─── Parse meta_data JSON string safely ──────────────────────────────────────
        this.parseMeta = (metaStr) => {
            try {
                if (typeof metaStr === "string") {
                    return JSON.parse(metaStr);
                }
                return metaStr;
            }
            catch (_a) {
                return {};
            }
        };
        // ─── Convert pct_change to a finite sortable number ──────────────────────────
        // "Infinity" or Infinity → 999999 so it sorts to top on desc
        this.pctToNumeric = (val) => {
            if (val === "Infinity" || val === Infinity)
                return 999999;
            if (val === "-Infinity" || val === -Infinity)
                return -999999;
            const n = parseFloat(String(val));
            return isFinite(n) ? n : 0;
        };
        // ─── Safe float — returns fallback for Infinity / NaN / undefined ─────────────
        this.safeFloat = (val, fallback = 0) => {
            const n = parseFloat(val);
            return isFinite(n) ? n : fallback;
        };
        // ─── Enrich a raw DB row with parsed meta + computed fields ──────────────────
        this.enrichRow = (row) => {
            const meta = this.parseMeta(row.meta_data);
            const pct_change_numeric = this.pctToNumeric(row.percentage_change_contracts);
            const alert_on_slack = row.current_contracts > 1.5 * row.previous_contracts &&
                row.change_in_oi > 0;
            return Object.assign(Object.assign({}, row), { meta, pct_change_numeric, alert_on_slack });
        };
        // ─── Build buildup distribution + sentiment score from enriched rows ──────────
        this.buildDistribution = (rows) => {
            var _a;
            const counts = {
                long_buildup: 0,
                short_buildup: 0,
                short_covering: 0,
                long_unwinding: 0,
                indecisive: 0,
            };
            for (const row of rows) {
                const bt = (_a = row.meta) === null || _a === void 0 ? void 0 : _a.buildup_type;
                if (bt && bt in counts)
                    counts[bt]++;
            }
            const total = rows.length || 1;
            const distribution = {};
            for (const [key, count] of Object.entries(counts)) {
                distribution[key] = {
                    count,
                    percent: parseFloat(((count / total) * 100).toFixed(1)),
                };
            }
            // Net bullish ratio: (long_buildup + short_covering) / total
            const sentimentScore = parseFloat(((counts.long_buildup + counts.short_covering) / total).toFixed(3));
            return { distribution, sentimentScore };
        };
        // ─── Absorption interpretation ────────────────────────────────────────────────
        this.classifyAbsorption = (score, priceReturn) => {
            if (score > 1.5 && Math.abs(priceReturn) < 0.02)
                return "STEALTH_ACCUMULATION";
            if (score > 1.5 && priceReturn > 0.02)
                return "HIGH_VOLUME_MOVE";
            if (score < -1.0)
                return "STEALTH_DISTRIBUTION";
            return "NORMAL";
        };
        // ─── Volume-to-OI churn category ─────────────────────────────────────────────
        this.classifyChurn = (ratio) => {
            if (ratio < 0.3)
                return "LOW";
            if (ratio < 0.7)
                return "MODERATE";
            if (ratio < 1.5)
                return "HIGH";
            return "EXTREME";
        };
        // ─── Streak strength label ────────────────────────────────────────────────────
        this.classifyStreakStrength = (days) => {
            if (days >= 10)
                return "EXTREME";
            if (days >= 6)
                return "STRONG";
            if (days >= 4)
                return "MODERATE";
            return "WEAK";
        };
        // ─── Expiry cycle phase ───────────────────────────────────────────────────────
        this.classifyCyclePhase = (daysToExpiry) => {
            if (daysToExpiry <= 1)
                return "EXPIRY_DAY";
            if (daysToExpiry <= 7)
                return "EXPIRY_WEEK";
            if (daysToExpiry <= 30)
                return "MID_CYCLE";
            return "BUILDUP";
        };
        // ─── Rollover signal from cross-expiry data ───────────────────────────────────
        this.classifyRollover = (expiries) => {
            if (expiries.length < 2)
                return "SINGLE_EXPIRY";
            const [near, mid] = expiries;
            if (mid.pct_change_numeric > near.pct_change_numeric * 1.5)
                return "EARLY_ROLLOVER";
            if (near.current_contracts > mid.current_contracts * 5)
                return "AGGRESSIVE_NEAR";
            return "NORMAL_ROLLOVER";
        };
        // ─── Most active expiry by total |OI change| ─────────────────────────────────
        this.getMostActiveExpiry = (rows) => {
            var _a;
            const oiByExpiry = new Map();
            for (const row of rows) {
                oiByExpiry.set(row.expiry_date, ((_a = oiByExpiry.get(row.expiry_date)) !== null && _a !== void 0 ? _a : 0) + Math.abs(row.change_in_oi));
            }
            return [...oiByExpiry.entries()].reduce((a, b) => (b[1] > a[1] ? b : a))[0];
        };
        // ─── Standard deviation ───────────────────────────────────────────────────────
        this.stdDev = (values) => {
            const n = values.length;
            if (n === 0)
                return 0;
            const mean = values.reduce((a, b) => a + b, 0) / n;
            return Math.sqrt(values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / n);
        };
        // ─── Z-score ──────────────────────────────────────────────────────────────────
        this.zScore = (value, mean, std) => {
            if (std === 0)
                return 0;
            return parseFloat(((value - mean) / std).toFixed(3));
        };
        // ─── Paginate array ───────────────────────────────────────────────────────────
        this.paginate = (arr, page, limit) => {
            return arr.slice((page - 1) * limit, page * limit);
        };
        // ─── Parse DD-MM-YYYY → Date ─────────────────────────────────────────────────
        this.parseDDMMYYYY = (dateStr) => {
            const [d, m, y] = dateStr.split("-").map(Number);
            return new Date(y, m - 1, d);
        };
        // ─── Days between two DD-MM-YYYY strings ─────────────────────────────────────
        this.daysBetween = (from, to) => {
            const diff = this.parseDDMMYYYY(to).getTime() - this.parseDDMMYYYY(from).getTime();
            return Math.round(diff / (1000 * 60 * 60 * 24));
        };
        // ─── Subtract N days from a DD-MM-YYYY string ────────────────────────────────
        this.subtractDays = (dateStr, days) => {
            const d = this.parseDDMMYYYY(dateStr);
            d.setDate(d.getDate() - days);
            return [
                String(d.getDate()).padStart(2, "0"),
                String(d.getMonth() + 1).padStart(2, "0"),
                d.getFullYear(),
            ].join("-");
        };
    }
}
exports.default = DashboardHelper;
//# sourceMappingURL=helper.js.map