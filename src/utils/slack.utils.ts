import axios from "axios";

const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK_URL ?? "";

export const alertSlack = async (text: string) => {
  try {
    await axios.post(SLACK_WEBHOOK, { text });
  } catch (err: any) {
    console.error("❌ Failed to send Slack alert:", err.message || err);
  }
};
