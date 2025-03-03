import * as dotenv from "dotenv";
dotenv.config();
import morgan from "morgan";
import express, { Application } from "express";
import cors from "cors";
import baseRouter from "./routes/index.routes";

const app: Application = express();

app.use(cors());
app.use(express.json());
app.set("trust proxy", true);
app.use(morgan("dev"));

app.use("/api", baseRouter);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
