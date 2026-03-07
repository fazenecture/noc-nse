import db from "../config/postgres";
import {
  IProcessedDataRow,
  IGetScannerRowsParams,
  IGetTrendRowsParams,
  IGetStreakRowsParams,
  IGetExpiryCycleRowsParams,
  IGetCrossExpiryRowsParams,
  IGetRowsInRangeParams,
  IGetByInstrumentParams,
} from "./types/interface";

export default class DashboardDb {
  // ─── Scanner: all rows for a given date ──────────────────────────────────────
  protected getScannerRows = async ({
    date,
    instrument,
  }: IGetScannerRowsParams): Promise<IProcessedDataRow[]> => {
    const params: any[] = [date];
    let where = `occurrence_date = $1`;

    if (instrument) {
      params.push(instrument);
      where += ` AND instrument = $${params.length}`;
    }

    const { rows } = await db.query(
      `SELECT * FROM processed_data WHERE ${where} ORDER BY created_at DESC`,
      params,
    );
    return rows as unknown as IProcessedDataRow[];
  };

  // ─── Trend: time-series rows for one symbol ───────────────────────────────────
  protected getTrendRows = async ({
    symbol,
    fromDate,
    toDate,
    instrument,
    expiryDate,
  }: IGetTrendRowsParams): Promise<IProcessedDataRow[]> => {
    const params: any[] = [symbol, fromDate, toDate];
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

    const { rows } = await db.query(
      `SELECT * FROM processed_data WHERE ${where}
       ORDER BY to_date(occurrence_date, 'DD-MM-YYYY') ASC`,
      params,
    );
    return rows as unknown as IProcessedDataRow[];
  };

  // ─── Streaks: last N days across all symbols ──────────────────────────────────
  protected getRecentRowsForStreaks = async ({
    asOfDate,
    daysBack = 30,
    instrument,
  }: IGetStreakRowsParams): Promise<IProcessedDataRow[]> => {
    const params: any[] = [asOfDate, daysBack];
    let where = `
      to_date(occurrence_date, 'DD-MM-YYYY') <= to_date($1, 'DD-MM-YYYY')
      AND to_date(occurrence_date, 'DD-MM-YYYY') >= to_date($1, 'DD-MM-YYYY') - ($2 || ' days')::INTERVAL
    `;

    if (instrument) {
      params.push(instrument);
      where += ` AND instrument = $${params.length}`;
    }

    const { rows } = await db.query(
      `SELECT * FROM processed_data WHERE ${where}
       ORDER BY name ASC, expiry_date ASC, to_date(occurrence_date, 'DD-MM-YYYY') DESC`,
      params,
    );
    return rows as unknown as IProcessedDataRow[];
  };

  // ─── Expiry cycle: full lifecycle of one symbol+expiry ───────────────────────
  protected getExpiryCycleRows = async ({
    symbol,
    expiryDate,
    instrument,
  }: IGetExpiryCycleRowsParams): Promise<IProcessedDataRow[]> => {
    const params: any[] = [symbol, expiryDate];
    let where = `name = $1 AND expiry_date = $2`;

    if (instrument) {
      params.push(instrument);
      where += ` AND instrument = $${params.length}`;
    }

    const { rows } = await db.query(
      `SELECT * FROM processed_data WHERE ${where}
       ORDER BY to_date(occurrence_date, 'DD-MM-YYYY') ASC`,
      params,
    );
    return rows as unknown as IProcessedDataRow[];
  };

  // ─── Cross-expiry: all expiries for a symbol on one date ─────────────────────
  protected getCrossExpiryRows = async ({
    symbol,
    date,
    instrument,
  }: IGetCrossExpiryRowsParams): Promise<IProcessedDataRow[]> => {
    const params: any[] = [symbol, date];
    let where = `name = $1 AND occurrence_date = $2`;

    if (instrument) {
      params.push(instrument);
      where += ` AND instrument = $${params.length}`;
    }

    const { rows } = await db.query(
      `SELECT * FROM processed_data WHERE ${where}
       ORDER BY to_date(expiry_date, 'DD-MM-YYYY') ASC`,
      params,
    );
    return rows as unknown as IProcessedDataRow[];
  };

  // ─── Distribution over a date range ──────────────────────────────────────────
  protected getRowsInRange = async ({
    fromDate,
    toDate,
    instrument,
  }: IGetRowsInRangeParams): Promise<IProcessedDataRow[]> => {
    const params: any[] = [fromDate, toDate];
    let where = `
      to_date(occurrence_date, 'DD-MM-YYYY') >= to_date($1, 'DD-MM-YYYY')
      AND to_date(occurrence_date, 'DD-MM-YYYY') <= to_date($2, 'DD-MM-YYYY')
    `;

    if (instrument) {
      params.push(instrument);
      where += ` AND instrument = $${params.length}`;
    }

    const { rows } = await db.query(
      `SELECT * FROM processed_data WHERE ${where}
       ORDER BY to_date(occurrence_date, 'DD-MM-YYYY') ASC`,
      params,
    );
    return rows as unknown as IProcessedDataRow[];
  };

  // ─── Utility: distinct occurrence dates ──────────────────────────────────────
  protected getAvailableDatesDb = async ({
    instrument,
  }: IGetByInstrumentParams): Promise<string[]> => {
    const params: any[] = [];
    const where = instrument ? `WHERE instrument = $1` : "";
    if (instrument) params.push(instrument);

    const { rows } = await db.query(
      `SELECT occurrence_date
       FROM (SELECT DISTINCT occurrence_date FROM processed_data ${where}) AS dates
       ORDER BY to_date(occurrence_date, 'DD-MM-YYYY') DESC`,
      params,
    );

    return rows.map((r: any) => r.occurrence_date);
  };

  // ─── Utility: distinct symbols ───────────────────────────────────────────────
  protected getAvailableSymbolsDb = async ({
    instrument,
  }: IGetByInstrumentParams): Promise<string[]> => {
    const params: any[] = [];
    const where = instrument ? `WHERE instrument = $1` : "";
    if (instrument) params.push(instrument);

    const { rows } = await db.query(
      `SELECT DISTINCT name FROM processed_data ${where} ORDER BY name ASC`,
      params,
    );
    return rows.map((r: any) => r.name);
  };

  // ─── Utility: latest occurrence_date in DB ───────────────────────────────────
  protected getLatestDate = async ({
    instrument,
  }: IGetByInstrumentParams): Promise<string | null> => {
    const params: any[] = [];
    const where = instrument ? `WHERE instrument = $1` : "";
    if (instrument) params.push(instrument);

    const { rows } = await db.query(
      `SELECT occurrence_date FROM processed_data ${where}
       ORDER BY to_date(occurrence_date, 'DD-MM-YYYY') DESC LIMIT 1`,
      params,
    );
    return (rows[0] as any)?.occurrence_date ?? null;
  };
}
