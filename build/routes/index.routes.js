"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controller_1 = __importDefault(require("../controller/controller"));
const routes_1 = __importDefault(require("../dashboard/routes"));
const router = (0, express_1.Router)();
const { fetchOIDifferenceDataController } = new controller_1.default();
router.get("/data", fetchOIDifferenceDataController);
router.use("/dashboard", routes_1.default);
exports.default = router;
//# sourceMappingURL=index.routes.js.map