import moment from "moment";
import NSEDb from "../db/db";
// import puppeteer from "puppeteer";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

import {
  IContractsData,
  IFlattenedOccurrence,
  IProcessedData,
  IRawGroupedOccurrence,
  ISymbolRawData,
} from "../types";
import axios from "axios";
import { BUILDUP_TYPE } from "../types/enums";
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

      if (currentContracts > 1.5 * previousContracts && changeInOI > 0) {
        occurrences.push({
          date: this.convertToDDMMYYYY(current.FH_TIMESTAMP),
          previousDate: this.convertToDDMMYYYY(previous.FH_TIMESTAMP),
          currentContracts,
          previousContracts,
          changeInOI,
          percentageChangeContracts,
          differenceInContracts,
          metaData: {
            buildup_type: buildupType,
          },
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

  public getCookiesFromResponse = async (url: string): Promise<string> => {
    let browser;
    try {
      browser = await puppeteer.launch({
        executablePath: "/usr/bin/chromium-browser",
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });

      const page = await browser.newPage();

      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      );

      await page.setViewport({ width: 1366, height: 768 });
      page.setDefaultNavigationTimeout(45000);

      await page.setRequestInterception(true);
      page.on("request", (req) => {
        console.log("➡️ Request:", req.url());
        req.continue();
      });

      console.log("🔁 Visiting NSE Homepage...");
      await page.goto("https://www.nseindia.com", {
        waitUntil: "networkidle2",
        timeout: 30000,
      });

      console.log("📄 Navigating to target report page...");
      await page.goto(url, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });

      // Wait for AJAX call (XHR) related to report page
      await page.waitForResponse(
        (response) =>
          response.url().includes("fo_eq_security") &&
          response.status() === 200,
        { timeout: 15000 }
      );

      // wait manually since waitForTimeout doesn't exist
      // await page.waitForSelector("body");
      // await page.evaluate(() => {
      //   window.scrollBy(0, 200); // triggers more DOM events
      // });
      await new Promise((resolve) => setTimeout(resolve, 5000));

      const cookies = await page.cookies();
      console.log("cookies: ", cookies);
      const cookieString = cookies
        .map((c) => `${c.name}=${c.value}`)
        .join("; ");
      console.log("✅ cookies:", cookies.map((c) => c.name).join(", "));
      console.log("✅ cookieString:", cookieString);

      await browser.close();

      return cookieString;
    } catch (error) {
      console.error("❌ Puppeteer error:", error);
      if (browser) await browser.close();
      return "";
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
