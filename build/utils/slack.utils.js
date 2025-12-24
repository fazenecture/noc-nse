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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.alertSlack = void 0;
const axios_1 = __importDefault(require("axios"));
const SLACK_WEBHOOK = (_a = process.env.SLACK_WEBHOOK_URL) !== null && _a !== void 0 ? _a : "";
const alertSlack = (text) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield axios_1.default.post(SLACK_WEBHOOK, { text });
    }
    catch (err) {
        console.error("❌ Failed to send Slack alert:", err.message || err);
    }
});
exports.alertSlack = alertSlack;
//# sourceMappingURL=slack.utils.js.map