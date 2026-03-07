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
const nse_1 = require("../constants/nse");
const enums_1 = require("../types/enums");
const slack_utils_1 = require("../utils/slack.utils");
const sync_service_1 = __importDefault(require("./sync.service"));
const node_cron_1 = __importDefault(require("node-cron"));
class CRONService {
    constructor() {
        this.errorMessage = (err) => `:rotating_light: *Cron Failure* at ${new Date().toLocaleString()}\n\`\`\`${err.stack || err.message}\`\`\``;
        this.execute = () => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                if (((_a = process.env) === null || _a === void 0 ? void 0 : _a.EXECUTION_TYPE) === nse_1.EXECUTION_TYPE.NONE) {
                    console.log("CRON: Halted");
                    return;
                }
                console.log("CRON: INIT");
                if (((_b = process.env) === null || _b === void 0 ? void 0 : _b.EXECUTION_TYPE) === nse_1.EXECUTION_TYPE.ON_DEMAND) {
                    // execute the cron job manually
                    console.log("🚀 ON_DEMAND: Started", new Date().toISOString());
                    yield this.nseSyncService.init(enums_1.SYNC_TYPE.DAILY_SYNC);
                    console.log("✅ ON_DEMAND: Completed", new Date().toISOString());
                    return;
                }
                else {
                    // execute the job once before the cron job starts
                    if (((_c = process.env) === null || _c === void 0 ? void 0 : _c.EXECUTION_TYPE) === nse_1.EXECUTION_TYPE.ONE_SYNC_BEFORE_CRON) {
                        console.log("🚀 ONE_SYNC_BEFORE_CRON: Started", new Date().toISOString());
                        yield this.nseSyncService.init(enums_1.SYNC_TYPE.DAILY_SYNC);
                        console.log("✅ ONE_SYNC_BEFORE_CRON: Completed", new Date().toISOString());
                    }
                    node_cron_1.default.schedule("30 21 * * *", () => __awaiter(this, void 0, void 0, function* () {
                        console.log("🚀 CRON: Started", new Date().toISOString());
                        yield this.nseSyncService.init(enums_1.SYNC_TYPE.DAILY_SYNC);
                        console.log("✅ CRON: Completed", new Date().toISOString());
                    }), {
                        timezone: "Asia/Kolkata",
                    });
                }
                // cron.schedule("* * * * *", () => {
            }
            catch (err) {
                console.log("❌ CRON: Error ", err);
                yield (0, slack_utils_1.alertSlack)(this.errorMessage(err));
            }
        });
        this.nseSyncService = new sync_service_1.default();
    }
}
exports.default = CRONService;
//# sourceMappingURL=cron.service.js.map