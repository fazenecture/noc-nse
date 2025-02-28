export type IFetchExpiryDatesServiceReqObj = {
  symbol: string;
  instrument: string;
  year: number;
};

export type IFetchDataReqObj = {
  symbol: string;
  fromData: string;
  toDate: string;
  expiryDate: string;
  instrument: string;
};

export type IFetchStocksReqObj = {
  instrument: string;
};

export type IFetchOIDifferenceReqObj = {
  type: string;
  year: number;
};
