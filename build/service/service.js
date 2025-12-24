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
const axios_1 = __importDefault(require("axios"));
const nse_1 = require("../constants/nse");
const enums_1 = require("../types/enums");
const helper_1 = __importDefault(require("../helper/helper"));
const error_handler_1 = __importDefault(require("../utils/error.handler"));
class NSEService extends helper_1.default {
    constructor() {
        super();
        this.fetchOIDifferenceService = (reqObj) => __awaiter(this, void 0, void 0, function* () {
            const results = [];
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
            let selectedSymbol = nse_1.symbols;
            let instrument = enums_1.INSTRUMENTS.INDEX_FUTURE;
            const cookie = yield this.getCookiesFromResponse(nse_1.URLS.NSE_WEBSITE);
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
                const stocksData = yield this.fetchStocksService({
                    instrument,
                    cookie: this.cookies,
                });
                selectedSymbol = stocksData;
            }
            let counter = 0;
            console.log("selectedSymbol.splice(0, 10): ", selectedSymbol === null || selectedSymbol === void 0 ? void 0 : selectedSymbol.splice(0, 10));
            for (const symbol of selectedSymbol.splice(0, 10)) {
                console.log("symbol: ", symbol);
                if (counter % 25 === 0) {
                    const reFetchedCookies = yield this.getCookiesFromResponse(nse_1.URLS.NSE_WEBSITE);
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
                const expiryDates = yield this.fetchExpiryDatesService({
                    symbol,
                    instrument,
                    year,
                    cookie: this.cookies,
                }); // Fetch expiry dates for the symbol
                for (const expiryDate of expiryDates) {
                    const data1Day = yield this.fetchDataService({
                        symbol,
                        fromDate: this.formatDate(date1DayAgo),
                        toDate: this.formatDate(dateNow),
                        expiryDate,
                        instrument,
                        cookie: this.cookies,
                    });
                    const data1Week = yield this.fetchDataService({
                        symbol,
                        fromDate: this.formatDate(date1WeekAgo),
                        toDate: this.formatDate(dateNow),
                        expiryDate,
                        instrument,
                        cookie: this.cookies,
                    });
                    const data1Month = yield this.fetchDataService({
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
        });
        this.fetchExpiryDatesService = (obj) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { symbol, instrument, year, cookie } = obj;
                const url = nse_1.URLS.EXPIRY_DATES({
                    symbol,
                    instrument,
                    year,
                });
                const config = {
                    method: enums_1.METHODS.GET,
                    url,
                    headers: Object.assign(Object.assign({}, nse_1.API_CONFIG.HEADERS), { cookie }),
                };
                const response = yield axios_1.default.request(config);
                return (_a = response.data.expiresDts) !== null && _a !== void 0 ? _a : [];
            }
            catch (error) {
                console.log("error: ", error);
            }
        });
        this.fetchDataService = (obj) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const { symbol, fromDate, toDate, expiryDate, instrument, cookie } = obj;
                const url = nse_1.URLS.FO_CPV({
                    symbol,
                    fromDate,
                    toDate,
                    expiryDate,
                    instrument,
                    cookie,
                });
                const config = {
                    method: enums_1.METHODS.GET,
                    url,
                    maxBodyLength: Infinity,
                    headers: Object.assign(Object.assign({}, nse_1.API_CONFIG.HEADERS), { cookie }),
                };
                const response = yield axios_1.default.request(config);
                return (_b = (_a = response === null || response === void 0 ? void 0 : response.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : [];
            }
            catch (error) {
                console.log("error: ", error);
            }
        });
        this.fetchStocksService = (obj) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { instrument, cookie } = obj;
                const url = nse_1.URLS.FO_CPV_META_SYMBOL(instrument);
                const config = {
                    method: enums_1.METHODS.GET,
                    url,
                    maxBodyLength: Infinity,
                    headers: Object.assign(Object.assign({}, nse_1.API_CONFIG.HEADERS), { cookie }),
                };
                const response = yield axios_1.default.request(config);
                return response.data.symbols;
            }
            catch (error) {
                console.log("error: ", error);
            }
        });
        this.errorSymbols = [];
        this.cookies = null;
    }
}
exports.default = NSEService;
//# sourceMappingURL=service.js.map