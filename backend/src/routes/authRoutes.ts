import express from "express";
import {
  signup,
  login,
  logout,
  forgotPassword,
} from "../controllers/authController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const authRouter = express.Router();

authRouter.post("/signup", signup);
authRouter.post("/login", login);
authRouter.post("/logout", logout);
authRouter.post("/forgot-password", forgotPassword);

// Protected route — returns current user info
authRouter.get("/me", authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

export { authRouter };
