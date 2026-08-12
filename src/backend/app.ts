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

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("API error caught in middleware:", err);
  const errStr = String(err?.message || "") + " " + String(err || "");
  if (
    errStr.includes("malformed") ||
    errStr.includes("disk image") ||
    errStr.includes("P2010") ||
    errStr.includes("Code: 11")
  ) {
    checkAndRecoverDatabase()
      .then(() => {
        res.status(500).json({ error: "Database disk image was corrupt and has been auto-recovered. Please retry your request." });
      })
      .catch(() => {
        res.status(500).json({ error: "Database error occurred." });
      });
    return;
  }
  res.status(500).json({ error: err?.message || "Internal Server Error" });
});
