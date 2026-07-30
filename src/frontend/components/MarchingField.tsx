import React, { useRef, useState, useEffect } from "react";
import { Member, Set, Position, CustomMarker } from "../types";
import { ArrowUpRight, ArrowRight, Move, MapPin } from "lucide-react";
import { evaluateInstructionFormula, parseMotionCommands, normalizeInstructionText } from "../lib/marchingUtils";

export function renderCustomMarkShape(shape: string, customColor?: string, defaultColor?: string) {
  const strokeColor = customColor || defaultColor || "rgba(255, 255, 255, 0.45)";
  const strokeW = 1.5;
  switch (shape) {
    case "cross":
    case "十字":
      return (
        <g stroke={strokeColor} strokeWidth={strokeW}>
          <line x1={-6} y1={0} x2={6} y2={0} />
          <line x1={0} y1={-6} x2={0} y2={6} />
        </g>
      );
    case "t_up":
    case "T(上)":
      return (
        <g stroke={strokeColor} strokeWidth={strokeW} fill="none">
          <line x1={-6} y1={0} x2={6} y2={0} />
          <line x1={0} y1={-6} x2={0} y2={0} />
        </g>
      );
    case "t_down":
    case "T(下)":
      return (
        <g stroke={strokeColor} strokeWidth={strokeW} fill="none">
          <line x1={-6} y1={0} x2={6} y2={0} />
          <line x1={0} y1={0} x2={0} y2={6} />
        </g>
      );
    case "t_left":
    case "T(左)":
      return (
        <g stroke={strokeColor} strokeWidth={strokeW} fill="none">
          <line x1={0} y1={-6} x2={0} y2={6} />
          <line x1={-6} y1={0} x2={0} y2={0} />
        </g>
      );
    case "t_right":
    case "T(right)":
    case "T(右)":
      return (
        <g stroke={strokeColor} strokeWidth={strokeW} fill="none">
          <line x1={0} y1={-6} x2={0} y2={6} />
          <line x1={0} y1={0} x2={6} y2={0} />
        </g>
      );
    case "l_top_left":
    case "L(左上)":
      return (
        <g stroke={strokeColor} strokeWidth={strokeW} fill="none">
          <line x1={0} y1={0} x2={6} y2={0} />
          <line x1={0} y1={0} x2={0} y2={6} />
        </g>
      );
    case "l_top_right":
    case "L(右上)":
      return (
        <g stroke={strokeColor} strokeWidth={strokeW} fill="none">
          <line x1={0} y1={0} x2={-6} y2={0} />
          <line x1={0} y1={0} x2={0} y2={6} />
        </g>
      );
    case "l_bottom_left":
    case "L(左下)":
      return (
        <g stroke={strokeColor} strokeWidth={strokeW} fill="none">
          <line x1={0} y1={0} x2={6} y2={0} />
          <line x1={0} y1={0} x2={0} y2={-6} />
        </g>
      );
    case "l_bottom_right":
    case "L(右下)":
      return (
        <g stroke={strokeColor} strokeWidth={strokeW} fill="none">
          <line x1={0} y1={0} x2={-6} y2={0} />
          <line x1={0} y1={0} x2={0} y2={-6} />
        </g>
      );
    case "dot":
    case "丸":
    default:
      return (
        <circle cx={0} cy={0} r={3} fill={strokeColor} />
      );
  }
}

interface MarchingFieldProps {
  currentSet: Set | null;
  nextSet: Set | null;
  prevSet?: Set | null;
  members: Member[];
  selectedMemberId: number | null;
  onSelectMember: (id: number | null) => void;
  onUpdatePosition: (memberId: number, x: number, y: number) => void;
  showGhost: boolean;
  isPlaying: boolean;
  currentCount: number; // 現在の再生中カウント (0 から currentSet.counts まで)
  fieldWidth?: number;
  fieldHeight?: number;
  markingShape?: string;
  markingIntervalX?: number;
  markingIntervalY?: number;
  markingCountX?: number;
  markingCountY?: number;

  // 新しいデザイン属性
  backgroundColor?: string;
  gridLineColor?: string;
  gridLineWidth?: number;
  gridLineStyle?: "solid" | "dashed" | "dotted";
  subGridLineStyle?: "solid" | "dashed" | "dotted";
  showGridLines?: boolean;
  customMarkers?: CustomMarker[];
  selectedCustomMarkerId?: string | null;
  onSelectCustomMarker?: (id: string | null) => void;
  markerSize?: number;
  isDesignMode?: boolean;
  onUpdateMarker?: (markerId: string, x: number, y: number) => void;
  setInstructions?: Record<number, any[]>;
  memberVariables?: Record<number, number>;

  // 配置ツール用のオプション
  isAlignActive?: boolean;
  alignType?: "line" | "arc" | "circle";
  alignPointA?: { x: number; y: number };
  alignPointB?: { x: number; y: number };
  alignPointMid?: { x: number; y: number };
  alignPointCenter?: { x: number; y: number };
  alignRadius?: number;
  alignStartAngle?: number;
  alignEndAngle?: number;
  onUpdateAlignPointA?: (x: number, y: number) => void;
  onUpdateAlignPointB?: (x: number, y: number) => void;
  onUpdateAlignPointMid?: (x: number, y: number) => void;
  onUpdateAlignPointCenter?: (x: number, y: number) => void;
  onUpdateAlignRadius?: (r: number) => void;
  onUpdateAlignStartAngle?: (deg: number) => void;
  onUpdateAlignEndAngle?: (deg: number) => void;
  onToggleAlignMemberId?: (id: number) => void;
  alignSelectedMemberIds?: number[];

  // グラフ用紙仕様
  blocksX?: number;
  blocksY?: number;
  subdivisionsX?: number;
  subdivisionsY?: number;
  snapToGrid?: boolean;
  markerColor?: string;
}

export default function MarchingField({
  currentSet,
  nextSet,
  prevSet,
  members,
  selectedMemberId,
  onSelectMember,
  onUpdatePosition,
  showGhost,
  isPlaying,
  fieldWidth = 150,
  fieldHeight = 150,
  markingShape = "cross",
  markingIntervalX = 10,
  markingIntervalY = 10,
  markingCountX = 15,
  markingCountY = 15,

  backgroundColor = "#ffffff",
  gridLineColor = "rgba(255,255,255,0.3)",
  gridLineWidth = 1.5,
  gridLineStyle = "solid",
  subGridLineStyle = "dashed",
  showGridLines = true,
  customMarkers = [],
  selectedCustomMarkerId = null,
  onSelectCustomMarker,
  markerSize = 24,
  isDesignMode = false,
  onUpdateMarker,
  setInstructions,
  memberVariables = {},

  isAlignActive = false,
  alignType = "line",
  alignPointA = { x: 0.2, y: 0.5 },
  alignPointB = { x: 0.8, y: 0.5 },
  alignPointMid = { x: 0.5, y: 0.3 },
  alignPointCenter = { x: 0.5, y: 0.5 },
  alignRadius = 0.2,
  alignStartAngle = 0,
  alignEndAngle = 180,
  onUpdateAlignPointA,
  onUpdateAlignPointB,
  onUpdateAlignPointMid,
  onUpdateAlignPointCenter,
  onUpdateAlignRadius,
  onUpdateAlignStartAngle,
  onUpdateAlignEndAngle,
  onToggleAlignMemberId,
  alignSelectedMemberIds = [],
  currentCount,

  blocksX,
  blocksY,
  subdivisionsX,
  subdivisionsY,
  snapToGrid = true,
  markerColor,
}: MarchingFieldProps) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [touchStartDist, setTouchStartDist] = useState<number | null>(null);
  const [touchStartScale, setTouchStartScale] = useState<number>(1.0);

  const bX = blocksX || Math.round(fieldWidth / 10) || 15;
  const bY = blocksY || Math.round(fieldHeight / 10) || 15;
  const subX = subdivisionsX || 10;
  const subY = subdivisionsY || 10;
  const totalCellsX = bX * subX;
  const totalCellsY = bY * subY;
  
  const mainStrokeDash = gridLineStyle === "dashed" ? "6,4" : gridLineStyle === "dotted" ? "2,3" : undefined;
  const subStrokeDash = subGridLineStyle === "dashed" ? "4,4" : subGridLineStyle === "dotted" ? "1,3" : undefined;
  
  // ドラッグ状態
  const [draggedMemberId, setDraggedMemberId] = useState<number | null>(null);
  const [draggedMarkerId, setDraggedMarkerId] = useState<string | null>(null);
  const [draggedAlignPoint, setDraggedAlignPoint] = useState<"A" | "B" | "Center" | "ArcStart" | "ArcEnd" | "ArcMid" | "CircleRadius" | null>(null);

  // マーカーのリスト。カスタムテンプレートがある場合はそちらを優先
  const displayMarkers: CustomMarker[] = customMarkers || [];

  const handleMouseDownMember = (memberId: number, e: React.MouseEvent) => {
    e.preventDefault();
    if (isPlaying || isDesignMode) return;
    setDraggedMemberId(memberId);
    onSelectMember(memberId);
  };

  const handleMouseDownMarker = (markerId: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (!isDesignMode) return;
    setDraggedMarkerId(markerId);
    if (onSelectCustomMarker) {
      onSelectCustomMarker(markerId);
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!fieldRef.current) return;
    const rect = fieldRef.current.getBoundingClientRect();

    let rawX = (e.clientX - rect.left) / rect.width;
    let rawY = (e.clientY - rect.top) / rect.height;

    rawX = Math.max(0, Math.min(1, rawX));
    rawY = Math.max(0, Math.min(1, rawY));

    let x = rawX;
    let y = rawY;

    if (snapToGrid) {
      x = Math.round(x * totalCellsX) / totalCellsX;
      y = Math.round(y * totalCellsY) / totalCellsY;
    } else {
      const snapValue = 0.005; // 1歩の1/2〜1/4単位で微細スナップ
      x = Math.round(x / snapValue) * snapValue;
      y = Math.round(y / snapValue) * snapValue;
    }

    if (draggedMemberId !== null) {
      onUpdatePosition(draggedMemberId, x, y);
    } else if (draggedMarkerId !== null && onUpdateMarker) {
      onUpdateMarker(draggedMarkerId, x, y);
    } else if (draggedAlignPoint === "A" && onUpdateAlignPointA) {
      onUpdateAlignPointA(x, y);
    } else if (draggedAlignPoint === "B" && onUpdateAlignPointB) {
      onUpdateAlignPointB(x, y);
    } else if (draggedAlignPoint === "Center" && onUpdateAlignPointCenter) {
      onUpdateAlignPointCenter(x, y);
    } else if (draggedAlignPoint === "ArcMid" && onUpdateAlignPointMid) {
      onUpdateAlignPointMid(x, y);
    } else if (draggedAlignPoint === "CircleRadius") {
      const center = alignPointCenter || { x: 0.5, y: 0.5 };
      const dist = Math.abs(rawX - center.x);
      if (onUpdateAlignRadius && dist > 0.01) onUpdateAlignRadius(Math.max(0.05, Math.min(0.8, dist)));
    } else if (draggedAlignPoint === "ArcStart" || draggedAlignPoint === "ArcEnd") {
      // old handlers
    }
  };

  const handleMouseUp = () => {
    setDraggedMemberId(null);
    setDraggedMarkerId(null);
    setDraggedAlignPoint(null);
  };

  // タッチ操作対応
  const handleTouchStartMember = (memberId: number, e: React.TouchEvent) => {
    if (isPlaying || isDesignMode) return;
    setDraggedMemberId(memberId);
    onSelectMember(memberId);
  };

  const handleTouchStartMarker = (markerId: string, e: React.TouchEvent) => {
    if (!isDesignMode) return;
    setDraggedMarkerId(markerId);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!fieldRef.current || e.touches.length === 0) return;
    const rect = fieldRef.current.getBoundingClientRect();
    const touch = e.touches[0];

    let rawX = (touch.clientX - rect.left) / rect.width;
    let rawY = (touch.clientY - rect.top) / rect.height;

    rawX = Math.max(0, Math.min(1, rawX));
    rawY = Math.max(0, Math.min(1, rawY));

    let x = rawX;
    let y = rawY;

    if (snapToGrid) {
      x = Math.round(x * totalCellsX) / totalCellsX;
      y = Math.round(y * totalCellsY) / totalCellsY;
    } else {
      const snapValue = 0.005;
      x = Math.round(x / snapValue) * snapValue;
      y = Math.round(y / snapValue) * snapValue;
    }

    if (draggedMemberId !== null) {
      onUpdatePosition(draggedMemberId, x, y);
    } else if (draggedMarkerId !== null && onUpdateMarker) {
      onUpdateMarker(draggedMarkerId, x, y);
    } else if (draggedAlignPoint === "A" && onUpdateAlignPointA) {
      onUpdateAlignPointA(x, y);
    } else if (draggedAlignPoint === "B" && onUpdateAlignPointB) {
      onUpdateAlignPointB(x, y);
    } else if (draggedAlignPoint === "Center" && onUpdateAlignPointCenter) {
      onUpdateAlignPointCenter(x, y);
    } else if (draggedAlignPoint === "ArcMid" && onUpdateAlignPointMid) {
      onUpdateAlignPointMid(x, y);
    } else if (draggedAlignPoint === "CircleRadius") {
      const center = alignPointCenter || { x: 0.5, y: 0.5 };
      const dist = Math.abs(rawX - center.x);
      if (onUpdateAlignRadius && dist > 0.01) onUpdateAlignRadius(Math.max(0.05, Math.min(0.8, dist)));
    } else if (draggedAlignPoint === "ArcStart" || draggedAlignPoint === "ArcEnd") {
      // old handlers
    }
  };

  useEffect(() => {
    const activeDrag = draggedMemberId !== null || draggedMarkerId !== null || draggedAlignPoint !== null;
    if (activeDrag) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleTouchMove, { passive: false });
      window.addEventListener("touchend", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, [draggedMemberId, draggedMarkerId, draggedAlignPoint]);

  if (!isDesignMode && !currentSet) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 shadow-sm p-6">
        <p className="text-slate-500 font-semibold font-sans">No.が選択されていません</p>
        <p className="text-xs text-slate-400 mt-2">左側のメニューから選択するか、新規作成してください</p>
      </div>
    );
  }

  // 表示するドット（部員）の座標を決定する
  const getRenderPositions = (): { memberId: number; x: number; y: number; isInterp: boolean }[] => {
    if (isDesignMode) return [];

    const safeCurrentSet = currentSet!;
    if (isPlaying) {
      // prevSet が存在する場合は (prevSet -> safeCurrentSet) の移動。
      // Set 0 選択中など prevSet が無い場合は (safeCurrentSet -> nextSet) の移動。
      const fromSet = prevSet || safeCurrentSet;
      const toSet = prevSet ? safeCurrentSet : (nextSet || safeCurrentSet);

      const counts = safeCurrentSet.counts || 1;
      const ratio = Math.max(0, Math.min(1, currentCount / counts));

      return members.map((m) => {
        const curPos = fromSet.positions.find((p) => p.memberId === m.id);
        const nextPos = toSet.positions.find((p) => p.memberId === m.id);

        const x1 = curPos ? curPos.x : 0.5;
        const y1 = curPos ? curPos.y : 0.5;
        const x2 = nextPos ? nextPos.x : x1;
        const y2 = nextPos ? nextPos.y : y1;

        // セット指示書の取得
        let text = "";
        const targetSetId = prevSet ? safeCurrentSet.id : (nextSet?.id || safeCurrentSet.id);
        if (setInstructions && setInstructions[targetSetId]) {
          const insts = setInstructions[targetSetId];
          const indInst = insts.find(
            (i: any) => i.targetType === "individual" && i.targetValue.split(",").includes(String(m.id))
          );
          if (indInst) {
            text = indInst.instructionText;
          } else {
            const insInst = insts.find(
              (i: any) => i.targetType === "instrument" && i.targetValue === m.instrument
            );
            if (insInst) {
              text = insInst.instructionText;
            } else {
              const allInst = insts.find((i: any) => i.targetType === "all");
              if (allInst) text = allInst.instructionText;
            }
          }
        }

        // 変数xの解決
        let xVal = memberVariables[m.id] ?? 0;
        // もし指定テキストに x/X が使われていて、メンバー変数 x が未割り当て(0)の場合、セットカウント数の中間値をデフォ補正
        if (/[xXｘＸ]/.test(text) && xVal === 0 && counts > 0) {
          xVal = Math.round(counts / 2);
        }

        const resolvedText = text ? evaluateInstructionFormula(text, xVal) : "";

        const hasCorner = Math.abs(x2 - x1) > 0.001 && Math.abs(y2 - y1) > 0.001;
        const isTurn = /(?:^|\s)(?:ターン|カレッジターン|Turn)(?:$|\s)/i.test(resolvedText) && !/halt|build|marktime|mt|action|float/i.test(resolvedText);
        const isDechongOrChombo = /(?:デチョン|チョンボ|カレッジチョンボ)/.test(resolvedText) || /(?:^|\s)レ(?:$|\s)/.test(resolvedText);

        if (hasCorner && (isTurn || isDechongOrChombo)) {
          // L字型曲がり角ルート。 (x1, y1) -> (x2, y1) -> (x2, y2)
          const cx = x2;
          const cy = y1;

          const dist1 = Math.abs(x2 - x1);
          const dist2 = Math.abs(y2 - y1);
          const totalDist = dist1 + dist2;

          if (isTurn) {
            // カレッジ・ターン：曲がり角で3カウント静止する
            if (counts > 3) {
              const remainCounts = counts - 3;
              const t1 = Math.max(1, Math.round(remainCounts * (dist1 / totalDist)));
              const t2 = remainCounts - t1;

              if (currentCount <= t1) {
                const segmentRatio = currentCount / t1;
                return {
                  memberId: m.id,
                  x: x1 + (cx - x1) * segmentRatio,
                  y: y1 + (cy - y1) * segmentRatio,
                  isInterp: true,
                };
              } else if (currentCount <= t1 + 3) {
                return {
                  memberId: m.id,
                  x: cx,
                  y: cy,
                  isInterp: true,
                };
              } else {
                const segmentRatio = (currentCount - t1 - 3) / t2;
                return {
                  memberId: m.id,
                  x: cx + (x2 - cx) * segmentRatio,
                  y: cy + (y2 - cy) * segmentRatio,
                  isInterp: true,
                };
              }
            }
          } else {
            // カレッジ・チョンボ／デチョン：曲がり角で静止せず即時曲がる
            const t1 = Math.max(1, Math.round(counts * (dist1 / totalDist)));
            const t2 = counts - t1;

            if (currentCount <= t1) {
              const segmentRatio = currentCount / t1;
              return {
                memberId: m.id,
                x: x1 + (cx - x1) * segmentRatio,
                y: y1 + (cy - y1) * segmentRatio,
                isInterp: true,
              };
            } else {
              const segmentRatio = (currentCount - t1) / t2;
              return {
                memberId: m.id,
                x: cx + (x2 - cx) * segmentRatio,
                y: cy + (y2 - cy) * segmentRatio,
                isInterp: true,
              };
            }
          }
        }

        // Halt(A) Build(B) などの順次コマンドのパースと進行度の解決
        let commands = parseMotionCommands(resolvedText);

        if (commands.length > 0) {
          const totalCmdCounts = commands.reduce((sum, c) => sum + c.counts, 0);
          if (totalCmdCounts < counts) {
            const diff = counts - totalCmdCounts;
            const hasBuild = commands.some((c) => c.type === "build");
            if (!hasBuild) {
              // Haltしか指定がない場合 (例: Halt 8)、残りのカウント数は動 (Build) として自動補完する
              commands = [...commands, { type: "build", counts: diff }];
            } else {
              // Buildが既に指定されている場合 (例: Build 8)、残りのカウント数は静止 (Halt) として補完する
              commands = [...commands, { type: "halt", counts: diff }];
            }
          }

          const totalBuildCounts = commands
            .filter((c) => c.type === "build")
            .reduce((sum, c) => sum + c.counts, 0);

          const isMovingInCoords = Math.hypot(x2 - x1, y2 - y1) >= 0.001;

          // 移動距離があるのに totalBuildCounts が 0 の場合、完全に止まるのを防止
          if (isMovingInCoords && totalBuildCounts === 0) {
            return {
              memberId: m.id,
              x: x1 + (x2 - x1) * ratio,
              y: y1 + (y2 - y1) * ratio,
              isInterp: true,
            };
          }

          let accumulatedCount = 0;
          let currentRatio = 0;
          let completedBuildCounts = 0;
          let foundSegment = false;

          for (const cmd of commands) {
            const start = accumulatedCount;
            const end = accumulatedCount + cmd.counts;

            if (currentCount >= start && currentCount < end) {
              foundSegment = true;
              if (cmd.type === "halt") {
                currentRatio = totalBuildCounts > 0 ? completedBuildCounts / totalBuildCounts : 0;
              } else {
                const segmentProgress = cmd.counts > 0 ? (currentCount - start) / cmd.counts : 0;
                const currentSegmentBuild = completedBuildCounts + cmd.counts * segmentProgress;
                currentRatio = totalBuildCounts > 0 ? currentSegmentBuild / totalBuildCounts : 1;
              }
              break;
            } else {
              if (cmd.type === "build") {
                completedBuildCounts += cmd.counts;
              }
            }
            accumulatedCount = end;
          }

          if (!foundSegment) {
            currentRatio = totalBuildCounts > 0 ? 1.0 : 0.0;
          }

          return {
            memberId: m.id,
            x: x1 + (x2 - x1) * currentRatio,
            y: y1 + (y2 - y1) * currentRatio,
            isInterp: true,
          };
        }

        // デフォルト動作: 設定された全カウントを通じて線形移動
        return {
          memberId: m.id,
          x: x1 + (x2 - x1) * ratio,
          y: y1 + (y2 - y1) * ratio,
          isInterp: true,
        };
      });
    } else {
      // 通常時
      return members.map((m) => {
        const pos = safeCurrentSet.positions.find((p) => p.memberId === m.id);
        return {
          memberId: m.id,
          x: pos ? pos.x : 0.5,
          y: pos ? pos.y : 0.5,
          isInterp: false,
        };
      });
    }
  };

  const dots = getRenderPositions();

  // リアルタイム衝突・接近検知ロジック (1.4歩未満で接近警告、0.8歩未満で重なり危険)
  const totalStepsX = totalCellsX;
  const totalStepsY = totalCellsY;
  const collisions: {
    m1Id: number;
    m1Name: string;
    m2Id: number;
    m2Name: string;
    dist: number;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    isSevere: boolean;
  }[] = [];

  if (dots.length > 1) {
    for (let i = 0; i < dots.length; i++) {
      for (let j = i + 1; j < dots.length; j++) {
        const d1 = dots[i];
        const d2 = dots[j];
        const dx = (d1.x - d2.x) * totalStepsX;
        const dy = (d1.y - d2.y) * totalStepsY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 1.4) {
          const m1 = members.find((m) => m.id === d1.memberId);
          const m2 = members.find((m) => m.id === d2.memberId);
          if (m1 && m2) {
            collisions.push({
              m1Id: m1.id,
              m1Name: m1.name,
              m2Id: m2.id,
              m2Name: m2.name,
              dist,
              x1: d1.x,
              y1: d1.y,
              x2: d2.x,
              y2: d2.y,
              isSevere: dist < 0.8,
            });
          }
        }
      }
    }
  }

  const getPrevSetPositionOfSelected = (): Position | null => {
    if (!selectedMemberId || !prevSet) return null;
    return prevSet.positions.find((p) => p.memberId === selectedMemberId) || null;
  };

  const selectedPrevPos = getPrevSetPositionOfSelected();
  const selectedCurPos = selectedMemberId && currentSet
    ? currentSet.positions.find((p) => p.memberId === selectedMemberId) 
    : null;


  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setTouchStartDist(dist);
      setTouchStartScale(zoomScale);
    }
  };

  const handleTouchMoveLocal = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartDist !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scale = touchStartScale * (dist / touchStartDist);
      setZoomScale(Math.max(0.3, Math.min(3.0, scale)));
    }
  };

  const handleTouchEnd = () => {
    setTouchStartDist(null);
  };

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.1 : 0.9;
        setZoomScale(prev => Math.max(0.3, Math.min(3.0, prev * factor)));
      }
    };
    const canvas = fieldRef.current;
    if (canvas) {
      canvas.addEventListener("wheel", handleWheel, { passive: false });
    }
    return () => {
      if (canvas) {
        canvas.removeEventListener("wheel", handleWheel);
      }
    };
  }, []);

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* ズーム / 縮小コントロールツールバー */}
      <div className="flex flex-wrap items-center gap-1.5 justify-end text-xs text-slate-500 font-medium select-none">
        <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md font-mono font-bold border border-slate-200 shadow-sm mr-1">
          ズーム: {Math.round(zoomScale * 100)}%
        </span>
        <button
          type="button"
          onClick={() => setZoomScale(prev => Math.max(0.3, Number((prev - 0.1).toFixed(2))))}
          className="p-1 px-2.5 bg-white border border-slate-200 rounded shadow hover:bg-slate-50 transition font-bold text-slate-700 hover:text-blue-600"
          title="縮小 (ズームアウト)"
        >
          - 縮小
        </button>
        <button
          type="button"
          onClick={() => setZoomScale(prev => Math.min(3.0, Number((prev + 0.1).toFixed(2))))}
          className="p-1 px-2.5 bg-white border border-slate-200 rounded shadow hover:bg-slate-50 transition font-bold text-slate-700 hover:text-blue-600"
          title="拡大 (ズームイン)"
        >
          + 拡大
        </button>
        <div className="h-4 w-px bg-slate-300 mx-0.5" />
        <button
          type="button"
          onClick={() => setZoomScale(1.0)}
          className={`px-2.5 py-1 border rounded text-xs font-bold transition ${
            zoomScale === 1.0 ? "bg-blue-50 border-blue-400 text-blue-600" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
          title="100% (標準表示)"
        >
          100% (標準)
        </button>
      </div>

      {/* スクロール可能コンテナ (ズーム・縮小対応・作業エリア拡大) */}
      <div 
        className="w-full overflow-auto max-h-[85vh] border border-slate-300 rounded-xl bg-slate-900/5 p-2 shadow-inner"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMoveLocal}
        onTouchEnd={handleTouchEnd}
      >
        <div
          style={{
            width: `${zoomScale * 100}%`,
            margin: "0 auto",
            position: "relative",
            transition: "width 0.15s ease-out",
          }}
        >
          {/* フィールド本体 */}
          <div
            id="marching-field-canvas"
            ref={fieldRef}
            className="relative w-full rounded-xl overflow-hidden shadow-xl border border-slate-400 select-none cursor-crosshair transition-all"
            style={{ 
              aspectRatio: `${totalCellsX}/${totalCellsY}`,
              backgroundColor: backgroundColor 
            }}
          >
            {/* 衝突検知・接近警告バナー */}
            {collisions.length > 0 && (
              <div className="absolute top-3 left-3 right-3 z-40 bg-red-600/95 text-white p-2.5 rounded-xl shadow-2xl border border-red-300 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-bounce-once">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl shrink-0">⚠️</span>
                  <div>
                    <div className="font-bold text-xs sm:text-sm flex items-center gap-2">
                      <span>衝突・接近警告 ({collisions.length}件検知)</span>
                      {collisions.some((c) => c.isSevere) && (
                        <span className="bg-white text-red-700 text-[10px] px-1.5 py-0.5 rounded font-black shadow-xs animate-pulse">
                          重なり危険!
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-red-100 mt-0.5 max-h-12 overflow-y-auto font-medium">
                      {collisions.map((c, idx) => (
                        <span key={idx} className="mr-3 inline-block">
                          <span className="font-bold text-white">{c.m1Name}</span> ↔ <span className="font-bold text-white">{c.m2Name}</span>
                          <span className="text-red-200 ml-1">({c.dist.toFixed(1)}歩)</span>
                          {idx < collisions.length - 1 ? " / " : ""}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* フィールド芝生模様（縞々） - 緑色の時のみ美しく表示 */}
            {backgroundColor.startsWith("#1e") && (
              <div className="absolute inset-0 flex pointer-events-none">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-full flex-1 ${i % 2 === 0 ? "bg-black/10" : "bg-transparent"}`}
                  />
                ))}
              </div>
            )}

            {/* グリッド線の描画 (SVGによる高精度な指定可能グリッド) */}
            {showGridLines && (
              <svg 
                viewBox={`0 0 ${totalCellsX * 10} ${totalCellsY * 10}`} 
                preserveAspectRatio="none" 
                className="absolute inset-0 w-full h-full pointer-events-none"
              >
                {/* 縦のグリッド線 */}
                {Array.from({ length: totalCellsX + 1 }).map((_, i) => {
                  const xVal = i * 10;
                  const isMajor = i % subX === 0;
                  return (
                    <line
                      key={`v-grid-${i}`}
                      x1={xVal}
                      y1={0}
                      x2={xVal}
                      y2={totalCellsY * 10}
                      stroke={gridLineColor}
                      strokeWidth={isMajor ? Math.max(1, gridLineWidth * 1.5) : Math.max(0.5, gridLineWidth * 0.6)}
                      strokeDasharray={isMajor ? mainStrokeDash : subStrokeDash}
                      opacity={isMajor ? 1.0 : 0.45}
                    />
                  );
                })}
                {/* 横のグリッド線 */}
                {Array.from({ length: totalCellsY + 1 }).map((_, i) => {
                  const yVal = i * 10;
                  const isMajor = i % subY === 0;
                  return (
                    <line
                      key={`h-grid-${i}`}
                      x1={0}
                      y1={yVal}
                      x2={totalCellsX * 10}
                      y2={yVal}
                      stroke={gridLineColor}
                      strokeWidth={isMajor ? Math.max(1, gridLineWidth * 1.5) : Math.max(0.5, gridLineWidth * 0.6)}
                      strokeDasharray={isMajor ? mainStrokeDash : subStrokeDash}
                      opacity={isMajor ? 1.0 : 0.45}
                    />
                  );
                })}
              </svg>
            )}

        {/* 外枠白線 */}
        <div className="absolute inset-x-0 top-0 h-[2px] bg-white/50 pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-[2px] bg-white/50 pointer-events-none" />
        <div className="absolute inset-y-0 left-0 w-[2px] bg-white/50 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-[2px] bg-white/50 pointer-events-none" />

        {/* マーカーのレンダリング (CSSパーセンテージによる完璧な絶対配置) */}
        {displayMarkers.map((mark, idx) => {
          const shapeToRender = mark.shape || markingShape || "cross";
          const colorToUse = mark.color || markerColor;
          return (
            <div
              key={`custom-mark-${idx}`}
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center justify-center z-20"
              style={{
                left: `${mark.x * 100}%`,
                top: `${mark.y * 100}%`,
                width: `${markerSize}px`,
                height: `${markerSize}px`,
              }}
            >
              <svg viewBox="-12 -12 24 24" className="w-full h-full overflow-visible">
                {renderCustomMarkShape(shapeToRender, colorToUse)}
              </svg>
              {mark.label && (
                <span className="absolute -bottom-3 text-[8px] font-sans font-black text-white bg-slate-900/80 px-1 rounded scale-90 border border-white/20 select-none pointer-events-none whitespace-nowrap shadow-sm">
                  {mark.label}
                </span>
              )}
            </div>
          );
        })}

        {/* フィールドデザイナーモード用：マーカーのドラッグ＆ドロップ配置 */}
        {isDesignMode && displayMarkers.map((mark) => {
          const isSelected = draggedMarkerId === mark.id || selectedCustomMarkerId === mark.id;
          return (
            <div
              key={`drag-mark-${mark.id}`}
              className="absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center cursor-grab active:cursor-grabbing hover:scale-125 z-40 transition-transform"
              style={{
                left: `${mark.x * 100}%`,
                top: `${mark.y * 100}%`,
              }}
              onMouseDown={(e) => handleMouseDownMarker(mark.id, e)}
              onTouchStart={(e) => {
                if (!isDesignMode) return;
                setDraggedMarkerId(mark.id);
                if (onSelectCustomMarker) onSelectCustomMarker(mark.id);
              }}
              onClick={() => {
                if (onSelectCustomMarker) onSelectCustomMarker(mark.id);
              }}
            >
              {isSelected ? (
                <>
                  <div
                    className="absolute inset-0 rounded-full border-2 border-amber-400 bg-amber-400/20 animate-ping pointer-events-none"
                    style={{ animationIterationCount: 2, animationDuration: "0.8s" }}
                  />
                  <div className="w-7 h-7 rounded-full border-2 border-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)] z-10 flex items-center justify-center">
                    {/* 中心を透明にしてマーカー交点を隠さない */}
                  </div>
                </>
              ) : (
                <div className="w-6 h-6 rounded-full border border-transparent hover:border-amber-400/80 hover:bg-amber-400/10 transition duration-150" />
              )}
            </div>
          );
        })}

        {/* ゴースト表示 (全メンバーの前セット位置: トゲトゲ感を無くした滑らかなソフトドット) */}
        {!isDesignMode && showGhost && prevSet && !isPlaying && (
          <div className="absolute inset-0 pointer-events-none">
            {members.map((m) => {
              const prevPos = prevSet.positions.find((p) => p.memberId === m.id);
              if (!prevPos) return null;

              return (
                <div
                  key={`ghost-${m.id}`}
                  className="absolute w-3.5 h-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/80 opacity-50 shadow-sm ring-1 ring-black/20"
                  style={{
                    left: `${prevPos.x * 100}%`,
                    top: `${prevPos.y * 100}%`,
                    backgroundColor: m.color,
                  }}
                />
              );
            })}
          </div>
        )}

        {/* 矢印表示 (前位置から現在位置へ) */}
        {!isDesignMode && prevSet && !isPlaying && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <defs>
              <marker
                id="arrowhead"
                markerWidth="8"
                markerHeight="6"
                refX="7"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 8 3, 0 6" fill="#ef4444" />
              </marker>
              <marker
                id="arrowhead-all"
                markerWidth="6"
                markerHeight="6"
                refX="3"
                refY="3"
                orient="auto"
              >
                <circle cx="3" cy="3" r="2" fill="rgba(255,255,255,0.4)" />
              </marker>
            </defs>

            {/* 全員のうっすら矢印 */}
            {members.map((m) => {
              const curPos = currentSet!.positions.find((p) => p.memberId === m.id);
              const prevPos = prevSet.positions.find((p) => p.memberId === m.id);
              if (!curPos || !prevPos) return null;

              const distance = Math.hypot(curPos.x - prevPos.x, curPos.y - prevPos.y);
              if (distance < 0.01) return null;
              if (m.id === selectedMemberId) return null;

              return (
                <line
                  key={`line-all-${m.id}`}
                  x1={`${prevPos.x * 100}%`}
                  y1={`${prevPos.y * 100}%`}
                  x2={`${curPos.x * 100}%`}
                  y2={`${curPos.y * 100}%`}
                  stroke="rgba(255, 255, 255, 0.25)"
                  strokeWidth="1"
                  strokeDasharray="2,2"
                  markerEnd="url(#arrowhead-all)"
                />
              );
            })}

            {/* 選択中の赤色明快な矢印 */}
            {selectedPrevPos && selectedCurPos && (
              <line
                x1={`${selectedPrevPos.x * 100}%`}
                y1={`${selectedPrevPos.y * 100}%`}
                x2={`${selectedCurPos.x * 100}%`}
                y2={`${selectedCurPos.y * 100}%`}
                stroke="#ef4444"
                strokeWidth="2.5"
                markerEnd="url(#arrowhead)"
              />
            )}
          </svg>
        )}

        {/* メンバー部員ドットの描画 */}
        {!isDesignMode && dots.map((dot) => {
          const m = members.find((member) => member.id === dot.memberId);
          if (!m) return null;

          const isSelected = dot.memberId === selectedMemberId;
          const isAlignSelected = isAlignActive && alignSelectedMemberIds.includes(dot.memberId);

          return (
            <div
              key={dot.memberId}
              id={`member-dot-${dot.memberId}`}
              className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing shadow-md font-sans ${
                isPlaying || dot.isInterp ? "transition-none" : "transition-all duration-150"
              } ${
                isAlignSelected
                  ? "w-6 h-6 ring-4 ring-emerald-400 ring-offset-1 ring-offset-[#1e4620] z-25 scale-105"
                  : isSelected
                  ? "w-7 h-7 ring-4 ring-white ring-offset-2 ring-offset-[#1e4620] scale-110 z-30"
                  : "w-3.5 h-3.5 hover:scale-125 z-10"
              }`}
              style={{
                left: `${dot.x * 100}%`,
                top: `${dot.y * 100}%`,
                backgroundColor: m.color,
              }}
              onMouseDown={(e) => {
                if (isAlignActive && onToggleAlignMemberId) {
                  e.stopPropagation();
                  onToggleAlignMemberId(dot.memberId);
                } else {
                  handleMouseDownMember(dot.memberId, e);
                }
              }}
              onTouchStart={(e) => {
                if (isAlignActive && onToggleAlignMemberId) {
                  e.stopPropagation();
                  onToggleAlignMemberId(dot.memberId);
                } else {
                  handleTouchStartMember(dot.memberId, e);
                }
              }}
            >
              {/* Dot content remains clean without text */}
              {isSelected && (
                <div className="absolute inset-0 rounded-full border-2 border-white animate-ping opacity-35" />
              )}
            </div>
          );
        })}

        {/* 配置ツール（Align Tool）のビジュアルガイド */}
        {isAlignActive && (() => {
          const ptA = alignPointA || { x: 0.25, y: 0.5 };
          const ptB = alignPointB || { x: 0.75, y: 0.5 };
          const ptCenter = alignPointCenter || { x: 0.5, y: 0.5 };
          const rad = typeof alignRadius === "number" && !isNaN(alignRadius) ? alignRadius : 0.25;
          const selectedIds = alignSelectedMemberIds || [];

          return (
            <svg 
              viewBox={`0 0 ${totalCellsX * 10} ${totalCellsY * 10}`} 
              preserveAspectRatio="none" 
              className="absolute inset-0 w-full h-full pointer-events-none z-20"
            >
              {alignType === "line" && (
                <>
                  <line
                    x1={ptA.x * totalCellsX * 10}
                    y1={ptA.y * totalCellsY * 10}
                    x2={ptB.x * totalCellsX * 10}
                    y2={ptB.y * totalCellsY * 10}
                    stroke="#3b82f6"
                    strokeWidth="3"
                    strokeDasharray="6,4"
                  />
                  {selectedIds.length > 0 && selectedIds.map((_, idx) => {
                    const count = selectedIds.length;
                    const t = count === 1 ? 0.5 : idx / (count - 1);
                    const px = (ptA.x + (ptB.x - ptA.x) * t) * totalCellsX * 10;
                    const py = (ptA.y + (ptB.y - ptA.y) * t) * totalCellsY * 10;
                    return (
                      <circle
                        key={`preview-line-${idx}`}
                        cx={px}
                        cy={py}
                        r="6"
                        fill="#3b82f6"
                        opacity="0.85"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                    );
                  })}
                </>
              )}

              {alignType === "circle" && (
                <>
                  <circle
                    cx={ptCenter.x * totalCellsX * 10}
                    cy={ptCenter.y * totalCellsY * 10}
                    r={rad * totalCellsX * 10}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="3"
                    strokeDasharray="6,4"
                  />
                  {selectedIds.length > 0 && selectedIds.map((_, idx) => {
                    const count = selectedIds.length;
                    const angle = (2 * Math.PI * idx) / count - Math.PI / 2;
                    const px = (ptCenter.x + rad * Math.cos(angle)) * totalCellsX * 10;
                    const py = (ptCenter.y + rad * Math.sin(angle) * (totalCellsX / totalCellsY)) * totalCellsY * 10;
                    return (
                      <circle
                        key={`preview-circle-${idx}`}
                        cx={px}
                        cy={py}
                        r="6"
                        fill="#3b82f6"
                        opacity="0.85"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                    );
                  })}
                </>
              )}

              {alignType === "arc" && (
                <>
                  <path
                    d={`M ${(alignPointA?.x ?? 0.25) * totalCellsX * 10} ${(alignPointA?.y ?? 0.5) * totalCellsY * 10} Q ${(alignPointMid?.x ?? 0.5) * totalCellsX * 10} ${(alignPointMid?.y ?? 0.3) * totalCellsY * 10} ${(alignPointB?.x ?? 0.75) * totalCellsX * 10} ${(alignPointB?.y ?? 0.5) * totalCellsY * 10}`}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="3"
                    strokeDasharray="6,4"
                  />
                  {selectedIds.length > 0 && selectedIds.map((_, idx) => {
                    const count = selectedIds.length;
                    const t = count === 1 ? 0.5 : idx / (count - 1);
                    const ptA = alignPointA || { x: 0.25, y: 0.5 };
                    const ptB = alignPointB || { x: 0.75, y: 0.5 };
                    const ptMid = alignPointMid || { x: 0.5, y: 0.3 };
                    const tx = (1 - t) * (1 - t) * ptA.x + 2 * (1 - t) * t * ptMid.x + t * t * ptB.x;
                    const ty = (1 - t) * (1 - t) * ptA.y + 2 * (1 - t) * t * ptMid.y + t * t * ptB.y;
                    const px = tx * totalCellsX * 10;
                    const py = ty * totalCellsY * 10;
                    return (
                      <circle
                        key={`preview-arc-${idx}`}
                        cx={px}
                        cy={py}
                        r="6"
                        fill="#3b82f6"
                        opacity="0.85"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                    );
                  })}
                </>
              )}
            </svg>
          );
        })()}

        {/* 衝突・接近ペアの視覚的ハイライト (赤破線と警告サークル) */}
        {collisions.length > 0 && (
          <svg
            viewBox={`0 0 ${totalCellsX * 10} ${totalCellsY * 10}`}
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full pointer-events-none z-30"
          >
            {collisions.map((c, idx) => {
              const cx1 = c.x1 * totalCellsX * 10;
              const cy1 = c.y1 * totalCellsY * 10;
              const cx2 = c.x2 * totalCellsX * 10;
              const cy2 = c.y2 * totalCellsY * 10;
              const midX = (cx1 + cx2) / 2;
              const midY = (cy1 + cy2) / 2;
              return (
                <g key={idx}>
                  <line
                    x1={cx1}
                    y1={cy1}
                    x2={cx2}
                    y2={cy2}
                    stroke="#ef4444"
                    strokeWidth={c.isSevere ? "3" : "2"}
                    strokeDasharray="4,2"
                    className="animate-pulse"
                  />
                  <circle
                    cx={midX}
                    cy={midY}
                    r={c.isSevere ? "8" : "6"}
                    fill="#ef4444"
                    opacity="0.8"
                    className="animate-ping"
                  />
                  <circle
                    cx={midX}
                    cy={midY}
                    r={c.isSevere ? "5" : "3.5"}
                    fill="#ffffff"
                    stroke="#ef4444"
                    strokeWidth="1.5"
                  />
                </g>
              );
            })}
          </svg>
        )}

        {/* 配置ガイド用のインタラクティブハンドル */}
        {isAlignActive && (() => {
          const ptCenter = alignPointCenter || { x: 0.5, y: 0.5 };
          const rad = typeof alignRadius === "number" && !isNaN(alignRadius) ? alignRadius : 0.25;

          const startRad = ((alignStartAngle || 0) * Math.PI) / 180;
          const endRad = ((alignEndAngle || 180) * Math.PI) / 180;
          const midRad = (startRad + endRad) / 2;

          const startPos = {
            x: ptCenter.x + rad * Math.cos(startRad),
            y: ptCenter.y + rad * Math.sin(startRad),
          };
          const endPos = {
            x: ptCenter.x + rad * Math.cos(endRad),
            y: ptCenter.y + rad * Math.sin(endRad),
          };
          const midPos = {
            x: ptCenter.x + rad * Math.cos(midRad),
            y: ptCenter.y + rad * Math.sin(midRad),
          };
          const circleRadPos = {
            x: ptCenter.x + rad,
            y: ptCenter.y,
          };

          return (
            <>
              {alignType === "line" && (
                <>
                  <div
                    className="absolute w-7 h-7 -translate-x-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-500 border-2 border-white rounded-full flex items-center justify-center text-white font-bold text-xs cursor-move shadow-lg z-40 select-none"
                    style={{
                      left: `${(alignPointA?.x ?? 0.25) * 100}%`,
                      top: `${(alignPointA?.y ?? 0.5) * 100}%`,
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setDraggedAlignPoint("A");
                    }}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      setDraggedAlignPoint("A");
                    }}
                  >
                    A
                  </div>
                  <div
                    className="absolute w-7 h-7 -translate-x-1/2 -translate-y-1/2 bg-emerald-600 hover:bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center text-white font-bold text-xs cursor-move shadow-lg z-40 select-none"
                    style={{
                      left: `${(alignPointB?.x ?? 0.75) * 100}%`,
                      top: `${(alignPointB?.y ?? 0.5) * 100}%`,
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setDraggedAlignPoint("B");
                    }}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      setDraggedAlignPoint("B");
                    }}
                  >
                    B
                  </div>
                </>
              )}

              {alignType === "arc" && (
                <>
                  {/* 端点1 (A) */}
                  <div
                    className="absolute w-7 h-7 -translate-x-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-500 border-2 border-white rounded-full flex items-center justify-center text-white font-bold text-xs cursor-move shadow-lg z-40 select-none"
                    style={{
                      left: `${(alignPointA?.x ?? 0.25) * 100}%`,
                      top: `${(alignPointA?.y ?? 0.5) * 100}%`,
                    }}
                    title="端点1 (ドラッグで移動)"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setDraggedAlignPoint("A");
                    }}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      setDraggedAlignPoint("A");
                    }}
                  >
                    A
                  </div>

                  {/* 端点2 (B) */}
                  <div
                    className="absolute w-7 h-7 -translate-x-1/2 -translate-y-1/2 bg-emerald-600 hover:bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center text-white font-bold text-xs cursor-move shadow-lg z-40 select-none"
                    style={{
                      left: `${(alignPointB?.x ?? 0.75) * 100}%`,
                      top: `${(alignPointB?.y ?? 0.5) * 100}%`,
                    }}
                    title="端点2 (ドラッグで移動)"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setDraggedAlignPoint("B");
                    }}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      setDraggedAlignPoint("B");
                    }}
                  >
                    B
                  </div>

                  {/* カーブ調整ハンドル (M) */}
                  <div
                    className="absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2 bg-amber-600 hover:bg-amber-500 border-2 border-white rounded-full flex items-center justify-center text-white font-bold text-[11px] cursor-move shadow-lg z-40 select-none"
                    style={{
                      left: `${(alignPointMid?.x ?? 0.5) * 100}%`,
                      top: `${(alignPointMid?.y ?? 0.3) * 100}%`,
                    }}
                    title="カーブ調整 (ドラッグでアーチを変形)"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setDraggedAlignPoint("ArcMid");
                    }}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      setDraggedAlignPoint("ArcMid");
                    }}
                  >
                    カーブ
                  </div>
                </>
              )}

              {alignType === "circle" && (
                <>
                  {/* 中心 C */}
                  <div
                    className="absolute w-7 h-7 -translate-x-1/2 -translate-y-1/2 bg-purple-600 hover:bg-purple-500 border-2 border-white rounded-full flex items-center justify-center text-white font-bold text-xs cursor-move shadow-lg z-40 select-none"
                    style={{
                      left: `${ptCenter.x * 100}%`,
                      top: `${ptCenter.y * 100}%`,
                    }}
                    title="中心位置 (ドラッグで移動)"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setDraggedAlignPoint("Center");
                    }}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      setDraggedAlignPoint("Center");
                    }}
                  >
                    C
                  </div>

                  {/* 円半径 R */}
                  <div
                    className="absolute w-7 h-7 -translate-x-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-500 border-2 border-white rounded-full flex items-center justify-center text-white font-bold text-xs cursor-move shadow-lg z-40 select-none"
                    style={{
                      left: `${circleRadPos.x * 100}%`,
                      top: `${circleRadPos.y * 100}%`,
                    }}
                    title="円の半径 (ドラッグで調整)"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setDraggedAlignPoint("CircleRadius");
                    }}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      setDraggedAlignPoint("CircleRadius");
                    }}
                  >
                    R
                  </div>
                </>
              )}
            </>
          );
        })()}
      </div>
        </div>
      </div>

      {/* 座標ステータス表示 */}
      {selectedMemberId && !isPlaying && !isDesignMode && (
        <div className="flex items-center justify-between px-4 py-3 bg-white rounded-lg border border-slate-200 text-xs text-slate-600 shadow-sm">
          <div className="flex items-center gap-1.5">
            <Move className="w-4 h-4 text-blue-600" />
            <span className="font-medium text-slate-500">選択中の部員:</span>
            <strong className="text-slate-800 font-semibold">
              {members.find((m) => m.id === selectedMemberId)?.name}
            </strong>
          </div>
          <div className="font-mono text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded border border-slate-100">
            X: <span className="text-slate-800 font-semibold">{(selectedCurPos?.x || 0.5).toFixed(3)}</span>, Y:{" "}
            <span className="text-slate-800 font-semibold">{(selectedCurPos?.y || 0.5).toFixed(3)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
