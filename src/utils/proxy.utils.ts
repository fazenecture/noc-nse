import axios, { AxiosResponse } from "axios";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { HttpsProxyAgent } from "https-proxy-agent";

puppeteer.use(StealthPlugin());

interface ProxyConfig {
  host: string;
  port: string;
  username: string;
  password: string;
}

const RAW_PROXIES = [
  "in.decodo.com:10001:user-spcwoviqpj-sessionduration-60:aw2igK7QDgscu~41Gl",
  "in.decodo.com:10002:user-spcwoviqpj-sessionduration-60:aw2igK7QDgscu~41Gl",
  "in.decodo.com:10003:user-spcwoviqpj-sessionduration-60:aw2igK7QDgscu~41Gl",
  "in.decodo.com:10004:user-spcwoviqpj-sessionduration-60:aw2igK7QDgscu~41Gl",
  "in.decodo.com:10005:user-spcwoviqpj-sessionduration-60:aw2igK7QDgscu~41Gl",
  "in.decodo.com:10006:user-spcwoviqpj-sessionduration-60:aw2igK7QDgscu~41Gl",
  "in.decodo.com:10007:user-spcwoviqpj-sessionduration-60:aw2igK7QDgscu~41Gl",
  "in.decodo.com:10008:user-spcwoviqpj-sessionduration-60:aw2igK7QDgscu~41Gl",
  "in.decodo.com:10009:user-spcwoviqpj-sessionduration-60:aw2igK7QDgscu~41Gl",
  "in.decodo.com:10010:user-spcwoviqpj-sessionduration-60:aw2igK7QDgscu~41Gl",
];

const PROXIES: ProxyConfig[] = RAW_PROXIES.map((line) => {
  const [host, port, username, password] = line.split(":");
  return { host, port, username, password };
});

let proxyIndex = 0;
function getNextProxyAgent() {
  const { host, port, username, password } = PROXIES[proxyIndex];
  proxyIndex = (proxyIndex + 1) % PROXIES.length;
  const proxyUrl = `http://${username}:${password}@${host}:${port}`;
  return new HttpsProxyAgent(proxyUrl);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const fetchWithProxyRetries = async (
  url: string,
  maxRetries = PROXIES.length
): Promise<AxiosResponse<any>> => {
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const httpsAgent = getNextProxyAgent();

    try {
      return await axios.get(url, {
        httpsAgent,
        withCredentials: true,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Encoding": "gzip, deflate, br",
          "Accept-Language": "en-US,en;q=0.5",
          Referer: "https://www.nseindia.com",
          Connection: "keep-alive",
        },
      });
    } catch (err: any) {
      lastError = err;
      const status = err.response?.status;
      console.warn(
        `Attempt ${attempt}/${maxRetries} failed` +
          (status ? ` (HTTP ${status})` : "") +
          ` via proxy ${
            PROXIES[(proxyIndex + PROXIES.length - 1) % PROXIES.length].host
          }:${PROXIES[(proxyIndex + PROXIES.length - 1) % PROXIES.length].port}`
      );

      // retry only on proxy-auth errors
      if (status && status !== 407) break;

      await sleep(500 * attempt);
    }
  }

  throw lastError;
};
