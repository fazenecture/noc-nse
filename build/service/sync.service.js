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
const nse_1 = require("../constants/nse");
const db_1 = __importDefault(require("../db/db"));
const helper_1 = __importDefault(require("../helper/helper"));
const enums_1 = require("../types/enums");
const error_handler_1 = __importDefault(require("../utils/error.handler"));
const service_1 = __importDefault(require("./service"));
class NSESyncService {
    constructor() {
        this.init = (sync_type) => __awaiter(this, void 0, void 0, function* () {
            /**
             * sync_type -> full_sync & daily_sync
             */
            console.log("sync_type: ", sync_type);
            try {
                if (sync_type === enums_1.SYNC_TYPE.DAILY_SYNC) {
                    yield this.dailySyncCRONExecution();
                }
                else if (sync_type === enums_1.SYNC_TYPE.FULL_SYNC) {
                    yield this.fullSyncExecution();
                }
            }
            catch (err) {
                console.log("❌ err: ", err);
            }
        });
        this.fullSyncExecution = () => __awaiter(this, void 0, void 0, function* () {
            const { processed_data, raw_data } = yield this.fullSyncDataBuild();
            const CHUNK_SIZE = 500;
            const processedChunks = this.nseService.chunkArray(processed_data, CHUNK_SIZE);
            const rawChunks = this.nseService.chunkArray(raw_data, CHUNK_SIZE);
            // await this.nseService.runChunkedParallel(
            //   processedChunks,
            //   this.nseService.insertProcessedDataDb
            // );
            // await this.nseService.runChunkedParallel(
            //   rawChunks,
            //   this.nseService.insertSymbolRawDataDb
            // );
        });
        this.dailySyncExecution = () => __awaiter(this, void 0, void 0, function* () {
            const today = new Date();
            const day = today.getDay();
            // if (day === 0 || day === 6) {
            //   console.log("🛑 Today is a weekend. Skipping sync.");
            //   return {
            //     message: "🛑 Today is a weekend. Skipping sync.",
            //   };
            // }
            const { processed_data, raw_data } = yield this.dailySyncDataBuild();
            const CHUNK_SIZE = 500;
            const processedChunks = this.nseService.chunkArray(processed_data, CHUNK_SIZE);
            const rawChunks = this.nseService.chunkArray(raw_data, CHUNK_SIZE);
            yield this.nseService.runChunkedParallel(processedChunks, this.nseService.insertProcessedDataDb);
            yield this.nseService.runChunkedParallel(rawChunks, this.nseService.insertSymbolRawDataDb);
            yield this.nseService.sendSlackAlert(processed_data);
            return {
                message: "✅ Data sync completed successfully!",
                processed_data,
            };
        });
        this.dailySyncCRONExecution = () => __awaiter(this, void 0, void 0, function* () {
            const today = new Date();
            const day = today.getDay();
            if (day === 0 || day === 6) {
                console.log("🛑 Today is a weekend. Skipping sync.");
                return {
                    message: "🛑 Today is a weekend. Skipping sync.",
                };
            }
            const { processed_data, raw_data } = yield this.dailySyncDataBuild();
            const CHUNK_SIZE = 500;
            const processedChunks = this.nseService.chunkArray(processed_data, CHUNK_SIZE);
            console.log("processedChunks: ", processedChunks === null || processedChunks === void 0 ? void 0 : processedChunks.length);
            const rawChunks = this.nseService.chunkArray(raw_data, CHUNK_SIZE);
            yield this.nseService.runChunkedParallel(processedChunks, this.nseService.insertProcessedDataDb);
            yield this.nseService.runChunkedParallel(rawChunks, this.nseService.insertSymbolRawDataDb);
            console.log("🐥 Sending Slack Alert!");
            yield this.nseService.sendSlackAlert(processed_data);
            console.log("🐥 Sended Slack Alert!");
            return {
                message: "✅ Data sync completed successfully!",
                processed_data,
            };
        });
        this.fullSyncDataBuild = () => __awaiter(this, void 0, void 0, function* () {
            const results = [];
            const rawData = [];
            this.cookies = null;
            const dateNow = new Date();
            const year = (0, moment_1.default)().year();
            const type = "stocks";
            const date1DayAgo = new Date(dateNow);
            date1DayAgo.setDate(dateNow.getDate() - 1);
            const date1WeekAgo = new Date(dateNow);
            date1WeekAgo.setDate(dateNow.getDate() - 7);
            const date1MonthAgo = new Date(dateNow);
            date1MonthAgo.setMonth(dateNow.getMonth() - 1);
            let selectedSymbol = nse_1.symbols;
            let instrument = enums_1.INSTRUMENTS.INDEX_FUTURE;
            const cookie = yield this.nseService.getCookiesFromResponse(nse_1.URLS.NSE_WEBSITE);
            console.log("cookie: ", cookie);
            if (!(cookie === null || cookie === void 0 ? void 0 : cookie.length) || cookie === undefined) {
                throw new error_handler_1.default({
                    message: "Error Getting the Cookies",
                    status_code: 400,
                });
            }
            this.cookies = cookie;
            if (type === "stocks") {
                instrument = enums_1.INSTRUMENTS.STOCK_FUTURE;
                const stocksData = yield this.nseService.fetchStocksService({
                    instrument,
                    cookie: this.cookies,
                });
                selectedSymbol = stocksData;
            }
            let counter = 0;
            for (const symbol of selectedSymbol) {
                console.log("symbol: ", symbol);
                if (counter % 25 === 0) {
                    const reFetchedCookies = yield this.nseService.getCookiesFromResponse(nse_1.URLS.NSE_WEBSITE);
                    if (!(reFetchedCookies === null || reFetchedCookies === void 0 ? void 0 : reFetchedCookies.length) || reFetchedCookies === undefined) {
                        throw new error_handler_1.default({
                            message: "Error Getting the Cookies",
                            status_code: 400,
                        });
                    }
                    this.cookies = reFetchedCookies;
                    console.log("reFetchedCookies: ", reFetchedCookies);
                    console.log("Refetched Cookies & Waiting...");
                    yield new Promise((resolve) => setTimeout(resolve, 3000));
                }
                const expiryDates = yield this.nseService.fetchExpiryDatesService({
                    symbol,
                    instrument,
                    year,
                    cookie: this.cookies,
                }); // Fetch expiry dates for the symbol
                for (const expiryDate of expiryDates) {
                    const data1Day = yield this.nseService.fetchDataService({
                        symbol,
                        fromDate: this.nseService.formatDate(date1DayAgo),
                        toDate: this.nseService.formatDate(dateNow),
                        expiryDate,
                        instrument,
                        cookie: this.cookies,
                    });
                    const data1Week = yield this.nseService.fetchDataService({
                        symbol,
                        fromDate: this.nseService.formatDate(date1WeekAgo),
                        toDate: this.nseService.formatDate(dateNow),
                        expiryDate,
                        instrument,
                        cookie: this.cookies,
                    });
                    const data1Month = yield this.nseService.fetchDataService({
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
            const processedData = this.nseHelper.flattenAndDeduplicateOccurrencesForDB(results);
            const rawDataFinal = this.nseHelper.prepareUniqueRawData(rawData);
            return {
                processed_data: processedData,
                raw_data: rawDataFinal,
            };
        });
        this.dailySyncDataBuild = () => __awaiter(this, void 0, void 0, function* () {
            const results = [];
            const rawData = [];
            this.cookies = null;
            const dateNow = new Date();
            const year = (0, moment_1.default)().year();
            const type = "stocks";
            const date1DayAgo = new Date(dateNow);
            date1DayAgo.setDate(dateNow.getDate() - 1);
            const date1WeekAgo = new Date(dateNow);
            date1WeekAgo.setDate(dateNow.getDate() - 7);
            let selectedSymbol = nse_1.symbols;
            let instrument = enums_1.INSTRUMENTS.INDEX_FUTURE;
            const cookie = yield this.nseService.getCookiesFromResponse(nse_1.URLS.NSE_WEBSITE);
            if (!(cookie === null || cookie === void 0 ? void 0 : cookie.length) || cookie === undefined) {
                throw new error_handler_1.default({
                    message: "Error Getting the Cookies",
                    status_code: 400,
                });
            }
            this.cookies = cookie;
            if (type === "stocks") {
                instrument = enums_1.INSTRUMENTS.STOCK_FUTURE;
                const stocksData = yield this.nseService.fetchStocksService({
                    instrument,
                    cookie: this.cookies,
                });
                selectedSymbol = stocksData;
            }
            let counter = 0;
            for (const symbol of selectedSymbol) {
                if (counter % 25 === 0) {
                    const reFetchedCookies = yield this.nseService.getCookiesFromResponse(nse_1.URLS.NSE_WEBSITE);
                    if (!(reFetchedCookies === null || reFetchedCookies === void 0 ? void 0 : reFetchedCookies.length) || reFetchedCookies === undefined) {
                        throw new error_handler_1.default({
                            message: "Error Getting the Cookies",
                            status_code: 400,
                        });
                    }
                    this.cookies = reFetchedCookies;
                    console.log("reFetchedCookies: ", reFetchedCookies);
                    console.log("Refetched Cookies & Waiting...");
                    yield new Promise((resolve) => setTimeout(resolve, 3000));
                }
                let expiryDates = yield this.nseService.fetchExpiryDatesService({
                    symbol,
                    instrument,
                    year,
                    cookie: this.cookies,
                }); // Fetch expiry dates for the symbol
                expiryDates = this.getFutureExpiryDates(expiryDates);
                for (const expiryDate of expiryDates) {
                    const data1Day = yield this.nseService.fetchDataService({
                        symbol,
                        fromDate: this.nseService.formatDate(date1DayAgo),
                        toDate: this.nseService.formatDate(dateNow),
                        expiryDate,
                        instrument,
                        cookie: this.cookies,
                    });
                    const data1Week = yield this.nseService.fetchDataService({
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
            const processedData = this.nseHelper.flattenAndDeduplicateOccurrencesForDB(results);
            const rawDataFinal = this.nseHelper.prepareUniqueRawData(rawData);
            return {
                processed_data: processedData,
                raw_data: rawDataFinal,
            };
        });
        this.getFilteredContracts = (data) => {
            if (!data || data.length === 0)
                return [];
            // Step 1: Sort by FH_TIMESTAMP in descending order
            const sortedDesc = [...data].sort((a, b) => {
                return ((0, moment_1.default)(b.FH_TIMESTAMP, "DD-MMM-YYYY").valueOf() -
                    (0, moment_1.default)(a.FH_TIMESTAMP, "DD-MMM-YYYY").valueOf());
            });
            // const latestDate = moment(sortedDesc[0].FH_TIMESTAMP, "DD-MMM-YYYY").format(
            //   "DD-MMM-YYYY"
            // );
            // const todayDate = moment().format("DD-MMM-YYYY");
            let result = [];
            // if (latestDate === todayDate) {
            result = sortedDesc.slice(0, 2);
            // } else {
            //   result = [sortedDesc[0]];
            // }
            // Step 2: Sort selected items in ascending order before returning
            return result.sort((a, b) => {
                return ((0, moment_1.default)(a.FH_TIMESTAMP, "DD-MMM-YYYY").valueOf() -
                    (0, moment_1.default)(b.FH_TIMESTAMP, "DD-MMM-YYYY").valueOf());
            });
        };
        this.getFutureExpiryDates = (dates) => {
            const today = (0, moment_1.default)().startOf("day");
            return dates.filter((dateStr) => {
                const date = (0, moment_1.default)(dateStr, "DD-MMM-YYYY");
                return date.isSameOrAfter(today);
            });
        };
        this.nseDb = new db_1.default();
        this.nseService = new service_1.default();
        this.nseHelper = new helper_1.default();
        this.errorSymbols = [];
        this.cookies = null;
    }
}
exports.default = NSESyncService;
//# sourceMappingURL=sync.service.js.map