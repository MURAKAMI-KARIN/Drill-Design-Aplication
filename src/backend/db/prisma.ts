import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

if (isVercel) {
  process.env.DATABASE_URL = "file:/tmp/dev.db";
  try {
    if (!fs.existsSync("/tmp/dev.db")) {
      const sourceDb = path.join(process.cwd(), "prisma", "dev.db");
      if (fs.existsSync(sourceDb)) {
        fs.copyFileSync(sourceDb, "/tmp/dev.db");
        console.log("✅ Copied initial dev.db to /tmp/dev.db for Vercel serverless environment");
      }
    }
  } catch (err) {
    console.error("⚠️ Failed to copy dev.db to /tmp:", err);
  }
} else if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "file:./dev.db";
}

export const prisma = new PrismaClient();

let isResetting = false;

export async function checkAndRecoverDatabase(): Promise<boolean> {
  if (isResetting) return true;
  try {
    const dbPath = isVercel
      ? "/tmp/dev.db"
      : path.join(process.cwd(), "prisma", "dev.db");

    if (isVercel && !fs.existsSync(dbPath)) {
      const sourceDb = path.join(process.cwd(), "prisma", "dev.db");
      if (fs.existsSync(sourceDb)) {
        fs.copyFileSync(sourceDb, "/tmp/dev.db");
      }
    }

    const isEmptyFile = !fs.existsSync(dbPath) || fs.statSync(dbPath).size === 0;
    if (isEmptyFile) {
      if (!isVercel) {
        throw new Error("Database file is missing or 0 bytes (uninitialized). Triggering schema push.");
      }
    }

    // Attempt a lightweight read query to check database integrity
    await prisma.$queryRawUnsafe("PRAGMA quick_check;");
    const count = await prisma.member.count();
    const formationCount = await prisma.formation.count();
    
    // Auto-seed if database is completely empty
    if (count === 0 && formationCount === 0) {
      await seedDefaultDataIfEmpty();
    }
    return true;
  } catch (error: any) {
    const errorStr =
      String(error?.message || "") +
      " " +
      String(error || "") +
      " " +
      String(error?.code || "") +
      " " +
      String(error?.meta?.table || "");
    console.warn("⚠️ Corrupted or uninitialized SQLite database detected:", errorStr);
    
    if (
      !isVercel &&
      (error?.code === "P2021" ||
      error?.code === "P2022" ||
      errorStr.includes("malformed") ||
      errorStr.includes("disk image") ||
      errorStr.includes("no such table") ||
      errorStr.includes("does not exist") ||
      errorStr.includes("P2021") ||
      errorStr.includes("SqliteError") ||
      errorStr.includes("unable to open database file") ||
      errorStr.includes("uninitialized"))
    ) {
      isResetting = true;
      try {
        console.log("🔄 Recreating database and resetting schema...");
        try {
          await prisma.$disconnect();
        } catch (_) {}

        const dbDir = path.join(process.cwd(), "prisma");
        
        // Remove corrupted files
        ["dev.db", "dev.db-journal", "dev.db-wal", "dev.db-shm"].forEach((file) => {
          const fp = path.join(dbDir, file);
          if (fs.existsSync(fp)) {
            try { fs.unlinkSync(fp); } catch (e) { console.error(`Failed to remove ${file}:`, e); }
          }
        });

        // Recreate using prisma db push
        execSync("npx prisma db push --accept-data-loss", { stdio: "inherit" });
        await prisma.$connect();
        await seedDefaultDataIfEmpty();
        console.log("✅ Database successfully recovered and seeded!");
        return true;
      } catch (recoveryErr) {
        console.error("❌ Failed to recover database:", recoveryErr);
        return false;
      } finally {
        isResetting = false;
      }
    }
    return false;
  }
}

export async function seedDefaultDataIfEmpty() {
  try {
    const memberCount = await prisma.member.count();
    if (memberCount > 0) return;

    console.log("🌱 Seeding default members and sample formation...");
    const defaultMembers = [
      { name: "Flute 1", instrument: "Flute", color: "#EC4899" },
      { name: "Flute 2", instrument: "Flute", color: "#EC4899" },
      { name: "Clarinet 1", instrument: "Clarinet", color: "#8B5CF6" },
      { name: "Clarinet 2", instrument: "Clarinet", color: "#8B5CF6" },
      { name: "Alto Sax 1", instrument: "Saxophone", color: "#F59E0B" },
      { name: "Alto Sax 2", instrument: "Saxophone", color: "#F59E0B" },
      { name: "Trumpet 1", instrument: "Trumpet", color: "#EF4444" },
      { name: "Trumpet 2", instrument: "Trumpet", color: "#EF4444" },
      { name: "Trombone 1", instrument: "Trombone", color: "#3B82F6" },
      { name: "Trombone 2", instrument: "Trombone", color: "#3B82F6" },
      { name: "Sousaphone 1", instrument: "Sousaphone", color: "#10B981" },
      { name: "Snare 1", instrument: "Percussion", color: "#6366F1" },
    ];

    const createdMembers = [];
    for (const m of defaultMembers) {
      const created = await prisma.member.create({ data: m });
      createdMembers.push(created);
    }

    // ユーザー作成の「大学」テンプレート仕様を用いた初期デモコンテ
    const univStyle = {
      fieldWidth: 150,
      fieldHeight: 150,
      markingShape: "cross",
      markingIntervalX: 10,
      markingIntervalY: 10,
      markingCountX: 15,
      markingCountY: 15,
      backgroundColor: "#ffffff",
      markerColor: "#000000",
      showYardLines: false,
      showYardNumbers: true,
      showGridLines: true,
      customMarkers: JSON.stringify([
        { id: "cm_1", x: 0.3, y: 0.3 },
        { id: "cm_2", x: 0.5, y: 0.7 },
        { id: "cm_3", x: 0.7, y: 0.5 },
        { id: "cm_4", x: 0.3, y: 0.5 },
        { id: "cm_5", x: 0.5, y: 0.3 },
        { id: "cm_6", x: 0.7, y: 0.7 },
        { id: "cm_7", x: 0.3, y: 0.7 },
        { id: "cm_8", x: 0.7, y: 0.3 },
        { id: "cm_9", x: 0.7, y: 0.10666666666666667, shape: "t_down" },
        { id: "cm_10", x: 0.5, y: 0.10666666666666667, shape: "t_down" },
        { id: "cm_11", x: 0.3, y: 0.10666666666666667, shape: "t_down" },
        { id: "cm_12", x: 0.1, y: 0.1, shape: "l_top_left" },
        { id: "cm_13", x: 0.10666666666666667, y: 0.3, shape: "t_right" },
        { id: "cm_14", x: 0.10666666666666667, y: 0.7, shape: "t_right" },
        { id: "cm_15", x: 0.10666666666666667, y: 0.5, shape: "t_right" },
        { id: "cm_16", x: 0.9, y: 0.1, shape: "l_top_right" },
        { id: "cm_17", x: 0.8933333333333333, y: 0.3, shape: "t_left" },
        { id: "cm_18", x: 0.8933333333333333, y: 0.5, shape: "t_left" },
        { id: "cm_19", x: 0.9, y: 0.9, shape: "l_bottom_right" },
        { id: "cm_20", x: 0.8933333333333333, y: 0.7, shape: "t_left" },
        { id: "cm_21", x: 0.1, y: 0.9, shape: "l_bottom_left" },
        { id: "cm_22", x: 0.5, y: 0.9, shape: "t_up" },
        { id: "cm_23", x: 0.3, y: 0.9, shape: "t_up" },
        { id: "cm_24", x: 0.7, y: 0.9, shape: "t_up" },
        { id: "cm_25", x: 0.5, y: 0.5 },
      ]),
    };

    const formation = await prisma.formation.create({
      data: {
        title: "大学フィールド・オープニングショー",
        music: "カレッジ・ファンファーレ＆マーチ",
        bpm: 132,
        ...univStyle,
      },
    });

    const set1 = await prisma.set.create({
      data: { formationId: formation.id, number: 1, counts: 16, bpm: 132 },
    });
    const set2 = await prisma.set.create({
      data: { formationId: formation.id, number: 2, counts: 16, bpm: 132 },
    });

    // Positions for Set 1 (Horizontal line) and Set 2 (Circle)
    for (let i = 0; i < createdMembers.length; i++) {
      const t = i / (createdMembers.length - 1);
      await prisma.position.create({
        data: {
          memberId: createdMembers[i].id,
          setId: set1.id,
          x: 0.2 + 0.6 * t,
          y: 0.5,
        },
      });

      const angle = (i / createdMembers.length) * 2 * Math.PI;
      await prisma.position.create({
        data: {
          memberId: createdMembers[i].id,
          setId: set2.id,
          x: 0.5 + 0.2 * Math.cos(angle),
          y: 0.5 + 0.35 * Math.sin(angle),
        },
      });
    }
    console.log("✅ Default seed data created successfully!");
  } catch (err) {
    console.error("❌ Error during default seeding:", err);
  }
}

