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
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchNSECookiesWithProxyRetries = void 0;
const axios_1 = __importDefault(require("axios"));
const puppeteer_extra_1 = __importDefault(require("puppeteer-extra"));
const puppeteer_extra_plugin_stealth_1 = __importDefault(require("puppeteer-extra-plugin-stealth"));
const https_proxy_agent_1 = require("https-proxy-agent");
puppeteer_extra_1.default.use((0, puppeteer_extra_plugin_stealth_1.default)());
// proxies from ENV (PROXIES_LIST)
const proxiesList = (_b = (_a = process === null || process === void 0 ? void 0 : process.env) === null || _a === void 0 ? void 0 : _a.PROXIES_LIST) !== null && _b !== void 0 ? _b : "";
const RAW_PROXIES = proxiesList.split(",");
const PROXIES = RAW_PROXIES.map((line) => {
    const [host, port, username, password] = line.split(":");
    return { host, port, username, password };
});
let proxyIndex = 0;
function getNextProxyAgent() {
    const { host, port, username, password } = PROXIES[proxyIndex];
    proxyIndex = (proxyIndex + 1) % PROXIES.length;
    const proxyUrl = `http://${username}:${password}@${host}:${port}`;
    return new https_proxy_agent_1.HttpsProxyAgent(proxyUrl);
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
const fetchNSECookiesWithProxyRetries = (url_1, ...args_1) => __awaiter(void 0, [url_1, ...args_1], void 0, function* (url, maxRetries = PROXIES.length) {
    var _a;
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const httpsAgent = getNextProxyAgent();
        try {
            return yield axios_1.default.get(url, {
                httpsAgent,
                withCredentials: true,
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                    "Accept-Encoding": "gzip, deflate, br",
                    "Accept-Language": "en-US,en;q=0.5",
                    Referer: "https://www.nseindia.com",
                    Connection: "keep-alive",
                },
            });
        }
        catch (err) {
            lastError = err;
            const status = (_a = err.response) === null || _a === void 0 ? void 0 : _a.status;
            console.warn(`Attempt ${attempt}/${maxRetries} failed` +
                (status ? ` (HTTP ${status})` : "") +
                ` via proxy ${PROXIES[(proxyIndex + PROXIES.length - 1) % PROXIES.length].host}:${PROXIES[(proxyIndex + PROXIES.length - 1) % PROXIES.length].port}`);
            // retry only on proxy-auth errors
            if (status && status !== 407)
                break;
            yield sleep(500 * attempt);
        }
    }
    throw lastError;
});
exports.fetchNSECookiesWithProxyRetries = fetchNSECookiesWithProxyRetries;
//# sourceMappingURL=proxy.utils.js.map