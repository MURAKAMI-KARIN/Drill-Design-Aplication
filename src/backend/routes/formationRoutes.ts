import { Router } from "express";
import { formationService } from "../services/formationService";

const router = Router();

// GET /api/formations - フォーメーション一覧取得
router.get("/", async (req, res) => {
  try {
    const formations = await formationService.getFormations();
    res.json(formations);
  } catch (error) {
    console.error("GET /api/formations error:", error);
    res.status(500).json({ error: "Failed to fetch formations" });
  }
});

// GET /api/formations/:id - フォーメーション詳細取得
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }

    const details = await formationService.getFormationDetails(id);
    if (!details) {
      return res.status(404).json({ error: "Formation not found" });
    }

    res.json(details);
  } catch (error) {
    console.error(`GET /api/formations/${req.params.id} error:`, error);
    res.status(500).json({ error: "Failed to fetch formation details" });
  }
});

// POST /api/formations - フォーメーション新規作成
router.post("/", async (req, res) => {
  try {
    const { title, music, bpm, style } = req.body;
    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    const parsedBpm = bpm ? parseInt(bpm) : 120;
    const newFormation = await formationService.createFormation(title, music, parsedBpm, style);
    res.status(201).json(newFormation);
  } catch (error) {
    console.error("POST /api/formations error:", error);
    res.status(500).json({ error: "Failed to create formation" });
  }
});

// DELETE /api/formations/:id - フォーメーション削除
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }

    await formationService.deleteFormation(id);
    res.json({ success: true, message: "Formation deleted successfully" });
  } catch (error) {
    console.error(`DELETE /api/formations/${req.params.id} error:`, error);
    res.status(500).json({ error: "Failed to delete formation" });
  }
});

// POST /api/formations/:id/save - 全一括保存
router.post("/:id/save", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid Formation ID" });
    }

    const result = await formationService.saveFormationEntire(id, req.body);
    res.json(result);
  } catch (error) {
    console.error(`POST /api/formations/${req.params.id}/save error:`, error);
    res.status(500).json({ error: "Failed to save entire formation" });
  }
});

export default router;
