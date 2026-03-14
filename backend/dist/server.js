import express from "express";
import { userRouter } from "./routes/userRoutes.js";
const PORT = 8080;
const app = express();
app.use(express.json());
app.use("/user", userRouter);
app.listen(PORT, () => {
    console.log("Server started at: ", PORT);
});
//# sourceMappingURL=server.js.map