"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BUILDUP_TYPE = exports.SYNC_TYPE = exports.INSTRUMENTS = exports.METHODS = void 0;
var METHODS;
(function (METHODS) {
    METHODS["GET"] = "get";
    METHODS["POST"] = "post";
})(METHODS || (exports.METHODS = METHODS = {}));
var INSTRUMENTS;
(function (INSTRUMENTS) {
    INSTRUMENTS["INDEX_FUTURE"] = "FUTIDX";
    INSTRUMENTS["STOCK_FUTURE"] = "FUTSTK";
    INSTRUMENTS["INDEX_OPTIONS"] = "OPTIDX";
    INSTRUMENTS["STOCK_OPTIONS"] = "OPTSTK";
})(INSTRUMENTS || (exports.INSTRUMENTS = INSTRUMENTS = {}));
var SYNC_TYPE;
(function (SYNC_TYPE) {
    SYNC_TYPE["FULL_SYNC"] = "full_sync";
    SYNC_TYPE["DAILY_SYNC"] = "daily_sync";
})(SYNC_TYPE || (exports.SYNC_TYPE = SYNC_TYPE = {}));
var BUILDUP_TYPE;
(function (BUILDUP_TYPE) {
    BUILDUP_TYPE["LONG_BUILDUP"] = "long_buildup";
    BUILDUP_TYPE["SHORT_BUILDUP"] = "short_buildup";
    BUILDUP_TYPE["SHORT_COVERING"] = "short_covering";
    BUILDUP_TYPE["LONG_UNWINDING"] = "long_unwinding";
    BUILDUP_TYPE["INDECISIVE"] = "indecisive";
})(BUILDUP_TYPE || (exports.BUILDUP_TYPE = BUILDUP_TYPE = {}));
//# sourceMappingURL=enums.js.map