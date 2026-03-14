import type { User } from "../generated/prisma/client.js";
import prisma from "./prismaClient.js";

// In-memory store for password reset tokens (short-lived, no DB model needed)
const resetTokens = new Map<
  string,
  { email: string; expiresAt: Date }
>();

export async function createUser(
  email: string,
  hashedPassword: string,
  name: string
): Promise<User> {
  return prisma.user.create({
    data: {
      email: email.toLowerCase(),
      password: hashedPassword,
      name,
    },
  });
}

export async function findUserByEmail(
  email: string
): Promise<User | null> {
  return prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
}

export async function updateUserPassword(
  email: string,
  newHashedPassword: string
): Promise<boolean> {
  try {
    await prisma.user.update({
      where: { email: email.toLowerCase() },
      data: { password: newHashedPassword },
    });
    return true;
  } catch {
    return false;
  }
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
