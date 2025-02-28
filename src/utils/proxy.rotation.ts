import { IRotationConfigObj, IRotationOptionsObj } from "../types/proxy";

const axios = require("axios");
const { HttpsProxyAgent } = require("https-proxy-agent");
const SocksProxyAgent = require("socks-proxy-agent").SocksProxyAgent;
const fs = require("fs");
const path = require("path");

export default class IPRotationManager {
  config: IRotationConfigObj;
  cache: Map<any, any>;
  currentProxyIndex: number;
  proxyUsageCount: Map<any, any>;
  blockedProxies: Set<unknown>;
  constructor(options: IRotationOptionsObj) {
    // Configuration with defaults
    this.config = {
      proxyList: options.proxyList || [],
      proxyFile: options.proxyFile || null,
      proxyType: options.proxyType || "http", // 'http', 'socks4', 'socks5'
      requestsPerIP: options.requestsPerIP || 10,
      retryAttempts: options.retryAttempts || 3,
      retryDelay: options.retryDelay || 1000,
      rateLimitCodes: options.rateLimitCodes || [429, 403, 418],
      rotationStrategy: options.rotationStrategy || "sequential", // 'sequential', 'random'
      logActivity: options.logActivity || false,
      cacheDuration: options.cacheDuration || 60000, // 1 minute cache for successful responses
      baseUrl: options.baseUrl || "",
    };

    this.cache = new Map();
    this.currentProxyIndex = 0;
    this.proxyUsageCount = new Map();
    this.blockedProxies = new Set();

    this.initializeProxies();
  }

  initializeProxies() {
    // Load proxies from file if specified
    if (this.config.proxyFile && fs.existsSync(this.config.proxyFile)) {
      const fileContent = fs.readFileSync(this.config.proxyFile, "utf8");
      const fileProxies = fileContent
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#"));

      this.config.proxyList = [...this.config.proxyList, ...fileProxies];
    }

    // Initialize usage counter for each proxy
    this.config.proxyList.forEach((proxy) => {
      this.proxyUsageCount.set(proxy, 0);
    });

    if (this.config.logActivity) {
      console.log(`Initialized with ${this.config.proxyList.length} proxies`);
    }
  }

  getNextProxy() {
    if (this.config.proxyList.length === 0) {
      return null;
    }

    // Filter out blocked proxies
    const availableProxies = this.config.proxyList.filter(
      (proxy) => !this.blockedProxies.has(proxy)
    );

    if (availableProxies.length === 0) {
      if (this.config.logActivity) {
        console.log("All proxies are blocked. Resetting blocked list.");
      }

      // Reset blocked proxies if all are blocked
      this.blockedProxies.clear();
      return this.getNextProxy();
    }

    let selectedProxy;

    if (this.config.rotationStrategy === "random") {
      // Random selection
      const randomIndex = Math.floor(Math.random() * availableProxies.length);
      selectedProxy = availableProxies[randomIndex];
    } else {
      // Sequential selection
      if (this.currentProxyIndex >= availableProxies.length) {
        this.currentProxyIndex = 0;
      }
      selectedProxy = availableProxies[this.currentProxyIndex++];
    }

    // Update usage count
    const currentCount = this.proxyUsageCount.get(selectedProxy) || 0;
    this.proxyUsageCount.set(selectedProxy, currentCount + 1);

    // Check if we should rotate due to usage limit
    if (currentCount + 1 >= this.config.requestsPerIP) {
      if (this.config.logActivity) {
        console.log(
          `Proxy ${selectedProxy} reached usage limit, resetting count`
        );
      }
      this.proxyUsageCount.set(selectedProxy, 0);
    }

    return selectedProxy;
  }

  createProxyAgent(proxyUrl) {
    if (!proxyUrl) return undefined;

    // Handle different proxy types
    if (
      this.config.proxyType === "socks4" ||
      this.config.proxyType === "socks5"
    ) {
      return new SocksProxyAgent(`${this.config.proxyType}://${proxyUrl}`);
    }
    return new HttpsProxyAgent(`http://${proxyUrl}`);
  }

  async request(options) {
    const requestOptions = { ...options };

    // Use base URL if provided and path is relative
    if (this.config.baseUrl && options.url && !options.url.startsWith("http")) {
      requestOptions.url = this.config.baseUrl + options.url;
    }

    // Check cache first
    const cacheKey = this.getCacheKey(requestOptions);
    if (this.config.cacheDuration > 0) {
      const cachedResponse = this.getFromCache(cacheKey);
      if (cachedResponse) {
        if (this.config.logActivity) {
          console.log(`Cache hit for ${requestOptions.url}`);
        }
        return cachedResponse;
      }
    }

    let attempts = 0;
    let lastError = null;

    while (attempts < this.config.retryAttempts) {
      attempts++;

      try {
        const proxyUrl = this.getNextProxy();

        if (proxyUrl) {
          const agent = this.createProxyAgent(proxyUrl);
          requestOptions.httpsAgent = agent;

          if (this.config.logActivity) {
            console.log(`Attempt ${attempts} using proxy: ${proxyUrl}`);
          }
        } else if (this.config.logActivity) {
          console.log(`Attempt ${attempts} without proxy`);
        }

        // Add random delay between requests to reduce pattern detection
        if (attempts > 1) {
          const jitterDelay =
            this.config.retryDelay + Math.floor(Math.random() * 1000);
          await new Promise((resolve) => setTimeout(resolve, jitterDelay));
        }

        // Execute the request
        const response = await axios(requestOptions);

        // Cache successful response
        if (this.config.cacheDuration > 0) {
          this.addToCache(cacheKey, response);
        }

        return response;
      } catch (error) {
        lastError = error;

        // Check if error is rate limiting related
        const statusCode = error.response?.status;

        if (statusCode && this.config.rateLimitCodes.includes(statusCode)) {
          const proxyUrl =
            requestOptions.httpsAgent?._socksProxyUrl ||
            (requestOptions.httpsAgent?.proxy &&
              requestOptions.httpsAgent.proxy.host +
                ":" +
                requestOptions.httpsAgent.proxy.port);

          if (proxyUrl) {
            if (this.config.logActivity) {
              console.log(
                `Proxy ${proxyUrl} is being rate limited (${statusCode}). Marking as blocked.`
              );
            }
            this.blockedProxies.add(proxyUrl);
          }

          // Calculate backoff delay with exponential increase and jitter
          const backoffDelay = Math.min(
            this.config.retryDelay * Math.pow(2, attempts - 1) +
              Math.random() * 1000,
            30000 // Max 30 seconds
          );

          if (this.config.logActivity) {
            console.log(
              `Rate limited. Backing off for ${Math.round(
                backoffDelay / 1000
              )} seconds.`
            );
          }

          await new Promise((resolve) => setTimeout(resolve, backoffDelay));
          continue;
        }

        // For non-rate-limit errors, retry with minimal delay
        if (this.config.logActivity) {
          console.log(`Request error: ${error.message}`);
        }

        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // If we've exhausted all retries, throw the last error
    throw lastError || new Error("Request failed after max retry attempts");
  }

  getCacheKey(options) {
    // Create a unique key based on the request parameters
    const { url, method = "GET", params, data } = options;
    return JSON.stringify({ url, method, params, data });
  }

  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.config.cacheDuration) {
      return cached.data;
    }
    return null;
  }

  addToCache(key, data) {
    this.cache.set(key, {
      timestamp: Date.now(),
      data,
    });

    // Simple cache cleanup - randomly clean old entries
    if (Math.random() < 0.1 && this.cache.size > 100) {
      this.cleanCache();
    }
  }

  cleanCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.config.cacheDuration) {
        this.cache.delete(key);
      }
    }
  }

  // Utility methods
  getProxyStats() {
    return {
      total: this.config.proxyList.length,
      blocked: this.blockedProxies.size,
      available: this.config.proxyList.length - this.blockedProxies.size,
      usage: Object.fromEntries(this.proxyUsageCount),
    };
  }

  clearBlockedProxies() {
    this.blockedProxies.clear();
    if (this.config.logActivity) {
      console.log("Cleared blocked proxies list");
    }
  }
}
