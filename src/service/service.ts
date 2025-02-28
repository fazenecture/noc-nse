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

export default class NSEService extends NSEHelper {
  public fetchOIDifferenceService = async (
    reqObj: IFetchOIDifferenceReqObj
  ) => {
    const results: any = {
      past1day: [],
      past1week: [],
      past1month: [],
    };

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
    if (type === "stocks") {
      const stocksData = await this.fetchStocksService({ instrument });
      selectedSymbol = stocksData;
      instrument = INSTRUMENTS.STOCK_FUTURE;
    }

    for (const symbol of selectedSymbol) {
      const expiryDates = await this.fetchExpiryDatesService({
        symbol,
        instrument,
        year,
      }); // Fetch expiry dates for the symbol

      for (const expiryDate of expiryDates) {
        const data1Day = await this.fetchDataService({
          symbol,
          fromDate: this.formatDate(date1DayAgo),
          toDate: this.formatDate(dateNow),
          expiryDate,
          instrument,
        });
        const data1Week = await this.fetchDataService({
          symbol,
          fromDate: this.formatDate(date1WeekAgo),
          toDate: this.formatDate(dateNow),
          expiryDate,
          instrument,
        });
        const data1Month = await this.fetchDataService({
          symbol,
          fromDate: this.formatDate(date1MonthAgo),
          toDate: this.formatDate(dateNow),
          expiryDate,
          instrument,
        });

        const dayOccurrences = this.checkCondition(data1Day);
        if (dayOccurrences.length > 0) {
          results.past1day.push({
            symbol,
            expiryDate,
            occurrences: dayOccurrences,
          });
        }

        const weekOccurrences = this.checkCondition(data1Week);
        if (weekOccurrences.length > 0) {
          results.past1week.push({
            symbol,
            expiryDate,
            occurrences: weekOccurrences,
          });
        }

        const monthOccurrences = this.checkCondition(data1Month);

        if (monthOccurrences.length > 0) {
          results.past1month.push({
            symbol,
            expiryDate,
            occurrences: monthOccurrences,
          });
        }
      }
    }

    return results;
  };

  public fetchExpiryDatesService = async (
    obj: IFetchExpiryDatesServiceReqObj
  ): Promise<string[]> => {
    const { symbol, instrument, year } = obj;
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
        cookie: API_CONFIG.COOKIE,
      },
    };

    const response = await axios.request(config);
    return response.data.expiresDts ?? [];
  };

  public fetchDataService = async (obj: IFetchDataReqObj) => {
    const { symbol, fromDate, toDate, expiryDate, instrument } = obj;

    const url = URLS.FO_CPV({
      symbol,
      fromDate,
      toDate,
      expiryDate,
      instrument,
    });

    const config = {
      method: METHODS.GET,
      url,
      maxBodyLength: Infinity,
      headers: {
        ...API_CONFIG.HEADERS,
        cookie: API_CONFIG.COOKIE,
      },
    };

    const response = await axios.request(config);
    return response?.data?.data ?? [];
  };

  public fetchStocksService = async (obj: IFetchStocksReqObj) => {
    const { instrument } = obj;

    const url = URLS.FO_CPV_META_SYMBOL(instrument);

    const config = {
      method: METHODS.GET,
      url,
      maxBodyLength: Infinity,
      headers: {
        ...API_CONFIG.HEADERS,
        cookie: API_CONFIG.COOKIE,
      },
    };

    const response = await axios.request(config);
    return response.data.symbols;
  };
}
