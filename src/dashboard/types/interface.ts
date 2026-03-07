import {
  SortOrder,
  ScannerSortBy,
  AbsorptionSortBy,
  SpreadSortBy,
  VolumeOISortBy,
} from './enums';

// Re-export so consumers only need to import from types
export { SortOrder, ScannerSortBy, AbsorptionSortBy, SpreadSortBy, VolumeOISortBy };

// ─── Exact shape of a row from processed_data table ─────────────────────────
export interface IProcessedDataRow {
  id: string;
  name: string;
  expiry_date: string;
  instrument: string;
  previous_date: string;
  current_contracts: number;
  previous_contracts: number;
  change_in_oi: number;
  percentage_change_contracts: number | string; // stored as "Infinity" string when prev_contracts = 0
  difference_in_contracts: number;
  occurrence_date: string;
  created_at: string;
  meta_data: string; // raw JSON string — always parse via parseMeta()
}

// ─── Parsed shape of meta_data JSON ──────────────────────────────────────────
export interface IMetaData {
  buildup_type: BuildupType;
  intraDayVolatility: string;
  priceReturn1D: string;
  rangeToPriceRation: string;
  priceChange: string;
  futSpotSpread: string;
  futSpotSpreadPerc: string;
  volumeToOI: string;
  volumeChangePerc: string;
  absorptionScore: string;
  previousDayVolumeChange: string;
}

// ─── Row after enrichment (meta parsed, computed fields added) ────────────────
export interface IEnrichedRow extends IProcessedDataRow {
  meta: IMetaData;
  alert_on_slack: boolean;
  pct_change_numeric: number; // "Infinity" string → 999999 for safe sorting
}

export type BuildupType =
  | 'long_buildup'
  | 'short_buildup'
  | 'short_covering'
  | 'long_unwinding'
  | 'indecisive';

// ─── Query param interfaces per endpoint ─────────────────────────────────────
export interface IScannerQuery {
  date?: string;
  instrument?: string;
  buildup_type?: string;       // comma-separated: "long_buildup,short_buildup"
  min_contract_change?: number;
  sort_by?: ScannerSortBy;
  sort_order?: SortOrder;
  page?: number;
  limit?: number;
}

export interface ISurgeQuery {
  date?: string;
  min_surge_percent?: number;
  require_positive_oi?: boolean;
  limit?: number;
}

export interface IDistributionQuery {
  date?: string;
  instrument?: string;
  from?: string;
  to?: string;
}

export interface ITrendQuery {
  symbol: string;
  from?: string;
  to?: string;
  expiry_date?: string;
  instrument?: string;
}

export interface IAbsorptionQuery {
  date?: string;
  instrument?: string;
  min_score?: number;
  sort_by?: AbsorptionSortBy;
  limit?: number;
}

export interface ISpreadQuery {
  date?: string;
  instrument?: string;
  sort_by?: SpreadSortBy;
  outlier_only?: boolean;
}

export interface IVolumeOIQuery {
  date?: string;
  instrument?: string;
  min_ratio?: number;
  max_ratio?: number;
  sort_by?: VolumeOISortBy;
}

export interface IStreakQuery {
  as_of?: string;
  instrument?: string;
  min_streak_days?: number;
  buildup_type?: BuildupType;
}

export interface IExpiryCycleQuery {
  symbol: string;
  expiry_date: string;
  instrument?: string;
}

export interface ICrossExpiryQuery {
  symbol: string;
  date?: string;
  instrument?: string;
}

// ─── DB layer query param interfaces ─────────────────────────────────────────
export interface IGetScannerRowsParams {
  date: string;
  instrument?: string;
  // Pushed down from service into DB — filters, sort and pagination in Postgres
  buildup_types?: string[];        // parsed array from comma-separated buildup_type param
  min_contract_change?: number;    // WHERE percentage_change_contracts::numeric >= n
  sort_by?: ScannerSortBy;         // maps to SQL column expression via SCANNER_SORT_COL
  sort_order?: SortOrder;          // ASC | DESC
  page?: number;                   // OFFSET = (page - 1) * limit
  limit?: number;                  // LIMIT n
}

export interface IGetTrendRowsParams {
  symbol: string;
  fromDate: string;
  toDate: string;
  instrument?: string;
  expiryDate?: string;
}

export interface IGetStreakRowsParams {
  asOfDate: string;
  daysBack?: number;
  instrument?: string;
}

export interface IGetExpiryCycleRowsParams {
  symbol: string;
  expiryDate: string;
  instrument?: string;
}

export interface IGetCrossExpiryRowsParams {
  symbol: string;
  date: string;
  instrument?: string;
}

export interface IGetRowsInRangeParams {
  fromDate: string;
  toDate: string;
  instrument?: string;
}

export interface IGetByInstrumentParams {
  instrument?: string;
}