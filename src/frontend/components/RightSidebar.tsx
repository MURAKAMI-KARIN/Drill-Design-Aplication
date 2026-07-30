import React, { useState, useEffect } from "react";
import { Member, SetInstruction, MemberGroup } from "../types";
import type { Set } from "../types";
import {
  Users,
  BookOpen,
  Sliders,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Hash,
  Edit2,
  Check,
  X,
  AlertTriangle,
} from "lucide-react";
import { evaluateInstructionFormula, validateInstructionCounts } from "../lib/marchingUtils";

interface RightSidebarProps {
  members: Member[];
  selectedMemberId: number | null;
  onSelectMember: (id: number | null) => void;
  currentSet: Set | null;
  nextSet: Set | null;
  moveInstructions: {
    hDir: string;
    hSteps: number;
    vDir: string;
    vSteps: number;
    counts: number;
  } | null;
  currentYardDesc: string;
  setInstructions: { [setId: number]: SetInstruction[] };
  onAddInstruction: (targetType: "all" | "instrument" | "individual", targetValue: string, text: string) => void;
  onDeleteInstruction: (id: string) => void;
  onUpdateInstructionText?: (id: string, newText: string) => void;
  memberVariables: { [memberId: number]: number };
  onUpdateMemberVariable: (memberId: number, val: number) => void;
  onAutoAssignVariablesFromX: () => void;
  onBatchSetVariables: (val: number) => void;
  onDeleteMember: (id: number) => void;
  onEditMember?: (member: Member) => void;
  onShowNewMemberModal: () => void;
  isRightSidebarOpen: boolean;
  setIsRightSidebarOpen: (open: boolean) => void;
  memberCustomLabels: { [memberId: number]: string };
  onUpdateMemberCustomLabel: (memberId: number, label: string) => void;
  memberGroups?: MemberGroup[];
  onUpdateMemberGroups?: (groups: MemberGroup[]) => void;
  activeTab?: "personnel" | "dotbook" | "instructions" | "variables" | "warnings";
  onTabChange?: (tab: "personnel" | "dotbook" | "instructions" | "variables" | "warnings") => void;
  allSetCollisions?: { setId: number; setNumber: number; count: number; pairs: { m1: Member; m2: Member; dist: number; isSevere: boolean; timeDesc?: string }[] }[];
  onSelectSet?: (setId: number) => void;
}

export default function RightSidebar({
  members,
  selectedMemberId,
  onSelectMember,
  currentSet,
  nextSet,
  moveInstructions,
  currentYardDesc,
  setInstructions,
  onAddInstruction,
  onDeleteInstruction,
  onUpdateInstructionText,
  memberVariables,
  onUpdateMemberVariable,
  onAutoAssignVariablesFromX,
  onBatchSetVariables,
  onDeleteMember,
  onEditMember,
  onShowNewMemberModal,
  isRightSidebarOpen,
  setIsRightSidebarOpen,
  memberCustomLabels,
  onUpdateMemberCustomLabel,
  memberGroups = [],
  onUpdateMemberGroups,
  activeTab: propActiveTab,
  onTabChange,
  allSetCollisions = [],
  onSelectSet,
}: RightSidebarProps) {
  const [activeTab, setActiveTab] = useState<"personnel" | "dotbook" | "instructions" | "variables" | "warnings">(propActiveTab || "personnel");

  useEffect(() => {
    if (propActiveTab && propActiveTab !== activeTab) {
      setActiveTab(propActiveTab);
    }
  }, [propActiveTab]);

  const handleTabChange = (tab: "personnel" | "dotbook" | "instructions" | "variables" | "warnings") => {
    setActiveTab(tab);
    if (onTabChange) onTabChange(tab);
  };

  // Group creation state
  const [newGroupName, setNewGroupName] = useState<string>("");
  const [selectedGroupMemberIds, setSelectedGroupMemberIds] = useState<number[]>([]);
  const [showGroupCreator, setShowGroupCreator] = useState<boolean>(false);

  // New instruction states
  const [newInstTargetType, setNewInstTargetType] = useState<"all" | "instrument" | "individual">("all");
  const [newInstTargetValue, setNewInstTargetValue] = useState<string>("");
  const [newInstText, setNewInstText] = useState<string>("");

  // Editing instruction inline states
  const [editingInstId, setEditingInstId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>("");

  // Batch variable state
  const [batchVal, setBatchVal] = useState<number>(8);

  const selectedMember = members.find((m) => m.id === selectedMemberId) || null;

  // Find instructions for the active set and selected member
  const currentSetInsts = currentSet ? setInstructions[currentSet.id] || [] : [];
  
  // Get unique instruments for instrument filter select
  const instruments = Array.from(new Set(members.map((m) => m.instrument))).filter(Boolean);

  const getMemberResolvedInstructions = (member: Member) => {
    if (!currentSet) return [];
    const insts = setInstructions[currentSet.id] || [];
    const xVal = memberVariables[member.id] ?? 0;

    return insts
      .filter((inst) => {
        if (inst.targetType === "all") return true;
        if (inst.targetType === "instrument" && inst.targetValue === member.instrument) return true;
        if (inst.targetType === "individual" && inst.targetValue === String(member.id)) return true;
        return false;
      })
      .map((inst) => {
        const resolvedText = evaluateInstructionFormula(inst.instructionText, xVal);
        return {
          id: inst.id,
          original: inst.instructionText,
          resolved: resolvedText,
          targetType: inst.targetType,
        };
      });
  };

  const selectedMemberResolvedInsts = selectedMember ? getMemberResolvedInstructions(selectedMember) : [];

  const handleAddInstSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInstText.trim()) return;

    let targetVal = "全員";
    if (newInstTargetType === "instrument") {
      targetVal = newInstTargetValue || instruments[0] || "";
    } else if (newInstTargetType === "individual") {
      targetVal = newInstTargetValue || (members[0] ? String(members[0].id) : "");
    }

    onAddInstruction(newInstTargetType, targetVal, newInstText);
    setNewInstText("");
  };

  const handleQuickInsert = (formula: string) => {
    setNewInstText((prev) => (prev ? `${prev} ${formula}` : formula));
  };

  const handleCreateGroup = () => {
    if (!newGroupName.trim() || selectedGroupMemberIds.length === 0 || !onUpdateMemberGroups) return;
    const newGroup: MemberGroup = {
      id: String(Date.now()),
      name: newGroupName.trim(),
      memberIds: selectedGroupMemberIds,
    };
    onUpdateMemberGroups([...memberGroups, newGroup]);
    setNewGroupName("");
    setSelectedGroupMemberIds([]);
    setShowGroupCreator(false);
  };

  const handleDeleteGroup = (groupId: string) => {
    if (!onUpdateMemberGroups) return;
    onUpdateMemberGroups(memberGroups.filter((g) => g.id !== groupId));
  };

  const handleAutoCreateGroupsByX = () => {
    if (!onUpdateMemberGroups) return;
    const xMap: Record<number, number[]> = {};
    members.forEach((m) => {
      const xVal = memberVariables[m.id] ?? 0;
      if (!xMap[xVal]) xMap[xVal] = [];
      xMap[xVal].push(m.id);
    });
    const newGroups: MemberGroup[] = Object.entries(xMap).map(([xStr, ids]) => ({
      id: `auto-${xStr}-${Date.now()}`,
      name: `変数 x = ${xStr} グループ (${ids.length}名)`,
      memberIds: ids,
      variableX: Number(xStr),
    }));
    onUpdateMemberGroups([...memberGroups, ...newGroups]);
  };

  if (!isRightSidebarOpen) {
    return (
      <div className="w-12 bg-slate-900 border-l border-slate-700 flex flex-col items-center py-4 shrink-0 transition-all duration-300">
        <button
          onClick={() => setIsRightSidebarOpen(true)}
          className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition mb-4"
          title="タスクバーを開く"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-[10px] font-bold gap-2">
          <Users className="w-4 h-4 text-blue-400" />
        </div>
      </div>
    );
  }

  return (
    <section className="w-full md:w-80 bg-slate-50 border-l border-slate-200 flex flex-col shrink-0 h-full p-0 transition-all duration-300 relative shadow-lg">
      {/* Sidebar Close Button */}
      <button
        onClick={() => setIsRightSidebarOpen(false)}
        className="absolute top-4 left-[-16px] w-6 h-8 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-l flex items-center justify-center text-slate-500 shadow z-50 transition"
        title="タスクバーを閉じる"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>

      {/* Tabs Header */}
      <div className="grid grid-cols-5 border-b border-slate-200 bg-white shrink-0">
        <button
          onClick={() => handleTabChange("personnel")}
          className={`py-2.5 text-center text-[10px] font-bold border-b-2 flex flex-col items-center gap-1 transition ${
            activeTab === "personnel"
              ? "border-blue-500 text-blue-600 bg-blue-50/20"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>部員</span>
        </button>
        <button
          onClick={() => handleTabChange("dotbook")}
          className={`py-2.5 text-center text-[10px] font-bold border-b-2 flex flex-col items-center gap-1 transition ${
            activeTab === "dotbook"
              ? "border-blue-500 text-blue-600 bg-blue-50/20"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50"
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
          <span>コマ表</span>
        </button>
        <button
          onClick={() => handleTabChange("instructions")}
          className={`py-2.5 text-center text-[10px] font-bold border-b-2 flex flex-col items-center gap-1 transition ${
            activeTab === "instructions"
              ? "border-blue-500 text-blue-600 bg-blue-50/20"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50"
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
          <span>指定</span>
        </button>
        <button
          onClick={() => handleTabChange("variables")}
          className={`py-2.5 text-center text-[10px] font-bold border-b-2 flex flex-col items-center gap-1 transition ${
            activeTab === "variables"
              ? "border-blue-500 text-blue-600 bg-blue-50/20"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50"
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>変数</span>
        </button>
        <button
          onClick={() => handleTabChange("warnings")}
          className={`py-2.5 text-center text-[10px] font-bold border-b-2 flex flex-col items-center gap-1 transition relative ${
            activeTab === "warnings"
              ? "border-red-500 text-red-600 bg-red-50/30"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50"
          }`}
        >
          <AlertTriangle className={`w-3.5 h-3.5 ${allSetCollisions.length > 0 ? "text-red-500 animate-pulse" : "text-slate-400"}`} />
          <span>警告</span>
          {allSetCollisions.length > 0 && (
            <span className="absolute top-1 right-1 bg-red-500 text-white text-[8px] font-black rounded-full w-3.5 h-3.5 flex items-center justify-center leading-none shadow-2xs">
              {allSetCollisions.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* TAB 1: PERSONNEL LIST */}
        {activeTab === "personnel" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-3.5 border-b border-slate-100 bg-white flex justify-between items-center shrink-0">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  部員リスト ({members.length}人)
                </span>
                <button
                  onClick={onShowNewMemberModal}
                  className="text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition font-bold text-[10px] border border-blue-200 bg-white"
                >
                  + 部員を追加
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-2.5 space-y-1 bg-slate-50/50">
                {members.map((m) => {
                  const isSelected = m.id === selectedMemberId;
                  const mLabel = memberCustomLabels[m.id] || "";
                  return (
                    <div
                      key={m.id}
                      onClick={() => onSelectMember(m.id)}
                      className={`group flex items-center gap-2 px-2.5 py-1.5 rounded border text-xs cursor-pointer transition ${
                        isSelected
                          ? "bg-blue-50 border-blue-200 text-blue-950 shadow-sm"
                          : "bg-white border-slate-150 text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: m.color }}
                      />
                      <div className="flex-1 font-semibold truncate flex items-center gap-1">
                        {mLabel && (
                          <span className="bg-slate-100 text-slate-600 px-1 rounded font-mono text-[9px] font-bold">
                            {mLabel}
                          </span>
                        )}
                        <span>{m.name}</span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onEditMember) onEditMember(m);
                          }}
                          className="p-1 text-slate-400 hover:text-blue-600 rounded transition"
                          title="部員情報を編集"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteMember(m.id);
                          }}
                          className="p-1 text-slate-400 hover:text-red-500 rounded transition"
                          title="部員を削除"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {members.length === 0 && (
                  <div className="text-center py-8 text-xs text-slate-400 font-medium">
                    部員が登録されていません
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DOT BOOK (歩数計算指示書) */}
        {activeTab === "dotbook" && (
          <div className="flex-1 bg-slate-900 text-white flex flex-col overflow-hidden">
            <div className="p-3 bg-slate-800/80 border-b border-slate-800 flex items-center justify-between shrink-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                <span>コマ表: {currentSet ? `No. ${currentSet.number}` : "---"} → {nextSet ? `No. ${nextSet.number}` : "END"}</span>
              </span>
              {selectedMember && (
                <span className="text-[9px] font-bold bg-blue-950 text-blue-300 px-1.5 py-0.5 rounded font-mono">
                  cts: {currentSet?.counts || 16}
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selectedMember ? (
                <>
                  {/* Selected Member Header with Custom Numbering Input */}
                  <div className="flex justify-between items-start pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: selectedMember.color }}
                      />
                      <div>
                        <div className="text-xs font-bold flex items-center gap-1">
                          <span>{selectedMember.name}</span>
                        </div>
                        <div className="text-[9px] text-slate-500 font-mono uppercase tracking-wider">{selectedMember.instrument}</div>
                      </div>
                    </div>

                    {/* Custom Label/Numbering input as requested */}
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-slate-500 font-mono">No.</span>
                      <input
                        type="text"
                        placeholder="A1, T1..."
                        value={memberCustomLabels[selectedMember.id] || ""}
                        onChange={(e) => onUpdateMemberCustomLabel(selectedMember.id, e.target.value)}
                        className="w-14 bg-slate-800 border border-slate-700 text-[10px] font-bold text-slate-200 px-1 py-0.5 rounded text-center focus:outline-none focus:border-blue-500 font-mono"
                        title="各自の立ち位置番号を割り当てます"
                      />
                    </div>
                  </div>

                  {/* Step calculations */}
                  <div className="space-y-2.5">
                    {/* Evaluated Set Specific custom instructions for college style */}
                    <div className="border-t border-slate-800 pt-2.5">
                      <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider mb-2">適用される指定 (削除・変更可能)</span>
                      {selectedMemberResolvedInsts.length > 0 ? (
                        <div className="space-y-1.5">
                          {selectedMemberResolvedInsts.map((inst, i) => {
                            const isEditing = editingInstId === inst.id;
                            return (
                              <div key={i} className="bg-slate-800 border border-slate-700 p-2.5 rounded flex flex-col gap-1.5">
                                {isEditing ? (
                                  <div className="flex gap-1 items-center">
                                    <input
                                      type="text"
                                      value={editingText}
                                      onChange={(e) => setEditingText(e.target.value)}
                                      className="flex-1 bg-slate-950 border border-slate-600 rounded px-1.5 py-1 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                                    />
                                    <button
                                      onClick={() => {
                                        if (onUpdateInstructionText) {
                                          onUpdateInstructionText(inst.id, editingText);
                                        }
                                        setEditingInstId(null);
                                      }}
                                      className="p-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded transition"
                                      title="保存"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => setEditingInstId(null)}
                                      className="p-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded transition"
                                      title="キャンセル"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-1 flex-1">
                                    <div className="flex justify-between items-start gap-2">
                                      <div className="flex-1">
                                        <div className="text-xs font-extrabold text-blue-400">
                                          {inst.resolved}
                                        </div>
                                        {inst.original !== inst.resolved && (
                                          <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                                            式: {inst.original} (x={memberVariables[selectedMember.id] ?? 0})
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1 shrink-0">
                                        <button
                                          onClick={() => {
                                            setEditingInstId(inst.id);
                                            setEditingText(inst.original);
                                          }}
                                          className="p-1 text-slate-400 hover:text-blue-400 hover:bg-slate-700/50 rounded transition"
                                          title="指定を変更"
                                        >
                                          <Edit2 className="w-3 h-3" />
                                        </button>
                                        <button
                                          onClick={() => onDeleteInstruction(inst.id)}
                                          className="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-700/50 rounded transition"
                                          title="指定を削除"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                    {(() => {
                                      const countVal = currentSet ? validateInstructionCounts(inst.resolved, currentSet.counts) : null;

                                      const warningMsgs: string[] = [];
                                      if (countVal && !countVal.isValid) warningMsgs.push(countVal.message);

                                      if (warningMsgs.length > 0) {
                                        return (
                                          <div className="mt-1 space-y-1">
                                            {warningMsgs.map((msg, wIdx) => (
                                              <div key={wIdx} className="px-2 py-1 bg-rose-950/40 border border-rose-800/60 rounded text-[9px] text-rose-300 font-semibold flex items-start gap-1">
                                                <span>{msg}</span>
                                              </div>
                                            ))}
                                          </div>
                                        );
                                      }
                                      return null;
                                    })()}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-600 italic">
                          このメンバーに該当する指定はありません
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center py-12 text-slate-500">
                  <HelpCircle className="w-8 h-8 text-slate-700 mb-2" />
                  <p className="text-xs leading-relaxed">
                    フィールド上、または「部員」タブから部員を選択すると、座標・歩数計算（コマ表）がリアルタイムに表示されます。
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: SET SPECIFIC INSTRUCTIONS FORMULA */}
        {activeTab === "instructions" && (
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            <div className="border-b border-slate-200 pb-1.5 shrink-0">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                現在のNo. ({currentSet ? `No. ${currentSet.number}` : "未選択"}) の指定
              </span>
              <p className="text-[9.5px] text-slate-500 leading-relaxed mt-0.5">
                「全員」「パート（楽器）別」「個人」の単位で直線・曲線などの動きを指定。変数 <code className="bg-slate-100 font-bold px-0.5 text-amber-700">x</code> や四則演算を含めると各自の値に自動解決されます。
              </p>
            </div>

            {currentSet ? (
              <div className="space-y-3">
                {/* Add new instruction form */}
                <form onSubmit={handleAddInstSubmit} className="space-y-2.5 bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-600 block uppercase">新しい指定を追加</span>
                  
                  {/* Target selection */}
                  <div>
                    <label className="text-[9px] text-slate-400 block mb-1 uppercase font-semibold">対象グループ</label>
                    <div className="grid grid-cols-3 gap-1">
                      {(["all", "instrument", "individual"] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => {
                            setNewInstTargetType(type);
                            if (type === "instrument") {
                              setNewInstTargetValue(instruments[0] || "");
                            } else if (type === "individual") {
                              setNewInstTargetValue(members[0] ? String(members[0].id) : "");
                            }
                          }}
                          className={`py-1 rounded text-[10px] font-bold border transition ${
                            newInstTargetType === type
                              ? "bg-blue-50 border-blue-400 text-blue-700"
                              : "bg-slate-50 border-slate-200 text-slate-600"
                          }`}
                        >
                          {type === "all" ? "全員" : type === "instrument" ? "パート別" : "個人別"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Target value inputs based on selection */}
                  {newInstTargetType === "instrument" && (
                    <div>
                      <label className="text-[9px] text-slate-400 block mb-1 font-semibold">対象パート</label>
                      <select
                        value={newInstTargetValue}
                        onChange={(e) => setNewInstTargetValue(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-700"
                      >
                        {instruments.map((inst) => (
                          <option key={inst} value={inst}>
                            {inst}
                          </option>
                        ))}
                        {instruments.length === 0 && (
                          <option value="">部員を登録してください</option>
                        )}
                      </select>
                    </div>
                  )}

                  {newInstTargetType === "individual" && (
                    <div>
                      <label className="text-[9px] text-slate-400 block mb-1 font-semibold">対象部員</label>
                      <select
                        value={newInstTargetValue}
                        onChange={(e) => setNewInstTargetValue(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-700"
                      >
                        {members.map((m) => (
                          <option key={m.id} value={String(m.id)}>
                            {m.name} ({m.instrument})
                          </option>
                        ))}
                        {members.length === 0 && (
                          <option value="">部員を登録してください</option>
                        )}
                      </select>
                    </div>
                  )}

                  {/* Instruction Input Builder Section */}
                  <div className="space-y-2 bg-slate-50 border border-slate-200/80 p-2 rounded-lg">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                      <span className="text-[10px] font-bold text-slate-700">動作フェーズ・ビルダー (簡単入力)</span>
                      <span className="text-[9px] text-slate-400">No.のカウント: {currentSet ? currentSet.counts : 16} counts</span>
                    </div>

                    {/* Step 1: Phase Action Selection */}
                    <div>
                      <span className="text-[9px] text-slate-500 font-bold block mb-1">1. 動作タイプを選択</span>
                      <div className="grid grid-cols-3 gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            const maxC = currentSet ? currentSet.counts : 16;
                            setNewInstText((prev) => (prev ? `${prev} Build ${maxC}` : `Build ${maxC}`));
                          }}
                          className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-1 px-1.5 rounded text-[9.5px] transition shadow-xs flex flex-col items-center justify-center"
                        >
                          <span>Build (進行)</span>
                          <span className="text-[8px] opacity-80">全移動</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const maxC = currentSet ? currentSet.counts : 16;
                            setNewInstText((prev) => (prev ? `${prev} Halt ${maxC}` : `Halt ${maxC}`));
                          }}
                          className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-1 px-1.5 rounded text-[9.5px] transition shadow-xs flex flex-col items-center justify-center"
                        >
                          <span>Halt (静止)</span>
                          <span className="text-[8px] opacity-80">全静止</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const maxC = currentSet ? currentSet.counts : 16;
                            setNewInstText((prev) => (prev ? `${prev} M.T. ${maxC}` : `M.T. ${maxC}`));
                          }}
                          className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-1 px-1.5 rounded text-[9.5px] transition shadow-xs flex flex-col items-center justify-center"
                        >
                          <span>Mark Time</span>
                          <span className="text-[8px] opacity-80">足踏み</span>
                        </button>
                      </div>
                    </div>

                    {/* Step 2: Quick count builder buttons */}
                    <div>
                      <span className="text-[9px] text-slate-500 font-bold block mb-1">2. ワンタップ追加コマンド</span>
                      <div className="grid grid-cols-2 gap-1">
                        <button
                          type="button"
                          onClick={() => setNewInstText("Build (x) Halt (" + (currentSet?.counts || 16) + "-x)")}
                          className="bg-white hover:bg-blue-50 border border-slate-300 hover:border-blue-300 text-slate-700 py-1 px-1.5 rounded text-[9px] font-semibold text-left transition flex justify-between items-center"
                        >
                          <span>Build (x) → Halt</span>
                          <span className="text-[7.5px] font-mono text-slate-400">前半移動</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewInstText("Halt (x) Build (" + (currentSet?.counts || 16) + "-x)")}
                          className="bg-white hover:bg-blue-50 border border-slate-300 hover:border-blue-300 text-slate-700 py-1 px-1.5 rounded text-[9px] font-semibold text-left transition flex justify-between items-center"
                        >
                          <span>Halt (x) → Build</span>
                          <span className="text-[7.5px] font-mono text-slate-400">後半移動</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewInstText("Build 8 Halt 8")}
                          className="bg-white hover:bg-blue-50 border border-slate-300 hover:border-blue-300 text-slate-700 py-1 px-1.5 rounded text-[9px] font-semibold text-left transition"
                        >
                          Build 8 → Halt 8
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewInstText("Halt 8 Build 8")}
                          className="bg-white hover:bg-blue-50 border border-slate-300 hover:border-blue-300 text-slate-700 py-1 px-1.5 rounded text-[9px] font-semibold text-left transition"
                        >
                          Halt 8 → Build 8
                        </button>
                      </div>
                    </div>

                    {/* Generated Instruction Text Input & Clear */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[9px] text-slate-500 font-bold">現在の指定コマンド</label>
                        {newInstText && (
                          <button
                            type="button"
                            onClick={() => setNewInstText("")}
                            className="text-[9px] text-red-500 hover:underline"
                          >
                            クリア
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="例: Build 8 Halt 8 または Build (x)"
                        value={newInstText}
                        onChange={(e) => setNewInstText(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-xs"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs transition shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>指定を追加して適用</span>
                  </button>
                </form>

                {/* List of current instructions */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">設定済みの指定リスト ({currentSetInsts.length})</span>
                  <div className="space-y-1.5">
                    {currentSetInsts.map((inst) => {
                      const xVal = selectedMember ? (memberVariables[selectedMember.id] ?? 0) : 0;
                      const resolvedText = evaluateInstructionFormula(inst.instructionText, xVal);
                      const countVal = currentSet ? validateInstructionCounts(resolvedText, currentSet.counts) : null;

                      const warningMsgs: string[] = [];
                      if (countVal && !countVal.isValid) warningMsgs.push(countVal.message);

                      return (
                        <div key={inst.id} className="bg-white border border-slate-200 rounded p-2 shadow-xs flex justify-between items-start">
                          <div className="space-y-1 flex-1">
                            <span className="text-[8px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                              {inst.targetType === "all"
                                ? "全員"
                                : inst.targetType === "instrument"
                                ? `パート: ${inst.targetValue}`
                                : `個人: ${members.find((m) => String(m.id) === inst.targetValue)?.name || "部員"}`}
                            </span>
                            <p className="text-xs font-bold text-slate-800 font-mono leading-relaxed mt-1">
                              {inst.instructionText}
                            </p>
                            {warningMsgs.length > 0 && (
                              <div className="mt-1 space-y-1">
                                {warningMsgs.map((msg, wIdx) => (
                                  <div key={wIdx} className="px-1.5 py-0.5 bg-rose-50 border border-rose-200 rounded text-[9px] text-rose-600 font-semibold flex items-start gap-1">
                                    <span>{msg}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => onDeleteInstruction(inst.id)}
                            className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded transition shrink-0 ml-2"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                    {currentSetInsts.length === 0 && (
                      <div className="text-center py-6 bg-white rounded-lg border border-slate-200/60 text-xs text-slate-400 italic">
                        登録された指定はありません
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-xs text-slate-500">
                No.を選択してください
              </div>
            )}
          </div>
        )}

        {/* TAB 3: VARIABLE X MANAGER */}
        {activeTab === "variables" && (
          <div className="flex-1 flex flex-col overflow-hidden p-2.5 space-y-2.5">
            <div className="border-b border-slate-200 pb-1.5 shrink-0 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  変数設定・グループ管理
                </span>
                <p className="text-[9px] text-slate-400">
                  各自の変数や、整列等で使えるグループを作成
                </p>
              </div>
              <button
                type="button"
                onClick={handleAutoCreateGroupsByX}
                className="text-[9px] bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold px-2 py-1 rounded border border-blue-200 transition shrink-0 shadow-xs"
                title="現在設定されている同じ変数の値ごとに部員をグループ化して保存します"
              >
                ✨ 変数値で自動グループ化
              </button>
            </div>

            {/* 変数グループ一覧 & 管理エリア */}
            <div className="bg-slate-100/80 p-2 rounded-lg border border-slate-200 shrink-0 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase">保存済み変数グループ ({memberGroups.length})</span>
                <button
                  type="button"
                  onClick={() => setShowGroupCreator(!showGroupCreator)}
                  className="text-[9px] text-blue-600 font-bold hover:underline"
                >
                  {showGroupCreator ? "キャンセル" : "+ 手動作成"}
                </button>
              </div>

              {/* 手動作成フォーム */}
              {showGroupCreator && (
                <div className="bg-white p-2 rounded border border-blue-200 space-y-1.5 text-xs shadow-sm">
                  <input
                    type="text"
                    placeholder="グループ名 (例: フロント列, Tp1番...)"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-semibold focus:outline-none focus:border-blue-500"
                  />
                  <div className="max-h-24 overflow-y-auto space-y-0.5 border border-slate-100 rounded p-1 bg-slate-50 text-[10px]">
                    <div className="flex justify-between pb-0.5 border-b border-slate-200 font-bold text-slate-500">
                      <span>部員を選択</span>
                      <button type="button" onClick={() => setSelectedGroupMemberIds(members.map(m => m.id))} className="text-blue-600">全選択</button>
                    </div>
                    {members.map((m) => {
                      const checked = selectedGroupMemberIds.includes(m.id);
                      return (
                        <label key={m.id} className="flex items-center gap-1.5 cursor-pointer py-0.5 px-1 rounded hover:bg-white">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              if (checked) setSelectedGroupMemberIds(selectedGroupMemberIds.filter(id => id !== m.id));
                              else setSelectedGroupMemberIds([...selectedGroupMemberIds, m.id]);
                            }}
                            className="rounded text-blue-600"
                          />
                          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: m.color }} />
                          <span className="truncate">{m.name}</span>
                        </label>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateGroup}
                    disabled={!newGroupName.trim() || selectedGroupMemberIds.length === 0}
                    className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 text-white font-bold py-1 rounded text-[11px] transition"
                  >
                    グループ保存 ({selectedGroupMemberIds.length}名)
                  </button>
                </div>
              )}

              {/* グループバッジリスト */}
              <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pr-1">
                {memberGroups.length === 0 ? (
                  <span className="text-[10px] text-slate-400 italic">グループはありません。「x値で自動グループ化」を押すと即作成されます</span>
                ) : (
                  memberGroups.map((g) => (
                    <div key={g.id} className="bg-white border border-slate-200 rounded px-1.5 py-0.5 flex items-center gap-1.5 shadow-2xs text-[10px]">
                      <span className="font-bold text-slate-700">{g.name}</span>
                      <span className="text-[9px] bg-slate-100 text-slate-500 font-mono px-1 rounded">{g.memberIds.length}名</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteGroup(g.id)}
                        className="text-slate-300 hover:text-red-500 font-bold ml-0.5"
                        title="グループを削除"
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* List of members with input field */}
            <div className="flex-1 flex flex-col overflow-hidden min-h-[300px]">
              <div className="flex items-center justify-between mb-1 shrink-0">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">各部員の変数 x 一覧 ({members.length}名)</span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-1 bg-slate-50/70 p-1.5 rounded-lg border border-slate-200 shadow-inner">
                {members.map((m) => {
                  const mLabel = memberCustomLabels[m.id] || "";
                  return (
                    <div key={m.id} className="flex items-center justify-between bg-white px-2 py-1 rounded border border-slate-200/80 shadow-2xs hover:border-slate-300 transition">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: m.color }}
                        />
                        <div className="text-[11px] font-semibold text-slate-800 truncate">
                          {mLabel && (
                            <span className="bg-slate-100 text-slate-500 font-mono text-[8px] font-bold px-1 rounded mr-1">
                              {mLabel}
                            </span>
                          )}
                          {m.name}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[10px] text-slate-400 font-bold font-mono">x=</span>
                        <input
                          type="number"
                          value={memberVariables[m.id] ?? 0}
                          onChange={(e) => onUpdateMemberVariable(m.id, parseInt(e.target.value) || 0)}
                          className="w-12 bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-[11px] text-center font-bold font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                        />
                      </div>
                    </div>
                  );
                })}
                {members.length === 0 && (
                  <div className="text-center py-8 text-xs text-slate-400">
                    部員が登録されていません
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: WARNINGS (COLLISIONS & PROXIMITY) */}
        {activeTab === "warnings" && (
          <div className="flex-1 flex flex-col overflow-hidden p-2.5 space-y-2.5 bg-slate-50/50">
            <div className="border-b border-slate-200 pb-2 shrink-0">
              <div className="flex items-center gap-1.5 text-red-600 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 animate-pulse" />
                <span>全No. 衝突・接近 警告一覧</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                全No.の静止位置および移動途中の経路を自動スキャン。衝突(<span className="font-bold underline text-red-600">0.8歩未満</span>)や接近(<span className="font-bold text-amber-600">1.4歩未満</span>)のペアを表示します。
              </p>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5">
              {allSetCollisions.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-xl border border-slate-200/80 text-slate-400 p-4 shadow-2xs space-y-2">
                  <div className="text-3xl">🎉</div>
                  <p className="text-xs font-bold text-slate-700">衝突・接近の警告はありません</p>
                  <p className="text-[10px] leading-relaxed">すべてのNo.の配置・移動間隔が安全に保たれています。</p>
                </div>
              ) : (
                allSetCollisions.map((sc) => (
                  <div key={sc.setId} className="bg-white rounded-xl border border-red-200 shadow-xs overflow-hidden">
                    <div className="bg-red-50/80 px-2.5 py-1.5 border-b border-red-100 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="bg-red-600 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
                          No. {sc.setNumber}
                        </span>
                        <span className="text-[10px] font-bold text-slate-700">
                          {sc.count}c
                        </span>
                        <span className="text-[10px] text-red-600 font-bold">
                          ({sc.pairs.length}ペア)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onSelectSet?.(sc.setId)}
                        className="text-[10px] bg-white hover:bg-red-600 text-red-600 hover:text-white font-bold px-2 py-0.5 rounded border border-red-200 transition shadow-2xs"
                      >
                        移動 →
                      </button>
                    </div>

                    <div className="p-2 space-y-1.5 divide-y divide-slate-100">
                      {sc.pairs.map((pair, pIdx) => (
                        <div key={pIdx} className="pt-1.5 first:pt-0 flex flex-col gap-0.5 text-[11px]">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 min-w-0">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: pair.m1.color }} />
                              <span className="font-bold truncate text-slate-800">{pair.m1.name}</span>
                              <span className="text-slate-400 font-bold">↔</span>
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: pair.m2.color }} />
                              <span className="font-bold truncate text-slate-800">{pair.m2.name}</span>
                            </div>
                            {pair.isSevere ? (
                              <span className="bg-red-600 text-white text-[8px] font-black px-1 py-0.5 rounded shrink-0">衝突危険!</span>
                            ) : (
                              <span className="bg-amber-100 text-amber-800 text-[8px] font-bold px-1 py-0.5 rounded shrink-0">接近</span>
                            )}
                          </div>
                          <div className="flex items-center justify-between text-[9px] text-slate-400 pl-3">
                            <span>{pair.timeDesc || "静止時"}</span>
                            <span className="font-mono font-bold text-slate-600">距離 {pair.dist}歩</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
