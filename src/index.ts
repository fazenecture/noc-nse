import * as dotenv from "dotenv";
dotenv.config();
import morgan from "morgan";
import express, { Application } from "express";
import cors from "cors";
import baseRouter from "./routes/index.routes";
import CRONService from "./service/cron.service";
import { Request, Response } from "express";

const app: Application = express();

const allowedOrigins = [
  "*"
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl)
      console.log("origin: ", origin);
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

app.use(express.json());
app.set("trust proxy", true);
app.use(morgan("dev"));

app.use("/api", baseRouter);

app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    uptime: process.uptime(),
    hrtime: process.hrtime(),
  });
});

app.use("*", (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "NOT_FOUND",
  });
});

const PORT = process.env.PORT || 4000;

const init = async () => {
  await new CRONService().execute();
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
};

init();
