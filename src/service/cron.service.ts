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
      // cron.schedule("* * * * *", () => {
      // cron.schedule(
      //   "30 21 * * *",
      //   async () => {
      console.log("🚀 CRON: Started", new Date().toISOString());
      await this.nseSyncService.init(SYNC_TYPE.DAILY_SYNC);
      console.log("✅ CRON: Completed", new Date().toISOString());
      //   },
      //   {
      //     timezone: "Asia/Kolkata",
      //   }
      // );
    } catch (err: any) {
      console.log("❌ CRON: Error ", err);
      await alertSlack(this.errorMessage(err));
    }
  };
}
