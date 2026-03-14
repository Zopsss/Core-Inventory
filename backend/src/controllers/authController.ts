import type { Request, Response } from "express";
import {
  hashPassword,
  comparePassword,
  generateToken,
  generateResetToken,
} from "../utils/authUtils.js";
import {
  createUser,
  findUserByEmail,
  storeResetToken,
} from "../utils/userStore.js";
import type {
  SignupBody,
  LoginBody,
  ForgotPasswordBody,
} from "../types/authTypes.js";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env["NODE_ENV"] === "production",
  sameSite: "strict" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export async function signup(
  req: Request<object, object, SignupBody>,
  res: Response,
): Promise<void> {
  const { name, email, password } = req.body;

  // Validate required fields
  if (!name || !email || !password) {
    res.status(400).json({ message: "Name, email, and password are required" });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ message: "Password must be at least 6 characters" });
    return;
  }

  // Check if user already exists
  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    res.status(409).json({ message: "Email is already registered" });
    return;
  }

  // Hash password and create user
  const hashedPassword = await hashPassword(password);
  const user = await createUser(email, hashedPassword, name);

  // Generate JWT and set cookie
  const token = generateToken({ userId: user.id, email: user.email });
  res.cookie("token", token, COOKIE_OPTIONS);

  res.status(201).json({
    message: "User created successfully",
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    },
  });
}

export async function login(
  req: Request<object, object, LoginBody>,
  res: Response,
): Promise<void> {
  const { email, password } = req.body;

  // Validate required fields
  if (!email || !password) {
    res.status(400).json({ message: "Email and password are required" });
    return;
  }

  // Find user
  const user = await findUserByEmail(email);
  if (!user) {
    res.status(401).json({ message: "Invalid email or password" });
    return;
  }

  // Compare password
  const isMatch = await comparePassword(password, user.password);
  if (!isMatch) {
    res.status(401).json({ message: "Invalid email or password" });
    return;
  }

  // Generate JWT and set cookie
  const token = generateToken({ userId: user.id, email: user.email });
  res.cookie("token", token, COOKIE_OPTIONS);

  res.status(200).json({
    message: "Logged in successfully",
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    },
  });
}

export function logout(_req: Request, res: Response): void {
  res.clearCookie("token", COOKIE_OPTIONS);
  res.status(200).json({ message: "Logged out successfully" });
}

export async function forgotPassword(
  req: Request<object, object, ForgotPasswordBody>,
  res: Response,
): Promise<void> {
  const { email } = req.body;

  if (!email) {
    res.status(400).json({ message: "Email is required" });
    return;
  }

  const user = await findUserByEmail(email);

  // Always return success to prevent email enumeration
  if (!user) {
    res.status(200).json({
      message:
        "If an account with that email exists, a password reset link has been sent",
    });
    return;
  }

  // Generate reset token
  const resetToken = generateResetToken();
  storeResetToken(email, resetToken);

  // Log to console (replace with email service in production)
  console.log(`\n🔑 Password reset token for ${email}: ${resetToken}\n`);

  res.status(200).json({
    message:
      "If an account with that email exists, a password reset link has been sent",
  });
}
