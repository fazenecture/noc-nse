import moment from "moment";
import NSEDb from "../db/db";
// import puppeteer from "puppeteer";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { HttpsProxyAgent } from "https-proxy-agent";

puppeteer.use(StealthPlugin());

import {
  IContractsData,
  IFlattenedOccurrence,
  IProcessedData,
  IProcessedDataForCSVExport,
  IRawGroupedOccurrence,
  ISymbolRawData,
} from "../types";
import axios from "axios";
import { BUILDUP_TYPE } from "../types/enums";
import { fetchNSECookiesWithProxyRetries } from "../utils/proxy.utils";
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

      const currentPrice = parseFloat(current.FH_LAST_TRADED_PRICE);
      const previousPrice = parseFloat(previous.FH_LAST_TRADED_PRICE);

      const priceChange = currentPrice - previousPrice;
      const oiChange = changeInOI;

      let buildupType: BUILDUP_TYPE = BUILDUP_TYPE.INDECISIVE;

      if (priceChange > 0 && oiChange > 0) {
        buildupType = BUILDUP_TYPE.LONG_BUILDUP;
      } else if (priceChange < 0 && oiChange > 0) {
        buildupType = BUILDUP_TYPE.SHORT_BUILDUP;
      } else if (priceChange > 0 && oiChange < 0) {
        buildupType = BUILDUP_TYPE.SHORT_COVERING;
      } else if (priceChange < 0 && oiChange < 0) {
        buildupType = BUILDUP_TYPE.LONG_UNWINDING;
      }

      // Calculate percentage change in contracts
      const percentageChangeContracts = parseFloat(
        (
          ((currentContracts - previousContracts) / previousContracts) *
          100
        ).toFixed(2)
      );

      // Calculate absolute difference in contracts
      const differenceInContracts = currentContracts - previousContracts;

      // IntraDay Volatility
      const intraDayVolatility =
        (parseFloat(current.FH_TRADE_HIGH_PRICE) -
          parseFloat(current.FH_TRADE_LOW_PRICE)) /
        parseFloat(current.FH_OPENING_PRICE);

      const priceReturn1D =
        (parseFloat(current.FH_CLOSING_PRICE) -
          parseFloat(current.FH_PREV_CLS)) /
        parseFloat(current.FH_PREV_CLS);

      const rangeToPriceRation =
        (parseFloat(current.FH_TRADE_HIGH_PRICE) -
          parseFloat(current.FH_TRADE_LOW_PRICE)) /
        parseFloat(current.FH_CLOSING_PRICE);

      const priceChangeAbs =
        parseFloat(current.FH_LAST_TRADED_PRICE) -
        parseFloat(previous.FH_LAST_TRADED_PRICE);

      const futSpotSpread =
        parseFloat(current.FH_CLOSING_PRICE) - current.FH_UNDERLYING_VALUE;

      const futSpotSpreadPerc =
        (futSpotSpread / current.FH_UNDERLYING_VALUE) * 100;

      const volumeToOI =
        parseFloat(current.FH_TOT_TRADED_QTY) /
        (Math.abs(parseFloat(current.FH_OPEN_INT)) || 1);

      const volumeChangePerc =
        (parseFloat(current.FH_TOT_TRADED_QTY) -
          parseFloat(previous.FH_TOT_TRADED_QTY)) /
        (Math.abs(parseFloat(previous.FH_TOT_TRADED_QTY)) || 1);

      const volumeChangePrevDay =
        parseFloat(current.FH_TOT_TRADED_QTY) /
        parseFloat(previous.FH_TOT_TRADED_QTY);

      const absorptionScore = volumeChangePerc * (1 - Math.abs(priceReturn1D));

      let alertOnSlack = false;
      if (currentContracts > 1.5 * previousContracts && changeInOI > 0) {
        alertOnSlack = true;
      }

      occurrences.push({
        date: this.convertToDDMMYYYY(current.FH_TIMESTAMP),
        previousDate: this.convertToDDMMYYYY(previous.FH_TIMESTAMP),
        currentContracts,
        previousContracts,
        changeInOI,
        percentageChangeContracts,
        differenceInContracts,
        alertOnSlack,
        metaData: {
          buildup_type: buildupType,
          intraDayVolatility: intraDayVolatility.toFixed(3),
          priceReturn1D: priceReturn1D.toFixed(3),
          rangeToPriceRation: rangeToPriceRation.toFixed(3),
          priceChange: priceChangeAbs.toFixed(3),
          futSpotSpread: futSpotSpread.toFixed(3),
          futSpotSpreadPerc: futSpotSpreadPerc.toFixed(3),
          volumeToOI: volumeToOI.toFixed(3),
          volumeChangePerc: volumeChangePerc.toFixed(3),
          absorptionScore: absorptionScore.toFixed(3),
          previousDayVolumeChange: volumeChangePrevDay.toFixed(3),
        },
      });
    }

    return occurrences; // Return all occurrences
  };

  public formatDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // public getCookiesFromResponse = async (url: string) => {
  //   try {
  //     const response = await axios.get(url, {
  //       withCredentials: true, // Important for handling cookies
  //       headers: {
  //         "User-Agent":
  //           "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  //         Accept:
  //           "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  //         "Accept-Encoding": "gzip, deflate, br",
  //         "Accept-Language": "en-US,en;q=0.5",
  //         Referer: "https://www.nseindia.com",
  //         Connection: "keep-alive",
  //       },
  //     });

  //     const cookies = response.headers["set-cookie"];
  //     if (cookies) {
  //       const final = this.formatCookies(cookies);
  //       return final;
  //     } else {
  //       console.log("No cookies found in the response headers.");
  //     }
  //   } catch (error) {
  //     console.error("Error fetching cookies:", error);
  //   }
  // };

  // public getCookiesFromResponse = async (url: string): Promise<string> => {
  //   let browser;

  //   console.log("process.env.PROXY_HOST: ", process.env.PROXY_HOST);
  //   const proxy =
  //     process.env.PROXY_HOST && process.env.PROXY_PORT
  //       ? `http://${process.env.PROXY_HOST}:${process.env.PROXY_PORT}`
  //       : null;

  //   const launchArgs = ["--no-sandbox", "--disable-setuid-sandbox"];
  //   if (proxy) launchArgs.unshift(`--proxy-server=${proxy}`);

  //   try {
  //     browser = await puppeteer.launch({
  //       executablePath: "/usr/bin/chromium-browser",
  //       headless: true,
  //       args: launchArgs,
  //     });

  //     const page = await browser.newPage();

  //     // Authenticate with proxy if needed
  //     if (proxy && process.env.PROXY_USERNAME && process.env.PROXY_PASSWORD) {
  //       await page.authenticate({
  //         username: process.env.PROXY_USERNAME,
  //         password: process.env.PROXY_PASSWORD,
  //       });
  //     }

  //     // Set user agent and viewport
  //     await page.setUserAgent(
  //       "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  //     );
  //     await page.setViewport({ width: 1366, height: 768 });
  //     page.setDefaultNavigationTimeout(45000);

  //     // Intercept requests/responses for debugging
  //     await page.setRequestInterception(true);
  //     // page.on("request", (req) => {
  //     //   console.log("➡️ Requested:", req.url());
  //     //   req.continue();
  //     // });
  //     // page.on("response", (res) => {
  //     //   console.log("⬅️ Response:", res.url(), res.status());
  //     // });

  //     // Navigate to homepage first
  //     console.log("🔁 Visiting NSE Homepage...");
  //     await page.goto("https://www.nseindia.com", {
  //       waitUntil: "networkidle2",
  //       timeout: 45000,
  //     });

  //     console.log("📄 Navigating to target report page...");
  //     await page.goto(url, {
  //       waitUntil: "domcontentloaded", // ← faster
  //       timeout: 60000, // ← more tolerant
  //     });

  //     await page.evaluate(() => window.scrollBy(0, 300));
  //     await new Promise((resolve) => setTimeout(resolve, 8000));

  //     // Get browser and JS cookies
  //     const browserCookies = await page.cookies();
  //     const documentCookie = await page.evaluate(() => document.cookie);

  //     const cookieString = browserCookies
  //       .map((c) => `${c.name}=${c.value}`)
  //       .join("; ");

  //     // Logs
  //     console.log(
  //       "✅ Non-HttpOnly Cookies:",
  //       browserCookies.map((c) => c.name)
  //     );
  //     console.log(
  //       "✅ JS-accessible Cookies (document.cookie):",
  //       documentCookie
  //     );
  //     console.log("✅ Final Cookie String for Requests:", cookieString);

  //     await browser.close();
  //     return cookieString;
  //   } catch (error) {
  //     console.error("❌ Puppeteer error:", error);
  //     if (browser) await browser.close();
  //     return "";
  //   }
  // };

  // public getCookiesFromResponse = async (
  //   url: string
  // ): Promise<string | undefined> => {
  //   try {
  //     const proxyAuth = `${process.env.PROXY_USERNAME}:${process.env.PROXY_PASSWORD}`;
  //     const proxyUrl = `https://${proxyAuth}@${process.env.PROXY_HOST}:${process.env.PROXY_PORT}`;
  //     const httpsAgent = new HttpsProxyAgent(proxyUrl);

  //     const response = await axios.get(url, {
  //       httpsAgent,
  //       withCredentials: true,
  //       headers: {
  //         "User-Agent":
  //           "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  //         Accept:
  //           "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  //         "Accept-Encoding": "gzip, deflate, br",
  //         "Accept-Language": "en-US,en;q=0.5",
  //         Referer: "https://www.nseindia.com",
  //         Connection: "keep-alive",
  //       },
  //     });

  //     const cookies = response.headers["set-cookie"];
  //     if (cookies && cookies.length) {
  //       const final = this.formatCookies(cookies);
  //       console.log("✅ Set-Cookie Headers:", cookies);
  //       console.log("✅ Final Cookie String:", final);
  //       return final;
  //     } else {
  //       console.warn("⚠️ No cookies found in response headers.");
  //       return undefined;
  //     }
  //   } catch (error: any) {
  //     console.error("❌ Error fetching cookies:", error.message || error);
  //     return undefined;
  //   }
  // };

  // public getCookiesFromResponse = async (
  //   url: string
  // ): Promise<string | undefined> => {
  //   const maxRetries = 3; // total attempts
  //   const baseDelay = 1000; // 1s initial back-off
  //   const proxyAuth = `${process.env.PROXY_USERNAME}:${process.env.PROXY_PASSWORD}`;
  //   const proxyUrl = `https://${proxyAuth}@${process.env.PROXY_HOST}:${process.env.PROXY_PORT}`;
  //   const httpsAgent = new HttpsProxyAgent(proxyUrl);

  //   for (let attempt = 1; attempt <= maxRetries; attempt++) {
  //     try {
  //       const response = await axios.get(url, {
  //         httpsAgent,
  //         withCredentials: true,
  //         headers: {
  //           "User-Agent":
  //             "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  //           Accept:
  //             "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  //           "Accept-Encoding": "gzip, deflate, br",
  //           "Accept-Language": "en-US,en;q=0.5",
  //           Referer: "https://www.nseindia.com",
  //           Connection: "keep-alive",
  //         },
  //       });

  //       const cookies = response.headers["set-cookie"];
  //       if (cookies && cookies.length) {
  //         const final = this.formatCookies(cookies);
  //         console.log("✅ Set-Cookie Headers:", cookies);
  //         console.log("✅ Final Cookie String:", final);
  //         return final;
  //       } else {
  //         console.warn("⚠️ No cookies found in response headers.");
  //         return undefined;
  //       }
  //     } catch (error: any) {
  //       const isLast = attempt === maxRetries;
  //       console.error(
  //         `❌ [Attempt ${attempt}/${maxRetries}] Error fetching cookies:`,
  //         error.response?.status,
  //         error.message
  //       );

  //       if (isLast) {
  //         console.error("💥 All retries failed.");
  //         return undefined;
  //       }

  //       // exponential back-off: 1s, 2s, 4s…
  //       const delay = baseDelay * Math.pow(2, attempt - 1);
  //       console.log(`⏳ Retrying in ${delay}ms…`);
  //       await this.sleep(delay);
  //     }
  //   }

  //   return undefined;
  // };

  public async getCookiesFromResponse(
    url: string
  ): Promise<string | undefined> {
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetchNSECookiesWithProxyRetries(url);
        const cookies = response.headers["set-cookie"];

        if (cookies?.length) {
          const final = this.formatCookies(cookies);
          console.log("✅ Cookies fetched:", final);
          return final;
        }

        console.warn(`⚠️ Attempt ${attempt}: No cookies returned`);
      } catch (err: any) {
        console.warn(`💥 Attempt ${attempt} failed:`, err?.message || err);
      }

      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`⏳ Retrying in ${delay}ms...`);
        await this.sleep(delay);
      }
    }

    console.error("❌ Max retries reached. Giving up.");
    return undefined;
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

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
          symbol_timestamp: new Date(item.FH_TIMESTAMP_ORDER),
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
      symbol_timestamp: new Date(item.FH_TIMESTAMP_ORDER),
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
            meta_data: occ.metaData,
          });
        }
      }
    }

    return flatResults;
  };

  public flattenAndDeduplicateOccurrencesForCSVExport = (
    data: IRawGroupedOccurrence[]
  ): IProcessedDataForCSVExport[] => {
    const seen = new Set<string>();
    const flatResults: IProcessedDataForCSVExport[] = [];

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
            buildup_type: occ.metaData?.buildup_type ?? "",
            intra_day_volatility: occ.metaData?.intraDayVolatility ?? "",
            price_return_1d: occ.metaData?.priceReturn1D ?? "",
            range_to_price_ration: occ.metaData?.rangeToPriceRation ?? "",
            price_change: occ.metaData?.priceChange ?? "",
            fut_spot_spread: occ.metaData?.futSpotSpread ?? "",
            fut_spot_spread_perc: occ.metaData?.futSpotSpreadPerc ?? "",
            volume_to_oi: occ.metaData?.volumeToOI ?? "",
            volume_change_perc: occ.metaData?.volumeChangePerc ?? "",
            absorption_score: occ.metaData?.absorptionScore ?? "",
            previous_day_volume_change:
              occ.metaData?.previousDayVolumeChange ?? "",
          });
        }
      }
    }

    return flatResults;
  };

  public flattenAndDeduplicateOccurrencesForAlert = (
    data: IRawGroupedOccurrence[]
  ): IProcessedData[] => {
    const seen = new Set<string>();
    const flatResults: IProcessedData[] = [];

    for (const item of data) {
      const { symbol, expiryDate, instrument, occurrences } = item;

      for (const occ of occurrences) {
        const key = `${symbol}-${expiryDate}-${instrument}-${occ.date}`;

        if (!seen.has(key) && occ.alertOnSlack) {
          seen.add(key);
          flatResults.push({
            name: symbol,
            expiry_date: expiryDate,
            instrument,
            occurrence_date: occ.date,
            alert_on_slack: occ.alertOnSlack,
            previous_date: occ.previousDate,
            current_contracts: occ.currentContracts,
            previous_contracts: occ.previousContracts,
            change_in_oi: occ.changeInOI,
            percentage_change_contracts: occ.percentageChangeContracts,
            difference_in_contracts: occ.differenceInContracts,
            meta_data: occ.metaData,
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

  private readonly SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL ?? "";

  private readonly MAX_BLOCKS_PER_MESSAGE = 20;
  private readonly BLOCKS_PER_RECORD = 5;
  private readonly RECORDS_PER_MESSAGE = Math.floor(
    this.MAX_BLOCKS_PER_MESSAGE / this.BLOCKS_PER_RECORD
  );

  public chunkArraySlack = <T>(arr: T[], size: number): T[][] =>
    Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
      arr.slice(i * size, i * size + size)
    );

  public interpretMarketAllParamsSimple = (meta: any): string[] => {
    const points: string[] = [];

    const priceReturn = parseFloat(meta.priceReturn1D);
    const priceChange = parseFloat(meta.priceChange);
    const volatility = parseFloat(meta.intraDayVolatility);
    const rangeRatio = parseFloat(meta.rangeToPriceRation);
    const volumeToOI = parseFloat(meta.volumeToOI);
    const volumeChange = parseFloat(meta.volumeChangePerc);
    const absorption = parseFloat(meta.absorptionScore);
    const spreadPerc = parseFloat(meta.futSpotSpreadPerc);
    const previousDayVolumeChange = parseFloat(meta.previousDayVolumeChange);

    /* 1️⃣ Big investors behaviour */
    const investorMap: Record<string, string> = {
      long_unwinding: "🚪 Big investors are exiting",
      long_buildup: "➕ Big investors are buying",
      short_buildup: "➕ Big investors are betting on a fall",
      short_covering: "🔄 Big investors are changing direction",
    };

    points.push(investorMap[meta.buildup_type]);

    /* 2️⃣ Price direction */
    if (priceReturn <= -0.01)
      points.push(`*Price Return*: ${priceReturn} (📉 Price is falling)`);
    else if (priceReturn < -0.002)
      points.push(`*Price Return*: ${priceReturn} (📉 Price is slightly down)`);
    else if (priceReturn <= 0.002)
      points.push(`*Price Return*: ${priceReturn} (➡️ Price is stable)`);
    else points.push(`*Price Return*: ${priceReturn} (📈 Price is rising)`);

    /* 3️⃣ Price movement size */
    if (Math.abs(priceChange) > 5) {
      points.push(
        `*Price Change*: ${priceChange} (💥 Price moved sharply today)`
      );
    } else {
      points.push(
        `*Price Change*: ${priceChange} (📏 Price movement was limited)`
      );
    }

    /* 4️⃣ Trading activity (volatility) */
    if (volatility < 0.01) {
      points.push(`*Volatility*: ${volatility} (🧊 Trading was quiet)`);
    } else if (volatility < 0.02) {
      points.push(`*Volatility*: ${volatility} (🔥 Trading activity was high)`);
    } else {
      points.push(`*Volatility*: ${volatility} (🔥 Very heavy trading today)`);
    }

    /* 5️⃣ Price swing range */
    if (rangeRatio > 0.02) {
      points.push(
        `*RangeRatio*: ${rangeRatio} (📊 Price moved within a wide range)`
      );
    } else {
      points.push(
        `*RangeRatio*: ${rangeRatio} (📊 Price stayed within a narrow range)`
      );
    }

    /* 6️⃣ Trader participation */
    if (volumeToOI < 0.2) {
      points.push(`*VolumeToOI*: ${volumeToOI} (👥 Fewer traders were active)`);
    } else if (volumeToOI <= 0.6) {
      points.push(
        `*VolumeToOI*: ${volumeToOI} (👥 Normal number of traders active)`
      );
    } else {
      points.push(
        `*VolumeToOI*: ${volumeToOI} (👥 Many traders entered and exited)`
      );
    }

    /* 7️⃣ Change in interest */
    if (volumeChange < -0.3) {
      points.push(
        `*Volume Change*: ${volumeChange} (🔻 Trading interest dropped)`
      );
    } else if (volumeChange > 0.3) {
      points.push(
        `*Volume Change*: ${volumeChange} (🔺 Trading interest surged)`
      );
    } else {
      points.push(
        `*Volume Change*: ${volumeChange} (➖ Trading interest steady)`
      );
    }

    /* 8️⃣ Hidden buying / selling */
    if (absorption > 0.5) {
      points.push(
        `*Absorption*: ${absorption} (🧲 Quiet buying or selling by big players)`
      );
    } else if (absorption < -0.5) {
      points.push(`*Absorption*: ${absorption} (⚠️ Sudden, reactive trading)`);
    } else {
      points.push(
        `*Absorption*: ${absorption} (🧲 No strong hidden buying or selling)`
      );
    }

    /* 9️⃣ Market expectation */
    if (spreadPerc > 0.3) {
      points.push(
        `*Spread*: ${spreadPerc} (🎯 Market expects prices to go up)`
      );
    } else if (spreadPerc < -0.3) {
      points.push(
        `*Spread*: ${spreadPerc} (🎯 Market expects prices to go down)`
      );
    } else {
      points.push(`*Spread*: ${spreadPerc} (🎯 Market expects stable prices)`);
    }

    /* 🔟 Previous day volume change */
    if (previousDayVolumeChange > 1) {
      points.push(
        `*Previous Day Volume Change*: ${previousDayVolumeChange} (📈 Volume increased compared to previous day)`
      );
    } else if (previousDayVolumeChange < 1) {
      points.push(
        `*Previous Day Volume Change*: ${previousDayVolumeChange} (📉 Volume decreased compared to previous day)`
      );
    } else {
      points.push(
        `*Previous Day Volume Change*: ${previousDayVolumeChange} (➖ Volume stable compared to previous day)`
      );
    }

    return points;
  };

  public sendSlackAlert = async (processed_data: IProcessedData[]) => {
    const chunks = this.chunkArraySlack(
      processed_data,
      this.RECORDS_PER_MESSAGE
    ); // ~10 records per message

    for (const chunk of chunks) {
      const blocks: any[] = [];

      chunk.forEach((stock, index) => {
        const { buildup_type } = stock.meta_data || {};
        const {
          name,
          instrument,
          expiry_date,
          previous_date,
          occurrence_date,
          previous_contracts,
          current_contracts,
          difference_in_contracts,
          percentage_change_contracts,
          change_in_oi,
        } = stock;

        const buildupEmojiMap: Record<string, string> = {
          long_buildup: "🟢 *Long Buildup*",
          short_buildup: "🔴 *Short Buildup*",
          short_covering: "🟡 *Short Covering*",
          long_unwinding: "🔵 *Long Unwinding*",
        };

        const buildupText = buildupEmojiMap[buildup_type] || "❔ *Unknown*";
        const points =
          this.interpretMarketAllParamsSimple(stock.meta_data) ?? [];
        const percentageChangeContracts = parseFloat(
          percentage_change_contracts
        );
        const differenceInContracts = parseInt(difference_in_contracts);

        const isHighVolume =
          percentageChangeContracts > 100 && differenceInContracts > 10000;

        const heading = isHighVolume
          ? `🔥 *High Volume Alert: ${name} (${instrument})*`
          : `📈 *Stock Alert: ${name} (${instrument})*`;

        if (index > 0) blocks.push({ type: "divider" });

        blocks.push(
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `${heading}\n${buildupText}`,
            },
          },
          {
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: `*🗓️ Expiry:* ${expiry_date}`,
              },
              {
                type: "mrkdwn",
                text: `*📅 Occurrence Date :* ${occurrence_date}`,
              },
              {
                type: "mrkdwn",
                text: `*📊 Contracts:* ${previous_contracts} → ${current_contracts} *(+${difference_in_contracts.toLocaleString()})*`,
              },
              {
                type: "mrkdwn",
                text: `*🔁 % Change:* ${percentageChangeContracts.toFixed(2)}%`,
              },
              {
                type: "mrkdwn",
                text: `*🧠 OI Change:* ${change_in_oi.toLocaleString()}`,
              },
            ],
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*🔍 Market Insights:*\n${points
                ?.map((point) => `• ${point}`)
                ?.join("\n")}`,
            },
          }
        );
      });

      try {
        await axios.post(this.SLACK_WEBHOOK_URL, { blocks });
      } catch (err: any) {
        console.error("❌ Slack alert failed:", err.message);
      }
    }
  };
}
