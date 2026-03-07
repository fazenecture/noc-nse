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
class DashboardDb {
    constructor() {
        // ─── Scanner: all rows for a given date ──────────────────────────────────────
        this.getScannerRows = (_a) => __awaiter(this, [_a], void 0, function* ({ date, instrument, }) {
            const params = [date];
            let where = `occurrence_date = $1`;
            if (instrument) {
                params.push(instrument);
                where += ` AND instrument = $${params.length}`;
            }
            const { rows } = yield postgres_1.default.query(`SELECT * FROM processed_data WHERE ${where} ORDER BY created_at DESC`, params);
            return rows;
        });
        // ─── Trend: time-series rows for one symbol ───────────────────────────────────
        this.getTrendRows = (_a) => __awaiter(this, [_a], void 0, function* ({ symbol, fromDate, toDate, instrument, expiryDate, }) {
            const params = [symbol, fromDate, toDate];
            let where = `
      name = $1
      AND to_date(occurrence_date, 'DD-MM-YYYY') >= to_date($2, 'DD-MM-YYYY')
      AND to_date(occurrence_date, 'DD-MM-YYYY') <= to_date($3, 'DD-MM-YYYY')
    `;
            if (instrument) {
                params.push(instrument);
                where += ` AND instrument = $${params.length}`;
            }
            if (expiryDate) {
                params.push(expiryDate);
                where += ` AND expiry_date = $${params.length}`;
            }
            const { rows } = yield postgres_1.default.query(`SELECT * FROM processed_data WHERE ${where}
       ORDER BY to_date(occurrence_date, 'DD-MM-YYYY') ASC`, params);
            return rows;
        });
        // ─── Streaks: last N days across all symbols ──────────────────────────────────
        this.getRecentRowsForStreaks = (_a) => __awaiter(this, [_a], void 0, function* ({ asOfDate, daysBack = 30, instrument, }) {
            const params = [asOfDate, daysBack];
            let where = `
      to_date(occurrence_date, 'DD-MM-YYYY') <= to_date($1, 'DD-MM-YYYY')
      AND to_date(occurrence_date, 'DD-MM-YYYY') >= to_date($1, 'DD-MM-YYYY') - ($2 || ' days')::INTERVAL
    `;
            if (instrument) {
                params.push(instrument);
                where += ` AND instrument = $${params.length}`;
            }
            const { rows } = yield postgres_1.default.query(`SELECT * FROM processed_data WHERE ${where}
       ORDER BY name ASC, expiry_date ASC, to_date(occurrence_date, 'DD-MM-YYYY') DESC`, params);
            return rows;
        });
        // ─── Expiry cycle: full lifecycle of one symbol+expiry ───────────────────────
        this.getExpiryCycleRows = (_a) => __awaiter(this, [_a], void 0, function* ({ symbol, expiryDate, instrument, }) {
            const params = [symbol, expiryDate];
            let where = `name = $1 AND expiry_date = $2`;
            if (instrument) {
                params.push(instrument);
                where += ` AND instrument = $${params.length}`;
            }
            const { rows } = yield postgres_1.default.query(`SELECT * FROM processed_data WHERE ${where}
       ORDER BY to_date(occurrence_date, 'DD-MM-YYYY') ASC`, params);
            return rows;
        });
        // ─── Cross-expiry: all expiries for a symbol on one date ─────────────────────
        this.getCrossExpiryRows = (_a) => __awaiter(this, [_a], void 0, function* ({ symbol, date, instrument, }) {
            const params = [symbol, date];
            let where = `name = $1 AND occurrence_date = $2`;
            if (instrument) {
                params.push(instrument);
                where += ` AND instrument = $${params.length}`;
            }
            const { rows } = yield postgres_1.default.query(`SELECT * FROM processed_data WHERE ${where}
       ORDER BY to_date(expiry_date, 'DD-MM-YYYY') ASC`, params);
            return rows;
        });
        // ─── Distribution over a date range ──────────────────────────────────────────
        this.getRowsInRange = (_a) => __awaiter(this, [_a], void 0, function* ({ fromDate, toDate, instrument, }) {
            const params = [fromDate, toDate];
            let where = `
      to_date(occurrence_date, 'DD-MM-YYYY') >= to_date($1, 'DD-MM-YYYY')
      AND to_date(occurrence_date, 'DD-MM-YYYY') <= to_date($2, 'DD-MM-YYYY')
    `;
            if (instrument) {
                params.push(instrument);
                where += ` AND instrument = $${params.length}`;
            }
            const { rows } = yield postgres_1.default.query(`SELECT * FROM processed_data WHERE ${where}
       ORDER BY to_date(occurrence_date, 'DD-MM-YYYY') ASC`, params);
            return rows;
        });
        // ─── Utility: distinct occurrence dates ──────────────────────────────────────
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
        // ─── Utility: distinct symbols ───────────────────────────────────────────────
        this.getAvailableSymbolsDb = (_a) => __awaiter(this, [_a], void 0, function* ({ instrument, }) {
            const params = [];
            const where = instrument ? `WHERE instrument = $1` : "";
            if (instrument)
                params.push(instrument);
            const { rows } = yield postgres_1.default.query(`SELECT DISTINCT name FROM processed_data ${where} ORDER BY name ASC`, params);
            return rows.map((r) => r.name);
        });
        // ─── Utility: latest occurrence_date in DB ───────────────────────────────────
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