import { Router } from "express";
import { memberService } from "../services/memberService";

const router = Router();

// GET /api/members - 部員一覧
router.get("/", async (req, res) => {
  try {
    const members = await memberService.getMembers();
    res.json(members);
  } catch (error) {
    console.error("GET /api/members error:", error);
    res.status(500).json({ error: "Failed to fetch members" });
  }
});

// POST /api/members - 部員追加
router.post("/", async (req, res) => {
  try {
    const { name, instrument, color, formationId } = req.body;
    if (!name || !instrument) {
      return res.status(400).json({ error: "Name and instrument are required" });
    }

    const parsedFormationId = formationId ? parseInt(formationId) : undefined;
    const newMember = await memberService.createMember(name, instrument, color, parsedFormationId);
    res.status(201).json(newMember);
  } catch (error) {
    console.error("POST /api/members error:", error);
    res.status(500).json({ error: "Failed to create member" });
  }
});

// PUT /api/members/:id - 部員更新
router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }

    const { name, instrument, color } = req.body;
    const updatedMember = await memberService.updateMember(id, { name, instrument, color });
    res.json(updatedMember);
  } catch (error) {
    console.error(`PUT /api/members/${req.params.id} error:`, error);
    res.status(500).json({ error: "Failed to update member" });
  }
});

// DELETE /api/members/:id - 部員削除
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }

    await memberService.deleteMember(id);
    res.json({ success: true, message: "Member deleted successfully" });
  } catch (error) {
    console.error(`DELETE /api/members/${req.params.id} error:`, error);
    res.status(500).json({ error: "Failed to delete member" });
  }
});

export default router;
