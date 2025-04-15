import axios from "axios";
import {
  IFetchDataReqObj,
  IFetchExpiryDatesServiceReqObj,
  IFetchOIDifferenceReqObj,
  IFetchStocksReqObj,
} from "../types";
import { API_CONFIG, symbols, URLS } from "../constants/nse";
import { INSTRUMENTS, METHODS } from "../types/enums";
import NSEHelper from "../helper/helper";
import ErrorHandler from "../utils/error.handler";

export default class NSEService extends NSEHelper {
  errorSymbols: any[];
  cookies: string | null;

  constructor() {
    super();
    this.errorSymbols = [];
    this.cookies = null;
  }

  public fetchOIDifferenceService = async (
    reqObj: IFetchOIDifferenceReqObj
  ) => {
    const results: any = [];
    this.errorSymbols = [];
    this.cookies = null;

    const dateNow = new Date();
    const { year, type } = reqObj;

    const date1DayAgo = new Date(dateNow);
    date1DayAgo.setDate(dateNow.getDate() - 1);

    const date1WeekAgo = new Date(dateNow);
    date1WeekAgo.setDate(dateNow.getDate() - 7);

    const date1MonthAgo = new Date(dateNow);
    date1MonthAgo.setMonth(dateNow.getMonth() - 1);

    let selectedSymbol = symbols;
    let instrument = INSTRUMENTS.INDEX_FUTURE;

    const cookie = await this.getCookiesFromResponse(URLS.NSE_WEBSITE);
    console.log("cookie: ", cookie);

    if (!cookie?.length || cookie === undefined) {
      throw new ErrorHandler({
        message: "Error Getting the Cookies",
        status_code: 400,
      });
    }
    this.cookies = cookie;

    if (type === "stocks") {
      instrument = INSTRUMENTS.STOCK_FUTURE;
      const stocksData = await this.fetchStocksService({
        instrument,
        cookie: this.cookies,
      });
      selectedSymbol = stocksData;
    }

    let counter = 0;
    console.log(
      "selectedSymbol.splice(0, 10): ",
      selectedSymbol?.splice(0, 10)
    );
    for (const symbol of selectedSymbol.splice(0, 10)) {
      console.log("symbol: ", symbol);

      if (counter % 25 === 0) {
        const reFetchedCookies = await this.getCookiesFromResponse(
          URLS.NSE_WEBSITE
        );

        if (!reFetchedCookies?.length || reFetchedCookies === undefined) {
          throw new ErrorHandler({
            message: "Error Getting the Cookies",
            status_code: 400,
          });
        }

        this.cookies = reFetchedCookies;
        console.log("reFetchedCookies: ", reFetchedCookies);
        console.log("Refetched Cookies & Waiting...");
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }

      const expiryDates = await this.fetchExpiryDatesService({
        symbol,
        instrument,
        year,
        cookie: this.cookies,
      }); // Fetch expiry dates for the symbol

      for (const expiryDate of expiryDates) {
        const data1Day = await this.fetchDataService({
          symbol,
          fromDate: this.formatDate(date1DayAgo),
          toDate: this.formatDate(dateNow),
          expiryDate,
          instrument,
          cookie: this.cookies,
        });
        const data1Week = await this.fetchDataService({
          symbol,
          fromDate: this.formatDate(date1WeekAgo),
          toDate: this.formatDate(dateNow),
          expiryDate,
          instrument,
          cookie: this.cookies,
        });
        const data1Month = await this.fetchDataService({
          symbol,
          fromDate: this.formatDate(date1MonthAgo),
          toDate: this.formatDate(dateNow),
          expiryDate,
          instrument,
          cookie: this.cookies,
        });

        const dayOccurrences = this.checkCondition(data1Day);
        if (dayOccurrences.length > 0) {
          results.push({
            symbol,
            expiryDate: this.convertToDDMMYYYY(expiryDate),
            occurrences: dayOccurrences,
          });
        }

        const weekOccurrences = this.checkCondition(data1Week);
        if (weekOccurrences.length > 0) {
          results.push({
            symbol,
            expiryDate: this.convertToDDMMYYYY(expiryDate),
            occurrences: weekOccurrences,
          });
        }

        const monthOccurrences = this.checkCondition(data1Month);

        if (monthOccurrences.length > 0) {
          results.push({
            symbol,
            expiryDate: this.convertToDDMMYYYY(expiryDate),
            occurrences: monthOccurrences,
          });
        }
      }

      counter += 1;
    }

    return this.flattenAndDeduplicateOccurrences(results);
  };

  public fetchExpiryDatesService = async (
    obj: IFetchExpiryDatesServiceReqObj
  ): Promise<any> => {
    try {
      const { symbol, instrument, year, cookie } = obj;
      const url = URLS.EXPIRY_DATES({
        symbol,
        instrument,
        year,
      });

      const config = {
        method: METHODS.GET,
        url,
        headers: {
          ...API_CONFIG.HEADERS,
          cookie,
        },
      };

      const response = await axios.request(config);
      return response.data.expiresDts ?? [];
    } catch (error) {
      console.log("error: ", error);
    }
  };

  public fetchDataService = async (obj: IFetchDataReqObj) => {
    try {
      const { symbol, fromDate, toDate, expiryDate, instrument, cookie } = obj;

      const url = URLS.FO_CPV({
        symbol,
        fromDate,
        toDate,
        expiryDate,
        instrument,
        cookie,
      });

      const config = {
        method: METHODS.GET,
        url,
        maxBodyLength: Infinity,
        headers: {
          ...API_CONFIG.HEADERS,
          cookie,
        },
      };

      const response = await axios.request(config);
      return response?.data?.data ?? [];
    } catch (error) {
      console.log("error: ", error);
    }
  };

  public fetchStocksService = async (obj: IFetchStocksReqObj) => {
    try {
      const { instrument, cookie } = obj;

      const url = URLS.FO_CPV_META_SYMBOL(instrument);

      const config = {
        method: METHODS.GET,
        url,
        maxBodyLength: Infinity,
        headers: {
          ...API_CONFIG.HEADERS,
          cookie,
        },
      };

      const response = await axios.request(config);
      return response.data.symbols;
    } catch (error) {
      console.log("error: ", error);
    }
  };
}
