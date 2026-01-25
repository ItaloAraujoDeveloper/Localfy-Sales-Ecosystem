import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

const DEFAULT_ADMIN_EMAIL = "admin@localfy.com";
const DEFAULT_ADMIN_PASSWORD = "admin123";

export async function seedDefaultAdmin() {
  try {
    const [existingAdmin] = await db
      .select()
      .from(users)
      .where(eq(users.email, DEFAULT_ADMIN_EMAIL))
      .limit(1);

    if (existingAdmin) {
      console.log("[seed] Admin user already exists");
      return;
    }

    const passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);

    await db.insert(users).values({
      email: DEFAULT_ADMIN_EMAIL,
      passwordHash,
      firstName: "Administrador",
      lastName: "Localfy",
      isAdmin: true,
    });

    console.log("[seed] Default admin user created: admin@localfy.com / admin123");
  } catch (error) {
    console.error("[seed] Error creating default admin:", error);
  }
}
