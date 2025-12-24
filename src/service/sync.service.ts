import moment from "moment";
import { symbols, URLS } from "../constants/nse";
import NSEDb from "../db/db";
import NSEHelper from "../helper/helper";
import { INSTRUMENTS, SYNC_TYPE } from "../types/enums";
import ErrorHandler from "../utils/error.handler";
import NSEService from "./service";
import { IContractsData } from "../types";
import { alertSlack } from "../utils/slack.utils";
import fs from "fs";

export default class NSESyncService {
  nseDb: NSEDb;
  nseService: NSEService;
  errorSymbols: any[];
  cookies: string | null;
  nseHelper: NSEHelper;

  constructor() {
    this.nseDb = new NSEDb();
    this.nseService = new NSEService();
    this.nseHelper = new NSEHelper();
    this.errorSymbols = [];
    this.cookies = null;
  }

  private readonly errorMessage = (err) =>
    `:rotating_light: *Cron Failure* at ${new Date().toLocaleString()}\n\`\`\`${
      err.stack || err.message
    }\`\`\``;

  public init = async (sync_type: SYNC_TYPE) => {
    /**
     * sync_type -> full_sync & daily_sync
     */

    console.log("sync_type: ", sync_type);
    try {
      if (sync_type === SYNC_TYPE.DAILY_SYNC) {
        await this.dailySyncCRONExecution();
      } else if (sync_type === SYNC_TYPE.FULL_SYNC) {
        await this.fullSyncExecution();
      }
    } catch (err) {
      console.log("❌ err: ", err);
      await alertSlack(this.errorMessage(err));
    }
  };

  public fullSyncExecution = async () => {
    const { processed_data, raw_data } = await this.fullSyncDataBuild();
    const CHUNK_SIZE = 500;

    const processedChunks = this.nseService.chunkArray(
      processed_data,
      CHUNK_SIZE
    );
    const rawChunks = this.nseService.chunkArray(raw_data, CHUNK_SIZE);

    // await this.nseService.runChunkedParallel(
    //   processedChunks,
    //   this.nseService.insertProcessedDataDb
    // );
    // await this.nseService.runChunkedParallel(
    //   rawChunks,
    //   this.nseService.insertSymbolRawDataDb
    // );
  };

  public dailySyncExecution = async () => {
    const today = new Date();
    const day = today.getDay();

    // if (day === 0 || day === 6) {
    //   console.log("🛑 Today is a weekend. Skipping sync.");
    //   return {
    //     message: "🛑 Today is a weekend. Skipping sync.",
    //   };
    // }

    const { processed_data, raw_data, alert_data } =
      await this.dailySyncDataBuild();
    const CHUNK_SIZE = 500;

    const processedChunks = this.nseService.chunkArray(
      processed_data,
      CHUNK_SIZE
    );

    const rawChunks = this.nseService.chunkArray(raw_data, CHUNK_SIZE);

    await this.nseService.runChunkedParallel(
      processedChunks,
      this.nseService.insertProcessedDataDb
    );
    await this.nseService.runChunkedParallel(
      rawChunks,
      this.nseService.insertSymbolRawDataDb
    );

    await this.nseService.sendSlackAlert(alert_data);

    return {
      message: "✅ Data sync completed successfully!",
      processed_data,
    };
  };

  public dailySyncCRONExecution = async () => {
    const today = new Date();
    const day = today.getDay();

    if (day === 0 || day === 6) {
      console.log("🛑 Today is a weekend. Skipping sync.");
      return {
        message: "🛑 Today is a weekend. Skipping sync.",
      };
    }

    const { processed_data, raw_data, alert_data } =
      await this.dailySyncDataBuild();
    const CHUNK_SIZE = 500;

    const processedChunks = this.nseService.chunkArray(
      processed_data,
      CHUNK_SIZE
    );

    console.log("processedChunks: ", processedChunks?.length);
    const rawChunks = this.nseService.chunkArray(raw_data, CHUNK_SIZE);

    if (processed_data.length) {
      await this.nseService.runChunkedParallel(
        processedChunks,
        this.nseService.insertProcessedDataDb
      );
    }

    if (raw_data.length) {
      await this.nseService.runChunkedParallel(
        rawChunks,
        this.nseService.insertSymbolRawDataDb
      );
    }

    
    if (alert_data.length > 0) {
      console.log("🐥 Sending Slack Alert!");
      await this.nseService.sendSlackAlert(alert_data);
      console.log("🐥 Sended Slack Alert!");
    }
    

    return {
      message: "✅ Data sync completed successfully!",
      processed_data,
    };
  };

  protected fullSyncDataBuild = async () => {
    const results: any = [];
    const rawData: any = [];
    this.cookies = null;

    const dateNow = new Date();
    const year = moment().year();
    const type = "stocks";

    const date1DayAgo = new Date(dateNow);
    date1DayAgo.setDate(dateNow.getDate() - 1);

    const date1WeekAgo = new Date(dateNow);
    date1WeekAgo.setDate(dateNow.getDate() - 7);

    const date1MonthAgo = new Date(dateNow);
    date1MonthAgo.setMonth(dateNow.getMonth() - 1);

    let selectedSymbol = symbols;
    let instrument = INSTRUMENTS.INDEX_FUTURE;

    const cookie = await this.nseService.getCookiesFromResponse(
      URLS.NSE_WEBSITE
    );
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
      const stocksData = await this.nseService.fetchStocksService({
        instrument,
        cookie: this.cookies,
      });
      selectedSymbol = stocksData;
    }

    let counter = 0;

    for (const symbol of selectedSymbol) {
      console.log("symbol: ", symbol);

      if (counter % 25 === 0) {
        const reFetchedCookies = await this.nseService.getCookiesFromResponse(
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

      const expiryDates = await this.nseService.fetchExpiryDatesService({
        symbol,
        instrument,
        year,
        cookie: this.cookies,
      }); // Fetch expiry dates for the symbol

      for (const expiryDate of expiryDates) {
        const data1Day = await this.nseService.fetchDataService({
          symbol,
          fromDate: this.nseService.formatDate(date1DayAgo),
          toDate: this.nseService.formatDate(dateNow),
          expiryDate,
          instrument,
          cookie: this.cookies,
        });
        const data1Week = await this.nseService.fetchDataService({
          symbol,
          fromDate: this.nseService.formatDate(date1WeekAgo),
          toDate: this.nseService.formatDate(dateNow),
          expiryDate,
          instrument,
          cookie: this.cookies,
        });
        const data1Month = await this.nseService.fetchDataService({
          symbol,
          fromDate: this.nseService.formatDate(date1MonthAgo),
          toDate: this.nseService.formatDate(dateNow),
          expiryDate,
          instrument,
          cookie: this.cookies,
        });

        rawData.push(...data1Day);
        rawData.push(...data1Week);
        rawData.push(...data1Month);

        const dayOccurrences = this.nseService.checkCondition(data1Day);
        if (dayOccurrences.length > 0) {
          results.past1day.push({
            symbol,
            instrument,
            expiryDate: this.nseHelper.convertToDDMMYYYY(expiryDate),
            occurrences: dayOccurrences,
          });
        }

        const weekOccurrences = this.nseService.checkCondition(data1Week);
        if (weekOccurrences.length > 0) {
          results.push({
            symbol,
            instrument,
            expiryDate: this.nseHelper.convertToDDMMYYYY(expiryDate),
            occurrences: weekOccurrences,
          });
        }

        const monthOccurrences = this.nseService.checkCondition(data1Month);

        if (monthOccurrences.length > 0) {
          results.push({
            symbol,
            instrument,
            expiryDate: this.nseHelper.convertToDDMMYYYY(expiryDate),
            occurrences: monthOccurrences,
          });
        }
      }

      counter += 1;
    }

    const processedData =
      this.nseHelper.flattenAndDeduplicateOccurrencesForDB(results);
    const rawDataFinal = this.nseHelper.prepareUniqueRawData(rawData);

    return {
      processed_data: processedData,
      raw_data: rawDataFinal,
    };
  };

  protected dailySyncDataBuild = async () => {
    const results: any = [];
    const rawData: any = [];
    this.cookies = null;

    const dateNow = new Date();
    const year = moment().year();
    const type = "stocks";

    const date1DayAgo = new Date(dateNow);
    date1DayAgo.setDate(dateNow.getDate() - 1);

    const date1WeekAgo = new Date(dateNow);
    date1WeekAgo.setDate(dateNow.getDate() - 7);

    let selectedSymbol = symbols;
    let instrument = INSTRUMENTS.INDEX_FUTURE;

    const cookie = await this.nseService.getCookiesFromResponse(
      URLS.NSE_WEBSITE
    );

    if (!cookie?.length || cookie === undefined) {
      throw new ErrorHandler({
        message: "Error Getting the Cookies",
        status_code: 400,
      });
    }
    this.cookies = cookie;

    if (type === "stocks") {
      instrument = INSTRUMENTS.STOCK_FUTURE;
      const stocksData = await this.nseService.fetchStocksService({
        instrument,
        cookie: this.cookies,
      });
      selectedSymbol = stocksData;
    }

    let counter = 0;

    for (const symbol of selectedSymbol) {
      if (counter % 25 === 0) {
        const reFetchedCookies = await this.nseService.getCookiesFromResponse(
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

      let expiryDates = await this.nseService.fetchExpiryDatesService({
        symbol,
        instrument,
        year,
        cookie: this.cookies,
      }); // Fetch expiry dates for the symbol

      // if the current month is December, also fetch next year expiry dates
      if (moment().month() === 11) {
        const nextYearExpiryDates = await this.nseService.fetchExpiryDatesService({
          symbol,
          instrument,
          year: year + 1,
          cookie: this.cookies,
        }); // Fetch next year expiry dates for the symbol
  
        expiryDates = [...expiryDates, ...nextYearExpiryDates];
      }

      expiryDates = this.getFutureExpiryDates(expiryDates);

      for (const expiryDate of expiryDates) {
        const data1Day = await this.nseService.fetchDataService({
          symbol,
          fromDate: this.nseService.formatDate(date1DayAgo),
          toDate: this.nseService.formatDate(dateNow),
          expiryDate,
          instrument,
          cookie: this.cookies,
        });

        const data1Week = await this.nseService.fetchDataService({
          symbol,
          fromDate: this.nseService.formatDate(date1WeekAgo),
          toDate: this.nseService.formatDate(dateNow),
          expiryDate,
          instrument,
          cookie: this.cookies,
        });

        const filter1WeekData = this.getFilteredContracts(data1Week);
        console.log("filter1WeekData: ", filter1WeekData);

        rawData.push(...data1Day);

        const dayOccurrences = this.nseService.checkCondition(filter1WeekData);
        console.log("dayOccurrences: ", dayOccurrences);
        if (dayOccurrences.length > 0) {
          results.push({
            symbol,
            instrument,
            expiryDate: this.nseHelper.convertToDDMMYYYY(expiryDate),
            occurrences: dayOccurrences,
          });
        }
      }

      counter += 1;
    }

    const processedData =
      this.nseHelper.flattenAndDeduplicateOccurrencesForDB(results);
    const dataForAlert =
      this.nseHelper.flattenAndDeduplicateOccurrencesForAlert(results);

    // const dataForCSVExport =
    //   this.nseHelper.flattenAndDeduplicateOccurrencesForCSVExport(results);

    
    // fs.writeFileSync(
    //   `daily_sync_data_for_csv_export_${moment().format("YYYYMMDD")}.json`,
    //   JSON.stringify(dataForCSVExport, null, 2)
    // );

    // this.exportDataToCSV(
    //   dataForCSVExport,
    //   `daily_sync_data_for_csv_export_${moment().format("YYYYMMDD")}.csv`
    // );

    const rawDataFinal = this.nseHelper.prepareUniqueRawData(rawData);

    const metaData = {
      total_symbols_processed: selectedSymbol.length,
      total_processed_records: processedData.length,
      total_raw_records: rawDataFinal.length,
      total_alerts_generated: dataForAlert.length,
      timestamp: new Date().toISOString(),
    };

    console.log("📝 Daily Sync Metadata: ", metaData);

    return {
      processed_data: processedData,
      raw_data: rawDataFinal,
      alert_data: dataForAlert,
    };
  };

  public getFilteredContracts = (data: IContractsData[]): IContractsData[] => {
    if (!data || data.length === 0) return [];

    // Step 1: Sort by FH_TIMESTAMP in descending order
    const sortedDesc = [...data].sort((a, b) => {
      return (
        moment(b.FH_TIMESTAMP, "DD-MMM-YYYY").valueOf() -
        moment(a.FH_TIMESTAMP, "DD-MMM-YYYY").valueOf()
      );
    });

    // const latestDate = moment(sortedDesc[0].FH_TIMESTAMP, "DD-MMM-YYYY").format(
    //   "DD-MMM-YYYY"
    // );
    // const todayDate = moment().format("DD-MMM-YYYY");

    let result: IContractsData[] = [];

    // if (latestDate === todayDate) {
    result = sortedDesc.slice(0, 2);
    // } else {
    //   result = [sortedDesc[0]];
    // }

    // Step 2: Sort selected items in ascending order before returning
    return result.sort((a, b) => {
      return (
        moment(a.FH_TIMESTAMP, "DD-MMM-YYYY").valueOf() -
        moment(b.FH_TIMESTAMP, "DD-MMM-YYYY").valueOf()
      );
    });
  };

  private exportDataToCSV = (data: any[], filename: string) => {
    const header = Object.keys(data[0]).join(",") + "\n";
    const rows = data
      .map((row) => Object.values(row).join(","))
      .join("\n");
    const csvContent = header + rows;

    fs.writeFileSync(filename, csvContent);
    console.log(`Data exported to ${filename}`);
  };

  public getFutureExpiryDates = (dates: string[]): string[] => {
    const today = moment().startOf("day");

    return dates.filter((dateStr) => {
      const date = moment(dateStr, "DD-MMM-YYYY");
      return date.isSameOrAfter(today);
    });
  };
}
