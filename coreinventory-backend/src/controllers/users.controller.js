// src/controllers/users.controller.js
const bcrypt = require("bcryptjs");
const prisma = require("../utils/prisma");
const { success, created, error, paginated } = require("../utils/response");

// GET /api/users
const getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, role, isActive } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {};
    if (search) {
      where.OR = [
        { name:  { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }
    if (role)     where.role     = role;
    if (isActive !== undefined) where.isActive = isActive === "true";

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where, skip, take: Number(limit),
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
      }),
      prisma.user.count({ where }),
    ]);

    return paginated(res, users, total, page, limit);
  } catch (err) { next(err); }
};

// GET /api/users/:id
const getUser = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true, updatedAt: true },
    });
    if (!user) return error(res, "User not found.", 404);
    return success(res, user);
  } catch (err) { next(err); }
};

// POST /api/users  (admin creates user)
const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return error(res, "Email already in use.", 409);

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashed, role },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    return created(res, user, "User created.");
  } catch (err) { next(err); }
};

// PUT /api/users/:id
const updateUser = async (req, res, next) => {
  try {
    const { name, role, isActive } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { name, role, isActive },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });
    return success(res, user, "User updated.");
  } catch (err) { next(err); }
};

// DELETE /api/users/:id  (soft delete)
const deleteUser = async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) {
      return error(res, "Cannot deactivate your own account.", 400);
    }
    await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    return success(res, null, "User deactivated.");
  } catch (err) { next(err); }
};

// PUT /api/users/:id/reset-password  (admin resets)
const adminResetPassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: req.params.id },
      data: { password: hashed, otpCode: null, otpExpiresAt: null },
    });
    return success(res, null, "Password reset by admin.");
  } catch (err) { next(err); }
};

module.exports = { getUsers, getUser, createUser, updateUser, deleteUser, adminResetPassword };
