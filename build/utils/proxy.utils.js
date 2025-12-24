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
exports.fetchNSECookiesWithProxyRetries = void 0;
const axios_1 = __importDefault(require("axios"));
const puppeteer_extra_1 = __importDefault(require("puppeteer-extra"));
const puppeteer_extra_plugin_stealth_1 = __importDefault(require("puppeteer-extra-plugin-stealth"));
const https_proxy_agent_1 = require("https-proxy-agent");
puppeteer_extra_1.default.use((0, puppeteer_extra_plugin_stealth_1.default)());
const RAW_PROXIES = [
    "in.decodo.com:10001:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10002:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10003:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10004:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10005:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10006:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10007:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10008:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10009:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10010:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10011:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10012:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10013:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10014:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10015:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10016:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10017:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10018:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10019:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10020:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10021:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10022:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10023:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10024:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10025:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10026:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10027:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10028:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10029:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10030:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10031:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10032:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10033:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10034:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10035:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10036:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10037:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10038:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10039:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10040:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10041:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10042:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10043:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10044:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10045:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10046:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10047:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10048:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10049:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10050:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10051:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10052:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10053:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10054:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10055:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10056:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10057:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10058:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10059:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10060:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10061:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10062:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10063:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10064:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10065:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10066:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10067:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10068:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10069:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10070:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10071:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10072:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10073:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10074:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10075:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10076:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10077:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10078:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10079:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10080:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10081:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10082:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10083:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10084:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10085:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10086:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10087:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10088:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10089:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10090:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10091:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10092:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10093:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10094:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10095:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10096:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10097:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10098:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10099:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    "in.decodo.com:10100:user-spcwoviqpj-sessionduration-1440:aw2igK7QDgscu~41Gl",
    // "in.decodo.com:10001:user-spcwoviqpj-sessionduration-60:aw2igK7QDgscu~41Gl",
    // "in.decodo.com:10002:user-spcwoviqpj-sessionduration-60:aw2igK7QDgscu~41Gl",
    // "in.decodo.com:10003:user-spcwoviqpj-sessionduration-60:aw2igK7QDgscu~41Gl",
    // "in.decodo.com:10004:user-spcwoviqpj-sessionduration-60:aw2igK7QDgscu~41Gl",
    // "in.decodo.com:10005:user-spcwoviqpj-sessionduration-60:aw2igK7QDgscu~41Gl",
    // "in.decodo.com:10006:user-spcwoviqpj-sessionduration-60:aw2igK7QDgscu~41Gl",
    // "in.decodo.com:10007:user-spcwoviqpj-sessionduration-60:aw2igK7QDgscu~41Gl",
    // "in.decodo.com:10008:user-spcwoviqpj-sessionduration-60:aw2igK7QDgscu~41Gl",
    // "in.decodo.com:10009:user-spcwoviqpj-sessionduration-60:aw2igK7QDgscu~41Gl",
    // "in.decodo.com:10010:user-spcwoviqpj-sessionduration-60:aw2igK7QDgscu~41Gl",
];
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