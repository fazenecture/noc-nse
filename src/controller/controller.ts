import NSEService from "../service/service";
import { Request, Response } from "express";
import customErrorHandler from "../utils/custom.error.handler";

export default class NSEController extends NSEService {
  public fetchOIDifferenceData = async (req: Request, res: Response) => {
    try {
      const { type, year } = req.query;
      const data = this.fetchOIDifferenceService({
        type: type ?? null,
        year: year ?? new Date().getFullYear(),
      });

      res.status(200).send({
        success: true,
        data,
      });
    } catch (err) {
      customErrorHandler(err, res);
    }
  };
}
