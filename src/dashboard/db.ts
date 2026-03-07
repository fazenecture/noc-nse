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
import { ScannerSortBy, AbsorptionSortBy, VolumeOISortBy, SortOrder } from "./types/enums";

// ─── Sort column map (enum → SQL expression) ─────────────────────────────────
const SCANNER_SORT_COL: Record<string, string> = {
  [ScannerSortBy.PERCENTAGE_CHANGE]: `percentage_change_contracts::numeric`,
  [ScannerSortBy.ABSORPTION_SCORE]:  `(meta_data->>'absorptionScore')::numeric`,
  [ScannerSortBy.VOLUME_TO_OI]:      `(meta_data->>'volumeToOI')::numeric`,
  [ScannerSortBy.CHANGE_IN_OI]:      `change_in_oi`,
};

const ABSORPTION_SORT_COL: Record<string, string> = {
  [AbsorptionSortBy.ABSORPTION_SCORE]:  `(meta_data->>'absorptionScore')::numeric`,
  [AbsorptionSortBy.VOLUME_CHANGE_PCT]: `(meta_data->>'volumeChangePerc')::numeric`,
};

const VOLUME_OI_SORT_COL: Record<string, string> = {
  [VolumeOISortBy.VOLUME_TO_OI]:      `(meta_data->>'volumeToOI')::numeric`,
  [VolumeOISortBy.VOLUME_CHANGE_PCT]: `(meta_data->>'volumeChangePerc')::numeric`,
};

export default class DashboardDb {

  // ─── 1a. Scanner: paginated + filtered + sorted rows ─────────────────────
  protected getScannerRows = async ({
    date,
    instrument,
    buildup_types,
    min_contract_change,
    sort_by = ScannerSortBy.PERCENTAGE_CHANGE,
    sort_order = SortOrder.DESC,
    page = 1,
    limit = 50,
  }: IGetScannerRowsParams): Promise<IProcessedDataRow[]> => {
    const params: any[] = [date];
    const clauses: string[] = [`occurrence_date = $1`];

    if (instrument) {
      params.push(instrument);
      clauses.push(`instrument = $${params.length}`);
    }
    if (buildup_types?.length) {
      params.push(buildup_types);
      clauses.push(`meta_data->>'buildup_type' = ANY($${params.length})`);
    }
    if (min_contract_change !== undefined) {
      params.push(min_contract_change);
      clauses.push(`percentage_change_contracts::numeric >= $${params.length}`);
    }

    const sortCol = SCANNER_SORT_COL[sort_by] ?? SCANNER_SORT_COL[ScannerSortBy.PERCENTAGE_CHANGE];
    const sortDir = sort_order === "asc" ? "ASC" : "DESC";
    const offset  = (page - 1) * limit;

    params.push(limit, offset);

    const { rows } = await db.query(
      `SELECT *
       FROM processed_data
       WHERE ${clauses.join(" AND ")}
       ORDER BY ${sortCol} ${sortDir} NULLS LAST
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    return rows as unknown as IProcessedDataRow[];
  };

  // ─── 1b. Scanner: summary (count + per-buildup distribution) ─────────────
  // Always runs on the FULL filtered set — no pagination — so the summary
  // card counts are accurate across all pages, not just the current page.
  protected getScannerSummary = async ({
    date,
    instrument,
    buildup_types,
    min_contract_change,
  }: Pick<
    IGetScannerRowsParams,
    "date" | "instrument" | "buildup_types" | "min_contract_change"
  >): Promise<{ total_count: number; distribution: Record<string, number> }> => {
    const params: any[] = [date];
    const clauses: string[] = [`occurrence_date = $1`];

    if (instrument) {
      params.push(instrument);
      clauses.push(`instrument = $${params.length}`);
    }
    if (buildup_types?.length) {
      params.push(buildup_types);
      clauses.push(`meta_data->>'buildup_type' = ANY($${params.length})`);
    }
    if (min_contract_change !== undefined) {
      params.push(min_contract_change);
      clauses.push(`percentage_change_contracts::numeric >= $${params.length}`);
    }

    const { rows } = await db.query(
      `SELECT
         meta_data->>'buildup_type' AS buildup_type,
         COUNT(*)::int              AS count
       FROM processed_data
       WHERE ${clauses.join(" AND ")}
       GROUP BY meta_data->>'buildup_type'`,
      params,
    );

    const distribution: Record<string, number> = {};
    let total_count = 0;
    for (const row of rows as any[]) {
      distribution[row.buildup_type] = Number(row.count);
      total_count += Number(row.count);
    }
    return { total_count, distribution };
  };

  // ─── 2a. Surge Feed: filtered + sorted + limited rows ────────────────────
  protected getSurgeRows = async ({
    date,
    min_surge_percent,
    require_positive_oi,
    limit,
  }: {
    date: string;
    min_surge_percent: number;
    require_positive_oi: boolean;
    limit: number;
  }): Promise<IProcessedDataRow[]> => {
    const params: any[] = [date, min_surge_percent, limit];
    const oiClause = require_positive_oi ? `AND change_in_oi > 0` : "";

    const { rows } = await db.query(
      `SELECT *
       FROM processed_data
       WHERE occurrence_date = $1
         AND percentage_change_contracts::numeric >= $2
         ${oiClause}
       ORDER BY percentage_change_contracts::numeric DESC,
                change_in_oi DESC
       LIMIT $3`,
      params,
    );
    return rows as unknown as IProcessedDataRow[];
  };

  // ─── 2b. Surge Feed: total matching count (before limit) ─────────────────
  protected getSurgeCount = async ({
    date,
    min_surge_percent,
    require_positive_oi,
  }: {
    date: string;
    min_surge_percent: number;
    require_positive_oi: boolean;
  }): Promise<number> => {
    const params: any[] = [date, min_surge_percent];
    const oiClause = require_positive_oi ? `AND change_in_oi > 0` : "";

    const { rows } = await db.query(
      `SELECT COUNT(*)::int AS count
       FROM processed_data
       WHERE occurrence_date = $1
         AND percentage_change_contracts::numeric >= $2
         ${oiClause}`,
      params,
    );
    return (rows[0] as any).count as number;
  };

  // ─── 3. Distribution: all rows in a date range ───────────────────────────
  // Intentionally unfiltered — distribution ratios must reflect the full universe.
  protected getRowsInRange = async ({
    fromDate,
    toDate,
    instrument,
  }: IGetRowsInRangeParams): Promise<IProcessedDataRow[]> => {
    const params: any[] = [fromDate, toDate];
    const clauses: string[] = [
      `to_date(occurrence_date, 'DD-MM-YYYY') >= to_date($1, 'DD-MM-YYYY')`,
      `to_date(occurrence_date, 'DD-MM-YYYY') <= to_date($2, 'DD-MM-YYYY')`,
    ];

    if (instrument) {
      params.push(instrument);
      clauses.push(`instrument = $${params.length}`);
    }

    const { rows } = await db.query(
      `SELECT * FROM processed_data
       WHERE ${clauses.join(" AND ")}
       ORDER BY to_date(occurrence_date, 'DD-MM-YYYY') ASC`,
      params,
    );
    return rows as unknown as IProcessedDataRow[];
  };

  // ─── 4. Trend: time-series rows for one symbol ───────────────────────────
  protected getTrendRows = async ({
    symbol,
    fromDate,
    toDate,
    instrument,
    expiryDate,
  }: IGetTrendRowsParams): Promise<IProcessedDataRow[]> => {
    const params: any[] = [symbol, fromDate, toDate];
    const clauses: string[] = [
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

    const { rows } = await db.query(
      `SELECT * FROM processed_data
       WHERE ${clauses.join(" AND ")}
       ORDER BY to_date(occurrence_date, 'DD-MM-YYYY') ASC`,
      params,
    );
    return rows as unknown as IProcessedDataRow[];
  };

  // ─── 5. Absorption: filtered + sorted + limited rows ─────────────────────
  protected getAbsorptionRows = async ({
    date,
    instrument,
    min_score,
    sort_by = AbsorptionSortBy.ABSORPTION_SCORE,
    limit = 20,
  }: {
    date: string;
    instrument?: string;
    min_score?: number;
    sort_by?: AbsorptionSortBy;
    limit?: number;
  }): Promise<IProcessedDataRow[]> => {
    const params: any[] = [date];
    const clauses: string[] = [`occurrence_date = $1`];

    if (instrument) {
      params.push(instrument);
      clauses.push(`instrument = $${params.length}`);
    }
    if (min_score !== undefined) {
      params.push(min_score);
      clauses.push(`(meta_data->>'absorptionScore')::numeric >= $${params.length}`);
    }

    const sortCol = ABSORPTION_SORT_COL[sort_by] ?? ABSORPTION_SORT_COL[AbsorptionSortBy.ABSORPTION_SCORE];
    params.push(limit);

    const { rows } = await db.query(
      `SELECT *
       FROM processed_data
       WHERE ${clauses.join(" AND ")}
       ORDER BY ${sortCol} DESC NULLS LAST
       LIMIT $${params.length}`,
      params,
    );
    return rows as unknown as IProcessedDataRow[];
  };

  // ─── 6. Spread: all rows + universe mean + stddev via window functions ────
  // AVG and STDDEV_POP are computed across the full date universe in one pass.
  // z-score derivation happens in the service using these pre-computed values.
  protected getSpreadRows = async ({
    date,
    instrument,
  }: {
    date: string;
    instrument?: string;
  }): Promise<(IProcessedDataRow & { universe_mean: number; universe_std: number })[]> => {
    const params: any[] = [date];
    const clauses: string[] = [`occurrence_date = $1`];

    if (instrument) {
      params.push(instrument);
      clauses.push(`instrument = $${params.length}`);
    }

    const { rows } = await db.query(
      `SELECT *,
         AVG((meta_data->>'futSpotSpreadPerc')::numeric)        OVER () AS universe_mean,
         STDDEV_POP((meta_data->>'futSpotSpreadPerc')::numeric) OVER () AS universe_std
       FROM processed_data
       WHERE ${clauses.join(" AND ")}`,
      params,
    );
    return rows as any;
  };

  // ─── 7. Volume-OI: filtered + sorted rows (no limit) ─────────────────────
  // No LIMIT — full filtered set returned so churn category distribution
  // counts in the service summary are accurate.
  protected getVolumeOIRows = async ({
    date,
    instrument,
    min_ratio,
    max_ratio,
    sort_by = VolumeOISortBy.VOLUME_TO_OI,
  }: {
    date: string;
    instrument?: string;
    min_ratio?: number;
    max_ratio?: number;
    sort_by?: VolumeOISortBy;
  }): Promise<IProcessedDataRow[]> => {
    const params: any[] = [date];
    const clauses: string[] = [`occurrence_date = $1`];

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

    const sortCol = VOLUME_OI_SORT_COL[sort_by] ?? VOLUME_OI_SORT_COL[VolumeOISortBy.VOLUME_TO_OI];

    const { rows } = await db.query(
      `SELECT *
       FROM processed_data
       WHERE ${clauses.join(" AND ")}
       ORDER BY ${sortCol} DESC NULLS LAST`,
      params,
    );
    return rows as unknown as IProcessedDataRow[];
  };

  // ─── 8. Streaks: last N days across all symbols ───────────────────────────
  protected getRecentRowsForStreaks = async ({
    asOfDate,
    daysBack = 30,
    instrument,
  }: IGetStreakRowsParams): Promise<IProcessedDataRow[]> => {
    const params: any[] = [asOfDate, daysBack];
    const clauses: string[] = [
      `to_date(occurrence_date, 'DD-MM-YYYY') <= to_date($1, 'DD-MM-YYYY')`,
      `to_date(occurrence_date, 'DD-MM-YYYY') >= to_date($1, 'DD-MM-YYYY') - ($2 || ' days')::INTERVAL`,
    ];

    if (instrument) {
      params.push(instrument);
      clauses.push(`instrument = $${params.length}`);
    }

    const { rows } = await db.query(
      `SELECT * FROM processed_data
       WHERE ${clauses.join(" AND ")}
       ORDER BY name ASC, expiry_date ASC,
                to_date(occurrence_date, 'DD-MM-YYYY') DESC`,
      params,
    );
    return rows as unknown as IProcessedDataRow[];
  };

  // ─── 9. Expiry cycle: full lifecycle of one symbol+expiry ────────────────
  protected getExpiryCycleRows = async ({
    symbol,
    expiryDate,
    instrument,
  }: IGetExpiryCycleRowsParams): Promise<IProcessedDataRow[]> => {
    const params: any[] = [symbol, expiryDate];
    const clauses: string[] = [`name = $1`, `expiry_date = $2`];

    if (instrument) {
      params.push(instrument);
      clauses.push(`instrument = $${params.length}`);
    }

    const { rows } = await db.query(
      `SELECT * FROM processed_data
       WHERE ${clauses.join(" AND ")}
       ORDER BY to_date(occurrence_date, 'DD-MM-YYYY') ASC`,
      params,
    );
    return rows as unknown as IProcessedDataRow[];
  };

  // ─── 10. Cross-expiry: all expiries for a symbol on one date ─────────────
  protected getCrossExpiryRows = async ({
    symbol,
    date,
    instrument,
  }: IGetCrossExpiryRowsParams): Promise<IProcessedDataRow[]> => {
    const params: any[] = [symbol, date];
    const clauses: string[] = [`name = $1`, `occurrence_date = $2`];

    if (instrument) {
      params.push(instrument);
      clauses.push(`instrument = $${params.length}`);
    }

    const { rows } = await db.query(
      `SELECT * FROM processed_data
       WHERE ${clauses.join(" AND ")}
       ORDER BY to_date(expiry_date, 'DD-MM-YYYY') ASC`,
      params,
    );
    return rows as unknown as IProcessedDataRow[];
  };

  // ─── Utility: distinct occurrence dates ──────────────────────────────────
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

  // ─── Utility: distinct expiry dates ──────────────────────────────────────
  protected getAvailableExpiryDatesDb = async ({
    instrument,
  }: IGetByInstrumentParams): Promise<string[]> => {
    const params: any[] = [];
    const where = instrument ? `WHERE instrument = $1` : "";
    if (instrument) params.push(instrument);

    const { rows } = await db.query(
      `SELECT expiry_date
       FROM (SELECT DISTINCT expiry_date FROM processed_data ${where}) AS dates
       ORDER BY to_date(expiry_date, 'DD-MM-YYYY') DESC`,
      params,
    );
    return rows.map((r: any) => r.expiry_date);
  };

  // ─── Utility: distinct symbols ────────────────────────────────────────────
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

  // ─── Utility: latest occurrence_date in DB ────────────────────────────────
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