import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import type { JwtPayload } from "../types/authTypes.js";

const SALT_ROUNDS = 10;

function getJwtSecret(): string {
  const secret = process.env["JWT_SECRET"];
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }
  return secret;
}

function getJwtExpiresIn(): string {
  return process.env["JWT_EXPIRES_IN"] ?? "7d";
}

export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

export async function comparePassword(
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}

export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: getJwtExpiresIn() as unknown as number,
  });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, getJwtSecret()) as JwtPayload;
}

export function generateResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}
