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
const postgres_1 = __importDefault(require("../config/postgres"));
const enums_1 = require("./types/enums");
// ─── Sort column map (enum → SQL expression) ─────────────────────────────────
const SCANNER_SORT_COL = {
    [enums_1.ScannerSortBy.PERCENTAGE_CHANGE]: `percentage_change_contracts::numeric`,
    [enums_1.ScannerSortBy.ABSORPTION_SCORE]: `(meta_data->>'absorptionScore')::numeric`,
    [enums_1.ScannerSortBy.VOLUME_TO_OI]: `(meta_data->>'volumeToOI')::numeric`,
    [enums_1.ScannerSortBy.CHANGE_IN_OI]: `change_in_oi`,
};
const ABSORPTION_SORT_COL = {
    [enums_1.AbsorptionSortBy.ABSORPTION_SCORE]: `(meta_data->>'absorptionScore')::numeric`,
    [enums_1.AbsorptionSortBy.VOLUME_CHANGE_PCT]: `(meta_data->>'volumeChangePerc')::numeric`,
};
const VOLUME_OI_SORT_COL = {
    [enums_1.VolumeOISortBy.VOLUME_TO_OI]: `(meta_data->>'volumeToOI')::numeric`,
    [enums_1.VolumeOISortBy.VOLUME_CHANGE_PCT]: `(meta_data->>'volumeChangePerc')::numeric`,
};
class DashboardDb {
    constructor() {
        // ─── 1a. Scanner: paginated + filtered + sorted rows ─────────────────────
        this.getScannerRows = (_a) => __awaiter(this, [_a], void 0, function* ({ date, instrument, buildup_types, min_contract_change, sort_by = enums_1.ScannerSortBy.PERCENTAGE_CHANGE, sort_order = enums_1.SortOrder.DESC, page = 1, limit = 50, }) {
            var _b;
            const params = [date];
            const clauses = [
                `occurrence_date = $1`,
                `percentage_change_contracts not in  ('NaN', 'Infinity')`,
            ];
            if (instrument) {
                params.push(instrument);
                clauses.push(`instrument = $${params.length}`);
            }
            if (buildup_types === null || buildup_types === void 0 ? void 0 : buildup_types.length) {
                params.push(buildup_types);
                clauses.push(`meta_data->>'buildup_type' = ANY($${params.length})`);
            }
            if (min_contract_change !== undefined) {
                params.push(min_contract_change);
                clauses.push(`percentage_change_contracts::numeric >= $${params.length}`);
            }
            const sortCol = (_b = SCANNER_SORT_COL[sort_by]) !== null && _b !== void 0 ? _b : SCANNER_SORT_COL[enums_1.ScannerSortBy.PERCENTAGE_CHANGE];
            const sortDir = sort_order === "asc" ? "ASC" : "DESC";
            const offset = (page - 1) * limit;
            params.push(limit, offset);
            const { rows } = yield postgres_1.default.query(`SELECT *
       FROM processed_data
       WHERE ${clauses.join(" AND ")}
       ORDER BY ${sortCol} ${sortDir} NULLS LAST
       LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
            return rows;
        });
        // ─── 1b. Scanner: summary (count + per-buildup distribution) ─────────────
        // Always runs on the FULL filtered set — no pagination — so the summary
        // card counts are accurate across all pages, not just the current page.
        this.getScannerSummary = (_a) => __awaiter(this, [_a], void 0, function* ({ date, instrument, buildup_types, min_contract_change, }) {
            const params = [date];
            const clauses = [
                `occurrence_date = $1`,
                `percentage_change_contracts not in  ('NaN', 'Infinity')`,
            ];
            if (instrument) {
                params.push(instrument);
                clauses.push(`instrument = $${params.length}`);
            }
            if (buildup_types === null || buildup_types === void 0 ? void 0 : buildup_types.length) {
                params.push(buildup_types);
                clauses.push(`meta_data->>'buildup_type' = ANY($${params.length})`);
            }
            if (min_contract_change !== undefined) {
                params.push(min_contract_change);
                clauses.push(`percentage_change_contracts::numeric >= $${params.length}`);
            }
            const { rows } = yield postgres_1.default.query(`SELECT
         meta_data->>'buildup_type' AS buildup_type,
         COUNT(*)::int              AS count
       FROM processed_data
       WHERE ${clauses.join(" AND ")}
       GROUP BY meta_data->>'buildup_type'`, params);
            const distribution = {};
            let total_count = 0;
            for (const row of rows) {
                distribution[row.buildup_type] = Number(row.count);
                total_count += Number(row.count);
            }
            return { total_count, distribution };
        });
        // ─── 2a. Surge Feed: filtered + sorted + limited rows ────────────────────
        this.getSurgeRows = (_a) => __awaiter(this, [_a], void 0, function* ({ date, min_surge_percent, require_positive_oi, limit, }) {
            const params = [date, min_surge_percent, limit];
            const oiClause = require_positive_oi ? `AND change_in_oi > 0` : "";
            const { rows } = yield postgres_1.default.query(`SELECT *
       FROM processed_data
       WHERE occurrence_date = $1
         AND percentage_change_contracts::numeric >= $2
         AND percentage_change_contracts not in  ('NaN', 'Infinity')
         ${oiClause}
       ORDER BY percentage_change_contracts::numeric DESC,
                change_in_oi DESC
       LIMIT $3`, params);
            return rows;
        });
        // ─── 2b. Surge Feed: total matching count (before limit) ─────────────────
        this.getSurgeCount = (_a) => __awaiter(this, [_a], void 0, function* ({ date, min_surge_percent, require_positive_oi, }) {
            const params = [date, min_surge_percent];
            const oiClause = require_positive_oi ? `AND change_in_oi > 0` : "";
            const { rows } = yield postgres_1.default.query(`SELECT COUNT(*)::int AS count
       FROM processed_data
       WHERE occurrence_date = $1
         AND percentage_change_contracts::numeric >= $2
         AND percentage_change_contracts not in  ('NaN', 'Infinity')
         ${oiClause}`, params);
            return rows[0].count;
        });
        // ─── 3. Distribution: all rows in a date range ───────────────────────────
        // Intentionally unfiltered — distribution ratios must reflect the full universe.
        this.getRowsInRange = (_a) => __awaiter(this, [_a], void 0, function* ({ fromDate, toDate, instrument, }) {
            const params = [fromDate, toDate];
            const clauses = [
                `to_date(occurrence_date, 'DD-MM-YYYY') >= to_date($1, 'DD-MM-YYYY')`,
                `to_date(occurrence_date, 'DD-MM-YYYY') <= to_date($2, 'DD-MM-YYYY')`,
            ];
            if (instrument) {
                params.push(instrument);
                clauses.push(`instrument = $${params.length}`);
            }
            const { rows } = yield postgres_1.default.query(`SELECT * FROM processed_data
       WHERE ${clauses.join(" AND ")}
       ORDER BY to_date(occurrence_date, 'DD-MM-YYYY') ASC`, params);
            return rows;
        });
        // ─── 4. Trend: time-series rows for one symbol ───────────────────────────
        this.getTrendRows = (_a) => __awaiter(this, [_a], void 0, function* ({ symbol, fromDate, toDate, instrument, expiryDate, }) {
            const params = [symbol, fromDate, toDate];
            const clauses = [
                `name = $1`,
                `to_date(occurrence_date, 'DD-MM-YYYY') >= to_date($2, 'DD-MM-YYYY')`,
                `to_date(occurrence_date, 'DD-MM-YYYY') <= to_date($3, 'DD-MM-YYYY')`,
            ];
            if (instrument) {
                params.push(instrument);
                clauses.push(`instrument = $${params.length}`);
            }
            if (expiryDate) {
                params.push(expiryDate);
                clauses.push(`expiry_date = $${params.length}`);
            }
            const { rows } = yield postgres_1.default.query(`SELECT * FROM processed_data
       WHERE ${clauses.join(" AND ")}
       ORDER BY to_date(occurrence_date, 'DD-MM-YYYY') ASC`, params);
            return rows;
        });
        // ─── 5. Absorption: filtered + sorted + limited rows ─────────────────────
        this.getAbsorptionRows = (_a) => __awaiter(this, [_a], void 0, function* ({ date, instrument, min_score, sort_by = enums_1.AbsorptionSortBy.ABSORPTION_SCORE, limit = 20, }) {
            var _b;
            const params = [date];
            const clauses = [`occurrence_date = $1`];
            if (instrument) {
                params.push(instrument);
                clauses.push(`instrument = $${params.length}`);
            }
            if (min_score !== undefined) {
                params.push(min_score);
                clauses.push(`(meta_data->>'absorptionScore')::numeric >= $${params.length}`);
            }
            const sortCol = (_b = ABSORPTION_SORT_COL[sort_by]) !== null && _b !== void 0 ? _b : ABSORPTION_SORT_COL[enums_1.AbsorptionSortBy.ABSORPTION_SCORE];
            params.push(limit);
            const { rows } = yield postgres_1.default.query(`SELECT *
       FROM processed_data
       WHERE ${clauses.join(" AND ")}
       ORDER BY ${sortCol} DESC NULLS LAST
       LIMIT $${params.length}`, params);
            return rows;
        });
        // ─── 6. Spread: all rows + universe mean + stddev via window functions ────
        // AVG and STDDEV_POP are computed across the full date universe in one pass.
        // z-score derivation happens in the service using these pre-computed values.
        this.getSpreadRows = (_a) => __awaiter(this, [_a], void 0, function* ({ date, instrument, }) {
            const params = [date];
            const clauses = [`occurrence_date = $1`];
            if (instrument) {
                params.push(instrument);
                clauses.push(`instrument = $${params.length}`);
            }
            const { rows } = yield postgres_1.default.query(`SELECT *,
         AVG((meta_data->>'futSpotSpreadPerc')::numeric)        OVER () AS universe_mean,
         STDDEV_POP((meta_data->>'futSpotSpreadPerc')::numeric) OVER () AS universe_std
       FROM processed_data
       WHERE ${clauses.join(" AND ")}`, params);
            return rows;
        });
        // ─── 7. Volume-OI: filtered + sorted rows (no limit) ─────────────────────
        // No LIMIT — full filtered set returned so churn category distribution
        // counts in the service summary are accurate.
        this.getVolumeOIRows = (_a) => __awaiter(this, [_a], void 0, function* ({ date, instrument, min_ratio, max_ratio, sort_by = enums_1.VolumeOISortBy.VOLUME_TO_OI, }) {
            var _b;
            const params = [date];
            const clauses = [`occurrence_date = $1`];
            if (instrument) {
                params.push(instrument);
                clauses.push(`instrument = $${params.length}`);
            }
            if (min_ratio !== undefined) {
                params.push(min_ratio);
                clauses.push(`(meta_data->>'volumeToOI')::numeric >= $${params.length}`);
            }
            if (max_ratio !== undefined) {
                params.push(max_ratio);
                clauses.push(`(meta_data->>'volumeToOI')::numeric <= $${params.length}`);
            }
            const sortCol = (_b = VOLUME_OI_SORT_COL[sort_by]) !== null && _b !== void 0 ? _b : VOLUME_OI_SORT_COL[enums_1.VolumeOISortBy.VOLUME_TO_OI];
            const { rows } = yield postgres_1.default.query(`SELECT *
       FROM processed_data
       WHERE ${clauses.join(" AND ")}
       ORDER BY ${sortCol} DESC NULLS LAST`, params);
            return rows;
        });
        // ─── 8. Streaks: last N days across all symbols ───────────────────────────
        this.getRecentRowsForStreaks = (_a) => __awaiter(this, [_a], void 0, function* ({ asOfDate, daysBack = 30, instrument, }) {
            const params = [asOfDate, daysBack];
            const clauses = [
                `to_date(occurrence_date, 'DD-MM-YYYY') <= to_date($1, 'DD-MM-YYYY')`,
                `to_date(occurrence_date, 'DD-MM-YYYY') >= to_date($1, 'DD-MM-YYYY') - ($2 || ' days')::INTERVAL`,
            ];
            if (instrument) {
                params.push(instrument);
                clauses.push(`instrument = $${params.length}`);
            }
            const { rows } = yield postgres_1.default.query(`SELECT * FROM processed_data
       WHERE ${clauses.join(" AND ")}
       ORDER BY name ASC, expiry_date ASC,
                to_date(occurrence_date, 'DD-MM-YYYY') DESC`, params);
            return rows;
        });
        // ─── 9. Expiry cycle: full lifecycle of one symbol+expiry ────────────────
        this.getExpiryCycleRows = (_a) => __awaiter(this, [_a], void 0, function* ({ symbol, expiryDate, instrument, }) {
            const params = [symbol, expiryDate];
            const clauses = [`name = $1`, `expiry_date = $2`];
            if (instrument) {
                params.push(instrument);
                clauses.push(`instrument = $${params.length}`);
            }
            const { rows } = yield postgres_1.default.query(`SELECT * FROM processed_data
       WHERE ${clauses.join(" AND ")}
       ORDER BY to_date(occurrence_date, 'DD-MM-YYYY') ASC`, params);
            return rows;
        });
        // ─── 10. Cross-expiry: all expiries for a symbol on one date ─────────────
        this.getCrossExpiryRows = (_a) => __awaiter(this, [_a], void 0, function* ({ symbol, date, instrument, }) {
            const params = [symbol, date];
            const clauses = [`name = $1`, `occurrence_date = $2`];
            if (instrument) {
                params.push(instrument);
                clauses.push(`instrument = $${params.length}`);
            }
            const { rows } = yield postgres_1.default.query(`SELECT * FROM processed_data
       WHERE ${clauses.join(" AND ")}
       ORDER BY to_date(expiry_date, 'DD-MM-YYYY') ASC`, params);
            return rows;
        });
        // ─── Utility: distinct occurrence dates ──────────────────────────────────
        this.getAvailableDatesDb = (_a) => __awaiter(this, [_a], void 0, function* ({ instrument, }) {
            const params = [];
            const where = instrument ? `WHERE instrument = $1` : "";
            if (instrument)
                params.push(instrument);
            const { rows } = yield postgres_1.default.query(`SELECT occurrence_date
       FROM (SELECT DISTINCT occurrence_date FROM processed_data ${where}) AS dates
       ORDER BY to_date(occurrence_date, 'DD-MM-YYYY') DESC`, params);
            return rows.map((r) => r.occurrence_date);
        });
        // ─── Utility: distinct expiry dates ──────────────────────────────────────
        this.getAvailableExpiryDatesDb = (_a) => __awaiter(this, [_a], void 0, function* ({ instrument, }) {
            const params = [];
            const where = instrument ? `WHERE instrument = $1` : "";
            if (instrument)
                params.push(instrument);
            const { rows } = yield postgres_1.default.query(`SELECT expiry_date
       FROM (SELECT DISTINCT expiry_date FROM processed_data ${where}) AS dates
       ORDER BY to_date(expiry_date, 'DD-MM-YYYY') DESC`, params);
            return rows.map((r) => r.expiry_date);
        });
        // ─── Utility: distinct symbols ────────────────────────────────────────────
        this.getAvailableSymbolsDb = (_a) => __awaiter(this, [_a], void 0, function* ({ instrument, }) {
            const params = [];
            const where = instrument ? `WHERE instrument = $1` : "";
            if (instrument)
                params.push(instrument);
            const { rows } = yield postgres_1.default.query(`SELECT DISTINCT name FROM processed_data ${where} ORDER BY name ASC`, params);
            return rows.map((r) => r.name);
        });
        // ─── Utility: latest occurrence_date in DB ────────────────────────────────
        this.getLatestDate = (_a) => __awaiter(this, [_a], void 0, function* ({ instrument, }) {
            var _b, _c;
            const params = [];
            const where = instrument ? `WHERE instrument = $1` : "";
            if (instrument)
                params.push(instrument);
            const { rows } = yield postgres_1.default.query(`SELECT occurrence_date FROM processed_data ${where}
       ORDER BY to_date(occurrence_date, 'DD-MM-YYYY') DESC LIMIT 1`, params);
            return (_c = (_b = rows[0]) === null || _b === void 0 ? void 0 : _b.occurrence_date) !== null && _c !== void 0 ? _c : null;
        });
    }
}
exports.default = DashboardDb;
//# sourceMappingURL=db.js.map