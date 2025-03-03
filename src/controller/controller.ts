import NSEService from "../service/service";
import { Request, Response } from "express";
import customErrorHandler from "../utils/custom.error.handler";

export default class NSEController extends NSEService {
  public fetchOIDifferenceDataController = async (
    req: Request,
    res: Response
  ) => {
    try {
      const { type, year } = req.query;
      console.time("Starting The Dig 🚨");
      const data = await this.fetchOIDifferenceService({
        type: type?.toString() ?? null,
        year: parseInt(year?.toString() ?? "2025", 10),
      });
      console.timeEnd("Ending The Dig 🚨");

      res.status(200).send({
        success: true,
        data,
      });
    } catch (err: any) {
      customErrorHandler(err, res);
    }
  };
}
