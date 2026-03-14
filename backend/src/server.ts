import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import { userRouter } from "./routes/userRoutes.js";
import { authRouter } from "./routes/authRoutes.js";

const PORT = process.env["PORT"] ?? 8080;

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use("/user", userRouter);
app.use("/auth", authRouter);

app.listen(PORT, () => {
  console.log("Server started at: ", PORT);
});
