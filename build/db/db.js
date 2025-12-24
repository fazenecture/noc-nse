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
const postgres_1 = __importDefault(require("../config/postgres"));
class NSEDb {
    constructor() {
        this.insertSymbolRawDataDb = (obj) => __awaiter(this, void 0, void 0, function* () {
            const query = postgres_1.default.format(`INSERT INTO symbol_raw_data ? ON CONFLICT ON CONSTRAINT unique_symbol_raw_data DO NOTHING`, obj);
            return postgres_1.default.query(query);
        });
        this.insertProcessedDataDb = (obj) => __awaiter(this, void 0, void 0, function* () {
            const query = postgres_1.default.format(`INSERT INTO processed_data ? ON CONFLICT ON CONSTRAINT unique_processed_data DO NOTHING`, obj);
            yield postgres_1.default.query(query);
        });
    }
}
exports.default = NSEDb;
//# sourceMappingURL=db.js.map