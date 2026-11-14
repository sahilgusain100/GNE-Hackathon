import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { User } from "../models/user.model.js";

const { BOOTSTRAP_ADMIN_NAME, BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_PASSWORD } = process.env;

async function createInitialAdmin() {
  if (!BOOTSTRAP_ADMIN_NAME?.trim() || !BOOTSTRAP_ADMIN_EMAIL?.trim() || !BOOTSTRAP_ADMIN_PASSWORD) {
    throw new Error(
      "Set BOOTSTRAP_ADMIN_NAME, BOOTSTRAP_ADMIN_EMAIL, and BOOTSTRAP_ADMIN_PASSWORD before running this command.",
    );
  }

  if (BOOTSTRAP_ADMIN_PASSWORD.length < 12) {
    throw new Error("The initial admin password must be at least 12 characters long.");
  }

  await connectDB();

  if (await User.exists({ accountType: "admin" })) {
    throw new Error("An admin account already exists; initial admin creation is one-time only.");
  }

  const email = BOOTSTRAP_ADMIN_EMAIL.trim().toLowerCase();
  if (await User.exists({ email })) {
    throw new Error("The configured admin email already belongs to an account.");
  }

  const admin = await User.create({
    name: BOOTSTRAP_ADMIN_NAME.trim(),
    email,
    password: BOOTSTRAP_ADMIN_PASSWORD,
    accountType: "admin",
    isVerified: true,
    isActive: true,
  });

  console.log(`Initial admin account created for ${admin.email}.`);
}

createInitialAdmin()
  .catch((error) => {
    console.error("Initial admin creation failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
