import moment from "moment";
import NSEDb from "../db/db";
import {
  IContractsData,
  IFlattenedOccurrence,
  IProcessedData,
  IRawGroupedOccurrence,
  ISymbolRawData,
} from "../types";
import axios from "axios";
export default class NSEHelper extends NSEDb {
  public checkCondition = (
    data: IContractsData[]
  ): { date: string; previousDate: string }[] => {
    const occurrences: any = [];

    for (let i = 1; i < data?.length; i++) {
      const current = data[i];
      const previous = data[i - 1];

      const currentContracts =
        parseFloat(current.FH_TOT_TRADED_QTY) /
        parseFloat(current.FH_MARKET_LOT);
      const previousContracts =
        parseFloat(previous.FH_TOT_TRADED_QTY) /
        parseFloat(previous.FH_MARKET_LOT);
      const changeInOI = parseFloat(current.FH_CHANGE_IN_OI);

      // Calculate percentage change in contracts
      const percentageChangeContracts = parseFloat(
        (
          ((currentContracts - previousContracts) / previousContracts) *
          100
        ).toFixed(2)
      );

      // Calculate absolute difference in contracts
      const differenceInContracts = currentContracts - previousContracts;

      if (currentContracts > 1.5 * previousContracts && changeInOI > 0) {
        occurrences.push({
          date: this.convertToDDMMYYYY(current.FH_TIMESTAMP),
          previousDate: this.convertToDDMMYYYY(previous.FH_TIMESTAMP),
          currentContracts,
          previousContracts,
          changeInOI,
          percentageChangeContracts,
          differenceInContracts,
        });
      }
    }

    return occurrences; // Return all occurrences
  };

  public formatDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  public getCookiesFromResponse = async (url: string) => {
    try {
      const response = await axios.get(url, {
        withCredentials: true, // Important for handling cookies
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Encoding": "gzip, deflate, br",
          "Accept-Language": "en-US,en;q=0.5",
          Referer: "https://www.nseindia.com",
          Connection: "keep-alive",
        },
      });

      const cookies = response.headers["set-cookie"];
      if (cookies) {
        const final = this.formatCookies(cookies);
        return final;
      } else {
        console.log("No cookies found in the response headers.");
      }
    } catch (error) {
      console.error("Error fetching cookies:", error);
    }
  };

  private formatCookies = (cookiesArray: string[]): string => {
    return cookiesArray.map((cookie) => cookie.split(";")[0]).join("; ");
  };

  public removeDuplicateContracts = (
    data: IContractsData[]
  ): IContractsData[] => {
    const seen = new Set<string>();
    const unique: IContractsData[] = [];

    for (const item of data) {
      const key = `${item.FH_EXPIRY_DT}-${item.FH_INSTRUMENT}-${item.FH_TIMESTAMP}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    }

    return unique;
  };

  public prepareUniqueRawData = (data: IContractsData[]): ISymbolRawData[] => {
    const seen = new Set<string>();
    const result: ISymbolRawData[] = [];

    for (const item of data) {
      const key = `${item.FH_EXPIRY_DT}-${item.FH_SYMBOL}-${item.FH_INSTRUMENT}-${item.FH_TIMESTAMP}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push({
          name: item.FH_SYMBOL,
          expiry_date: item.FH_EXPIRY_DT,
          instrument: item.FH_INSTRUMENT,
          option_type: item.FH_OPTION_TYPE,
          strike_price: item.FH_STRIKE_PRICE,
          symbol_timestamp: new Date(item.TIMESTAMP),
          change_in_oi: item.FH_CHANGE_IN_OI,
          closing_price: item.FH_CLOSING_PRICE,
          last_traded_price: item.FH_LAST_TRADED_PRICE,
          market_lot: item.FH_MARKET_LOT,
          market_type: item.FH_MARKET_TYPE,
          opening_price: item.FH_OPENING_PRICE,
          open_int: item.FH_OPEN_INT,
          prev_cls: item.FH_PREV_CLS,
          settle_price: item.FH_SETTLE_PRICE,
          fh_timestamp: item.FH_TIMESTAMP,
          tot_traded_qty: item.FH_TOT_TRADED_QTY,
          tot_traded_val: item.FH_TOT_TRADED_VAL,
          trade_low_price: item.FH_TRADE_LOW_PRICE,
          underlying_value: item.FH_UNDERLYING_VALUE
            ? String(item.FH_UNDERLYING_VALUE)
            : null,
          created_at: new Date(),
        });
      }
    }

    return result;
  };

  public buildRawDataInsertObjects = (
    data: IContractsData[]
  ): ISymbolRawData[] => {
    return data.map((item) => ({
      name: item.FH_SYMBOL,
      expiry_date: item.FH_EXPIRY_DT,
      instrument: item.FH_INSTRUMENT,
      option_type: item.FH_OPTION_TYPE,
      strike_price: item.FH_STRIKE_PRICE,
      symbol_timestamp: new Date(item.TIMESTAMP),
      change_in_oi: item.FH_CHANGE_IN_OI,
      closing_price: item.FH_CLOSING_PRICE,
      last_traded_price: item.FH_LAST_TRADED_PRICE,
      market_lot: item.FH_MARKET_LOT,
      market_type: item.FH_MARKET_TYPE,
      opening_price: item.FH_OPENING_PRICE,
      open_int: item.FH_OPEN_INT,
      prev_cls: item.FH_PREV_CLS,
      settle_price: item.FH_SETTLE_PRICE,
      fh_timestamp: item.FH_TIMESTAMP,
      tot_traded_qty: item.FH_TOT_TRADED_QTY,
      tot_traded_val: item.FH_TOT_TRADED_VAL,
      trade_low_price: item.FH_TRADE_LOW_PRICE,
      underlying_value: String(item.FH_UNDERLYING_VALUE),
      created_at: new Date(),
    }));
  };

  public flattenAndDeduplicateOccurrences = (
    data: IRawGroupedOccurrence[]
  ): IFlattenedOccurrence[] => {
    const seen = new Set<string>();
    const flatResults: IFlattenedOccurrence[] = [];

    for (const item of data) {
      const { symbol, expiryDate, instrument, occurrences } = item;

      for (const occ of occurrences) {
        const key = `${symbol}-${expiryDate}-${instrument}-${occ.date}`;

        if (!seen.has(key)) {
          seen.add(key);
          flatResults.push({
            name: symbol,
            expiry_date: expiryDate,
            instrument,
            occurrence_date: occ.date,
            previous_date: occ.previousDate,
            current_contracts: occ.currentContracts,
            previous_contracts: occ.previousContracts,
            change_in_oi: occ.changeInOI,
            percentage_change_contracts: occ.percentageChangeContracts,
            difference_in_contracts: occ.differenceInContracts,
          });
        }
      }
    }

    return flatResults;
  };

  public flattenAndDeduplicateOccurrencesForDB = (
    data: IRawGroupedOccurrence[]
  ): IProcessedData[] => {
    const seen = new Set<string>();
    const flatResults: IProcessedData[] = [];

    for (const item of data) {
      const { symbol, expiryDate, instrument, occurrences } = item;

      for (const occ of occurrences) {
        const key = `${symbol}-${expiryDate}-${instrument}-${occ.date}`;

        if (!seen.has(key)) {
          seen.add(key);
          flatResults.push({
            name: symbol,
            expiry_date: expiryDate,
            instrument,
            occurrence_date: occ.date,
            previous_date: occ.previousDate,
            current_contracts: occ.currentContracts,
            previous_contracts: occ.previousContracts,
            change_in_oi: occ.changeInOI,
            percentage_change_contracts: occ.percentageChangeContracts,
            difference_in_contracts: occ.differenceInContracts,
          });
        }
      }
    }

    return flatResults;
  };

  public convertToDDMMYYYY = (dateStr: string): string => {
    return moment(dateStr, "DD-MMM-YYYY").format("DD-MM-YYYY");
  };

  public chunkArray = <T>(array: T[], size: number): T[][] => {
    const result: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      result.push(array.slice(i, i + size));
    }
    return result;
  };

  private _CONCURRENCY = 500;

  public runChunkedParallel = async (
    chunks: any[][],
    handler: (chunk: any[]) => Promise<any>
  ) => {
    for (let i = 0; i < chunks.length; i += this._CONCURRENCY) {
      const group = chunks.slice(i, i + this._CONCURRENCY);
      await Promise.all(group.map(handler));
    }
  };
}
