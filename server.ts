import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

import { checkAndRecoverDatabase } from "./src/backend/db/prisma";
import formationRoutes from "./src/backend/routes/formationRoutes";
import memberRoutes from "./src/backend/routes/memberRoutes";
import setRoutes from "./src/backend/routes/setRoutes";
import positionRoutes from "./src/backend/routes/positionRoutes";

const app = express();
const PORT = 3000;

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

// --- Vite Middleware or Static Files Hosting ---
async function startServer() {
  await checkAndRecoverDatabase();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

