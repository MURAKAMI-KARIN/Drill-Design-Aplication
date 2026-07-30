import { Router } from "express";
import { setService } from "../services/setService";

const router = Router();

// GET /api/sets - 特定のフォーメーションのセット一覧取得
router.get("/", async (req, res) => {
  try {
    const formationIdStr = req.query.formationId as string;
    if (!formationIdStr) {
      return res.status(400).json({ error: "formationId is required" });
    }
    const formationId = parseInt(formationIdStr);
    if (isNaN(formationId)) {
      return res.status(400).json({ error: "Invalid formationId" });
    }

    const sets = await setService.getSets(formationId);
    res.json(sets);
  } catch (error) {
    console.error("GET /api/sets error:", error);
    res.status(500).json({ error: "Failed to fetch sets" });
  }
});

// POST /api/sets - セット追加
router.post("/", async (req, res) => {
  try {
    const { formationId, counts } = req.body;
    if (!formationId) {
      return res.status(400).json({ error: "formationId is required" });
    }

    const fId = parseInt(formationId);
    const parsedCounts = counts ? parseInt(counts) : 16;

    const newSet = await setService.createSet(fId, parsedCounts);
    res.status(201).json(newSet);
  } catch (error) {
    console.error("POST /api/sets error:", error);
    res.status(500).json({ error: "Failed to create set" });
  }
});

// POST /api/sets/:id/duplicate - セット複製
router.post("/:id/duplicate", async (req, res) => {
  try {
    const sourceSetId = parseInt(req.params.id);
    if (isNaN(sourceSetId)) {
      return res.status(400).json({ error: "Invalid Source Set ID" });
    }

    const completeSet = await setService.duplicateSet(sourceSetId);
    if (!completeSet) {
      return res.status(404).json({ error: "Source set not found" });
    }

    res.status(201).json(completeSet);
  } catch (error) {
    console.error(`POST /api/sets/${req.params.id}/duplicate error:`, error);
    res.status(500).json({ error: "Failed to duplicate set" });
  }
});

// DELETE /api/sets/:id - セット削除
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }

    const result = await setService.deleteSet(id);
    if (!result) {
      return res.status(404).json({ error: "Set not found" });
    }

    res.json({ success: true, message: "Set deleted and numbers re-ordered" });
  } catch (error) {
    console.error(`DELETE /api/sets/${req.params.id} error:`, error);
    res.status(500).json({ error: "Failed to delete set" });
  }
});

// PUT /api/sets/:id - セット更新 (例: カウント数、BPM等)
router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }

    const { counts, bpm } = req.body;
    const updateData: { counts?: number; bpm?: number } = {};
    if (counts !== undefined) updateData.counts = parseInt(counts);
    if (bpm !== undefined) updateData.bpm = parseInt(bpm);

    const updated = await setService.updateSet(id, updateData);
    res.json(updated);
  } catch (error) {
    console.error(`PUT /api/sets/${req.params.id} error:`, error);
    res.status(500).json({ error: "Failed to update set" });
  }
});

export default router;
