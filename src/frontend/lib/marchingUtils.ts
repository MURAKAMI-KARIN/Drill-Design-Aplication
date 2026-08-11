// マーチングドリル計算ユーティリティ

// フィールド全体の歩数設定 (8 to 5: 5ヤード=8歩。すなわち1ヤード=1.6歩)
// 横幅：80ヤード (10ヤード〜90ヤード) = 128歩
export const TOTAL_X_STEPS = 128;
// 縦幅：40ヤード = 64歩
export const TOTAL_Y_STEPS = 64;

/**
 * 2つの座標間の移動歩数を計算する
 */
export function calculateMoveInstructions(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  counts: number,
  totalXSteps: number = 128,
  totalYSteps: number = 64
) {
  const dx = x2 - x1;
  const dy = y2 - y1;

  const xSteps = dx * totalXSteps;
  const ySteps = dy * totalYSteps;

  // xSteps > 0 -> 右、xSteps < 0 -> 左
  // ySteps > 0 -> 後ろ(バックステージ側)、ySteps < 0 -> 前(フロントステージ側)

  const hDir = xSteps >= 0 ? "右" : "左";
  const vDir = ySteps >= 0 ? "後ろ" : "前";

  const hStepsAbs = Math.abs(Math.round(xSteps * 10) / 10);
  const vStepsAbs = Math.abs(Math.round(ySteps * 10) / 10);

  return {
    hDir,
    hSteps: hStepsAbs,
    vDir,
    vSteps: vStepsAbs,
    counts,
    formatted: `${hDir} ${hStepsAbs}歩、${vDir} ${vStepsAbs}歩、${counts}カウント`,
  };
}

/**
 * 現在の位置の「ドット（座標）」を歩数・ポイント表記に翻訳する
 * 例: 「中央から左へ 8.0歩 / 手前から 16.0歩」
 */
export function getYardLocationDescription(
  x: number,
  y: number,
  totalXSteps: number = 128,
  totalYSteps: number = 64
): string {
  // 1. X方向の計算 (中央基準)
  const xDiffSteps = (x - 0.5) * totalXSteps;
  const xStepsAbs = Math.abs(Math.round(xDiffSteps * 10) / 10);

  let xDesc = "";
  if (xStepsAbs < 0.1) {
    xDesc = "中央";
  } else if (xDiffSteps < 0) {
    xDesc = `中央から左へ ${xStepsAbs}歩`;
  } else {
    xDesc = `中央から右へ ${xStepsAbs}歩`;
  }

  // 2. Y方向の計算 (手前基準)
  const ySteps = Math.round(y * totalYSteps * 10) / 10;
  let yDesc = `手前から ${ySteps}歩`;

  return `${xDesc} / ${yDesc}`;
}

/**
 * 全角・半角・大文字・小文字、全角スペースなどを整えて指示テキストを正規化する
 */
export function normalizeInstructionText(text: string): string {
  if (!text) return "";
  // 1. 全角英数を半角英数に変換 (０-９, Ａ-Ｚ, ａ-ｚ)
  let s = text.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
  // 2. 全角スペースを半角スペースに変換
  s = s.replace(/　/g, " ");
  // 3. 全角の括弧や記号を半角に
  s = s.replace(/（/g, "(").replace(/）/g, ")").replace(/：/g, ":").replace(/[−―‐ー–—−]/g, "-");
  return s;
}

/**
 * 式の中に含まれる変数 x を実数値に置換し、四則演算 (例: (10-x)) を計算して解決する
 */
export function evaluateInstructionFormula(text: string, xVal: number): string {
  if (!text) return "";
  
  const normalized = normalizeInstructionText(text);

  // 大文字小文字の X を数値に置換 (全角半角両方)
  let substituted = normalized.replace(/[xXｘＸ]/g, String(xVal));

  // カッコに囲まれた演算を評価 (無限ループ防止のため、文字列直接チェックで安全に繰返し)
  let iterations = 0;
  while (substituted.includes("(") && iterations < 10) {
    const before = substituted;
    substituted = substituted.replace(/\(([^()]+)\)/g, (match, expr) => {
      try {
        if (/^[0-9+\-*/.\s]+$/.test(expr)) {
          const evalResult = Function(`"use strict"; return (${expr})`)();
          return String(evalResult);
        }
      } catch (e) {
        console.error("Formula evaluation failed for expression:", expr, e);
      }
      return match;
    });
    if (substituted === before) break;
    iterations++;
  }

  // カッコのない四則演算式 (例: 8-2 や 16-3.5) を評価・計算
  substituted = substituted.replace(/\b\d+(?:\.\d+)?(?:\s*[-+*/]\s*\d+(?:\.\d+)?)+\b/g, (match) => {
    try {
      const evalResult = Function(`"use strict"; return (${match})`)();
      return String(evalResult);
    } catch (e) {
      return match;
    }
  });

  return substituted;
}

export interface ParsedMotionCommand {
  type: "halt" | "build";
  counts: number;
}

/**
 * 指示テキストから動きのコマンド (Halt / Build とそれぞれのカウント数) を順番に抽出する
 */
export function parseMotionCommands(resolvedText: string): ParsedMotionCommand[] {
  if (!resolvedText) return [];

  const text = normalizeInstructionText(resolvedText);
  const commands: ParsedMotionCommand[] = [];

  // 1. "build 8", "halt 8", "b8", "h8", "mt8", "float 8", "action 8", "ホルト8", "ビルド8" など (スペース有無・大文字小文字・連続表記問わず)
  const cmdRegex = /(halt|build|action|float|marktime|mark-time|m\.t\b|m\.t\.|mt|ホルト|ビルド|フロート|静止|移動|前進|進行|動き|動|b|h)\s*:?\s*\(?\s*(\d+(?:\.\d+)?)/gi;
  let match;

  while ((match = cmdRegex.exec(text)) !== null) {
    const keyword = match[1].toLowerCase();
    const isHalt = (
      keyword.includes("halt") ||
      keyword.includes("ホルト") ||
      keyword.includes("静止") ||
      keyword.includes("mark") ||
      keyword.includes("m.t") ||
      keyword === "mt" ||
      keyword === "h"
    );
    const type = isHalt ? "halt" : "build";
    const countsVal = parseFloat(match[2]);
    if (!isNaN(countsVal) && countsVal > 0) {
      commands.push({ type, counts: countsVal });
    }
  }

  // 2. 数字 + 歩 / カウント などの簡易表記 (例: "8歩", "16カウント")
  if (commands.length === 0) {
    const simpleNumRegex = /(\d+(?:\.\d+)?)\s*(?:歩|カウント|cts|ct|c)/gi;
    while ((match = simpleNumRegex.exec(text)) !== null) {
      const countsVal = parseFloat(match[1]);
      if (!isNaN(countsVal) && countsVal > 0) {
        commands.push({ type: "build", counts: countsVal });
      }
    }
  }

  return commands;
}

/**
 * 指定されたテキストから動きのカウントを合計し、期待されるカウント数と一致するか検証します。
 */
export function validateInstructionCounts(resolvedText: string, expectedCounts: number): { isValid: boolean; message: string; sum: number } | null {
  if (!resolvedText) return null;

  const commands = parseMotionCommands(resolvedText);
  if (commands.length === 0) return null;

  const sum = commands.reduce((acc, c) => acc + c.counts, 0);

  if (Math.abs(sum - expectedCounts) > 0.001) {
    const diff = expectedCounts - sum;
    const message = diff > 0 
      ? `動きが ${diff} カウント不足（計${sum}/${expectedCounts}）`
      : `動きが ${Math.abs(diff)} カウント過剰（計${sum}/${expectedCounts}）`;
    return {
      isValid: false,
      message,
      sum,
    };
  }

  return {
    isValid: true,
    message: "カウント数一致",
    sum,
  };
}

/**
 * 楽器名から規定の省略名（プレフィックス）を取得する
 */
export function getInstrumentPrefix(instrument: string): string {
  if (!instrument) return "";
  const norm = instrument.trim().toLowerCase();

  if (norm.includes("flute") || norm.includes("フルート") || norm === "fl") return "Fl";
  if (norm.includes("clarinet") || norm.includes("クラリネット") || norm === "cl") return "Cl";
  if (norm.includes("alto") || norm.includes("アルト") || norm === "as") return "AS";
  if (norm.includes("tenor") || norm.includes("テナー") || norm === "ts") return "TS";
  if (norm.includes("trumpet") || norm.includes("トランペット") || norm === "tp") return "Tp";
  if (norm.includes("trombone") || norm.includes("トロンボーン") || norm === "tb") return "Tb";
  if (norm.includes("sousa") || norm.includes("スーザ") || norm.includes("tuba") || norm.includes("チューバ") || norm === "sou") return "Sou";
  if (norm.includes("euph") || norm.includes("ユーフォ") || norm === "eu") return "Eu";
  if (norm.includes("horn") || norm.includes("ホルン") || norm === "hr") return "Hr";
  if (norm.includes("snare") || norm.includes("スネア") || norm === "sd") return "SD";
  if (norm.includes("cymbal") || norm.includes("シンバル") || norm === "cym") return "Cym";
  if (norm.includes("bass") || norm.includes("バス") || norm === "bd") return "BD";
  if (norm.includes("quint") || norm.includes("クイント") || norm === "qt") return "QT";
  if (norm.includes("guard") || norm.includes("ガード") || norm.includes("color guard") || norm === "cg") return ""; // カラーガードは通し番号のみ

  if (norm.includes("major") || norm.includes("メジャー")) return "DM";

  return instrument.replace(/[^a-zA-Z]/g, "").slice(0, 3) || instrument.slice(0, 2);
}

/**
 * メンバーの有効な表示名（例: Tp1, Fl2, QT, 1 など）を計算する。
 * 1. memberCustomLabels に設定があればそれを使用
 * 2. m.label に設定があればそれを使用
 * 3. 未設定の場合は同パート(楽器)内での順序に基づき自動計算（例: 1番目のTrumpetなら "Tp1"）
 */
export function getEffectiveMemberLabel(
  m: { id: number; instrument: string; label?: string; name?: string },
  members: { id: number; instrument: string; label?: string; name?: string }[],
  memberCustomLabels?: Record<number, string>
): string {
  if (memberCustomLabels && memberCustomLabels[m.id] && memberCustomLabels[m.id].trim()) {
    return memberCustomLabels[m.id].trim();
  }
  if (m.label && m.label.trim()) {
    return m.label.trim();
  }

  const prefix = getInstrumentPrefix(m.instrument);

  if (prefix === "QT" || m.instrument.trim().toLowerCase().includes("quint") || m.instrument.trim().toLowerCase().includes("クイント")) {
    return "QT";
  }

  const sameInstMembers = members.filter((other) => {
    const otherPrefix = getInstrumentPrefix(other.instrument);
    return otherPrefix === prefix || other.instrument === m.instrument;
  });

  const index = sameInstMembers.findIndex((other) => String(other.id) === String(m.id));
  const num = index >= 0 ? index + 1 : 1;

  if (prefix === "") {
    return String(num);
  }

  return `${prefix}${num}`;
}

/**
 * 既存のメンバーリストに基づいて、新規追加されるメンバーの自動表示名（例: Tp1, Fl2, QT, 1 など）を生成する
 */
export function generateNextMemberLabel(
  instrument: string,
  existingMembers: { id?: number; instrument: string; label?: string; name?: string }[],
  memberCustomLabels?: Record<number, string>
): string {
  const prefix = getInstrumentPrefix(instrument);

  // 1. クイントは1台しかないため「QT」とする（通し番号なし）
  if (prefix === "QT" || instrument.trim().toLowerCase().includes("quint") || instrument.trim().toLowerCase().includes("クイント")) {
    return "QT";
  }

  // 2. 同じ楽器 (または同じプレフィックス) の既存メンバーから既に使用されている番号を抽出
  const usedNumbers = new Set<number>();
  for (const m of existingMembers) {
    const mPrefix = getInstrumentPrefix(m.instrument);
    if (mPrefix === prefix || m.instrument === instrument) {
      const lbl = (m.id && memberCustomLabels && memberCustomLabels[m.id]) || m.label || "";
      if (lbl) {
        const match = lbl.match(/\d+$/);
        if (match) {
          usedNumbers.add(parseInt(match[0], 10));
        }
      }
    }
  }

  let nextNumber = 1;
  if (usedNumbers.size > 0) {
    nextNumber = Math.max(...Array.from(usedNumbers)) + 1;
  } else {
    const count = existingMembers.filter((m) => {
      const mPrefix = getInstrumentPrefix(m.instrument);
      return mPrefix === prefix || m.instrument === instrument;
    }).length;
    nextNumber = count + 1;
  }

  // 3. カラーガードは通し番号のみ（例: "1", "2", "3"）
  if (prefix === "") {
    return String(nextNumber);
  }

  // 4. 一般の楽器は プレフィックス + 通し番号（例: "Fl1", "Tp2"）
  return `${prefix}${nextNumber}`;
}


