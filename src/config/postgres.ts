import { Pool } from "pg";
import { format, buildWhereFromQuery, transformer } from "sqlutils/pg";

const {
  DB_HOST,
  DB_PASSWORD,
  DB_PORT = 5432,
  DB_USERNAME,
  DB_NAME,
} = process.env;

const isDev = process.env.NODE_ENV === "development";

const pool = new Pool({
  user: DB_USERNAME,
  password: DB_PASSWORD,
  host: DB_HOST,
  port: parseInt(String(DB_PORT), 10),
  database: DB_NAME,
  ssl: {
    rejectUnauthorized: false, // only for dev
  },
});

export default {
  async query(text, params?) {
    const start = Date.now();
    text = text.replace(/\n/g, "");
    if (isDev) console.log("to be executed query", { text });
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (isDev) {
      // logger.info("executed query", { text, duration, rows: res.rowCount });
      console.log("executed query", { text, duration, rows: res.rowCount });
    }
    return res;
  },
  format,
  buildWhereFromQuery,
  transformer,
  close: async () => {
    await pool.end();
    if (isDev) console.log("DB pool closed");
  },
};
