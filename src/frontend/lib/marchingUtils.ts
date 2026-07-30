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
 * 現在の位置の「ドット（座標）」をヤード表記に翻訳する
 * 例: 「50ヤードから左に2.4歩、フロントハッシュから後ろに1.5歩」
 */
export function getYardLocationDescription(
  x: number,
  y: number,
  totalXSteps: number = 128,
  totalYSteps: number = 64
): string {
  // 1. X方向の計算
  // ヤードラインの位置 (X比率)
  const lines = [
    { name: "左10ヤード", x: 0.1 },
    { name: "左20ヤード", x: 0.2 },
    { name: "左30ヤード", x: 0.3 },
    { name: "左40ヤード", x: 0.4 },
    { name: "50ヤード", x: 0.5 },
    { name: "右40ヤード", x: 0.6 },
    { name: "右30ヤード", x: 0.7 },
    { name: "右20ヤード", x: 0.8 },
    { name: "右10ヤード", x: 0.9 },
  ];

  // 最も近いヤードラインを見つける
  let closestLine = lines[0];
  let minDiff = Math.abs(x - lines[0].x);

  for (let i = 1; i < lines.length; i++) {
    const diff = Math.abs(x - lines[i].x);
    if (diff < minDiff) {
      minDiff = diff;
      closestLine = lines[i];
    }
  }

  const xDiffPct = x - closestLine.x;
  const xDiffSteps = xDiffPct * totalXSteps;
  const xStepsAbs = Math.abs(Math.round(xDiffSteps * 10) / 10);

  let xDesc = "";
  if (xStepsAbs < 0.2) {
    xDesc = closestLine.name;
  } else {
    // 50ヤードラインから「左・右」
    // 他のラインから「インサイド(50側)・アウトサイド(エンド側)」
    if (closestLine.x === 0.5) {
      xDesc = `50ヤードから${xDiffSteps > 0 ? "右" : "左"}に ${xStepsAbs}歩`;
    } else {
      const isLeftSide = closestLine.x < 0.5;
      const isInside = isLeftSide ? xDiffSteps > 0 : xDiffSteps < 0;
      xDesc = `${closestLine.name}から${isInside ? "インサイド" : "アウトサイド"}に ${xStepsAbs}歩`;
    }
  }

  // 2. Y方向の計算
  // 奥行き基準線
  const yLines = [
    { name: "フロントサイド(手前)", y: 0.0 },
    { name: "フロントハッシュ", y: 0.33 },
    { name: "バックハッシュ", y: 0.67 },
    { name: "バックサイド(奥)", y: 1.0 },
  ];

  let closestY = yLines[0];
  let minYDiff = Math.abs(y - yLines[0].y);

  for (let i = 1; i < yLines.length; i++) {
    const diff = Math.abs(y - yLines[i].y);
    if (diff < minYDiff) {
      minYDiff = diff;
      closestY = yLines[i];
    }
  }

  const yDiffPct = y - closestY.y;
  const yDiffSteps = yDiffPct * totalYSteps;
  const yStepsAbs = Math.abs(Math.round(yDiffSteps * 10) / 10);

  let yDesc = "";
  if (yStepsAbs < 0.2) {
    yDesc = closestY.name;
  } else {
    yDesc = `${closestY.name}から${yDiffSteps > 0 ? "後ろ" : "前"}に ${yStepsAbs}歩`;
  }

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
  s = s.replace(/（/g, "(").replace(/）/g, ")").replace(/：/g, ":").replace(/ー/g, "-");
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

  // カッコのない四則演算式 (例: 8-2 や 4+4) を評価・計算
  substituted = substituted.replace(/\b\d+(?:\s*[-+*/]\s*\d+)+\b/g, (match) => {
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


