export enum METHODS {
  GET = "get",
  POST = "post",
}

export enum INSTRUMENTS {
  INDEX_FUTURE = "FUTIDX",
  STOCK_FUTURE = "FUTSTK",
  INDEX_OPTIONS = "OPTIDX",
  STOCK_OPTIONS = "OPTSTK",
}

export enum SYNC_TYPE {
  FULL_SYNC = "full_sync",
  DAILY_SYNC = "daily_sync",
}

export enum BUILDUP_TYPE {
  LONG_BUILDUP = "long_buildup",
  SHORT_BUILDUP = "short_buildup",
  SHORT_COVERING = "short_covering",
  LONG_UNWINDING = "long_unwinding",
  INDECISIVE = "indecisive",
}
