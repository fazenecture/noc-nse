import { SYNC_TYPE } from "../types/enums";
import NSESyncService from "./sync.service";
import cron from "node-cron";

export default class CRONService {
  nseSyncService: NSESyncService;
  constructor() {
    this.nseSyncService = new NSESyncService();
  }

  public execute = async () => {
    try {
      console.log("CRON: INIT");
      cron.schedule("2 * * * *", () => {
        // cron.schedule("30 15 * * *", () => {
        try {
          console.log("CRON: Starting");
          this.nseSyncService.init(SYNC_TYPE.DAILY_SYNC);
          console.log("CRON: Completed");
        } catch (err) {
          console.log("CRONError: ", err);
        }
      });
    } catch (err) {
      console.log("CRONError: ", err);
    }
  };
}
