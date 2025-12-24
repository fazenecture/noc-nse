export type IFetchExpiryDatesServiceReqObj = {
  symbol: string;
  instrument: string;
  year: number;
  cookie: string;
};

export type IFetchExpiryDatesServiceUrlObj = {
  symbol: string;
  instrument: string;
  year: number;
};

export type IFetchDataReqObj = {
  symbol: string;
  fromDate: string;
  toDate: string;
  expiryDate: string;
  instrument: string;
  cookie: string;
};

export type IFetchDataUrlObj = {
  symbol: string;
  fromDate: string;
  toDate: string;
  expiryDate: string;
  instrument: string;
  cookie: string;
};

export type IFetchStocksReqObj = {
  instrument: string;
  cookie: string;
};

export type IFetchOIDifferenceReqObj = {
  type: string | null;
  year: number;
};

export type IContractsData = {
  _id: string;
  FH_EXPIRY_DT: string;
  FH_INSTRUMENT: string;
  FH_OPTION_TYPE: string;
  FH_STRIKE_PRICE: string;
  FH_SYMBOL: string;
  FH_TIMESTAMP_ORDER: string;
  FH_CHANGE_IN_OI: string;
  FH_CLOSING_PRICE: string;
  FH_LAST_TRADED_PRICE: string;
  FH_MARKET_LOT: string;
  FH_MARKET_TYPE: string;
  FH_OPENING_PRICE: string;
  FH_OPEN_INT: string;
  FH_PREV_CLS: string;
  FH_SETTLE_PRICE: string;
  FH_TIMESTAMP: string;
  FH_TOT_TRADED_QTY: string;
  FH_TOT_TRADED_VAL: string;
  FH_TRADE_HIGH_PRICE: string;
  FH_TRADE_LOW_PRICE: string;
  FH_UNDERLYING_VALUE: number;
};

export type ISymbolRawData = {
  id?: string; // UUID, optional for insert
  name: string;
  expiry_date: string;
  instrument: string;
  option_type: string;
  strike_price: string;
  symbol_timestamp: Date;
  change_in_oi: string;
  closing_price: string;
  last_traded_price: string;
  market_lot: string;
  market_type: string;
  opening_price: string;
  open_int: string;
  prev_cls: string;
  settle_price: string;
  fh_timestamp: string;
  tot_traded_qty: string;
  tot_traded_val: string;
  trade_low_price: string;
  underlying_value: string | null;
  created_at?: Date; // optional, defaulted to current timestamp
};

export type IProcessedData = {
  id?: string; // UUID, optional for insert
  name: string;
  expiry_date: string;
  instrument: string;
  alert_on_slack?: boolean;
  previous_date: string;
  current_contracts: string;
  previous_contracts: string;
  change_in_oi: string;
  percentage_change_contracts: string;
  difference_in_contracts: string;
  occurrence_date: string | Date;
  created_at?: Date; // optional, defaulted to current timestamp
  meta_data: any;
};

export type IProcessedDataForCSVExport = {
  id?: string; // UUID, optional for insert
  name: string;
  expiry_date: string;
  instrument: string;
  alert_on_slack?: boolean;
  previous_date: string;
  current_contracts: string;
  previous_contracts: string;
  change_in_oi: string;
  percentage_change_contracts: string;
  difference_in_contracts: string;
  occurrence_date: string | Date;
  created_at?: Date; // optional, defaulted to current timestamp
  buildup_type: string;
  intra_day_volatility: string;
  price_return_1d: string;
  range_to_price_ration: string;
  price_change: string;
  fut_spot_spread: string;
  fut_spot_spread_perc: string;
  volume_to_oi: string;
  volume_change_perc: string;
  absorption_score: string;
  previous_day_volume_change: string;
};

export type IFlattenedOccurrence = {
  name: string;
  expiry_date: string;
  instrument: string;
  occurrence_date: string; // date = FH_TIMESTAMP
  previous_date: string;
  current_contracts: string;
  previous_contracts: string;
  change_in_oi: string;
  percentage_change_contracts: string;
  difference_in_contracts: string;
};

export type IRawGroupedOccurrence = {
  symbol: string;
  expiryDate: string;
  instrument: string;
  occurrences: {
    date: string;
    previousDate: string;
    currentContracts: string;
    previousContracts: string;
    changeInOI: string;
    percentageChangeContracts: string;
    differenceInContracts: string;
    alertOnSlack: boolean;
    metaData: any;
  }[];
};
