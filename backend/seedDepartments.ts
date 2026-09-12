
import mongoose from "mongoose";
import Department from "./src/models/Department.ts";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/cms";

async function seed() {
  console.log("Connecting to:", MONGO_URI);
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  const departments = [
    { name: "Computer Science & Engineering", courses: ["B.Tech CS", "M.Tech CS"] },
    { name: "Electronics & Communication", courses: ["B.Tech ECE"] },
    { name: "Mechanical Engineering", courses: ["B.Tech ME"] },
    { name: "School of Management", courses: ["MBA", "BBA"] },
  ];

  for (const dept of departments) {
    await Department.findOneAndUpdate(
      { name: dept.name },
      dept,
      { upsert: true, new: true }
    );
  }

  console.log("Departments seeded successfully");
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
