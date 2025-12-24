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
const service_1 = __importDefault(require("../service/service"));
const custom_error_handler_1 = __importDefault(require("../utils/custom.error.handler"));
const sync_service_1 = __importDefault(require("../service/sync.service"));
class NSEController extends service_1.default {
    constructor() {
        super(...arguments);
        this.fetchOIDifferenceDataController = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { type, year } = req.query;
                console.time("Starting The Dig 🚨");
                // const data = await this.fetchOIDifferenceService({
                //   type: type?.toString() ?? null,
                //   year: parseInt(year?.toString() ?? "2025", 10),
                // });
                const data = yield new sync_service_1.default().dailySyncExecution();
                console.timeEnd("Ending The Dig 🚨");
                res.status(200).send({
                    success: true,
                    data,
                });
            }
            catch (err) {
                console.log("err: ", err);
                (0, custom_error_handler_1.default)(res, err);
            }
        });
    }
}
exports.default = NSEController;
//# sourceMappingURL=controller.js.map