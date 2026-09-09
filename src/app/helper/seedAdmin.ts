import { Role } from "@prisma/client";
import config from "../config/index.js";
import { prisma } from "../shared/prisma.js";
import * as bcrypt from "bcryptjs";

export const seedAdmin = async () => {
  try {
    if (!config.admin.email || !config.admin.password) {
      throw new Error("ADMIN_EMAIL or ADMIN_PASSWORD is missing in config.");
    }

    const existingAdmin = await prisma.user.findUnique({
      where: {
        email: config.admin.email,
      },
    });

    if (existingAdmin) {
      console.log("✅ Admin already exists.");
      return;
    }

    const hashedPassword = await bcrypt.hash(
      config.admin.password,
      Number(config.bcrypt_salt_rounds) || 10
    );

    await prisma.user.create({
      data: {
        name: "System Administrator",
        email: config.admin.email,
        password: hashedPassword,
        role: Role.ADMIN,
        isEmailVerified: true,
        isActive: true,
      },
    });

    console.log("🎉 Admin seeded successfully!");
    console.log({
      email: config.admin.email,
      password: config.admin.password,
      role: "ADMIN",
    });
  } catch (error: any) {
    console.error("❌ Failed to seed admin:", error.message);
  } finally {
    await prisma.$disconnect();
  }
};

seedAdmin();