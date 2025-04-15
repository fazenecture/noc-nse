import * as dotenv from "dotenv";
dotenv.config(); // for local dev

import db from "./config/postgres";
import NSESyncService from "./service/sync.service";
import { SYNC_TYPE } from "./types/enums";

const { init } = new NSESyncService();

export const runJob = async () => {
  try {
    console.log("🐥 runJob: starting");

    const data = await init(SYNC_TYPE.DAILY_SYNC);

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (error: any) {
    console.error("Job failed:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  } finally {
    await db.close(); // ✅ Ensure pool is closed
  }
};
