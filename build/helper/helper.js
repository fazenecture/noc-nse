"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const moment_1 = __importDefault(require("moment"));
const db_1 = __importDefault(require("../db/db"));
// import puppeteer from "puppeteer";
const puppeteer_extra_1 = __importDefault(require("puppeteer-extra"));
const puppeteer_extra_plugin_stealth_1 = __importDefault(require("puppeteer-extra-plugin-stealth"));
puppeteer_extra_1.default.use((0, puppeteer_extra_plugin_stealth_1.default)());
const axios_1 = __importDefault(require("axios"));
const enums_1 = require("../types/enums");
const proxy_utils_1 = require("../utils/proxy.utils");
class NSEHelper extends db_1.default {
    constructor() {
        var _a;
        super(...arguments);
        this.checkCondition = (data) => {
            const occurrences = [];
            for (let i = 1; i < (data === null || data === void 0 ? void 0 : data.length); i++) {
                const current = data[i];
                const previous = data[i - 1];
                const currentContracts = parseFloat(current.FH_TOT_TRADED_QTY) /
                    parseFloat(current.FH_MARKET_LOT);
                const previousContracts = parseFloat(previous.FH_TOT_TRADED_QTY) /
                    parseFloat(previous.FH_MARKET_LOT);
                const changeInOI = parseFloat(current.FH_CHANGE_IN_OI);
                const currentPrice = parseFloat(current.FH_LAST_TRADED_PRICE);
                const previousPrice = parseFloat(previous.FH_LAST_TRADED_PRICE);
                const priceChange = currentPrice - previousPrice;
                const oiChange = changeInOI;
                let buildupType = enums_1.BUILDUP_TYPE.INDECISIVE;
                if (priceChange > 0 && oiChange > 0) {
                    buildupType = enums_1.BUILDUP_TYPE.LONG_BUILDUP;
                }
                else if (priceChange < 0 && oiChange > 0) {
                    buildupType = enums_1.BUILDUP_TYPE.SHORT_BUILDUP;
                }
                else if (priceChange > 0 && oiChange < 0) {
                    buildupType = enums_1.BUILDUP_TYPE.SHORT_COVERING;
                }
                else if (priceChange < 0 && oiChange < 0) {
                    buildupType = enums_1.BUILDUP_TYPE.LONG_UNWINDING;
                }
                // Calculate percentage change in contracts
                const percentageChangeContracts = parseFloat((((currentContracts - previousContracts) / previousContracts) *
                    100).toFixed(2));
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
        this.formatDate = (date) => {
            const day = String(date.getDate()).padStart(2, "0");
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const year = date.getFullYear();
            return `${day}-${month}-${year}`;
        };
        this.formatCookies = (cookiesArray) => {
            return cookiesArray.map((cookie) => cookie.split(";")[0]).join("; ");
        };
        this.removeDuplicateContracts = (data) => {
            const seen = new Set();
            const unique = [];
            for (const item of data) {
                const key = `${item.FH_EXPIRY_DT}-${item.FH_INSTRUMENT}-${item.FH_TIMESTAMP}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    unique.push(item);
                }
            }
            return unique;
        };
        this.prepareUniqueRawData = (data) => {
            const seen = new Set();
            const result = [];
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
        this.buildRawDataInsertObjects = (data) => {
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
        this.flattenAndDeduplicateOccurrences = (data) => {
            const seen = new Set();
            const flatResults = [];
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
        this.flattenAndDeduplicateOccurrencesForDB = (data) => {
            const seen = new Set();
            const flatResults = [];
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
        this.convertToDDMMYYYY = (dateStr) => {
            return (0, moment_1.default)(dateStr, "DD-MMM-YYYY").format("DD-MM-YYYY");
        };
        this.chunkArray = (array, size) => {
            const result = [];
            for (let i = 0; i < array.length; i += size) {
                result.push(array.slice(i, i + size));
            }
            return result;
        };
        this._CONCURRENCY = 500;
        this.runChunkedParallel = (chunks, handler) => __awaiter(this, void 0, void 0, function* () {
            for (let i = 0; i < chunks.length; i += this._CONCURRENCY) {
                const group = chunks.slice(i, i + this._CONCURRENCY);
                yield Promise.all(group.map(handler));
            }
        });
        this.SLACK_WEBHOOK_URL = (_a = process.env.SLACK_WEBHOOK_URL) !== null && _a !== void 0 ? _a : "";
        this.MAX_BLOCKS_PER_MESSAGE = 20;
        this.BLOCKS_PER_RECORD = 5;
        this.RECORDS_PER_MESSAGE = Math.floor(this.MAX_BLOCKS_PER_MESSAGE / this.BLOCKS_PER_RECORD);
        this.chunkArraySlack = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));
        this.sendSlackAlert = (processed_data) => __awaiter(this, void 0, void 0, function* () {
            const chunks = this.chunkArraySlack(processed_data, this.RECORDS_PER_MESSAGE); // ~10 records per message
            for (const chunk of chunks) {
                const blocks = [];
                chunk.forEach((stock, index) => {
                    const { buildup_type } = stock.meta_data || {};
                    const { name, instrument, expiry_date, previous_date, occurrence_date, previous_contracts, current_contracts, difference_in_contracts, percentage_change_contracts, change_in_oi, } = stock;
                    const buildupEmojiMap = {
                        long_buildup: "🟢 *Long Buildup*",
                        short_buildup: "🔴 *Short Buildup*",
                        short_covering: "🟡 *Short Covering*",
                        long_unwinding: "🔵 *Long Unwinding*",
                    };
                    const buildupText = buildupEmojiMap[buildup_type] || "❔ *Unknown*";
                    const percentageChangeContracts = parseFloat(percentage_change_contracts);
                    const differenceInContracts = parseInt(difference_in_contracts);
                    const isHighVolume = percentageChangeContracts > 100 && differenceInContracts > 10000;
                    const heading = isHighVolume
                        ? `🔥 *High Volume Alert: ${name} (${instrument})*`
                        : `📈 *Stock Alert: ${name} (${instrument})*`;
                    if (index > 0)
                        blocks.push({ type: "divider" });
                    blocks.push({
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: `${heading}\n${buildupText}`,
                        },
                    }, {
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
                    });
                });
                try {
                    yield axios_1.default.post(this.SLACK_WEBHOOK_URL, { blocks });
                }
                catch (err) {
                    console.error("❌ Slack alert failed:", err.message);
                }
            }
        });
    }
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
    getCookiesFromResponse(url) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield (0, proxy_utils_1.fetchNSECookiesWithProxyRetries)(url);
                const cookies = response.headers["set-cookie"];
                if (cookies === null || cookies === void 0 ? void 0 : cookies.length) {
                    const final = this.formatCookies(cookies);
                    console.log("✅ Cookies fetched:", final);
                    return final;
                }
                else {
                    console.warn("⚠️ No cookies returned in headers.");
                }
            }
            catch (err) {
                console.error("💥 All proxy attempts failed:", err.message || err);
            }
            return undefined;
        });
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
exports.default = NSEHelper;
//# sourceMappingURL=helper.js.map