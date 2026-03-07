"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VolumeOISortBy = exports.SpreadSortBy = exports.AbsorptionSortBy = exports.ScannerSortBy = exports.SortOrder = void 0;
// ─── Sort Order ───────────────────────────────────────────────────────────────
var SortOrder;
(function (SortOrder) {
    SortOrder["ASC"] = "asc";
    SortOrder["DESC"] = "desc";
})(SortOrder || (exports.SortOrder = SortOrder = {}));
// ─── Scanner sort fields ───────────────────────────────────────────────────────
// Used in: GET /scanner ?sort_by
var ScannerSortBy;
(function (ScannerSortBy) {
    ScannerSortBy["PERCENTAGE_CHANGE"] = "percentage_change_contracts";
    ScannerSortBy["ABSORPTION_SCORE"] = "absorptionScore";
    ScannerSortBy["VOLUME_TO_OI"] = "volumeToOI";
    ScannerSortBy["CHANGE_IN_OI"] = "change_in_oi";
})(ScannerSortBy || (exports.ScannerSortBy = ScannerSortBy = {}));
// ─── Absorption sort fields ───────────────────────────────────────────────────
// Used in: GET /absorption ?sort_by
var AbsorptionSortBy;
(function (AbsorptionSortBy) {
    AbsorptionSortBy["ABSORPTION_SCORE"] = "absorptionScore";
    AbsorptionSortBy["VOLUME_CHANGE_PCT"] = "volumeChangePercent";
})(AbsorptionSortBy || (exports.AbsorptionSortBy = AbsorptionSortBy = {}));
// ─── Spread sort fields ───────────────────────────────────────────────────────
// Used in: GET /spread ?sort_by
var SpreadSortBy;
(function (SpreadSortBy) {
    SpreadSortBy["SPREAD_PERCENT"] = "futSpotSpreadPercent";
    SpreadSortBy["SPREAD_ABS"] = "futSpotSpread";
})(SpreadSortBy || (exports.SpreadSortBy = SpreadSortBy = {}));
// ─── Volume-OI sort fields ────────────────────────────────────────────────────
// Used in: GET /volume-oi ?sort_by
var VolumeOISortBy;
(function (VolumeOISortBy) {
    VolumeOISortBy["VOLUME_TO_OI"] = "volumeToOI";
    VolumeOISortBy["VOLUME_CHANGE_PCT"] = "volumeChangePercent";
})(VolumeOISortBy || (exports.VolumeOISortBy = VolumeOISortBy = {}));
//# sourceMappingURL=enums.js.map