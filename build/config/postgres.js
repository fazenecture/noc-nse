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
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const pg_2 = require("sqlutils/pg");
const { DB_HOST, DB_PASSWORD, DB_PORT = 5432, DB_USERNAME, DB_NAME, } = process.env;
const isDev = process.env.NODE_ENV === "development";
const pool = new pg_1.Pool({
    user: DB_USERNAME,
    password: DB_PASSWORD,
    host: DB_HOST,
    port: parseInt(String(DB_PORT), 10),
    database: DB_NAME,
    ssl: {
        rejectUnauthorized: false, // only for dev
    },
});
exports.default = {
    query(text, params) {
        return __awaiter(this, void 0, void 0, function* () {
            const start = Date.now();
            text = text.replace(/\n/g, "");
            if (isDev)
                console.log("to be executed query", { text });
            const res = yield pool.query(text, params);
            const duration = Date.now() - start;
            if (isDev) {
                // logger.info("executed query", { text, duration, rows: res.rowCount });
                console.log("executed query", { text, duration, rows: res.rowCount });
            }
            return res;
        });
    },
    format: pg_2.format,
    buildWhereFromQuery: pg_2.buildWhereFromQuery,
    transformer: pg_2.transformer,
    close: () => __awaiter(void 0, void 0, void 0, function* () {
        yield pool.end();
        if (isDev)
            console.log("DB pool closed");
    }),
};
//# sourceMappingURL=postgres.js.map