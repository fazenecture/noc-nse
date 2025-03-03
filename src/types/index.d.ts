export type IFetchExpiryDatesServiceReqObj = {
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
};

export type IFetchStocksReqObj = {
  instrument: string;
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
  TIMESTAMP: string;
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
