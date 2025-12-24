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
const joi_1 = require("joi");
const error_handler_1 = __importDefault(require("./error.handler"));
const customErrorHandler = (res, error) => __awaiter(void 0, void 0, void 0, function* () {
    // console.error(
    //   "❌ Error: ",
    //   JSON.stringify(error),
    //   error["Error"],
    //   error.toString()
    // );
    console.log(`"❌ Error: ", ${error}`);
    if (error instanceof joi_1.ValidationError) {
        return res.header({ "x-frame-options": "deny" }).status(400).json({
            success: false,
            message: "Data validation failed",
            details: error.details,
        });
    }
    if (error instanceof error_handler_1.default) {
        return res.status(error.status_code).send({
            success: false,
            message: error.message,
            data: error.data,
        });
    }
    console.log("error: ", error);
    res.status(500).send({
        success: false,
        message: error.toString().split("Error: ").pop() || "Internal ServerError.",
        error,
    });
});
exports.default = customErrorHandler;
//# sourceMappingURL=custom.error.handler.js.map