export type IRotationConfigObj = {
  proxyList: any;
  proxyFile: any;
  proxyType: any; // 'http', 'socks4', 'socks5'
  requestsPerIP: any;
  retryAttempts: any;
  retryDelay: any;
  rateLimitCodes: any;
  rotationStrategy: any; // 'sequential', 'random'
  logActivity: any;
  cacheDuration: any; // 1 minute cache for successful responses
  baseUrl: any;
};

export type IRotationOptionsObj = {
  proxyList: any;
  proxyFile: any;
  proxyType: string;
  requestsPerIP: number;
  retryAttempts: number;
  retryDelay: number;
  rateLimitCodes: number[];
  rotationStrategy: string;
  logActivity: boolean;
  cacheDuration: number;
  baseUrl: string;
};
