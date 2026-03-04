import { EXECUTION_TYPE } from "../constants/nse";
import { SYNC_TYPE } from "../types/enums";
import { alertSlack } from "../utils/slack.utils";
import NSESyncService from "./sync.service";
import cron from "node-cron";

export default class CRONService {
  nseSyncService: NSESyncService;
  constructor() {
    this.nseSyncService = new NSESyncService();
  }

  private readonly errorMessage = (err) =>
    `:rotating_light: *Cron Failure* at ${new Date().toLocaleString()}\n\`\`\`${
      err.stack || err.message
    }\`\`\``;

  public execute = async () => {
    try {
      console.log("CRON: INIT");

      if (process.env?.EXECUTION_TYPE === EXECUTION_TYPE.ON_DEMAND) {
        // execute the cron job manually
        console.log("🚀 ON_DEMAND: Started", new Date().toISOString());
        await this.nseSyncService.init(SYNC_TYPE.DAILY_SYNC);
        console.log("✅ ON_DEMAND: Completed", new Date().toISOString());
        return;
      } else {
        // execute the job once before the cron job starts
        if (
          process.env?.EXECUTION_TYPE === EXECUTION_TYPE.ONE_SYNC_BEFORE_CRON
        ) {
          console.log(
            "🚀 ONE_SYNC_BEFORE_CRON: Started",
            new Date().toISOString(),
          );
          await this.nseSyncService.init(SYNC_TYPE.DAILY_SYNC);
          console.log(
            "✅ ONE_SYNC_BEFORE_CRON: Completed",
            new Date().toISOString(),
          );
        }

        cron.schedule(
          "30 21 * * *",
          async () => {
            console.log("🚀 CRON: Started", new Date().toISOString());
            await this.nseSyncService.init(SYNC_TYPE.DAILY_SYNC);
            console.log("✅ CRON: Completed", new Date().toISOString());
          },
          {
            timezone: "Asia/Kolkata",
          },
        );
      }

      // cron.schedule("* * * * *", () => {
    } catch (err: any) {
      console.log("❌ CRON: Error ", err);
      await alertSlack(this.errorMessage(err));
    }
  };
}
