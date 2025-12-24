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
const enums_1 = require("../types/enums");
const slack_utils_1 = require("../utils/slack.utils");
const sync_service_1 = __importDefault(require("./sync.service"));
class CRONService {
    constructor() {
        this.errorMessage = (err) => `:rotating_light: *Cron Failure* at ${new Date().toLocaleString()}\n\`\`\`${err.stack || err.message}\`\`\``;
        this.execute = () => __awaiter(this, void 0, void 0, function* () {
            try {
                console.log("CRON: INIT");
                // cron.schedule("* * * * *", () => {
                // cron.schedule(
                //   "30 21 * * *",
                //   async () => {
                console.log("🚀 CRON: Started", new Date().toISOString());
                yield this.nseSyncService.init(enums_1.SYNC_TYPE.DAILY_SYNC);
                console.log("✅ CRON: Completed", new Date().toISOString());
                //   },
                //   {
                //     timezone: "Asia/Kolkata",
                //   }
                // );
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