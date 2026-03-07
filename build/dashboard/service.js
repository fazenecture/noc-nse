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
const helper_1 = __importDefault(require("./helper"));
const enums_1 = require("./types/enums");
class DashboardService extends helper_1.default {
    constructor() {
        super(...arguments);
        // ─── 1. Scanner Table ─────────────────────────────────────────────────────────
        this.getScannerService = (query) => __awaiter(this, void 0, void 0, function* () {
            const { instrument, buildup_type, min_contract_change, sort_by = enums_1.ScannerSortBy.PERCENTAGE_CHANGE, sort_order = "desc", page = 1, limit = 50, } = query;
            const date = yield this.resolveDate(query.date, instrument);
            if (!date)
                return null;
            const rawRows = yield this.getScannerRows({ date, instrument });
            let rows = rawRows.map(this.enrichRow);
            if (buildup_type) {
                const types = buildup_type
                    .toLowerCase()
                    .split(",")
                    .map((s) => s.trim());
                rows = rows.filter((r) => types.includes(r.meta.buildup_type));
            }
            if (min_contract_change !== undefined) {
                rows = rows.filter((r) => r.pct_change_numeric >= min_contract_change);
            }
            rows.sort((a, b) => {
                let aVal;
                let bVal;
                switch (sort_by) {
                    case enums_1.ScannerSortBy.ABSORPTION_SCORE:
                        aVal = this.safeFloat(a.meta.absorptionScore);
                        bVal = this.safeFloat(b.meta.absorptionScore);
                        break;
                    case enums_1.ScannerSortBy.VOLUME_TO_OI:
                        aVal = this.safeFloat(a.meta.volumeToOI);
                        bVal = this.safeFloat(b.meta.volumeToOI);
                        break;
                    case enums_1.ScannerSortBy.CHANGE_IN_OI:
                        aVal = a.change_in_oi;
                        bVal = b.change_in_oi;
                        break;
                    default:
                        aVal = a.pct_change_numeric;
                        bVal = b.pct_change_numeric;
                }
                return sort_order === "desc" ? bVal - aVal : aVal - bVal;
            });
            const { distribution, sentimentScore } = this.buildDistribution(rows);
            return {
                date,
                total_count: rows.length,
                page,
                limit,
                summary: Object.assign(Object.assign({}, distribution), { sentiment_score: sentimentScore }),
                data: this.paginate(rows, page, limit).map((r) => ({
                    id: r.id,
                    symbol: r.name,
                    instrument: r.instrument,
                    expiry_date: r.expiry_date,
                    occurrence_date: r.occurrence_date,
                    buildup_type: r.meta.buildup_type,
                    current_contracts: r.current_contracts,
                    previous_contracts: r.previous_contracts,
                    percentage_change_contracts: r.percentage_change_contracts,
                    difference_in_contracts: r.difference_in_contracts,
                    change_in_oi: r.change_in_oi,
                    alert_on_slack: r.alert_on_slack,
                    meta: r.meta,
                })),
            };
        });
        // ─── 2. Surge Feed ────────────────────────────────────────────────────────────
        this.getSurgesService = (query) => __awaiter(this, void 0, void 0, function* () {
            const { min_surge_percent = 150, require_positive_oi = true, limit = 20, } = query;
            const date = yield this.resolveDate(query.date);
            if (!date)
                return null;
            const rawRows = yield this.getScannerRows({ date });
            let rows = rawRows.map(this.enrichRow);
            rows = rows.filter((r) => {
                const surgeOk = r.pct_change_numeric >= min_surge_percent;
                const oiOk = require_positive_oi ? r.change_in_oi > 0 : true;
                return surgeOk && oiOk;
            });
            rows.sort((a, b) => {
                if (a.pct_change_numeric !== b.pct_change_numeric) {
                    return b.pct_change_numeric - a.pct_change_numeric;
                }
                return b.change_in_oi - a.change_in_oi;
            });
            return {
                date,
                total_surges: rows.length,
                data: rows.slice(0, limit).map((r) => ({
                    symbol: r.name,
                    instrument: r.instrument,
                    expiry_date: r.expiry_date,
                    surge_percent: r.percentage_change_contracts,
                    contracts_before: r.previous_contracts,
                    contracts_after: r.current_contracts,
                    contract_delta: r.difference_in_contracts,
                    oi_change: r.change_in_oi,
                    buildup_type: r.meta.buildup_type,
                    alert_on_slack: r.alert_on_slack,
                    meta: r.meta,
                })),
            };
        });
        // ─── 3. Distribution Chart ────────────────────────────────────────────────────
        this.getDistributionService = (query) => __awaiter(this, void 0, void 0, function* () {
            const { instrument, from, to } = query;
            if (from && to) {
                const rawRows = yield this.getRowsInRange({
                    fromDate: from,
                    toDate: to,
                    instrument,
                });
                const rows = rawRows.map(this.enrichRow);
                const byDate = new Map();
                for (const row of rows) {
                    if (!byDate.has(row.occurrence_date))
                        byDate.set(row.occurrence_date, []);
                    byDate.get(row.occurrence_date).push(row);
                }
                const series = Array.from(byDate.entries())
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([seriesDate, dayRows]) => {
                    const { distribution, sentimentScore } = this.buildDistribution(dayRows);
                    return {
                        date: seriesDate,
                        distribution,
                        sentiment_score: sentimentScore,
                    };
                });
                return { from, to, series };
            }
            const date = yield this.resolveDate(query.date, instrument);
            if (!date)
                return null;
            const rawRows = yield this.getScannerRows({ date, instrument });
            const rows = rawRows.map(this.enrichRow);
            const { distribution, sentimentScore } = this.buildDistribution(rows);
            return { date, distribution, sentiment_score: sentimentScore };
        });
        // ─── 4. OI + Price Trend Overlay ─────────────────────────────────────────────
        this.getTrendService = (query) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const { symbol, instrument, expiry_date } = query;
            const toDate = yield this.resolveDate(query.to, instrument);
            if (!toDate)
                return null;
            const fromDate = (_a = query.from) !== null && _a !== void 0 ? _a : this.subtractDays(toDate, 30);
            const rawRows = yield this.getTrendRows({
                symbol,
                fromDate,
                toDate,
                instrument,
                expiryDate: expiry_date,
            });
            if (!rawRows.length)
                return null;
            const rows = rawRows.map(this.enrichRow);
            const expiryToUse = expiry_date !== null && expiry_date !== void 0 ? expiry_date : this.getMostActiveExpiry(rows);
            const filtered = expiry_date
                ? rows
                : rows.filter((r) => r.expiry_date === expiryToUse);
            return {
                symbol,
                instrument: (_c = (_b = filtered[0]) === null || _b === void 0 ? void 0 : _b.instrument) !== null && _c !== void 0 ? _c : instrument,
                expiry_date: expiryToUse,
                series: filtered.map((r) => ({
                    date: r.occurrence_date,
                    current_contracts: r.current_contracts,
                    previous_contracts: r.previous_contracts,
                    change_in_oi: r.change_in_oi,
                    percentage_change_contracts: r.percentage_change_contracts,
                    buildup_type: r.meta.buildup_type,
                    price_change: this.safeFloat(r.meta.priceChange),
                    price_return_1d: this.safeFloat(r.meta.priceReturn1D),
                    absorption_score: this.safeFloat(r.meta.absorptionScore),
                    fut_spot_spread: this.safeFloat(r.meta.futSpotSpread),
                    fut_spot_spread_percent: this.safeFloat(r.meta.futSpotSpreadPerc),
                    volume_to_oi: this.safeFloat(r.meta.volumeToOI),
                    intra_day_volatility: this.safeFloat(r.meta.intraDayVolatility),
                })),
            };
        });
        // ─── 5. Absorption Score Tracker ──────────────────────────────────────────────
        this.getAbsorptionService = (query) => __awaiter(this, void 0, void 0, function* () {
            const { instrument, min_score, sort_by = "absorptionScore", limit = 20, } = query;
            const date = yield this.resolveDate(query.date, instrument);
            if (!date)
                return null;
            const rawRows = yield this.getScannerRows({ date, instrument });
            let rows = rawRows.map(this.enrichRow);
            if (min_score !== undefined) {
                rows = rows.filter((r) => this.safeFloat(r.meta.absorptionScore) >= min_score);
            }
            rows.sort((a, b) => sort_by === "volumeChangePercent"
                ? this.safeFloat(b.meta.volumeChangePerc) -
                    this.safeFloat(a.meta.volumeChangePerc)
                : this.safeFloat(b.meta.absorptionScore) -
                    this.safeFloat(a.meta.absorptionScore));
            return {
                date,
                data: rows.slice(0, limit).map((r) => {
                    const score = this.safeFloat(r.meta.absorptionScore);
                    const priceReturn = this.safeFloat(r.meta.priceReturn1D);
                    return {
                        symbol: r.name,
                        instrument: r.instrument,
                        expiry_date: r.expiry_date,
                        absorption_score: score,
                        price_return_1d: priceReturn,
                        volume_change_percent: this.safeFloat(r.meta.volumeChangePerc),
                        buildup_type: r.meta.buildup_type,
                        interpretation: this.classifyAbsorption(score, priceReturn),
                    };
                }),
            };
        });
        // ─── 6. FutSpot Spread Monitor ────────────────────────────────────────────────
        this.getSpreadService = (query) => __awaiter(this, void 0, void 0, function* () {
            const { instrument, sort_by = "futSpotSpreadPercent", outlier_only = false, } = query;
            const date = yield this.resolveDate(query.date, instrument);
            if (!date)
                return null;
            const rawRows = yield this.getScannerRows({ date, instrument });
            const rows = rawRows.map(this.enrichRow);
            const spreadValues = rows.map((r) => this.safeFloat(r.meta.futSpotSpreadPerc));
            const mean = spreadValues.reduce((a, b) => a + b, 0) / (spreadValues.length || 1);
            const std = this.stdDev(spreadValues);
            let enriched = rows.map((r) => {
                const spreadPercent = this.safeFloat(r.meta.futSpotSpreadPerc);
                const spread = this.safeFloat(r.meta.futSpotSpread);
                const z = this.zScore(spreadPercent, mean, std);
                return {
                    symbol: r.name,
                    instrument: r.instrument,
                    expiry_date: r.expiry_date,
                    fut_spot_spread: spread,
                    fut_spot_spread_percent: spreadPercent,
                    spread_z_score: z,
                    is_outlier: Math.abs(z) > 2,
                    market_expectation: spread > 0 ? "BULLISH" : "BEARISH",
                    buildup_type: r.meta.buildup_type,
                };
            });
            if (outlier_only)
                enriched = enriched.filter((r) => r.is_outlier);
            enriched.sort((a, b) => sort_by === "futSpotSpread"
                ? Math.abs(b.fut_spot_spread) - Math.abs(a.fut_spot_spread)
                : Math.abs(b.fut_spot_spread_percent) -
                    Math.abs(a.fut_spot_spread_percent));
            return {
                date,
                mean_spread_percent: parseFloat(mean.toFixed(4)),
                std_dev_spread: parseFloat(std.toFixed(4)),
                data: enriched,
            };
        });
        // ─── 7. Volume-to-OI Screener ─────────────────────────────────────────────────
        this.getVolumeOIService = (query) => __awaiter(this, void 0, void 0, function* () {
            const { instrument, min_ratio, max_ratio, sort_by = "volumeToOI" } = query;
            const date = yield this.resolveDate(query.date, instrument);
            if (!date)
                return null;
            const rawRows = yield this.getScannerRows({ date, instrument });
            let rows = rawRows.map(this.enrichRow);
            if (min_ratio !== undefined) {
                rows = rows.filter((r) => this.safeFloat(r.meta.volumeToOI) >= min_ratio);
            }
            if (max_ratio !== undefined) {
                rows = rows.filter((r) => this.safeFloat(r.meta.volumeToOI) <= max_ratio);
            }
            rows.sort((a, b) => sort_by === "volumeChangePercent"
                ? this.safeFloat(b.meta.volumeChangePerc) -
                    this.safeFloat(a.meta.volumeChangePerc)
                : this.safeFloat(b.meta.volumeToOI) - this.safeFloat(a.meta.volumeToOI));
            return {
                date,
                data: rows.map((r) => {
                    const ratio = this.safeFloat(r.meta.volumeToOI);
                    return {
                        symbol: r.name,
                        instrument: r.instrument,
                        expiry_date: r.expiry_date,
                        volume_to_oi: ratio,
                        volume_change_percent: this.safeFloat(r.meta.volumeChangePerc),
                        change_in_oi: r.change_in_oi,
                        buildup_type: r.meta.buildup_type,
                        churn_category: this.classifyChurn(ratio),
                    };
                }),
            };
        });
        // ─── 8. Multi-Day Buildup Streaks ─────────────────────────────────────────────
        this.getStreaksService = (query) => __awaiter(this, void 0, void 0, function* () {
            const { instrument, min_streak_days = 3, buildup_type } = query;
            const asOf = yield this.resolveDate(query.as_of, instrument);
            if (!asOf)
                return null;
            const rawRows = yield this.getRecentRowsForStreaks({
                asOfDate: asOf,
                daysBack: 30,
                instrument,
            });
            const rows = rawRows.map(this.enrichRow);
            const grouped = new Map();
            for (const row of rows) {
                const key = `${row.name}||${row.expiry_date}`;
                if (!grouped.has(key))
                    grouped.set(key, []);
                grouped.get(key).push(row);
            }
            const streaks = [];
            for (const symbolRows of grouped.values()) {
                if (!symbolRows.length)
                    continue;
                const currentType = symbolRows[0].meta.buildup_type;
                if (buildup_type && currentType !== buildup_type)
                    continue;
                let streakDays = 0;
                let totalOIChange = 0;
                let totalPriceChange = 0;
                let absorptionSum = 0;
                for (const row of symbolRows) {
                    if (row.meta.buildup_type !== currentType)
                        break;
                    streakDays++;
                    totalOIChange += row.change_in_oi;
                    totalPriceChange += this.safeFloat(row.meta.priceChange);
                    absorptionSum += this.safeFloat(row.meta.absorptionScore);
                }
                if (streakDays < min_streak_days)
                    continue;
                streaks.push({
                    symbol: symbolRows[0].name,
                    instrument: symbolRows[0].instrument,
                    expiry_date: symbolRows[0].expiry_date,
                    current_buildup_type: currentType,
                    streak_days: streakDays,
                    streak_start_date: symbolRows[streakDays - 1].occurrence_date,
                    total_oi_change: totalOIChange,
                    cumulative_price_change: parseFloat(totalPriceChange.toFixed(3)),
                    average_absorption: parseFloat((absorptionSum / streakDays).toFixed(3)),
                    streak_strength: this.classifyStreakStrength(streakDays),
                });
            }
            streaks.sort((a, b) => b.streak_days - a.streak_days);
            return { as_of: asOf, data: streaks };
        });
        // ─── 9. Expiry Cycle Analysis ─────────────────────────────────────────────────
        this.getExpiryCycleService = (query) => __awaiter(this, void 0, void 0, function* () {
            const { symbol, expiry_date, instrument } = query;
            const rawRows = yield this.getExpiryCycleRows({
                symbol,
                expiryDate: expiry_date,
                instrument,
            });
            if (!rawRows.length)
                return null;
            const rows = rawRows.map(this.enrichRow);
            const latest = rows[rows.length - 1];
            const daysLeft = this.daysBetween(latest.occurrence_date, expiry_date);
            const peakRow = rows.reduce((best, r) => Math.abs(r.change_in_oi) > Math.abs(best.change_in_oi) ? r : best);
            return {
                symbol,
                expiry_date,
                instrument: rows[0].instrument,
                days_to_expiry: daysLeft,
                cycle_phase: this.classifyCyclePhase(daysLeft),
                peak_oi_date: peakRow.occurrence_date,
                peak_oi_change: peakRow.change_in_oi,
                series: rows.map((r) => ({
                    date: r.occurrence_date,
                    days_to_expiry: this.daysBetween(r.occurrence_date, expiry_date),
                    change_in_oi: r.change_in_oi,
                    current_contracts: r.current_contracts,
                    percentage_change_contracts: r.percentage_change_contracts,
                    buildup_type: r.meta.buildup_type,
                    absorption_score: this.safeFloat(r.meta.absorptionScore),
                    fut_spot_spread_percent: this.safeFloat(r.meta.futSpotSpreadPerc),
                    rollover_indicator: daysLeft <= 7 && r.change_in_oi < 0,
                })),
            };
        });
        // ─── 10. Cross-Expiry Comparison ──────────────────────────────────────────────
        this.getCrossExpiryService = (query) => __awaiter(this, void 0, void 0, function* () {
            const { symbol, instrument } = query;
            const date = yield this.resolveDate(query.date, instrument);
            if (!date)
                return null;
            const rawRows = yield this.getCrossExpiryRows({ symbol, date, instrument });
            if (!rawRows.length)
                return null;
            const rows = rawRows.map(this.enrichRow);
            const labels = ["NEAR", "MID", "FAR", "FAR2"];
            const expiries = rows.map((r, i) => {
                var _a;
                return ({
                    label: (_a = labels[i]) !== null && _a !== void 0 ? _a : `FAR${i}`,
                    expiry_date: r.expiry_date,
                    days_to_expiry: this.daysBetween(date, r.expiry_date),
                    current_contracts: r.current_contracts,
                    previous_contracts: r.previous_contracts,
                    change_in_oi: r.change_in_oi,
                    percentage_change_contracts: r.percentage_change_contracts,
                    pct_change_numeric: r.pct_change_numeric,
                    fut_spot_spread_percent: this.safeFloat(r.meta.futSpotSpreadPerc),
                    buildup_type: r.meta.buildup_type,
                    volume_to_oi: this.safeFloat(r.meta.volumeToOI),
                    absorption_score: this.safeFloat(r.meta.absorptionScore),
                });
            });
            const dominantExpiry = expiries.reduce((best, e) => Math.abs(e.change_in_oi) > Math.abs(best.change_in_oi) ? e : best).expiry_date;
            return {
                symbol,
                date,
                instrument: rows[0].instrument,
                expiries,
                rollover_signal: this.classifyRollover(expiries),
                dominant_expiry: dominantExpiry,
            };
        });
        // ─── 11. Available dates ──────────────────────────────────────────────────────
        this.getAvailableDatesService = (_a) => __awaiter(this, [_a], void 0, function* ({ instrument, }) {
            return this.getAvailableDatesDb({ instrument });
        });
        // ─── 12. Available expiry dates ──────────────────────────────────────────────────────
        this.getAvailableExpiryDatesService = (_a) => __awaiter(this, [_a], void 0, function* ({ instrument, }) {
            return this.getAvailableExpiryDatesDb({ instrument });
        });
        // ─── 13. Available symbols ────────────────────────────────────────────────────
        this.getAvailableSymbolsService = (_a) => __awaiter(this, [_a], void 0, function* ({ instrument, }) {
            return this.getAvailableSymbolsDb({ instrument });
        });
    }
}
exports.default = DashboardService;
//# sourceMappingURL=service.js.map