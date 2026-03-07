// ─── Sort Order ───────────────────────────────────────────────────────────────
export enum SortOrder {
  ASC  = 'asc',
  DESC = 'desc',
}

// ─── Scanner sort fields ───────────────────────────────────────────────────────
// Used in: GET /scanner ?sort_by
export enum ScannerSortBy {
  PERCENTAGE_CHANGE = 'percentage_change_contracts', // default
  ABSORPTION_SCORE  = 'absorptionScore',
  VOLUME_TO_OI      = 'volumeToOI',
  CHANGE_IN_OI      = 'change_in_oi',
}

// ─── Absorption sort fields ───────────────────────────────────────────────────
// Used in: GET /absorption ?sort_by
export enum AbsorptionSortBy {
  ABSORPTION_SCORE    = 'absorptionScore',       // default
  VOLUME_CHANGE_PCT   = 'volumeChangePercent',
}

// ─── Spread sort fields ───────────────────────────────────────────────────────
// Used in: GET /spread ?sort_by
export enum SpreadSortBy {
  SPREAD_PERCENT = 'futSpotSpreadPercent',   // default
  SPREAD_ABS     = 'futSpotSpread',
}

// ─── Volume-OI sort fields ────────────────────────────────────────────────────
// Used in: GET /volume-oi ?sort_by
export enum VolumeOISortBy {
  VOLUME_TO_OI      = 'volumeToOI',           // default
  VOLUME_CHANGE_PCT = 'volumeChangePercent',
}