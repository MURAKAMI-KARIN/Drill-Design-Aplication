import { Router } from "express";
import { positionService } from "../services/positionService";

const router = Router();

// GET /api/positions - ポジション一覧取得
router.get("/", async (req, res) => {
  try {
    const setIdStr = req.query.setId as string;
    if (!setIdStr) {
      return res.status(400).json({ error: "setId query parameter is required" });
    }

    const setId = parseInt(setIdStr);
    if (isNaN(setId)) {
      return res.status(400).json({ error: "Invalid setId" });
    }

    const positions = await positionService.getPositions(setId);
    res.json(positions);
  } catch (error) {
    console.error("GET /api/positions error:", error);
    res.status(500).json({ error: "Failed to fetch positions" });
  }
});

// POST /api/positions - ポジション登録 / 更新 (upsert)
router.post("/", async (req, res) => {
  try {
    const { memberId, setId, x, y } = req.body;
    if (memberId === undefined || setId === undefined || x === undefined || y === undefined) {
      return res.status(400).json({ error: "memberId, setId, x, y are required" });
    }

    const mId = parseInt(memberId);
    const sId = parseInt(setId);
    const parsedX = parseFloat(x);
    const parsedY = parseFloat(y);

    if (isNaN(mId) || isNaN(sId) || isNaN(parsedX) || isNaN(parsedY)) {
      return res.status(400).json({ error: "Invalid parameters" });
    }

    const position = await positionService.upsertPosition(mId, sId, parsedX, parsedY);
    res.json(position);
  } catch (error) {
    console.error("POST /api/positions error:", error);
    res.status(500).json({ error: "Failed to upsert position" });
  }
});

// PATCH /api/positions/:id - 個別座標の更新
router.patch("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }

    const { x, y } = req.body;
    if (x === undefined && y === undefined) {
      return res.status(400).json({ error: "x or y value is required" });
    }

    const parsedX = x !== undefined ? parseFloat(x) : undefined;
    const parsedY = y !== undefined ? parseFloat(y) : undefined;

    const updatedPosition = await positionService.updatePosition(id, parsedX, parsedY);
    res.json(updatedPosition);
  } catch (error) {
    console.error(`PATCH /api/positions/${req.params.id} error:`, error);
    res.status(500).json({ error: "Failed to update position" });
  }
});

export default router;
