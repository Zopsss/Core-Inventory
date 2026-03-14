import type { User } from "../types/authTypes.js";
import crypto from "crypto";

// In-memory user store — replace with a real database later
const users = new Map<string, User>();

// Store for password reset tokens: token → { email, expiresAt }
const resetTokens = new Map<
  string,
  { email: string; expiresAt: Date }
>();

export function createUser(
  email: string,
  hashedPassword: string,
  name: string
): User {
  const user: User = {
    id: crypto.randomUUID(),
    email: email.toLowerCase(),
    password: hashedPassword,
    name,
    createdAt: new Date(),
  };
  users.set(user.email, user);
  return user;
}

export function findUserByEmail(email: string): User | undefined {
  return users.get(email.toLowerCase());
}

export function updateUserPassword(
  email: string,
  newHashedPassword: string
): boolean {
  const user = users.get(email.toLowerCase());
  if (!user) return false;
  user.password = newHashedPassword;
  return true;
}

export function storeResetToken(email: string, token: string): void {
  resetTokens.set(token, {
    email: email.toLowerCase(),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
  });
}

export function verifyResetToken(
  token: string
): { email: string } | null {
  const entry = resetTokens.get(token);
  if (!entry) return null;
  if (entry.expiresAt < new Date()) {
    resetTokens.delete(token);
    return null;
  }
  resetTokens.delete(token); // single use
  return { email: entry.email };
}
