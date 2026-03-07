import customErrorHandler from "../utils/custom.error.handler";
import ErrorHandler from "../utils/error.handler";
import DashboardService from "./service";
import { Request, Response } from "express";
import {
  AbsorptionSortBy,
  SortOrder,
  SpreadSortBy,
  VolumeOISortBy,
} from "./types/enums";

export default class DashboardController extends DashboardService {
  // ─── 1. Scanner Table ─────────────────────────────────────────────────────────
  // GET /api/dashboard/scanner
  // ?date ?instrument ?buildup_type ?min_contract_change ?sort_by ?sort_order ?page ?limit
  public getScannerController = async (req: Request, res: Response) => {
    try {
      const {
        date,
        instrument,
        buildup_type,
        min_contract_change,
        sort_by,
        sort_order,
        page,
        limit,
      } = req.query;

      const data = await this.getScannerService({
        date: this.str(date),
        instrument: this.str(instrument),
        buildup_type: this.str(buildup_type),
        min_contract_change: this.num(min_contract_change),
        sort_by: this.str(sort_by),
        sort_order:
          sort_order === SortOrder.ASC ? SortOrder.ASC : SortOrder.DESC,
        page: this.int(page, 1),
        limit: this.int(limit, 50),
      });

      res.status(200).send({ success: true, data });
      return;
    } catch (err) {
      customErrorHandler(res, err);
    }
  };

  // ─── 2. Surge Feed ────────────────────────────────────────────────────────────
  // GET /api/dashboard/surges
  // ?date ?min_surge_percent ?require_positive_oi ?limit
  public getSurgesController = async (req: Request, res: Response) => {
    try {
      const { date, min_surge_percent, require_positive_oi, limit } = req.query;

      const data = await this.getSurgesService({
        date: this.str(date),
        min_surge_percent: this.num(min_surge_percent) ?? 150,
        require_positive_oi:
          require_positive_oi !== undefined
            ? this.bool(require_positive_oi)
            : true,
        limit: this.int(limit, 20),
      });

      res.status(200).send({ success: true, data });
    } catch (err) {
      customErrorHandler(res, err);
    }
  };

  // ─── 3. Distribution Chart ────────────────────────────────────────────────────
  // GET /api/dashboard/distribution
  // Single day: ?date ?instrument   |   Range: ?from ?to ?instrument
  public getDistributionController = async (req: Request, res: Response) => {
    try {
      const { date, instrument, from, to } = req.query;

      const data = await this.getDistributionService({
        date: this.str(date),
        instrument: this.str(instrument),
        from: this.str(from),
        to: this.str(to),
      });

      res.status(200).send({ success: true, data });
    } catch (err) {
      customErrorHandler(res, err);
    }
  };

  // ─── 4. OI + Price Trend Overlay ─────────────────────────────────────────────
  // GET /api/dashboard/trend/:symbol
  // ?from ?to ?expiry_date ?instrument
  public getTrendController = async (req: Request, res: Response) => {
    try {
      const { symbol } = req.params;
      const { from, to, expiry_date, instrument } = req.query;

      const data = await this.getTrendService({
        symbol,
        from: this.str(from),
        to: this.str(to),
        expiry_date: this.str(expiry_date),
        instrument: this.str(instrument),
      });

      res.status(200).send({ success: true, data });
    } catch (err) {
      customErrorHandler(res, err);
    }
  };

  // ─── 5. Absorption Score Tracker ──────────────────────────────────────────────
  // GET /api/dashboard/absorption
  // ?date ?instrument ?min_score ?sort_by ?limit
  public getAbsorptionController = async (req: Request, res: Response) => {
    try {
      const { date, instrument, min_score, sort_by, limit } = req.query;

      const data = await this.getAbsorptionService({
        date: this.str(date),
        instrument: this.str(instrument),
        min_score: this.num(min_score),
        sort_by:
          sort_by === AbsorptionSortBy.VOLUME_CHANGE_PCT
            ? AbsorptionSortBy.VOLUME_CHANGE_PCT
            : AbsorptionSortBy.ABSORPTION_SCORE,
        limit: this.int(limit, 20),
      });

      res.status(200).send({ success: true, data });
    } catch (err) {
      customErrorHandler(res, err);
    }
  };

  // ─── 6. FutSpot Spread Monitor ────────────────────────────────────────────────
  // GET /api/dashboard/spread
  // ?date ?instrument ?sort_by ?outlier_only
  public getSpreadController = async (req: Request, res: Response) => {
    try {
      const { date, instrument, sort_by, outlier_only } = req.query;

      const data = await this.getSpreadService({
        date: this.str(date),
        instrument: this.str(instrument),
        sort_by:
          sort_by === SpreadSortBy.SPREAD_ABS
            ? SpreadSortBy.SPREAD_ABS
            : SpreadSortBy.SPREAD_PERCENT,
        outlier_only: this.bool(outlier_only),
      });

      res.status(200).send({ success: true, data });
    } catch (err) {
      customErrorHandler(res, err);
    }
  };

  // ─── 7. Volume-to-OI Screener ─────────────────────────────────────────────────
  // GET /api/dashboard/volume-oi
  // ?date ?instrument ?min_ratio ?max_ratio ?sort_by
  public getVolumeOIController = async (req: Request, res: Response) => {
    try {
      const { date, instrument, min_ratio, max_ratio, sort_by } = req.query;

      const data = await this.getVolumeOIService({
        date: this.str(date),
        instrument: this.str(instrument),
        min_ratio: this.num(min_ratio),
        max_ratio: this.num(max_ratio),
        sort_by:
          sort_by === VolumeOISortBy.VOLUME_CHANGE_PCT
            ? VolumeOISortBy.VOLUME_CHANGE_PCT
            : VolumeOISortBy.VOLUME_TO_OI,
      });

      res.status(200).send({ success: true, data });
    } catch (err) {
      customErrorHandler(res, err);
    }
  };

  // ─── 8. Multi-Day Buildup Streaks ─────────────────────────────────────────────
  // GET /api/dashboard/streaks
  // ?as_of ?instrument ?min_streak_days ?buildup_type
  public getStreaksController = async (req: Request, res: Response) => {
    try {
      const { as_of, instrument, min_streak_days, buildup_type } = req.query;

      const data = await this.getStreaksService({
        as_of: this.str(as_of),
        instrument: this.str(instrument),
        min_streak_days: this.int(min_streak_days, 3),
        buildup_type: buildup_type as any,
      });

      res.status(200).send({ success: true, data });
    } catch (err) {
      customErrorHandler(res, err);
    }
  };

  // ─── 9. Expiry Cycle Analysis ─────────────────────────────────────────────────
  // GET /api/dashboard/expiry-cycle
  // ?symbol (required) ?expiry_date (required) ?instrument
  public getExpiryCycleController = async (req: Request, res: Response) => {
    try {
      const { symbol, expiry_date, instrument } = req.query;

      if (!symbol || !expiry_date) {
        throw new ErrorHandler({
          status_code: 400,
          message: "symbol and expiry_date are required query params",
        });
      }

      const data = await this.getExpiryCycleService({
        symbol: symbol as string,
        expiry_date: expiry_date as string,
        instrument: this.str(instrument),
      });

      res.status(200).send({ success: true, data });
    } catch (err) {
      customErrorHandler(res, err);
    }
  };

  // ─── 10. Cross-Expiry Comparison ──────────────────────────────────────────────
  // GET /api/dashboard/cross-expiry/:symbol
  // ?date ?instrument
  public getCrossExpiryController = async (req: Request, res: Response) => {
    try {
      const { symbol } = req.params;
      const { date, instrument } = req.query;

      const data = await this.getCrossExpiryService({
        symbol,
        date: this.str(date),
        instrument: this.str(instrument),
      });

      res.status(200).send({ success: true, data });
    } catch (err) {
      customErrorHandler(res, err);
    }
  };

  // ─── Utility: available dates ─────────────────────────────────────────────────
  // GET /api/dashboard/dates ?instrument
  public getAvailableDatesController = async (req: Request, res: Response) => {
    try {
      const data = await this.getAvailableDatesService({
        instrument: this.str(req.query.instrument),
      });
      res.status(200).send({ success: true, data });
    } catch (err) {
      customErrorHandler(res, err);
    }
  };

  // ─── Utility: available symbols ───────────────────────────────────────────────
  // GET /api/dashboard/symbols ?instrument
  public getAvailableSymbolsController = async (
    req: Request,
    res: Response,
  ) => {
    try {
      const data = await this.getAvailableSymbolsService({
        instrument: this.str(req.query.instrument),
      });
      res.status(200).send({ success: true, data });
    } catch (err) {
      customErrorHandler(res, err);
    }
  };
}
