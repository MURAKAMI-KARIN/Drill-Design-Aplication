import express from "express";
import { checkAndRecoverDatabase } from "./db/prisma";
import formationRoutes from "./routes/formationRoutes";
import memberRoutes from "./routes/memberRoutes";
import setRoutes from "./routes/setRoutes";
import positionRoutes from "./routes/positionRoutes";

export const app = express();

app.use(express.json());

// Ensure database is healthy and seeded before handling API requests
app.use("/api", async (req, res, next) => {
  try {
    await checkAndRecoverDatabase();
  } catch (err) {
    console.error("DB check error:", err);
  }
  next();
});

// --- 3-Tier Backend API Routes ---
app.use("/api/formations", formationRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/sets", setRoutes);
app.use("/api/positions", positionRoutes);
