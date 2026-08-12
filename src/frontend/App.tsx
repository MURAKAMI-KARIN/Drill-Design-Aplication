import React, { useState, useEffect, useRef, useMemo } from "react";
import { Formation, Member, Position, FieldTemplate, SetInstruction, CustomMarker, MemberGroup } from "./types";
import type { Set } from "./types";
import MarchingField, { renderCustomMarkShape } from "./components/MarchingField";
import RightSidebar from "./components/RightSidebar";
import {
  calculateMoveInstructions,
  getYardLocationDescription,
  evaluateInstructionFormula,
  getInstrumentPrefix,
  generateNextMemberLabel,
  getEffectiveMemberLabel,
} from "./lib/marchingUtils";
import {
  Play,
  Pause,
  Square,
  Plus,
  Copy,
  Trash2,
  Edit2,
  Save,
  Users,
  Music,
  Activity,
  Layers,
  BookOpen,
  ChevronRight,
  User,
  UserPlus,
  Home,
  Layout,
  Sliders,
  Settings,
  Keyboard,
  HelpCircle,
  Menu,
  ChevronLeft,
  RotateCcw,
  Check,
  Bookmark,
  Printer,
  X,
} from "lucide-react";

const DEFAULT_TEMPLATES: FieldTemplate[] = [
  {
    id: "template_1",
    name: "大学",
    fieldWidth: 150,
    fieldHeight: 150,
    gridSizeX: 10,
    gridSizeY: 10,
    gridLineWidth: 1,
    gridLineStyle: "solid",
    subGridLineStyle: "solid",
    gridLineColor: "rgba(0,0,0,0.15)",
    backgroundColor: "#ffffff",
    showGridLines: true,
    markingShape: "cross",
    blocksX: 15,
    blocksY: 15,
    subdivisionsX: 10,
    subdivisionsY: 10,
    markerColor: "#000000",
    customMarkers: [
      { id: "cm_1", x: 0.3, y: 0.3 },
      { id: "cm_2", x: 0.5, y: 0.7 },
      { id: "cm_3", x: 0.7, y: 0.5 },
      { id: "cm_4", x: 0.3, y: 0.5 },
      { id: "cm_5", x: 0.5, y: 0.3 },
      { id: "cm_6", x: 0.7, y: 0.7 },
      { id: "cm_7", x: 0.3, y: 0.7 },
      { id: "cm_8", x: 0.7, y: 0.3 },
      { id: "cm_9", x: 0.7, y: 0.04, shape: "t_down" },
      { id: "cm_10", x: 0.5, y: 0.04, shape: "t_down" },
      { id: "cm_11", x: 0.3, y: 0.04, shape: "t_down" },
      { id: "cm_12", x: 0.1, y: 0.1, shape: "l_top_left" },
      { id: "cm_13", x: 0.04, y: 0.3, shape: "t_right" },
      { id: "cm_14", x: 0.04, y: 0.7, shape: "t_right" },
      { id: "cm_15", x: 0.04, y: 0.5, shape: "t_right" },
      { id: "cm_16", x: 0.9, y: 0.1, shape: "l_top_right" },
      { id: "cm_17", x: 0.96, y: 0.3, shape: "t_left" },
      { id: "cm_18", x: 0.96, y: 0.5, shape: "t_left" },
      { id: "cm_19", x: 0.9, y: 0.9, shape: "l_bottom_right" },
      { id: "cm_20", x: 0.96, y: 0.7, shape: "t_left" },
      { id: "cm_21", x: 0.1, y: 0.9, shape: "l_bottom_left" },
      { id: "cm_22", x: 0.5, y: 0.96, shape: "t_up" },
      { id: "cm_23", x: 0.3, y: 0.96, shape: "t_up" },
      { id: "cm_24", x: 0.7, y: 0.96, shape: "t_up" },
      { id: "cm_25", x: 0.5, y: 0.5, shape: "x" },
    ]
  }
];

export interface TrashItem {
  id: string;
  formationId: number;
  title: string;
  music: string;
  bpm: number;
  deletedAt: string;
  formationStyle: any;
  setInstructions: any;
  memberVariables: any;
  memberCustomLabels: any;
  memberGroups?: any;
  details: {
    formation: any;
    members: any[];
  };
}

export const getCleanTrash = (): TrashItem[] => {
  const rawTrash = localStorage.getItem("drillflow_trash");
  if (!rawTrash) return [];
  try {
    const items: TrashItem[] = JSON.parse(rawTrash);
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const validItems = items.filter(item => {
      const deleteTime = new Date(item.deletedAt).getTime();
      return deleteTime >= thirtyDaysAgo;
    });
    if (validItems.length !== items.length) {
      localStorage.setItem("drillflow_trash", JSON.stringify(validItems));
    }
    return validItems;
  } catch (e) {
    console.error("Failed to parse trash:", e);
    return [];
  }
};

export default function App() {
  // アプリケーション状態
  const [formations, setFormations] = useState<Formation[]>([]);
  const [activeFormation, setActiveFormation] = useState<Formation | null>(null);
  const [members, setMembers] = useState<Member[]>([]);

  // ごみ箱（30日復元可能）の状態管理
  const [showTrashModal, setShowTrashModal] = useState<boolean>(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [deleteTargetTitle, setDeleteTargetTitle] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");

  // 画面モード: "home" = ホーム画面, "editor" = コンテ作成画面, "field_designer" = フィールドテンプレート作成画面
  const [activeView, setActiveView] = useState<"home" | "editor" | "field_designer">("home");

  const [selectedSetId, setSelectedSetId] = useState<number | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [snapMode, setSnapMode] = useState<"on" | "none">("on");
  const [enableCollisionDetection, setEnableCollisionDetection] = useState<boolean>(true);
  const [showGhost, setShowGhost] = useState<boolean>(true);

  // コンテ・音源設定モーダルの開閉
  const [showFormationSettingsModal, setShowFormationSettingsModal] = useState<boolean>(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState<boolean>(false);

  // 配置（整列）ツール状態
  const [isAlignToolActive, setIsAlignToolActive] = useState<boolean>(false);
  const [alignType, setAlignType] = useState<"line" | "arc" | "circle">("line");
  const [alignSelectedMemberIds, setAlignSelectedMemberIds] = useState<number[]>([]);
  const [alignPointA, setAlignPointA] = useState<{ x: number; y: number }>({ x: 0.25, y: 0.5 });
  const [alignPointB, setAlignPointB] = useState<{ x: number; y: number }>({ x: 0.75, y: 0.5 });
  const [alignPointMid, setAlignPointMid] = useState<{ x: number; y: number }>({ x: 0.5, y: 0.3 });
  const [alignPointCenter, setAlignPointCenter] = useState<{ x: number; y: number }>({ x: 0.5, y: 0.5 });
  const [alignRadius, setAlignRadius] = useState<number>(0.25);
  const [alignStartAngle, setAlignStartAngle] = useState<number>(0);
  const [alignEndAngle, setAlignEndAngle] = useState<number>(180);
  const [showAlignMemberSelector, setShowAlignMemberSelector] = useState<boolean>(false);
  const [alignMemberSearch, setAlignMemberSearch] = useState<string>("");

  const [copiedFormationPositions, setCopiedFormationPositions] = useState<{ memberId: number; x: number; y: number }[] | null>(null);

  const toggleAlignMemberId = (mId: number) => {
    setAlignSelectedMemberIds((prev) =>
      prev.includes(mId) ? prev.filter((id) => id !== mId) : [...prev, mId]
    );
  };

  // フィールドテンプレート作成・編集用状態
  const [designerTemplateId, setDesignerTemplateId] = useState<string | null>(null);
  const [designerName, setDesignerName] = useState<string>("カスタムフィールド1");
  const [designerWidth, setDesignerWidth] = useState<number>(150);
  const [designerHeight, setDesignerHeight] = useState<number>(150);
  const [designerGridSizeX, setDesignerGridSizeX] = useState<number>(10);
  const [designerGridSizeY, setDesignerGridSizeY] = useState<number>(10);
  const [designerGridLineWidth, setDesignerGridLineWidth] = useState<number>(1);
  const [designerGridLineStyle, setDesignerGridLineStyle] = useState<"solid" | "dashed" | "dotted">("solid");
  const [designerSubGridLineStyle, setDesignerSubGridLineStyle] = useState<"solid" | "dashed" | "dotted">("solid");
  const [selectedDesignerMarkerId, setSelectedDesignerMarkerId] = useState<string | null>(null);
  const [copiedMarker, setCopiedMarker] = useState<CustomMarker | null>(null);
  const [designerGridLineColor, setDesignerGridLineColor] = useState<string>("rgba(0,0,0,0.15)");
  const [designerBackgroundColor, setDesignerBackgroundColor] = useState<string>("#ffffff");
  const [designerShowGridLines, setDesignerShowGridLines] = useState<boolean>(true);
  const [designerMarkingShape, setDesignerMarkingShape] = useState<string>("cross");
  const [designerCustomMarkers, setDesignerCustomMarkers] = useState<CustomMarker[]>([]);

  // ブロック・補助線ベースの新規フィールド設定項目 & スナップ機能
  const [designerBlocksX, setDesignerBlocksX] = useState<number>(15);
  const [designerBlocksY, setDesignerBlocksY] = useState<number>(15);
  const [designerSubdivisionsX, setDesignerSubdivisionsX] = useState<number>(10);
  const [designerSubdivisionsY, setDesignerSubdivisionsY] = useState<number>(10);
  const [designerMarkerColor, setDesignerMarkerColor] = useState<string>("#000000");
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);

  // 新規フィールドテンプレート＆セット指示のステート
  const [fieldTemplates, setFieldTemplates] = useState<FieldTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("template_1");
  const [isFieldDesignerOpen, setIsFieldDesignerOpen] = useState<boolean>(false);
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState<boolean>(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState<boolean>(true);

  // Undo (取り消し) / Redo (やり直し) 履歴用ステート
  const [editorHistory, setEditorHistory] = useState<Formation[]>([]);
  const [editorFuture, setEditorFuture] = useState<Formation[]>([]);
  const [designerHistory, setDesignerHistory] = useState<any[]>([]);
  const [designerFuture, setDesignerFuture] = useState<any[]>([]);

  // セットごとの指示
  const [setInstructions, setSetInstructions] = useState<Record<number, SetInstruction[]>>({});
  // 部員ごとの変数 x (セットID -> 部員ID -> 数値)
  const [memberVariables, setMemberVariables] = useState<Record<number, Record<number, number>>>({});
  // 部員ごとの立ち位置番号 (Custom labels/numbering)
  const [memberCustomLabels, setMemberCustomLabels] = useState<Record<number, string>>({});
  // コマ表上の部員名表示（オン/オフ）
  const [showMemberLabels, setShowMemberLabels] = useState<boolean>(true);
  // 部員変数グループ (セットID -> MemberGroup[])
  const [memberGroupsBySet, setMemberGroupsBySet] = useState<Record<number, MemberGroup[]>>({});
  // 右サイドバーで表示するタブ（警告タブへの切り替え用）
  const [activeRightSidebarTab, setActiveRightSidebarTab] = useState<"personnel" | "dotbook" | "instructions" | "variables" | "warnings">("personnel");

  // 新規フォーメーション作成時のテンプレート選択
  const [newFormationTemplateId, setNewFormationTemplateId] = useState<string>("template_1");

  // 指示作成フォーム用のステート
  const [newInstTargetType, setNewInstTargetType] = useState<"all" | "instrument" | "individual">("all");
  const [newInstTargetValue, setNewInstTargetValue] = useState<string>("");
  const [newInstText, setNewInstText] = useState<string>("");

  // 未保存の変更追跡
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<string>("");


  // 再生・アニメーション状態
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentCount, setCurrentCount] = useState<number>(0);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // 音声・楽曲挿入状態
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [localAudioFile, setLocalAudioFile] = useState<File | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      setLocalAudioFile(file);
    }
  };

  // 印刷プレビューモード
  const [isPrintMode, setIsPrintMode] = useState<boolean>(false);

  // 新規追加モーダル/フォームの状態
  const [showNewFormationModal, setShowNewFormationModal] = useState<boolean>(false);
  const [newFormationTitle, setNewFormationTitle] = useState<string>("");
  const [newFormationMusic, setNewFormationMusic] = useState<string>("");
  const [newFormationBpm, setNewFormationBpm] = useState<number>(120);

  const [showNewMemberModal, setShowNewMemberModal] = useState<boolean>(false);
  const [newMemberName, setNewMemberName] = useState<string>("");
  const [newMemberInstrument, setNewMemberInstrument] = useState<string>("Trumpet");
  const [newMemberLabel, setNewMemberLabel] = useState<string>("");
  const [newMemberColor, setNewMemberColor] = useState<string>("#3B82F6");

  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editMemberName, setEditMemberName] = useState<string>("");
  const [editMemberInstrument, setEditMemberInstrument] = useState<string>("Trumpet");
  const [editMemberLabel, setEditMemberLabel] = useState<string>("");
  const [editMemberColor, setEditMemberColor] = useState<string>("#3B82F6");

  const openNewMemberModal = () => {
    const defaultInst = "Trumpet";
    setNewMemberInstrument(defaultInst);
    setNewMemberName("");
    setNewMemberColor("#3B82F6");
    const autoLabel = generateNextMemberLabel(defaultInst, members, memberCustomLabels);
    setNewMemberLabel(autoLabel);
    setShowNewMemberModal(true);
  };

  const handleNewMemberInstrumentChange = (inst: string) => {
    setNewMemberInstrument(inst);
    const autoLabel = generateNextMemberLabel(inst, members, memberCustomLabels);
    setNewMemberLabel(autoLabel);
  };

  const openEditMemberModal = (m: Member) => {
    setEditingMember(m);
    setEditMemberName(m.name || "");
    setEditMemberInstrument(m.instrument || "Trumpet");
    setEditMemberColor(m.color || "#3B82F6");
    const currentLbl = getEffectiveMemberLabel(m, members, memberCustomLabels);
    setEditMemberLabel(currentLbl);
  };

  // 一般的な楽器一覧
  const instruments = [
    "Trumpet",
    "Horn",
    "Trombone",
    "Euphonium",
    "Sousaphone",
    "Flute",
    "Clarinet",
    "Alto Sax",
    "Tenor Sax",
    "Snare Drum",
    "Quint",
    "Bass Drum",
    "Cymbals",
    "Color Guard",
    "Drum Major",
  ];

  // パート色分けの選択肢
  const colorPalette = [
    "#3B82F6", // Blue
    "#EF4444", // Red
    "#10B981", // Emerald
    "#F59E0B", // Amber
    "#8B5CF6", // Purple
    "#EC4899", // Pink
    "#06B6D4", // Cyan
    "#14B8A6", // Teal
    "#F97316", // Orange
  ];

  // 初期ロード
  useEffect(() => {
    fetchFormations();
    fetchMembers();

    // テンプレートのロード (デフォルトとの自動マージ付き)
    const savedTemplates = localStorage.getItem("drillflow_field_templates");
    if (savedTemplates) {
      try {
        const parsed: FieldTemplate[] = JSON.parse(savedTemplates);
        let merged = [...parsed];

        // 不要になった旧プリセットやAI作成の古い緑背景・ハッシュマーク付きテンプレートを除去
        const obsoleteIds = ["template_2", "template_3", "template_univ"];
        const obsoleteNames = [
          "アメフトフィールド",
          "ハーフアリーナ",
          "屋内ステージ",
          "大学 (NCAA規格アメフトフィールド)",
          "大学アメフトフィールド (NCAA規格)",
        ];
        merged = merged.filter((t) => {
          if (obsoleteIds.includes(t.id)) return false;
          if (t.id.startsWith("template_") && obsoleteNames.includes(t.name)) return false;
          // 以前のAI作成の緑背景のものを除外
          if (t.id === "template_1" && (t.backgroundColor === "#165028" || t.backgroundColor === "#1e4620" || t.customMarkers?.some(m => m.id === "u1"))) return false;
          return true;
        });

        // 初期テンプレート (template_1) の更新統合
        // ユーザーが画面上で作成した「1」または「１」という名前のテンプレートがあれば、その設定をデフォルトの「1」 (template_1) に統合
        const customTemplateOne = parsed.find((t) => (t.name?.trim() === "1" || t.name?.trim() === "１") && t.id !== "template_1");
        
        let primaryTemplateOne = merged.find((t) => t.id === "template_1");
        if (!primaryTemplateOne) {
          primaryTemplateOne = { ...DEFAULT_TEMPLATES[0] };
        } else {
          primaryTemplateOne.name = "大学";
        }
        primaryTemplateOne.gridLineStyle = "solid";
        primaryTemplateOne.subGridLineStyle = "solid";

        if (customTemplateOne) {
          primaryTemplateOne = {
            ...primaryTemplateOne,
            id: "template_1",
            name: "大学",
            fieldWidth: customTemplateOne.fieldWidth ?? primaryTemplateOne.fieldWidth ?? 150,
            fieldHeight: customTemplateOne.fieldHeight ?? primaryTemplateOne.fieldHeight ?? 150,
            gridSizeX: customTemplateOne.gridSizeX ?? primaryTemplateOne.gridSizeX ?? 10,
            gridSizeY: customTemplateOne.gridSizeY ?? primaryTemplateOne.gridSizeY ?? 10,
            gridLineWidth: customTemplateOne.gridLineWidth ?? primaryTemplateOne.gridLineWidth ?? 1,
            gridLineStyle: customTemplateOne.gridLineStyle ?? primaryTemplateOne.gridLineStyle ?? "solid",
            subGridLineStyle: customTemplateOne.subGridLineStyle ?? primaryTemplateOne.subGridLineStyle ?? "solid",
            gridLineColor: customTemplateOne.gridLineColor ?? primaryTemplateOne.gridLineColor ?? "rgba(0,0,0,0.15)",
            backgroundColor: customTemplateOne.backgroundColor ?? primaryTemplateOne.backgroundColor ?? "#ffffff",
            showGridLines: customTemplateOne.showGridLines !== false,
            markingShape: customTemplateOne.markingShape ?? primaryTemplateOne.markingShape ?? "cross",
            blocksX: customTemplateOne.blocksX ?? primaryTemplateOne.blocksX ?? 15,
            blocksY: customTemplateOne.blocksY ?? primaryTemplateOne.blocksY ?? 15,
            subdivisionsX: customTemplateOne.subdivisionsX ?? primaryTemplateOne.subdivisionsX ?? 10,
            subdivisionsY: customTemplateOne.subdivisionsY ?? primaryTemplateOne.subdivisionsY ?? 10,
            markerColor: customTemplateOne.markerColor ?? primaryTemplateOne.markerColor ?? "#000000",
            customMarkers: customTemplateOne.customMarkers ? JSON.parse(JSON.stringify(customTemplateOne.customMarkers)) : (primaryTemplateOne.customMarkers || []),
          };
          // 重複している個別カスタム「1」を除去
          merged = merged.filter((t) => t.id !== customTemplateOne.id);
        }

        // template_1 を先頭に配置
        const idx1 = merged.findIndex((t) => t.id === "template_1");
        if (idx1 !== -1) {
          merged[idx1] = primaryTemplateOne;
        } else {
          merged.unshift(primaryTemplateOne);
        }

        DEFAULT_TEMPLATES[0] = { ...primaryTemplateOne };
        setFieldTemplates(merged);
        localStorage.setItem("drillflow_field_templates", JSON.stringify(merged));
      } catch (e) {
        setFieldTemplates(DEFAULT_TEMPLATES);
        localStorage.setItem("drillflow_field_templates", JSON.stringify(DEFAULT_TEMPLATES));
      }
    } else {
      setFieldTemplates(DEFAULT_TEMPLATES);
      localStorage.setItem("drillflow_field_templates", JSON.stringify(DEFAULT_TEMPLATES));
    }
  }, []);

  // API: フォーメーション一覧取得
  const fetchFormations = async () => {
    try {
      const res = await fetch("/api/formations");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setFormations(data);
          localStorage.setItem("drillflow_local_formations", JSON.stringify(data));
          return;
        }
      }
    } catch (error) {
      console.error("Failed to fetch formations:", error);
    }
    const saved = localStorage.getItem("drillflow_local_formations");
    if (saved) {
      try { setFormations(JSON.parse(saved)); } catch (e) {}
    }
  };

  // API: 部員一覧取得
  const fetchMembers = async () => {
    try {
      const res = await fetch("/api/members");
      if (res.ok) {
        const data = await res.json();
        setMembers(data);
        localStorage.setItem("drillflow_local_members", JSON.stringify(data));
        return;
      }
    } catch (error) {
      console.error("Failed to fetch members:", error);
    }
    const saved = localStorage.getItem("drillflow_local_members");
    if (saved) {
      try { setMembers(JSON.parse(saved)); } catch (e) {}
    }
  };

  // API: フォーメーション詳細取得
  const loadFormation = async (id: number) => {
    let formation: any = null;
    let loadedMembers: Member[] = [];

    try {
      const res = await fetch(`/api/formations/${id}`);
      if (res.ok) {
        const data = await res.json();
        formation = data.formation;
        loadedMembers = data.members || [];
      }
    } catch (error) {
      console.error(`Failed to load formation ${id} via API:`, error);
    }

    // Vercel等でAPIレスポンスがない場合のローカルフォールバック
    if (!formation) {
      const savedLocalForm = localStorage.getItem(`drillflow_formation_${id}`);
      if (savedLocalForm) {
        try {
          formation = JSON.parse(savedLocalForm);
        } catch (e) {}
      }
      if (!formation) {
        const localList = localStorage.getItem("drillflow_local_formations");
        if (localList) {
          try {
            const list = JSON.parse(localList);
            formation = list.find((f: any) => f.id === id);
          } catch (e) {}
        }
      }
      if (members.length > 0) {
        loadedMembers = members;
      } else {
        const savedM = localStorage.getItem("drillflow_local_members");
        if (savedM) {
          try { loadedMembers = JSON.parse(savedM); } catch (e) {}
        }
      }
    }

    if (!formation) return;

    // 指示書のロード
    const savedInstructions = localStorage.getItem(`drillflow_set_instructions_${id}`);
    if (savedInstructions) {
      setSetInstructions(JSON.parse(savedInstructions));
    } else {
      setSetInstructions({});
    }

    // 変数のロード (セットごとのマップ)
    const savedVars = localStorage.getItem(`drillflow_member_variables_${id}`);
    if (savedVars) {
      try {
        const parsed = JSON.parse(savedVars);
        const keys = Object.keys(parsed);
        if (keys.length > 0 && typeof parsed[Number(keys[0])] === "number") {
          const converted: Record<number, Record<number, number>> = {};
          (formation.sets || []).forEach((s: Set) => {
            converted[s.id] = { ...parsed };
          });
          setMemberVariables(converted);
        } else {
          setMemberVariables(parsed);
        }
      } catch (e) {
        setMemberVariables({});
      }
    } else {
      setMemberVariables({});
    }

    // ラベル・番号のロード
    const savedLabels = localStorage.getItem(`drillflow_member_labels_${id}`);
    if (savedLabels) {
      setMemberCustomLabels(JSON.parse(savedLabels));
    } else {
      setMemberCustomLabels({});
    }

    // 変数グループのロード (セットIDごと)
    const savedSetGroups = localStorage.getItem(`drillflow_set_groups_${id}`);
    if (savedSetGroups) {
      setMemberGroupsBySet(JSON.parse(savedSetGroups));
    } else {
      const oldGroups = localStorage.getItem(`drillflow_member_groups_${id}`);
      const parsedOld = oldGroups ? JSON.parse(oldGroups) : (formation.memberGroups || []);
      const initMap: Record<number, MemberGroup[]> = {};
      formation.sets?.forEach((s) => {
        initMap[s.id] = s.memberGroups || parsedOld;
      });
      setMemberGroupsBySet(initMap);
    }

    // フォーメーションスタイルのロード
    const styleKey = `drillflow_formation_style_${id}`;
    const savedStyle = localStorage.getItem(styleKey);
    const style = savedStyle ? JSON.parse(savedStyle) : null;

    if (style) {
      let fw = style.fieldWidth ?? formation.fieldWidth ?? 150;
      let fh = style.fieldHeight ?? formation.fieldHeight ?? 150;
      let bx = style.blocksX ?? formation.blocksX ?? 15;
      let by = style.blocksY ?? formation.blocksY ?? 15;
      let sx = style.subdivisionsX ?? formation.subdivisionsX ?? 10;
      let sy = style.subdivisionsY ?? formation.subdivisionsY ?? 10;

      if ((fw === 128 && fh === 64) || (bx === 16 && by === 8)) {
        fw = 150;
        fh = 150;
        bx = 15;
        by = 15;
        sx = 10;
        sy = 10;
        style.backgroundColor = "#ffffff";
        style.gridLineColor = "rgba(0,0,0,0.15)";
        style.markerColor = "#000000";
        style.showYardLines = false;
      }

      formation.fieldWidth = fw;
      formation.fieldHeight = fh;
      formation.markingShape = style.markingShape ?? formation.markingShape ?? "cross";
      formation.backgroundColor = style.backgroundColor ?? formation.backgroundColor ?? "#ffffff";
      formation.gridLineColor = style.gridLineColor ?? formation.gridLineColor ?? "rgba(0,0,0,0.15)";
      formation.gridLineWidth = style.gridLineWidth ?? formation.gridLineWidth ?? 1;
      formation.gridLineStyle = style.gridLineStyle ?? formation.gridLineStyle ?? "solid";
      formation.subGridLineStyle = style.subGridLineStyle ?? formation.subGridLineStyle ?? "solid";
      formation.showYardLines = style.showYardLines !== undefined ? style.showYardLines : false;
      formation.showYardNumbers = style.showYardNumbers !== undefined ? style.showYardNumbers : true;
      formation.showGridLines = style.showGridLines !== undefined ? style.showGridLines : true;
      formation.customMarkers = (style.customMarkers && style.customMarkers.length > 0) ? style.customMarkers : (formation.customMarkers || []);
      formation.blocksX = bx;
      formation.blocksY = by;
      formation.subdivisionsX = sx;
      formation.subdivisionsY = sy;
      formation.markerColor = style.markerColor ?? formation.markerColor ?? "#000000";
      formation.markerSize = style.markerSize ?? formation.markerSize ?? 24;
    } else {
      let fw = formation.fieldWidth ?? 150;
      let fh = formation.fieldHeight ?? 150;
      let bx = formation.blocksX ?? 15;
      let by = formation.blocksY ?? 15;
      let sx = formation.subdivisionsX ?? 10;
      let sy = formation.subdivisionsY ?? 10;

      if ((fw === 128 && fh === 64) || (bx === 16 && by === 8)) {
        fw = 150;
        fh = 150;
        bx = 15;
        by = 15;
        sx = 10;
        sy = 10;
      }

      formation.fieldWidth = fw;
      formation.fieldHeight = fh;
      formation.markingShape = formation.markingShape ?? "cross";
      formation.backgroundColor = formation.backgroundColor ?? "#ffffff";
      formation.gridLineColor = formation.gridLineColor ?? "rgba(0,0,0,0.15)";
      formation.gridLineWidth = formation.gridLineWidth ?? 1;
      formation.gridLineStyle = formation.gridLineStyle ?? "solid";
      formation.subGridLineStyle = formation.subGridLineStyle ?? "solid";
      formation.showYardLines = formation.showYardLines ?? false;
      formation.showYardNumbers = formation.showYardNumbers ?? true;
      formation.showGridLines = formation.showGridLines ?? true;
      formation.blocksX = bx;
      formation.blocksY = by;
      formation.subdivisionsX = sx;
      formation.subdivisionsY = sy;
      formation.markerColor = formation.markerColor ?? "#000000";
      formation.markerSize = formation.markerSize ?? 24;
    }

    // --- Set 0 (初期隊形) の自動補完＆セットソート & カウント強制0 ---
    let loadedSets: Set[] = formation.sets ? [...formation.sets] : [];
    const hasSet0 = loadedSets.some((s) => s.number === 0);
    if (!hasSet0) {
      const firstSet = loadedSets[0];
      const set0Positions = firstSet
        ? firstSet.positions.map((p) => ({ ...p, id: undefined, setId: -999 }))
        : loadedMembers.map((m) => ({ memberId: m.id, setId: -999, x: 0.5, y: 0.5 }));
      
      const set0: Set = {
        id: -999,
        formationId: id,
        number: 0,
        counts: 0,
        positions: set0Positions,
      };
      loadedSets = [set0, ...loadedSets];
    }

    // Set 0 のカウントは必ず 0
    loadedSets = loadedSets.map((s) => (s.number === 0 ? { ...s, counts: 0 } : s));

    loadedSets.sort((a, b) => a.number - b.number);
    formation.sets = loadedSets;

    setActiveFormation(formation);
    setMembers(loadedMembers);
    setIsDirty(false);
    setSaveStatus("");

    // 楽曲URLを設定
    if (formation.music) {
      setAudioUrl(formation.music);
    } else {
      setAudioUrl("");
    }
    setLocalAudioFile(null);

    // セットを選択状態にする (Set 0 があれば Set 0、無ければ最初)
    if (formation.sets && formation.sets.length > 0) {
      setSelectedSetId(formation.sets[0].id);
    } else {
      setSelectedSetId(null);
    }
    
    // エディタビューに移行
    setActiveView("editor");
  };

  // 整列対象メンバーの順序入れ替え
  const moveAlignMember = (index: number, direction: -1 | 1) => {
    setAlignSelectedMemberIds((prev) => {
      const next = [...prev];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  };

  // 逆順に並び替え
  const reverseAlignMembers = () => {
    setAlignSelectedMemberIds((prev) => [...prev].reverse());
  };

  // パート順に並び替え
  const sortAlignMembersByInstrument = () => {
    setAlignSelectedMemberIds((prev) => {
      const copy = [...prev];
      return copy.sort((a, b) => {
        const mA = members.find((m) => m.id === a);
        const mB = members.find((m) => m.id === b);
        if (!mA || !mB) return 0;
        if (mA.instrument !== mB.instrument) return mA.instrument.localeCompare(mB.instrument);
        return mA.name.localeCompare(mB.name);
      });
    });
  };

  // メンバー等間隔配置（整列）の適用
  const applyMemberAlignment = () => {
    if (!activeFormation || !selectedSetId || !alignSelectedMemberIds || alignSelectedMemberIds.length === 0) return;

    const currentSetIndex = activeFormation.sets.findIndex(s => s.id === selectedSetId);
    if (currentSetIndex === -1) return;

    const ptA = alignPointA || { x: 0.25, y: 0.5 };
    const ptB = alignPointB || { x: 0.75, y: 0.5 };
    const ptMid = alignPointMid || { x: 0.5, y: 0.3 };
    const ptCenter = alignPointCenter || { x: 0.5, y: 0.5 };
    const rad = typeof alignRadius === "number" && !isNaN(alignRadius) ? alignRadius : 0.25;

    // フィールドのアスペクト比計算（真円維持用）
    const blocksX = activeFormation.blocksX ?? 15;
    const blocksY = activeFormation.blocksY ?? 15;
    const subX = activeFormation.subdivisionsX ?? 10;
    const subY = activeFormation.subdivisionsY ?? 10;
    const totalCellsX = blocksX * subX;
    const totalCellsY = blocksY * subY;
    const aspectRatio = totalCellsX / totalCellsY;

    const targetSet = activeFormation.sets[currentSetIndex];
    const count = alignSelectedMemberIds.length;

    // 現在のセットのメンバー配置ポジションを複製
    const updatedPositions = [...(targetSet.positions || [])];

    alignSelectedMemberIds.forEach((memberId, index) => {
      let targetX = 0.5;
      let targetY = 0.5;

      if (alignType === "line") {
        // 直線 (2点補間)
        const t = count === 1 ? 0.5 : index / (count - 1);
        targetX = ptA.x + (ptB.x - ptA.x) * t;
        targetY = ptA.y + (ptB.y - ptA.y) * t;
      } else if (alignType === "circle") {
        // 真円 (12時の方向から時計回りに配置、アスペクト比補正適用)
        // 12時方向 = 角度 +PI/2, 時計回り = - (2*PI*index)/count
        let effCenter = { ...ptCenter };
        let effRad = rad;

        if (snapToGrid || snapMode !== "none") {
          // グリッドスナップオン時は中心・半径もスナップ
          const stepX = 1 / totalCellsX;
          const stepY = 1 / totalCellsY;
          effCenter.x = Math.round(effCenter.x / stepX) * stepX;
          effCenter.y = Math.round(effCenter.y / stepY) * stepY;
          effRad = Math.round(effRad / stepX) * stepX;
        }

        const angle = Math.PI / 2 - (2 * Math.PI * index) / count;
        targetX = effCenter.x + effRad * Math.cos(angle);
        targetY = effCenter.y + effRad * Math.sin(angle) * aspectRatio;
      } else if (alignType === "arc") {
        // ドローイングツール風 円弧 (3点二次ベジェ補間: 端1 -> アーチ -> 端2)
        const t = count === 1 ? 0.5 : index / (count - 1);
        targetX = (1 - t) * (1 - t) * ptA.x + 2 * (1 - t) * t * ptMid.x + t * t * ptB.x;
        targetY = (1 - t) * (1 - t) * ptA.y + 2 * (1 - t) * t * ptMid.y + t * t * ptB.y;
      }

      // クランプ＆NaN対策
      targetX = Math.max(0, Math.min(1, isNaN(targetX) ? 0.5 : targetX));
      targetY = Math.max(0, Math.min(1, isNaN(targetY) ? 0.5 : targetY));

      const posIndex = updatedPositions.findIndex(p => p.memberId === memberId);
      if (posIndex !== -1) {
        updatedPositions[posIndex] = {
          ...updatedPositions[posIndex],
          x: targetX,
          y: targetY,
        };
      } else {
        updatedPositions.push({
          memberId,
          setId: selectedSetId,
          x: targetX,
          y: targetY,
        });
      }
    });

    const updatedSets = activeFormation.sets.map((s) => {
      if (s.id === selectedSetId) {
        return { ...s, positions: updatedPositions };
      }
      return s;
    });

    setActiveFormation({
      ...activeFormation,
      sets: updatedSets,
    });
    setIsDirty(true);
    setIsAlignToolActive(false);
    setSuccessMessage(`${count}名の位置を${alignType === 'line' ? '直線' : alignType === 'arc' ? '円弧' : '円'}に整列しました`);
    setTimeout(() => setSuccessMessage(""), 3000);
  };

  // フィールドテンプレートの新規作成・編集開始
  const handleOpenFieldDesigner = (templateId: string | null) => {
    if (templateId) {
      const template = fieldTemplates.find((t) => t.id === templateId);
      if (template) {
        setDesignerTemplateId(template.id);
        setDesignerName(template.name);
        setDesignerWidth(template.fieldWidth);
        setDesignerHeight(template.fieldHeight);
        setDesignerGridSizeX(template.gridSizeX ?? 10);
        setDesignerGridSizeY(template.gridSizeY ?? 10);
        setDesignerGridLineWidth(template.gridLineWidth ?? 1);
        setDesignerGridLineStyle(template.gridLineStyle ?? "solid");
        setDesignerSubGridLineStyle(template.subGridLineStyle ?? "solid");
        setDesignerGridLineColor(template.gridLineColor ?? "rgba(0,0,0,0.15)");
        setDesignerBackgroundColor(template.backgroundColor ?? "#ffffff");
        setDesignerShowGridLines(template.showGridLines ?? true);
        setDesignerMarkingShape(template.markingShape ?? "cross");
        setDesignerCustomMarkers(template.customMarkers ?? []);
        setSelectedDesignerMarkerId(null);
        // ブロックグリッドマッピング
        setDesignerBlocksX(template.blocksX ?? 15);
        setDesignerBlocksY(template.blocksY ?? 15);
        setDesignerSubdivisionsX(template.subdivisionsX ?? 10);
        setDesignerSubdivisionsY(template.subdivisionsY ?? 10);
        setDesignerMarkerColor(template.markerColor ?? "#000000");
      }
    } else {
      setDesignerTemplateId(null);
      setDesignerName("カスタムフィールド");
      setDesignerWidth(150);
      setDesignerHeight(150);
      setDesignerGridSizeX(10);
      setDesignerGridSizeY(10);
      setDesignerGridLineWidth(1);
      setDesignerGridLineStyle("solid");
      setDesignerSubGridLineStyle("solid");
      setDesignerGridLineColor("rgba(0,0,0,0.15)");
      setDesignerBackgroundColor("#ffffff");
      setDesignerShowGridLines(false);
      setDesignerMarkingShape("none");
      setDesignerCustomMarkers([]);
      setSelectedDesignerMarkerId(null);
      // デフォルトブロックグリッド
      setDesignerBlocksX(15);
      setDesignerBlocksY(15);
      setDesignerSubdivisionsX(10);
      setDesignerSubdivisionsY(10);
      setDesignerMarkerColor("#000000");
    }
    setDesignerHistory([]);
    setActiveView("field_designer");
  };

  // フィールドテンプレートの保存
  const handleSaveFieldTemplate = () => {
    let id = designerTemplateId || `custom_${Date.now()}`;
    if (designerName.includes("大学") && !id.startsWith("template_")) {
      id = "template_custom_" + id.replace("custom_", "");
    }
    const newTemplate: FieldTemplate = {
      id,
      name: designerName,
      fieldWidth: designerWidth,
      fieldHeight: designerHeight,
      gridSizeX: designerGridSizeX,
      gridSizeY: designerGridSizeY,
      gridLineWidth: designerGridLineWidth,
      gridLineStyle: designerGridLineStyle,
      subGridLineStyle: designerSubGridLineStyle,
      gridLineColor: designerGridLineColor,
      backgroundColor: designerBackgroundColor,
      showGridLines: designerShowGridLines,
      markingShape: designerMarkingShape,
      customMarkers: designerCustomMarkers,
      // ブロックグリッド保存
      blocksX: designerBlocksX,
      blocksY: designerBlocksY,
      subdivisionsX: designerSubdivisionsX,
      subdivisionsY: designerSubdivisionsY,
      markerColor: designerMarkerColor,
    };

    let updatedTemplates = [...fieldTemplates];
    const index = updatedTemplates.findIndex((t) => t.id === id);
    if (index !== -1) {
      updatedTemplates[index] = newTemplate;
    } else {
      updatedTemplates.push(newTemplate);
    }

    setFieldTemplates(updatedTemplates);
    localStorage.setItem("drillflow_field_templates", JSON.stringify(updatedTemplates));
    setActiveView("home");
  };

  // フィールドテンプレートの削除
  const handleDeleteFieldTemplate = (id: string) => {
    if (id === "template_1") {
      alert("システムのデフォルトテンプレートは削除できません");
      return;
    }
    if (!window.confirm("このフィールドテンプレートを削除しますか？")) return;

    const updated = fieldTemplates.filter((t) => t.id !== id);
    setFieldTemplates(updated);
    localStorage.setItem("drillflow_field_templates", JSON.stringify(updated));
  };



  // API: フォーメーション新規作成
  const handleCreateFormation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFormationTitle) return;

    let newForm: any = null;
    const chosenTemplate = fieldTemplates.find(t => t.id === newFormationTemplateId) || DEFAULT_TEMPLATES[0];

    const templateStyle = {
      fieldWidth: chosenTemplate.fieldWidth,
      fieldHeight: chosenTemplate.fieldHeight,
      markingShape: chosenTemplate.markingShape,
      backgroundColor: chosenTemplate.backgroundColor,
      gridLineColor: chosenTemplate.gridLineColor,
      gridLineWidth: chosenTemplate.gridLineWidth,
      gridLineStyle: chosenTemplate.gridLineStyle,
      subGridLineStyle: chosenTemplate.subGridLineStyle || "solid",
      showYardLines: chosenTemplate.showYardLines,
      showYardNumbers: chosenTemplate.showYardNumbers,
      showGridLines: chosenTemplate.showGridLines,
      customMarkers: chosenTemplate.customMarkers,
      blocksX: chosenTemplate.blocksX ?? 15,
      blocksY: chosenTemplate.blocksY ?? 15,
      subdivisionsX: chosenTemplate.subdivisionsX ?? 10,
      subdivisionsY: chosenTemplate.subdivisionsY ?? 10,
      markerColor: chosenTemplate.markerColor ?? "#000000",
      markerSize: chosenTemplate.markerSize ?? 24,
    };

    try {
      const res = await fetch("/api/formations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newFormationTitle,
          music: newFormationMusic,
          bpm: newFormationBpm,
          style: templateStyle,
        }),
      });

      if (res.ok) {
        newForm = await res.json();
      }
    } catch (error) {
      console.error("Failed to create formation via API:", error);
    }

    // Vercel等でAPIレスポンスがない場合のローカルフォールバック
    if (!newForm) {
      const newId = Date.now();
      const initialSet: Set = {
        id: -999,
        formationId: newId,
        number: 0,
        counts: 0,
        positions: members.map((m) => ({ memberId: m.id, setId: -999, x: 0.5, y: 0.5 })),
      };

      newForm = {
        id: newId,
        title: newFormationTitle,
        music: newFormationMusic,
        bpm: newFormationBpm,
        ...templateStyle,
        sets: [initialSet],
      };

      // ローカル一覧を更新
      const localListRaw = localStorage.getItem("drillflow_local_formations");
      let localList = localListRaw ? JSON.parse(localListRaw) : [...formations];
      localList = [newForm, ...localList.filter((f: any) => f.id !== newId)];
      localStorage.setItem("drillflow_local_formations", JSON.stringify(localList));
      localStorage.setItem(`drillflow_formation_${newId}`, JSON.stringify(newForm));
      setFormations(localList);
    }

    // テンプレートスタイルのコピーをローカルストレージへ保存
    const styleKey = `drillflow_formation_style_${newForm.id}`;
    localStorage.setItem(styleKey, JSON.stringify(templateStyle));

    setNewFormationTitle("");
    setNewFormationMusic("");
    setNewFormationBpm(120);
    setShowNewFormationModal(false);

    loadFormation(newForm.id);
  };

  // API: フォーメーション一括保存
  const handleSaveFormation = async () => {
    if (!activeFormation) return;
    setSaveStatus("保存中...");

    try {
      // 立ち位置等のDB保存を試行
      await fetch(`/api/formations/${activeFormation.id}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: activeFormation.title,
          music: activeFormation.music,
          bpm: activeFormation.bpm,
          fieldWidth: activeFormation.fieldWidth || 150,
          fieldHeight: activeFormation.fieldHeight || 150,
          markingShape: activeFormation.markingShape || "cross",
          markingIntervalX: activeFormation.markingIntervalX || 10,
          markingIntervalY: activeFormation.markingIntervalY || 10,
          markingCountX: activeFormation.markingCountX || 15,
          markingCountY: activeFormation.markingCountY || 15,
          backgroundColor: activeFormation.backgroundColor || "#ffffff",
          markerColor: activeFormation.markerColor || "#000000",
          showYardLines: activeFormation.showYardLines !== false,
          showYardNumbers: activeFormation.showYardNumbers !== false,
          showGridLines: activeFormation.showGridLines !== false,
          customMarkers: activeFormation.customMarkers || [],
          sets: activeFormation.sets,
          members: members,
          memberGroupsBySet: memberGroupsBySet,
        }),
      });
    } catch (error) {
      console.error("Failed to save formation to backend API:", error);
    }

    // サーバーの成否にかかわらず常にローカルストレージに確定保存
    localStorage.setItem(
      `drillflow_set_instructions_${activeFormation.id}`,
      JSON.stringify(setInstructions)
    );
    localStorage.setItem(
      `drillflow_member_variables_${activeFormation.id}`,
      JSON.stringify(memberVariables)
    );
    localStorage.setItem(
      `drillflow_member_labels_${activeFormation.id}`,
      JSON.stringify(memberCustomLabels)
    );
    localStorage.setItem(
      `drillflow_set_groups_${activeFormation.id}`,
      JSON.stringify(memberGroupsBySet)
    );

    const styleKey = `drillflow_formation_style_${activeFormation.id}`;
    const templateStyle = {
      fieldWidth: activeFormation.fieldWidth || 150,
      fieldHeight: activeFormation.fieldHeight || 150,
      markingShape: activeFormation.markingShape || "cross",
      backgroundColor: activeFormation.backgroundColor || "#ffffff",
      gridLineColor: activeFormation.gridLineColor || "rgba(0,0,0,0.15)",
      gridLineWidth: activeFormation.gridLineWidth || 1,
      gridLineStyle: activeFormation.gridLineStyle || "solid",
      subGridLineStyle: activeFormation.subGridLineStyle || "solid",
      showYardLines: activeFormation.showYardLines !== false,
      showYardNumbers: activeFormation.showYardNumbers !== false,
      showGridLines: activeFormation.showGridLines !== false,
      customMarkers: activeFormation.customMarkers || [],
      blocksX: activeFormation.blocksX ?? 15,
      blocksY: activeFormation.blocksY ?? 15,
      subdivisionsX: activeFormation.subdivisionsX ?? 10,
      subdivisionsY: activeFormation.subdivisionsY ?? 10,
      markerColor: activeFormation.markerColor ?? "#000000",
      markerSize: activeFormation.markerSize ?? 24,
    };
    localStorage.setItem(styleKey, JSON.stringify(templateStyle));
    localStorage.setItem(`drillflow_formation_${activeFormation.id}`, JSON.stringify(activeFormation));

    // ローカル一覧も更新
    const localListRaw = localStorage.getItem("drillflow_local_formations");
    let localList = localListRaw ? JSON.parse(localListRaw) : [...formations];
    const existingIdx = localList.findIndex((f: any) => f.id === activeFormation.id);
    if (existingIdx !== -1) {
      localList[existingIdx] = activeFormation;
    } else {
      localList.unshift(activeFormation);
    }
    localStorage.setItem("drillflow_local_formations", JSON.stringify(localList));
    setFormations(localList);

    setIsDirty(false);
    setSaveStatus("保存されました");
    setTimeout(() => setSaveStatus(""), 3000);
  };

  // セット指示の新規登録
  const handleAddInstruction = () => {
    if (!selectedSetId || !newInstText.trim()) return;

    const newInst: SetInstruction = {
      id: String(Date.now()),
      targetType: newInstTargetType,
      targetValue: newInstTargetType === "all" ? "全員" : newInstTargetValue,
      instructionText: newInstText,
    };

    const currentInsts = setInstructions[selectedSetId] || [];
    const updated = {
      ...setInstructions,
      [selectedSetId]: [...currentInsts, newInst],
    };
    setSetInstructions(updated);
    setNewInstText("");
    setIsDirty(true);
  };

  // セット指示の削除
  const handleDeleteInstruction = (instId: string) => {
    if (!selectedSetId) return;

    const currentInsts = setInstructions[selectedSetId] || [];
    const updated = {
      ...setInstructions,
      [selectedSetId]: currentInsts.filter((i) => i.id !== instId),
    };
    setSetInstructions(updated);
    setIsDirty(true);
  };

  // 個人変数 x の更新 (選択中セットに保存)
  const handleUpdateMemberVariable = (memberId: number, val: number) => {
    if (!selectedSetId) return;
    setMemberVariables((prev) => ({
      ...prev,
      [selectedSetId]: {
        ...(prev[selectedSetId] || {}),
        [memberId]: val,
      },
    }));
    setIsDirty(true);
  };

  // 個人変数 x の一括設定 (選択中セットに保存)
  const handleBatchSetVariables = (val: number) => {
    if (!selectedSetId) return;
    const newVars: Record<number, number> = {};
    members.forEach((m) => {
      newVars[m.id] = val;
    });
    setMemberVariables((prev) => ({
      ...prev,
      [selectedSetId]: newVars,
    }));
    setIsDirty(true);
  };

  // X座標から変数 x を自動計算して設定 (選択中セットに保存)
  const handleAutoAssignVariablesFromX = () => {
    if (!selectedSetId || !activeFormation) return;
    const currentSet = activeFormation.sets.find((s) => s.id === selectedSetId);
    if (!currentSet) return;

    const newVars: Record<number, number> = {};
    members.forEach((m) => {
      const pos = currentSet.positions.find((p) => p.memberId === m.id);
      if (pos) {
        const totalSteps = activeFormation.fieldWidth || 150;
        const currentStep = Math.round(pos.x * totalSteps);
        newVars[m.id] = currentStep;
      }
    });
    setMemberVariables((prev) => ({
      ...prev,
      [selectedSetId]: newVars,
    }));
    setIsDirty(true);
  };

  // API: フォーメーション削除 (ごみ箱に移動)
  const handleDeleteFormation = (id: number) => {
    const f = formations.find((item) => item.id === id);
    if (f) {
      setDeleteTargetId(id);
      setDeleteTargetTitle(f.title);
    } else if (activeFormation && activeFormation.id === id) {
      setDeleteTargetId(id);
      setDeleteTargetTitle(activeFormation.title);
    }
  };

  const executeDeleteFormation = async (id: number) => {
    try {
      // 1. 削除前にDBから詳細を読み出し、ごみ箱にバックアップ
      const detailRes = await fetch(`/api/formations/${id}`);
      if (detailRes.ok) {
        const formationDetail = await detailRes.json();
        
        let backupMembers = [];
        if (activeFormation && activeFormation.id === id) {
          backupMembers = members;
        } else {
          const membersRes = await fetch(`/api/members?formationId=${id}`);
          if (membersRes.ok) {
            backupMembers = await membersRes.json();
          }
        }

        // ローカルストレージ関連キーのバックアップ
        const styleKey = `drillflow_formation_style_${id}`;
        const savedStyle = localStorage.getItem(styleKey);
        const style = savedStyle ? JSON.parse(savedStyle) : {};

        const savedInsts = localStorage.getItem(`drillflow_set_instructions_${id}`);
        const insts = savedInsts ? JSON.parse(savedInsts) : {};

        const savedVars = localStorage.getItem(`drillflow_member_variables_${id}`);
        const vars = savedVars ? JSON.parse(savedVars) : {};

        const savedLabels = localStorage.getItem(`drillflow_member_labels_${id}`);
        const labels = savedLabels ? JSON.parse(savedLabels) : {};

        // ごみ箱アイテム構築
        const trashItem: TrashItem = {
          id: `trash_${Date.now()}`,
          formationId: id,
          title: formationDetail.title || "無題のコマ表",
          music: formationDetail.music || "",
          bpm: formationDetail.bpm || 120,
          deletedAt: new Date().toISOString(),
          formationStyle: style,
          setInstructions: insts,
          memberVariables: vars,
          memberCustomLabels: labels,
          memberGroups: JSON.parse(localStorage.getItem(`drillflow_member_groups_${id}`) || "[]"),
          details: {
            formation: formationDetail,
            members: backupMembers,
          }
        };

        const currentTrash = getCleanTrash();
        currentTrash.push(trashItem);
        localStorage.setItem("drillflow_trash", JSON.stringify(currentTrash));
      }

      // 2. DBからハードデリート
      try {
        await fetch(`/api/formations/${id}`, {
          method: "DELETE",
        });
      } catch (err) {
        console.error("Failed to delete formation via API:", err);
      }

      const updatedFormations = formations.filter((item) => item.id !== id);
      setFormations(updatedFormations);
      localStorage.setItem("drillflow_local_formations", JSON.stringify(updatedFormations));

      if (activeFormation && activeFormation.id === id) {
        setActiveFormation(null);
        setSelectedSetId(null);
        setActiveView("home");
      }

      // 元のローカルストレージキーのクリーンアップ
      localStorage.removeItem(`drillflow_formation_${id}`);
      localStorage.removeItem(`drillflow_formation_style_${id}`);
      localStorage.removeItem(`drillflow_set_instructions_${id}`);
      localStorage.removeItem(`drillflow_member_variables_${id}`);
      localStorage.removeItem(`drillflow_member_labels_${id}`);
      localStorage.removeItem(`drillflow_member_groups_${id}`);

      fetchFormations();
      setSuccessMessage(`「${deleteTargetTitle || "コマ表"}」をごみ箱に移動しました`);
      setTimeout(() => setSuccessMessage(""), 4500);
    } catch (error) {
      console.error("Failed to delete formation:", error);
    } finally {
      setDeleteTargetId(null);
      setDeleteTargetTitle("");
    }
  };

  // API: ごみ箱からフォーメーションを復元
  const handleRestoreTrashItem = async (item: TrashItem) => {
    try {
      setSaveStatus("復元中");
      // 1. 新規フォーメーションをDB上に作成
      const res = await fetch("/api/formations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: item.title,
          music: item.music,
          bpm: item.bpm,
        }),
      });

      if (res.ok) {
        const newForm = await res.json();
        const newId = newForm.id;

        // 2. 自動生成されるデフォルトの第1セットを取得
        const setsRes = await fetch(`/api/sets?formationId=${newId}`);
        const currentSets = setsRes.ok ? await setsRes.json() : [];

        // 3. 必要なセット数を満たすように追加セットを作成
        const backupSets = item.details?.formation?.sets || [];
        const createdSetIds = [];
        if (currentSets.length > 0) {
          createdSetIds.push(currentSets[0].id);
        }

        for (let i = 1; i < backupSets.length; i++) {
          const sRes = await fetch("/api/sets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              formationId: newId,
              counts: backupSets[i].counts || 16,
            }),
          });
          if (sRes.ok) {
            const newS = await sRes.json();
            createdSetIds.push(newS.id);
          }
        }

        // 4. 立ち位置ポジションのマッピング
        const payloadSets = backupSets.map((backupSet: any, idx: number) => {
          const newSetId = createdSetIds[idx] || (idx === 0 && currentSets[0]?.id);
          return {
            id: newSetId,
            counts: backupSet.counts,
            bpm: backupSet.bpm,
            positions: (backupSet.positions || []).map((p: any) => ({
              memberId: p.memberId,
              x: p.x,
              y: p.y,
            })),
          };
        });

        // 5. 保存
        const style = item.formationStyle || {};
        const saveRes = await fetch(`/api/formations/${newId}/save`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: item.title,
            music: item.music,
            bpm: item.bpm,
            fieldWidth: style.fieldWidth || 150,
            fieldHeight: style.fieldHeight || 150,
            markingShape: style.markingShape || "cross",
            markingIntervalX: style.markingIntervalX || 10,
            markingIntervalY: style.markingIntervalY || 10,
            markingCountX: style.markingCountX || 15,
            markingCountY: style.markingCountY || 15,
            sets: payloadSets,
            members: item.details?.members || [],
          }),
        });

        if (saveRes.ok) {
          // セット指示(SetInstructions)の古いセットIDから新しいセットIDへのマッピング
          const remappedInstructions: Record<number, any> = {};
          backupSets.forEach((backupSet: any, idx: number) => {
            const oldSetId = backupSet.id;
            const newSetId = createdSetIds[idx];
            if (newSetId && item.setInstructions && item.setInstructions[oldSetId]) {
              remappedInstructions[newSetId] = item.setInstructions[oldSetId];
            }
          });

          // ローカルストレージキーの書き出し
          localStorage.setItem(`drillflow_set_instructions_${newId}`, JSON.stringify(remappedInstructions));
          localStorage.setItem(`drillflow_member_variables_${newId}`, JSON.stringify(item.memberVariables || {}));
          localStorage.setItem(`drillflow_member_labels_${newId}`, JSON.stringify(item.memberCustomLabels || {}));
          localStorage.setItem(`drillflow_member_groups_${newId}`, JSON.stringify(item.memberGroups || []));
          localStorage.setItem(`drillflow_formation_style_${newId}`, JSON.stringify(style));

          // ごみ箱から削除
          const currentTrash = getCleanTrash();
          const updatedTrash = currentTrash.filter(t => t.id !== item.id);
          localStorage.setItem("drillflow_trash", JSON.stringify(updatedTrash));

          // 更新
          await fetchFormations();
          setSuccessMessage(`「${item.title}」を復元しました`);
          setTimeout(() => setSuccessMessage(""), 4500);
        } else {
          setSuccessMessage("復元に失敗しました");
          setTimeout(() => setSuccessMessage(""), 4500);
        }
      }
    } catch (error) {
      console.error("Failed to restore item:", error);
      setSuccessMessage("復元中にエラーが発生しました");
      setTimeout(() => setSuccessMessage(""), 4500);
    } finally {
      setSaveStatus("");
    }
  };

  // API: セット追加
  const handleCreateSet = async () => {
    if (!activeFormation) return;

    let newSet: Set | null = null;
    try {
      const res = await fetch("/api/sets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formationId: activeFormation.id,
          counts: 8, // デフォルト8カウント
        }),
      });

      if (res.ok) {
        newSet = await res.json();
      }
    } catch (error) {
      console.error("Failed to add set via API:", error);
    }

    if (!newSet) {
      const currentSets = activeFormation.sets || [];
      const maxSetNum = currentSets.reduce((max, s) => Math.max(max, s.number), 0);
      const lastSet = currentSets.find((s) => s.number === maxSetNum) || currentSets[currentSets.length - 1];
      const nextNumber = maxSetNum + 1;
      const prevPositions = lastSet
        ? lastSet.positions
        : members.map((m) => ({ memberId: m.id, setId: Date.now(), x: 0.5, y: 0.5 }));

      newSet = {
        id: Date.now(),
        formationId: activeFormation.id,
        number: nextNumber,
        counts: 8,
        positions: prevPositions.map((p) => ({ ...p, id: undefined, setId: Date.now() })),
      };
    }

    const updatedSets = [...activeFormation.sets.filter((s) => s.id !== newSet!.id), newSet].sort(
      (a, b) => a.number - b.number
    );
    const updatedFormation = { ...activeFormation, sets: updatedSets };
    setActiveFormation(updatedFormation);
    setSelectedSetId(newSet.id);
    setIsDirty(true);
    localStorage.setItem(`drillflow_formation_${activeFormation.id}`, JSON.stringify(updatedFormation));
  };

  // API: セットカウント数変更 (Update counts)
  const handleUpdateSetCounts = async (setId: number, counts: number) => {
    if (!activeFormation) return;
    const targetSet = activeFormation.sets.find((s) => s.id === setId);
    if (targetSet && targetSet.number === 0) {
      // Set 0 (初期隊形) は必ず 0 カウント
      return;
    }

    const updatedSets = activeFormation.sets.map((set) =>
      set.id === setId ? { ...set, counts: set.number === 0 ? 0 : counts } : set
    );
    const updatedFormation = { ...activeFormation, sets: updatedSets };
    setActiveFormation(updatedFormation);
    setIsDirty(true);
    localStorage.setItem(`drillflow_formation_${activeFormation.id}`, JSON.stringify(updatedFormation));

    try {
      await fetch(`/api/sets/${setId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ counts }),
      });
    } catch (error) {
      console.error("Failed to update set counts via API:", error);
    }
  };

  // セット個別テンポ(BPM)変更
  const handleUpdateSetBpm = async (setId: number, bpm: number | undefined) => {
    if (!activeFormation) return;

    const updatedSets = activeFormation.sets.map((set) =>
      set.id === setId ? { ...set, bpm: bpm && bpm > 0 ? bpm : undefined } : set
    );
    const updatedFormation = { ...activeFormation, sets: updatedSets };
    setActiveFormation(updatedFormation);
    setIsDirty(true);
    localStorage.setItem(`drillflow_formation_${activeFormation.id}`, JSON.stringify(updatedFormation));

    try {
      await fetch(`/api/sets/${setId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bpm }),
      });
    } catch (error) {
      console.error("Failed to update set bpm via API:", error);
    }
  };

  // コマ表を跨いだ隊形コピペ: コピー
  const handleCopySetPositions = (setId?: number) => {
    const targetId = setId || selectedSetId;
    if (!activeFormation || !targetId) return;
    const targetSet = activeFormation.sets.find((s) => s.id === targetId);
    if (!targetSet) return;

    const positionsCopy = targetSet.positions.map((p) => ({
      memberId: p.memberId,
      x: p.x,
      y: p.y,
    }));
    setCopiedFormationPositions(positionsCopy);
    setSuccessMessage(`No.${targetSet.number} の隊形をコピーしました 📋`);
    setTimeout(() => setSuccessMessage(""), 2500);
  };

  // コマ表を跨いだ隊形コピペ: ペースト
  const handlePasteSetPositions = (targetSetId?: number) => {
    const destSetId = targetSetId || selectedSetId;
    if (!activeFormation || !destSetId || !copiedFormationPositions) return;

    const targetSet = activeFormation.sets.find((s) => s.id === destSetId);
    if (!targetSet) return;

    saveEditorHistory();

    const updatedSets = activeFormation.sets.map((s) => {
      if (s.id !== destSetId) return s;
      const existingMap = new Map(s.positions.map((p) => [p.memberId, p]));
      copiedFormationPositions.forEach((cp) => {
        existingMap.set(cp.memberId, {
          memberId: cp.memberId,
          setId: destSetId,
          x: cp.x,
          y: cp.y,
        });
      });
      return {
        ...s,
        positions: Array.from(existingMap.values()),
      };
    });

    const updatedFormation = { ...activeFormation, sets: updatedSets };
    setActiveFormation(updatedFormation);
    setIsDirty(true);
    setSuccessMessage(`No.${targetSet.number} に隊形を貼り付けました 📋`);
    setTimeout(() => setSuccessMessage(""), 2500);
  };

  // API: セット複製 (Duplicate)
  const handleDuplicateSet = async (setId: number) => {
    if (!activeFormation) return;

    let newSet: Set | null = null;
    try {
      const res = await fetch(`/api/sets/${setId}/duplicate`, {
        method: "POST",
      });

      if (res.ok) {
        newSet = await res.json();
      }
    } catch (error) {
      console.error("Failed to duplicate set via API:", error);
    }

    if (!newSet) {
      const targetSet = activeFormation.sets.find((s) => s.id === setId);
      if (targetSet) {
        const currentSets = activeFormation.sets || [];
        const maxSetNum = currentSets.reduce((max, s) => Math.max(max, s.number), 0);
        const nextNumber = maxSetNum + 1;
        newSet = {
          id: Date.now(),
          formationId: activeFormation.id,
          number: nextNumber,
          counts: targetSet.counts || 8,
          positions: (targetSet.positions || []).map((p) => ({ ...p, id: undefined, setId: Date.now() })),
        };
      }
    }

    if (newSet) {
      if (setId) {
        const sourceGroups = memberGroupsBySet[setId] || [];
        setMemberGroupsBySet((prev) => ({
          ...prev,
          [newSet!.id]: JSON.parse(JSON.stringify(sourceGroups)),
        }));
      }
      const updatedSets = [...activeFormation.sets.filter((s) => s.id !== newSet!.id), newSet].sort(
        (a, b) => a.number - b.number
      );
      const updatedFormation = { ...activeFormation, sets: updatedSets };
      setActiveFormation(updatedFormation);
      setSelectedSetId(newSet.id);
      setIsDirty(true);
      localStorage.setItem(`drillflow_formation_${activeFormation.id}`, JSON.stringify(updatedFormation));
    }
  };

  // API: セット削除
  const handleDeleteSet = async (setId: number) => {
    if (!activeFormation) return;
    if (activeFormation.sets.length <= 1) {
      alert("これ以上削除できません");
      return;
    }

    if (!window.confirm("このNo.を削除しますか？")) return;

    const setIndex = activeFormation.sets.findIndex((s) => s.id === setId);
    const remainingSets = activeFormation.sets.filter((s) => s.id !== setId);
    const renumberedSets = remainingSets.map((s, idx) => ({
      ...s,
      number: idx,
    }));

    const updatedFormation = { ...activeFormation, sets: renumberedSets };
    setActiveFormation(updatedFormation);

    if (selectedSetId === setId) {
      const newSelectedId = renumberedSets[Math.max(0, setIndex - 1)]?.id || renumberedSets[0]?.id || null;
      setSelectedSetId(newSelectedId);
    }

    setIsDirty(true);
    setSaveStatus("削除しました");
    localStorage.setItem(`drillflow_formation_${activeFormation.id}`, JSON.stringify(updatedFormation));

    try {
      await fetch(`/api/sets/${setId}`, {
        method: "DELETE",
      });
    } catch (error) {
      console.error("Failed to delete set via API:", error);
    }
  };

  // API: 部員追加
  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalDisplayLabel = newMemberLabel.trim() || generateNextMemberLabel(newMemberInstrument, members, memberCustomLabels);
    const finalName = newMemberName.trim();

    let createdMember: Member | null = null;
    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: finalName,
          instrument: newMemberInstrument,
          color: newMemberColor,
          label: finalDisplayLabel,
          formationId: activeFormation ? activeFormation.id : undefined,
        }),
      });

      if (res.ok) {
        createdMember = await res.json();
      }
    } catch (error) {
      console.error("Failed to create member via API:", error);
    }

    const newM: Member = createdMember ? {
      ...createdMember,
      name: finalName,
      label: finalDisplayLabel,
    } : {
      id: members.length > 0 ? Math.max(...members.map((m) => Number(m.id) || 0)) + 1 : 1,
      name: finalName,
      instrument: newMemberInstrument,
      color: newMemberColor,
      label: finalDisplayLabel,
    };

    const updatedMembers = [...members.filter((m) => String(m.id) !== String(newM.id)), newM];
    setMembers(updatedMembers);
    localStorage.setItem("drillflow_local_members", JSON.stringify(updatedMembers));

    setMemberCustomLabels((prev) => ({
      ...prev,
      [newM.id]: finalDisplayLabel,
    }));

    if (activeFormation) {
      const updatedSets = activeFormation.sets.map((s) => {
        const exists = s.positions.some((p) => String(p.memberId) === String(newM.id));
        if (exists) return s;
        return {
          ...s,
          positions: [
            ...s.positions,
            { memberId: newM.id, setId: s.id, x: 0.5, y: 0.5 },
          ],
        };
      });
      const updatedFormation = { ...activeFormation, sets: updatedSets };
      setActiveFormation(updatedFormation);
      localStorage.setItem(`drillflow_formation_${activeFormation.id}`, JSON.stringify(updatedFormation));
    }

    setNewMemberName("");
    setNewMemberLabel("");
    setShowNewMemberModal(false);
  };

  // API: 部員編集
  const handleSaveEditMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    const finalLabel = editMemberLabel.trim() || generateNextMemberLabel(editMemberInstrument, members, memberCustomLabels);
    const finalName = editMemberName.trim();

    const updatedMember: Member = {
      ...editingMember,
      name: finalName,
      instrument: editMemberInstrument,
      color: editMemberColor,
      label: finalLabel,
    };

    const updatedMembers = members.map((m) => (m.id === editingMember.id ? updatedMember : m));
    setMembers(updatedMembers);
    localStorage.setItem("drillflow_local_members", JSON.stringify(updatedMembers));

    setMemberCustomLabels((prev) => ({
      ...prev,
      [editingMember.id]: finalLabel,
    }));

    try {
      await fetch(`/api/members/${editingMember.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: finalName,
          instrument: editMemberInstrument,
          color: editMemberColor,
          label: finalLabel,
        }),
      });
    } catch (error) {
      console.error("Failed to update member via API:", error);
    }

    setEditingMember(null);
  };

  // API: 部員削除
  const handleDeleteMember = async (memberId: number | string) => {
    const updatedMembers = members.filter((m) => String(m.id) !== String(memberId));
    setMembers(updatedMembers);
    localStorage.setItem("drillflow_local_members", JSON.stringify(updatedMembers));

    if (selectedMemberId && String(selectedMemberId) === String(memberId)) {
      setSelectedMemberId(null);
    }

    if (editingMember && String(editingMember.id) === String(memberId)) {
      setEditingMember(null);
    }

    setMemberCustomLabels((prev) => {
      const next = { ...prev };
      delete next[memberId as any];
      delete next[String(memberId) as any];
      return next;
    });

    let updatedFormation = activeFormation;
    if (activeFormation) {
      const updatedSets = activeFormation.sets.map((s) => ({
        ...s,
        positions: s.positions.filter((p) => String(p.memberId) !== String(memberId)),
      }));
      updatedFormation = { ...activeFormation, sets: updatedSets };
      setActiveFormation(updatedFormation);
      localStorage.setItem(`drillflow_formation_${activeFormation.id}`, JSON.stringify(updatedFormation));
    }

    try {
      await fetch(`/api/members/${memberId}`, {
        method: "DELETE",
      });
    } catch (error) {
      console.error("Failed to delete member via API:", error);
    }

    if (updatedFormation) {
      try {
        await fetch(`/api/formations/${updatedFormation.id}/save`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: updatedFormation.title,
            music: updatedFormation.music,
            bpm: updatedFormation.bpm,
            fieldWidth: updatedFormation.fieldWidth || 150,
            fieldHeight: updatedFormation.fieldHeight || 150,
            markingShape: updatedFormation.markingShape || "cross",
            markingIntervalX: updatedFormation.markingIntervalX || 10,
            markingIntervalY: updatedFormation.markingIntervalY || 10,
            markingCountX: updatedFormation.markingCountX || 15,
            markingCountY: updatedFormation.markingCountY || 15,
            backgroundColor: updatedFormation.backgroundColor || "#ffffff",
            markerColor: updatedFormation.markerColor || "#000000",
            showYardLines: updatedFormation.showYardLines !== false,
            showYardNumbers: updatedFormation.showYardNumbers !== false,
            showGridLines: updatedFormation.showGridLines !== false,
            customMarkers: updatedFormation.customMarkers || [],
            sets: updatedFormation.sets,
            members: updatedMembers,
            memberGroupsBySet: memberGroupsBySet,
          }),
        });
      } catch (e) {
        console.error("Failed to save formation after member deletion:", e);
      }
    }

    setSuccessMessage("部員を削除しました");
    setTimeout(() => setSuccessMessage(""), 3000);
  };

  // API: 部員一括削除
  const handleDeleteAllMembers = async () => {
    if (!window.confirm("登録されているすべての部員を削除しますか？この操作は取り消せません。")) return;

    setMembers([]);
    setSelectedMemberId(null);
    setEditingMember(null);
    setMemberCustomLabels({});
    localStorage.setItem("drillflow_local_members", JSON.stringify([]));

    if (activeFormation) {
      const updatedSets = activeFormation.sets.map((s) => ({
        ...s,
        positions: [],
      }));
      const updatedFormation = { ...activeFormation, sets: updatedSets };
      setActiveFormation(updatedFormation);
      localStorage.setItem(`drillflow_formation_${activeFormation.id}`, JSON.stringify(updatedFormation));
    }

    try {
      await fetch("/api/members/all", {
        method: "DELETE",
      });
    } catch (error) {
      console.error("Failed to delete all members via API:", error);
    }
  };

  // ポジションドラッグ＆ドロップ時の座標更新 (メモリ上でのみ更新、isDirty = true)
  const handleUpdatePosition = (memberId: number, x: number, y: number) => {
    if (!activeFormation || !selectedSetId) return;
    saveEditorHistory();

    const updatedSets = activeFormation.sets.map((s) => {
      if (s.id !== selectedSetId) return s;

      const existingPosIdx = s.positions.findIndex((p) => p.memberId === memberId);
      const updatedPositions = [...s.positions];

      if (existingPosIdx > -1) {
        updatedPositions[existingPosIdx] = {
          ...updatedPositions[existingPosIdx],
          x,
          y,
        };
      } else {
        updatedPositions.push({
          memberId,
          setId: selectedSetId,
          x,
          y,
        });
      }

      return {
        ...s,
        positions: updatedPositions,
      };
    });

    setActiveFormation({
      ...activeFormation,
      sets: updatedSets,
    });
    setIsDirty(true);
  };

  // 再生制御ロジック
  const currentSet = activeFormation?.sets.find((s) => s.id === selectedSetId) || null;

  // 次のセットを取得する
  const getNextSet = (): Set | null => {
    if (!activeFormation || !currentSet) return null;
    const currentIndex = activeFormation.sets.findIndex((s) => s.id === currentSet.id);
    if (currentIndex > -1 && currentIndex < activeFormation.sets.length - 1) {
      return activeFormation.sets[currentIndex + 1];
    }
    return null;
  };

  // 前のセットを取得する
  const getPrevSet = (): Set | null => {
    if (!activeFormation || !currentSet) return null;
    const currentIndex = activeFormation.sets.findIndex((s) => s.id === currentSet.id);
    if (currentIndex > 0) {
      return activeFormation.sets[currentIndex - 1];
    }
    return null;
  };

  const prevSet = getPrevSet();
  const nextSet = getNextSet();

  // 複数メンバーのポジション更新
  const handleUpdatePositions = (updates: { memberId: number; x: number; y: number }[]) => {
    if (!activeFormation || !selectedSetId || updates.length === 0) return;

    const updatedSets = activeFormation.sets.map((s) => {
      if (s.id !== selectedSetId) return s;

      const updatedPositions = [...s.positions];
      updates.forEach((u) => {
        const idx = updatedPositions.findIndex((p) => p.memberId === u.memberId);
        if (idx > -1) {
          updatedPositions[idx] = { ...updatedPositions[idx], x: u.x, y: u.y };
        } else {
          updatedPositions.push({ memberId: u.memberId, setId: selectedSetId, x: u.x, y: u.y });
        }
      });

      return { ...s, positions: updatedPositions };
    });

    const updatedFormation = { ...activeFormation, sets: updatedSets };
    setActiveFormation(updatedFormation);
    setIsDirty(true);
  };

  // --- Undo (元に戻す ↩) & Redo (やり直す ↪) 履歴ロジック ---
  const saveEditorHistory = () => {
    if (activeFormation) {
      setEditorHistory((prev) => [...prev.slice(-50), JSON.parse(JSON.stringify(activeFormation))]);
      setEditorFuture([]);
    }
  };

  const saveDesignerHistory = () => {
    setDesignerHistory((prev) => [
      ...prev.slice(-50),
      {
        designerName,
        designerBlocksX,
        designerBlocksY,
        designerSubdivisionsX,
        designerSubdivisionsY,
        designerMarkingShape,
        designerBackgroundColor,
        designerGridLineStyle,
        designerSubGridLineStyle,
        designerGridLineColor,
        designerMarkerColor,
        designerCustomMarkers: JSON.parse(JSON.stringify(designerCustomMarkers)),
        snapToGrid,
      },
    ]);
    setDesignerFuture([]);
  };

  const handleUndo = () => {
    if (activeView === "editor" && editorHistory.length > 0 && activeFormation) {
      const previous = editorHistory[editorHistory.length - 1];
      setEditorHistory((prev) => prev.slice(0, prev.length - 1));
      setEditorFuture((prev) => [...prev, JSON.parse(JSON.stringify(activeFormation))]);
      setActiveFormation(previous);
      setIsDirty(true);
      setSaveStatus("元に戻しました ↩");
      setTimeout(() => setSaveStatus(""), 2000);
    } else if (activeView === "field_designer" && designerHistory.length > 0) {
      const previous = designerHistory[designerHistory.length - 1];
      setDesignerHistory((prev) => prev.slice(0, prev.length - 1));
      setDesignerFuture((prev) => [
        ...prev,
        {
          designerName,
          designerBlocksX,
          designerBlocksY,
          designerSubdivisionsX,
          designerSubdivisionsY,
          designerMarkingShape,
          designerBackgroundColor,
          designerGridLineStyle,
          designerSubGridLineStyle,
          designerGridLineColor,
          designerMarkerColor,
          designerCustomMarkers: JSON.parse(JSON.stringify(designerCustomMarkers)),
          snapToGrid,
        },
      ]);
      setDesignerName(previous.designerName);
      setDesignerBlocksX(previous.designerBlocksX);
      setDesignerBlocksY(previous.designerBlocksY);
      setDesignerSubdivisionsX(previous.designerSubdivisionsX);
      setDesignerSubdivisionsY(previous.designerSubdivisionsY);
      setDesignerMarkingShape(previous.designerMarkingShape);
      setDesignerBackgroundColor(previous.designerBackgroundColor);
      setDesignerGridLineStyle(previous.designerGridLineStyle);
      setDesignerSubGridLineStyle(previous.designerSubGridLineStyle ?? "dashed");
      setDesignerGridLineColor(previous.designerGridLineColor);
      setDesignerMarkerColor(previous.designerMarkerColor);
      setDesignerCustomMarkers(previous.designerCustomMarkers);
      setSnapToGrid(previous.snapToGrid);
      setSaveStatus("元に戻しました ↩");
      setTimeout(() => setSaveStatus(""), 2000);
    }
  };

  const handleRedo = () => {
    if (activeView === "editor" && editorFuture.length > 0 && activeFormation) {
      const next = editorFuture[editorFuture.length - 1];
      setEditorFuture((prev) => prev.slice(0, prev.length - 1));
      setEditorHistory((prev) => [...prev, JSON.parse(JSON.stringify(activeFormation))]);
      setActiveFormation(next);
      setIsDirty(true);
      setSaveStatus("やり直しました ↪");
      setTimeout(() => setSaveStatus(""), 2000);
    } else if (activeView === "field_designer" && designerFuture.length > 0) {
      const next = designerFuture[designerFuture.length - 1];
      setDesignerFuture((prev) => prev.slice(0, prev.length - 1));
      setDesignerHistory((prev) => [
        ...prev,
        {
          designerName,
          designerBlocksX,
          designerBlocksY,
          designerSubdivisionsX,
          designerSubdivisionsY,
          designerMarkingShape,
          designerBackgroundColor,
          designerGridLineStyle,
          designerSubGridLineStyle,
          designerGridLineColor,
          designerMarkerColor,
          designerCustomMarkers: JSON.parse(JSON.stringify(designerCustomMarkers)),
          snapToGrid,
        },
      ]);
      setDesignerName(next.designerName);
      setDesignerBlocksX(next.designerBlocksX);
      setDesignerBlocksY(next.designerBlocksY);
      setDesignerSubdivisionsX(next.designerSubdivisionsX);
      setDesignerSubdivisionsY(next.designerSubdivisionsY);
      setDesignerMarkingShape(next.designerMarkingShape);
      setDesignerBackgroundColor(next.designerBackgroundColor);
      setDesignerGridLineStyle(next.designerGridLineStyle);
      setDesignerSubGridLineStyle(next.designerSubGridLineStyle ?? "dashed");
      setDesignerGridLineColor(next.designerGridLineColor);
      setDesignerMarkerColor(next.designerMarkerColor);
      setDesignerCustomMarkers(next.designerCustomMarkers);
      setSnapToGrid(next.snapToGrid);
      setSaveStatus("やり直しました ↪");
      setTimeout(() => setSaveStatus(""), 2000);
    }
  };

  const handleCopyMarker = () => {
    if (!selectedDesignerMarkerId) return false;
    let targetMarker: CustomMarker | undefined;
    if (activeView === "field_designer") {
      targetMarker = designerCustomMarkers.find((m) => m.id === selectedDesignerMarkerId);
    } else if (activeFormation) {
      targetMarker = (activeFormation.customMarkers || []).find((m) => m.id === selectedDesignerMarkerId);
    }

    if (targetMarker) {
      setCopiedMarker({ ...targetMarker });
      setSaveStatus("マーカーをコピーしました 📋");
      setTimeout(() => setSaveStatus(""), 2000);
      return true;
    }
    return false;
  };

  const handlePasteMarker = () => {
    if (!copiedMarker) return false;

    if (activeView === "field_designer") {
      if (designerCustomMarkers.length >= 50) {
        alert("マーカーは最大50個まで配置可能です。");
        return false;
      }
      saveDesignerHistory();
      const offsetX = 0.03;
      const offsetY = 0.03;
      const newX = Math.min(0.98, copiedMarker.x + offsetX);
      const newY = Math.min(0.98, copiedMarker.y + offsetY);

      const newMarker: CustomMarker = {
        ...copiedMarker,
        id: `custom-marker-${Date.now()}`,
        x: newX,
        y: newY,
      };

      setDesignerCustomMarkers((prev) => [...prev, newMarker]);
      setSelectedDesignerMarkerId(newMarker.id);
      setCopiedMarker(newMarker);
      setSaveStatus("マーカーを貼り付けました 📋");
      setTimeout(() => setSaveStatus(""), 2000);
      return true;
    } else if (activeFormation) {
      const currentMarkers = activeFormation.customMarkers || [];
      if (currentMarkers.length >= 50) {
        alert("マーカーは最大50個まで配置可能です。");
        return false;
      }
      saveEditorHistory();
      const offsetX = 0.03;
      const offsetY = 0.03;
      const newX = Math.min(0.98, copiedMarker.x + offsetX);
      const newY = Math.min(0.98, copiedMarker.y + offsetY);

      const newMarker: CustomMarker = {
        ...copiedMarker,
        id: `custom-marker-${Date.now()}`,
        x: newX,
        y: newY,
      };

      const updatedMarkers = [...currentMarkers, newMarker];
      setActiveFormation({
        ...activeFormation,
        customMarkers: updatedMarkers,
      });
      setSelectedDesignerMarkerId(newMarker.id);
      setCopiedMarker(newMarker);
      setSaveStatus("マーカーを貼り付けました 📋");
      setTimeout(() => setSaveStatus(""), 2000);
      return true;
    }
    return false;
  };

  const handleDeleteSelectedMarker = () => {
    if (!selectedDesignerMarkerId) return false;
    if (activeView === "field_designer") {
      saveDesignerHistory();
      setDesignerCustomMarkers((prev) => prev.filter((m) => m.id !== selectedDesignerMarkerId));
      setSelectedDesignerMarkerId(null);
      setSaveStatus("マーカーを削除しました 🗑️");
      setTimeout(() => setSaveStatus(""), 2000);
      return true;
    } else if (activeFormation) {
      const currentMarkers = activeFormation.customMarkers || [];
      if (currentMarkers.some((m) => m.id === selectedDesignerMarkerId)) {
        saveEditorHistory();
        setActiveFormation({
          ...activeFormation,
          customMarkers: currentMarkers.filter((m) => m.id !== selectedDesignerMarkerId),
        });
        setSelectedDesignerMarkerId(null);
        setSaveStatus("マーカーを削除しました 🗑️");
        setTimeout(() => setSaveStatus(""), 2000);
        return true;
      }
    }
    return false;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S / Cmd+S はどの要素にフォーカスがあっても保存処理
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (activeView === "editor" && activeFormation) {
          handleSaveFormation();
        } else if (activeView === "field_designer") {
          handleSaveFieldTemplate();
        }
        return;
      }

      const activeTag = document.activeElement?.tagName.toLowerCase();
      const isInput = activeTag === "input" || activeTag === "textarea" || activeTag === "select";

      // Escapeキー (モーダル閉じ・選択解除)
      if (e.key === "Escape") {
        if (showShortcutsModal) { setShowShortcutsModal(false); return; }
        if (showNewFormationModal) { setShowNewFormationModal(false); return; }
        if (showNewMemberModal) { setShowNewMemberModal(false); return; }
        if (showFormationSettingsModal) { setShowFormationSettingsModal(false); return; }
        if (selectedDesignerMarkerId) {
          setSelectedDesignerMarkerId(null);
          return;
        }
        if (selectedMemberIds.length > 0 || selectedMemberId !== null) {
          setSelectedMemberIds([]);
          setSelectedMemberId(null);
          return;
        }
      }

      if (isInput) return;

      // Ctrl / Cmd 組み合わせ
      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        if (key === "c") {
          if (selectedDesignerMarkerId) {
            e.preventDefault();
            handleCopyMarker();
            return;
          } else if (activeView === "editor" && selectedSetId) {
            e.preventDefault();
            handleCopySetPositions();
            return;
          }
        } else if (key === "v") {
          if (copiedMarker) {
            e.preventDefault();
            handlePasteMarker();
            return;
          } else if (activeView === "editor" && copiedFormationPositions) {
            e.preventDefault();
            handlePasteSetPositions();
            return;
          }
        } else if (key === "z") {
          e.preventDefault();
          if (e.shiftKey) {
            handleRedo();
          } else {
            handleUndo();
          }
        } else if (key === "y") {
          e.preventDefault();
          handleRedo();
        } else if (key === "a") {
          e.preventDefault();
          if (activeView === "editor" && members.length > 0) {
            setSelectedMemberIds(members.map((m) => m.id));
          }
        }
        return;
      }

      // 単音キーショートカット
      if (e.code === "Space") {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedDesignerMarkerId) {
          e.preventDefault();
          handleDeleteSelectedMarker();
        }
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        if (prevSet) {
          setSelectedSetId(prevSet.id);
          setCurrentCount(0);
        }
      } else if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        if (nextSet) {
          setSelectedSetId(nextSet.id);
          setCurrentCount(0);
        }
      } else if (e.key === "g" || e.key === "G") {
        e.preventDefault();
        setSnapToGrid((prev) => !prev);
        setSnapMode((prev) => (prev === "none" ? "on" : "none"));
      } else if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setShowShortcutsModal((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    editorHistory, editorFuture, designerHistory, designerFuture, activeView, activeFormation,
    designerName, designerBlocksX, designerBlocksY, designerSubdivisionsX, designerSubdivisionsY,
    designerMarkingShape, designerBackgroundColor, designerGridLineStyle, designerSubGridLineStyle,
    designerGridLineColor, designerMarkerColor, designerCustomMarkers, snapToGrid,
    showShortcutsModal, showNewFormationModal, showNewMemberModal, showFormationSettingsModal,
    selectedMemberIds, selectedMemberId, selectedDesignerMarkerId, copiedMarker, prevSet, nextSet, members, selectedSetId, isPlaying
  ]);

  // アニメーションループ (BPM考慮)
  const animate = (timestamp: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = timestamp;
    const elapsed = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;

    if (!activeFormation || !currentSet) return;

    // セット独自のBPMがあればそれを優先、なければフォーメーション全体
    const bpm = currentSet.bpm || activeFormation.bpm || 120;
    // 1分間(60,000ms)にbpmカウント。
    // 1msあたりのカウント変化量 = bpm / 60000
    const countsPerMs = bpm / 60000;
    const deltaCount = elapsed * countsPerMs;

    setCurrentCount((prev) => {
      const nextCount = prev + deltaCount;
      if (nextCount >= currentSet.counts) {
        // 現在のセットのカウント制限を超えた場合
        const nextSetObj = getNextSet();
        if (nextSetObj) {
          // 次のセットへ自動遷移
          setSelectedSetId(nextSetObj.id);
          return 0; // 新しいセットの 0 カウントから開始
        } else {
          // 最後のセットに達したら停止
          setIsPlaying(false);
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
          }
          return 0;
        }
      }
      return nextCount;
    });

    if (isPlaying) {
      animationRef.current = requestAnimationFrame(animate);
    }
  };

  useEffect(() => {
    if (isPlaying) {
      lastTimeRef.current = 0;
      animationRef.current = requestAnimationFrame(animate);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, selectedSetId]);

  // 音声トラック再生との同期制御
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch((err) => {
          console.warn("Audio play was deferred or blocked by browser gesture rules:", err);
        });
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  const calcSetStartTimeSeconds = (targetSetId: number): number => {
    if (!activeFormation) return 0;
    const sortedSets = [...activeFormation.sets].sort((a, b) => a.number - b.number);
    let totalSeconds = 0;
    for (const s of sortedSets) {
      if (s.number === 0) continue; // Set 0は初期配置なので時間累積対象外
      if (s.id === targetSetId) break;
      const bpm = s.bpm || activeFormation.bpm || 120;
      totalSeconds += (s.counts / bpm) * 60;
    }
    return totalSeconds;
  };

  const handlePlayToggle = () => {
    if (!isPlaying) {
      let targetSetId = selectedSetId;
      if (activeFormation && activeFormation.sets.length > 1) {
        // もし Set 0 (初期セット: number === 0) や未選択の場合、最初の移動目標セット(Set 1)へ自動切替
        if (!selectedSetId || currentSet?.number === 0) {
          const moveSet = activeFormation.sets.find((s) => s.number === 1) || activeFormation.sets[1];
          if (moveSet) {
            targetSetId = moveSet.id;
            setSelectedSetId(moveSet.id);
          }
        }
      }
      if (audioRef.current) {
        const startTime = targetSetId ? calcSetStartTimeSeconds(targetSetId) : 0;
        const currentBpm = currentSet?.bpm || activeFormation?.bpm || 120;
        const offsetSeconds = (currentCount / currentBpm) * 60;
        const targetTime = startTime + (isNaN(offsetSeconds) ? 0 : offsetSeconds);
        audioRef.current.currentTime = targetTime;
      }
      setCurrentCount(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
      if (audioRef.current) {
        audioRef.current.pause();
      }
    }
  };

  const handleStop = () => {
    setIsPlaying(false);
    setCurrentCount(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  // 選択されたメンバーの現在セットの座標と次セットの座標
  const selectedMember = members.find((m) => m.id === selectedMemberId) || null;
  const selectedMemberCurPos =
    currentSet?.positions.find((p) => p.memberId === selectedMemberId) || null;
  const selectedMemberNextPos =
    nextSet?.positions.find((p) => p.memberId === selectedMemberId) || null;

  // ドットブック＆移動指示の計算
  const moveInstructions =
    selectedMemberCurPos && selectedMemberNextPos && currentSet && activeFormation
      ? calculateMoveInstructions(
          selectedMemberCurPos.x,
          selectedMemberCurPos.y,
          selectedMemberNextPos.x,
          selectedMemberNextPos.y,
          currentSet.counts,
          activeFormation.fieldWidth || 150,
          activeFormation.fieldHeight || 150
        )
      : null;

  const currentYardDesc = selectedMemberCurPos && activeFormation
    ? getYardLocationDescription(
        selectedMemberCurPos.x,
        selectedMemberCurPos.y,
        activeFormation.fieldWidth || 150,
        activeFormation.fieldHeight || 150
      )
    : "";

  // リクエスト4: 全セットの衝突・接近ペア一覧を計算 (静止時および移動中の経路上を正確な歩数でスキャン)
  const allSetCollisions = useMemo(() => {
    if (!activeFormation || !activeFormation.sets) return [];
    const results: { setId: number; setNumber: number; count: number; pairs: { m1: Member; m2: Member; dist: number; isSevere: boolean; timeDesc?: string }[] }[] = [];

    const bX = activeFormation.blocksX || Math.round((activeFormation.fieldWidth || 150) / 10) || 15;
    const bY = activeFormation.blocksY || Math.round((activeFormation.fieldHeight || 150) / 10) || 15;
    const subX = activeFormation.subdivisionsX || 10;
    const subY = activeFormation.subdivisionsY || 10;
    const totalStepsX = bX * subX;
    const totalStepsY = bY * subY;

    activeFormation.sets.forEach((set, sIdx) => {
      const pairsMap = new Map<string, { m1: Member; m2: Member; dist: number; isSevere: boolean; timeDesc?: string }>();
      
      const prevSet = sIdx > 0 ? activeFormation.sets[sIdx - 1] : null;
      const prevPositions = prevSet ? prevSet.positions || [] : [];
      const currPositions = set.positions || [];

      // t=0 (前のセット位置) から t=1.0 (現在のセット位置) までを大幅に細分化してスキャン (拍数×10ステップ以上、最小160分割)
      const steps = prevSet ? Math.max((set.counts || 16) * 10, 160) : 0;
      for (let step = 0; step <= steps; step++) {
        const t = steps > 0 ? step / steps : 1.0;
        
        const currentDots: { memberId: number; x: number; y: number }[] = [];
        for (const m of members) {
          const cPos = currPositions.find(p => p.memberId === m.id);
          if (!cPos) continue;
          if (prevSet && t < 1.0) {
            const pPos = prevPositions.find(p => p.memberId === m.id) || cPos;
            currentDots.push({
              memberId: m.id,
              x: pPos.x + (cPos.x - pPos.x) * t,
              y: pPos.y + (cPos.y - pPos.y) * t,
            });
          } else {
            currentDots.push({ memberId: m.id, x: cPos.x, y: cPos.y });
          }
        }

        for (let i = 0; i < currentDots.length; i++) {
          for (let j = i + 1; j < currentDots.length; j++) {
            const d1 = currentDots[i];
            const d2 = currentDots[j];
            const dx = (d1.x - d2.x) * totalStepsX;
            const dy = (d1.y - d2.y) * totalStepsY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 1.4) {
              const m1 = members.find((m) => m.id === d1.memberId);
              const m2 = members.find((m) => m.id === d2.memberId);
              if (!m1 || !m2) continue;
              
              const pairKey = m1.id < m2.id ? `${m1.id}-${m2.id}` : `${m2.id}-${m1.id}`;
              const distFixed = Number(dist.toFixed(1));
              const isSevere = dist < 0.8;
              const timeDesc = step === steps || steps === 0 ? "静止時" : `移動中(${Math.round(t * 100)}%地点)`;

              const existing = pairsMap.get(pairKey);
              if (!existing || distFixed < existing.dist) {
                pairsMap.set(pairKey, { m1, m2, dist: distFixed, isSevere: existing ? (existing.isSevere || isSevere) : isSevere, timeDesc });
              }
            }
          }
        }
      }

      const pairs = Array.from(pairsMap.values()).sort((a, b) => a.dist - b.dist);
      if (pairs.length > 0) {
        results.push({ setId: set.id, setNumber: set.number, count: set.counts, pairs });
      }
    });
    return results;
  }, [activeFormation, members]);

  if (isPrintMode && activeFormation) {
    const handleTriggerPrint = () => {
      try {
        window.focus();
        window.print();
      } catch (err) {
        console.error("Print trigger failed:", err);
        alert("印刷ダイアログの起動に失敗しました。キーボードの Ctrl + P (Macは Cmd + P) を押して印刷してください。");
      }
    };

    return (
      <div className="print-wrapper min-h-screen bg-slate-800 text-slate-100 p-4 font-sans flex flex-col items-center">
        {/* Style block for clean A4 printing */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page {
              size: A4 portrait;
              margin: 0;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              color: #000000 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .no-print {
              display: none !important;
            }
            .print-wrapper {
              background: #ffffff !important;
              padding: 0 !important;
              margin: 0 !important;
              min-height: auto !important;
              width: 100% !important;
            }
            .print-page {
              width: 210mm !important;
              height: 297mm !important;
              max-height: 297mm !important;
              page-break-after: always !important;
              break-after: page !important;
              box-sizing: border-box !important;
              margin: 0 auto !important;
              padding: 10mm !important;
              background: #ffffff !important;
              color: #000000 !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: space-between !important;
              position: relative !important;
              border: none !important;
              box-shadow: none !important;
            }
            .marching-canvas-print {
              border: 2px solid #000000 !important;
              border-radius: 0 !important;
              outline: none !important;
              box-shadow: none !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        ` }} />

        {/* Top bar for Print Mode Controls */}
        <div className="no-print w-full max-w-5xl bg-slate-900 border border-slate-700 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4 mb-6 shadow-2xl">
          <div className="flex items-center gap-4 flex-wrap">
            <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>印刷プレビュー (A4ドリルシート)</span>
            </h2>
            <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
              <label className="text-xs text-slate-300 font-bold">部員選択:</label>
              <select
                value={selectedMemberId || ""}
                onChange={(e) => setSelectedMemberId(e.target.value ? Number(e.target.value) : null)}
                className="bg-slate-900 text-white border border-slate-600 rounded px-2.5 py-1 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- 全員表示 --</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <span className="text-[11px] text-slate-400">
              ※ 送信先で「PDFに保存」を選択するとPDFファイルとしてダウンロードできます
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleTriggerPrint}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-5 py-2.5 rounded-lg shadow-lg hover:shadow-blue-500/20 transition flex items-center gap-2 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>今すぐ印刷 / PDF保存</span>
            </button>
            <button
              type="button"
              onClick={() => setIsPrintMode(false)}
              className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition"
            >
              閉じる
            </button>
          </div>
        </div>

        {/* List of printable A4 pages */}
        <div className="flex flex-col gap-10 items-center w-full max-w-4xl">
          {activeFormation.sets.map((set, setIdx) => {
            const prevSetObj = activeFormation.sets[setIdx - 1] || null;
            const nextSetObj = activeFormation.sets[setIdx + 1] || null;
            const setInsts = setInstructions[set.id] || [];
            const selMember = members.find((m) => m.id === selectedMemberId);

            // 全ての指定 (トップセクション表示用: グループ分けがある場合はグループ名:指定 の形式で全指定を表示)
            const topInstsFormatted = setInsts.map((inst) => {
              if (inst.targetType === "all") {
                return {
                  id: inst.id,
                  text: inst.instructionText,
                };
              }

              let label = inst.targetValue;
              if (inst.targetType === "group") {
                const setGrps = memberGroupsBySet[set.id] || [];
                const grp =
                  setGrps.find((g) => g.id === inst.targetValue || g.name === inst.targetValue) ||
                  activeFormation.memberGroups?.find((g) => g.id === inst.targetValue || g.name === inst.targetValue);
                if (grp) {
                  label = grp.name;
                }
              } else if (inst.targetType === "individual") {
                const targetMember = members.find(
                  (m) => String(m.id) === inst.targetValue || m.name.toLowerCase() === inst.targetValue.toLowerCase()
                );
                if (targetMember) {
                  label = getEffectiveMemberLabel(targetMember, members, memberCustomLabels) || targetMember.name;
                }
              }

              return {
                id: inst.id,
                text: `${label}:${inst.instructionText}`,
              };
            });

            const allInsts = setInsts.filter((inst) => inst.targetType === "all");

            // 個人の指定 (individual member / group / instrument instructions for bottom section)
            let individualInsts: SetInstruction[] = [];
            if (selMember) {
              const setGrps = memberGroupsBySet[set.id] || [];
              individualInsts = setInsts.filter((inst) => {
                if (inst.targetType === "individual") {
                  const vals = inst.targetValue
                    .split(",")
                    .map((s) => s.trim().toLowerCase());
                  return (
                    vals.includes(String(selMember.id)) ||
                    vals.includes(selMember.name.toLowerCase())
                  );
                }
                if (inst.targetType === "group") {
                  const grp = setGrps.find((g) => g.id === inst.targetValue || g.name === inst.targetValue);
                  return grp ? grp.memberIds.includes(selMember.id) : false;
                }
                if (inst.targetType === "instrument") {
                  return (
                    (selMember.instrument &&
                      inst.targetValue.toLowerCase() === selMember.instrument.toLowerCase()) ||
                    inst.targetValue.toLowerCase() === selMember.name.toLowerCase()
                  );
                }
                return false;
              });
            }

            // 部員選択時の下部指定テキスト: 個別指定がある場合はそれを優先、無ければ全体の指定 (allInsts) を表示
            const bottomInsts = individualInsts.length > 0 ? individualInsts : allInsts;

            const valX = selMember ? (memberVariables[set.id]?.[selMember.id] ?? 0) : 0;

            return (
              <div
                key={`print-page-${set.id}`}
                className="print-page w-[210mm] h-[297mm] bg-white text-black px-[10mm] pt-[20mm] pb-[8mm] shadow-2xl flex flex-col justify-end items-center relative rounded-none border border-slate-300"
              >
                {/* 1. TOP SECTION: Rotated 180 degrees */}
                <div className="rotate-180 w-full shrink-0 flex flex-col justify-end">
                  {/* Visually BOTTOM: 横線 (DOM 1番目 -> 180度回転でコマ表直上) */}
                  <div className="w-full border-b-2 border-black mb-1" />

                  {/* Visually MIDDLE: Header: No. {set.number}　cts. {set.counts} (DOM 2番目 -> 180度回転でBuild 16の直下) */}
                  <div className="flex items-center justify-between py-0.5 mb-0.5">
                    <div className="text-3xl md:text-4xl font-black text-black tracking-wide flex items-center gap-4 flex-wrap">
                      <span>No. {set.number}　cts. {set.counts}</span>
                    </div>
                  </div>

                  {/* Visually TOP: 全体指示 (グループ指定含む全指示テキスト) (DOM 3番目 -> 180度回転で紙面最上部) */}
                  {topInstsFormatted.length > 0 && (
                    <div className="py-0.5 mb-0.5 flex flex-wrap items-center gap-x-6 gap-y-1">
                      {topInstsFormatted.map((inst) => (
                        <div key={inst.id} className="text-3xl md:text-4xl font-black text-black tracking-tight">
                          <span>{inst.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. MIDDLE/LOWER SECTION: Field map (コマ表) - centered with minimal vertical gap */}
                <div className="w-full my-1 flex items-center justify-center overflow-hidden">
                  <div
                    className="relative rounded-none overflow-hidden marching-canvas-print select-none rotate-180 border-2 border-black"
                    style={{
                      aspectRatio: `${activeFormation.fieldWidth || 150}/${activeFormation.fieldHeight || 150}`,
                      width: "100%",
                      maxHeight: "220mm",
                      maxWidth: `${((activeFormation.fieldWidth || 150) / (activeFormation.fieldHeight || 150)) * 220}mm`,
                      margin: "0 auto",
                      backgroundColor: activeFormation.backgroundColor || "#ffffff",
                    }}
                  >
                    {/* Grass lanes */}
                    {activeFormation.backgroundColor?.startsWith("#1e") && (
                      <div className="absolute inset-0 flex pointer-events-none">
                        {Array.from({ length: 10 }).map((_, i) => (
                          <div
                            key={i}
                            className={`h-full flex-1 ${i % 2 === 0 ? "bg-black/10" : "bg-transparent"}`}
                          />
                        ))}
                      </div>
                    )}

                    {/* Grid lines */}
                    {activeFormation.showGridLines !== false && (() => {
                      const bX = activeFormation.blocksX ?? 15;
                      const bY = activeFormation.blocksY ?? 15;
                      const subX = activeFormation.subdivisionsX ?? 10;
                      const subY = activeFormation.subdivisionsY ?? 10;
                      const totalX = bX * subX;
                      const totalY = bY * subY;
                      const gColor = activeFormation.gridLineColor || (activeFormation.backgroundColor?.startsWith("#1e") ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.2)");
                      const gWidth = activeFormation.gridLineWidth || 1;
                      const gStyle = activeFormation.gridLineStyle || "solid";
                      const subGStyle = activeFormation.subGridLineStyle || "dashed";
                      const mainDash = gStyle === "dashed" ? "4,4" : gStyle === "dotted" ? "2,2" : "none";
                      const subDash = subGStyle === "dashed" ? "3,3" : subGStyle === "dotted" ? "1.5,1.5" : "none";

                      return (
                        <svg
                          viewBox={`0 0 ${totalX * 10} ${totalY * 10}`}
                          preserveAspectRatio="none"
                          className="absolute inset-0 w-full h-full pointer-events-none"
                        >
                          {Array.from({ length: totalX + 1 }).map((_, i) => {
                            const xVal = i * 10;
                            const isMajor = i % subX === 0;
                            return (
                              <line
                                key={`print-v-${i}`}
                                x1={xVal}
                                y1={0}
                                x2={xVal}
                                y2={totalY * 10}
                                stroke={gColor}
                                strokeWidth={isMajor ? Math.max(1.5, gWidth * 1.5) : Math.max(0.8, gWidth * 0.8)}
                                strokeDasharray={isMajor ? mainDash : subDash}
                                opacity={isMajor ? 1.0 : 0.5}
                                vectorEffect="non-scaling-stroke"
                              />
                            );
                          })}
                          {Array.from({ length: totalY + 1 }).map((_, i) => {
                            const yVal = i * 10;
                            const isMajor = i % subY === 0;
                            return (
                              <line
                                key={`print-h-${i}`}
                                x1={0}
                                y1={yVal}
                                x2={totalX * 10}
                                y2={yVal}
                                stroke={gColor}
                                strokeWidth={isMajor ? Math.max(1.5, gWidth * 1.5) : Math.max(0.8, gWidth * 0.8)}
                                strokeDasharray={isMajor ? mainDash : subDash}
                                opacity={isMajor ? 1.0 : 0.5}
                                vectorEffect="non-scaling-stroke"
                              />
                            );
                          })}
                        </svg>
                      );
                    })()}

                    {/* Custom markers */}
                    {(activeFormation.customMarkers || []).map((mark, idx) => {
                      const shapeToRender = mark.shape || activeFormation.markingShape || "cross";
                      const colorToUse = mark.color || activeFormation.markerColor || "rgba(0,0,0,0.7)";
                      const mSize = activeFormation.markerSize || 24;
                      return (
                        <div
                          key={`print-custom-mark-${idx}`}
                          className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center justify-center z-10"
                          style={{
                            left: `${mark.x * 100}%`,
                            top: `${(1 - mark.y) * 100}%`,
                            width: `${mSize * 0.7}px`,
                            height: `${mSize * 0.7}px`,
                          }}
                        >
                          <svg viewBox="-12 -12 24 24" className="w-full h-full overflow-visible">
                            {renderCustomMarkShape(shapeToRender, colorToUse, "#000000")}
                          </svg>
                          {mark.label && (
                            <span className="absolute -bottom-3 text-[8px] font-sans font-black text-slate-900 bg-white/90 px-1 rounded scale-90 border border-slate-300 select-none pointer-events-none whitespace-nowrap shadow-xs">
                              {mark.label}
                            </span>
                          )}
                        </div>
                      );
                    })}

                    {/* Draw member positions in print view */}
                    {members.map((m) => {
                      const curPos = set.positions.find((p) => p.memberId === m.id);
                      const prevPos = prevSetObj?.positions.find((p) => p.memberId === m.id);

                      const curX = curPos ? curPos.x : 0.5;
                      const curY = curPos ? curPos.y : 0.5;
                      const prevX = prevPos ? prevPos.x : curX;
                      const prevY = prevPos ? prevPos.y : curY;

                      const isSelected = selectedMemberId === m.id;
                      const mLabel = getEffectiveMemberLabel(m, members, memberCustomLabels);

                      return (
                        <React.Fragment key={m.id}>
                          {/* Member position dot and display name on print canvas */}
                          <div
                            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center pointer-events-none z-20"
                            style={{
                              left: `${curX * 100}%`,
                              top: `${(1 - curY) * 100}%`,
                            }}
                          >
                            <div
                              className="w-1.5 h-1.5 rounded-full bg-black"
                              style={{ backgroundColor: "#000000" }}
                              title={mLabel}
                            />
                            {showMemberLabels && (
                              <span
                                className={`absolute top-full left-1/2 -translate-x-1/2 font-mono leading-none text-black whitespace-nowrap select-none pt-0.5 ${
                                  isSelected
                                    ? "text-[12px] font-extrabold z-30"
                                    : "text-[12px] font-extrabold"
                                }`}
                                style={{ color: "#000000" }}
                              >
                                {mLabel}
                              </span>
                            )}
                          </div>

                          {/* Arrow from previous set position to current set position for selected member */}
                          {prevSetObj && (prevX !== curX || prevY !== curY) && isSelected && (
                            <svg className="absolute inset-0 w-full h-full pointer-events-none z-40">
                              <defs>
                                <marker
                                  id={`arrow-print-${set.id}-${m.id}`}
                                  viewBox="0 0 10 10"
                                  refX="10"
                                  refY="5"
                                  markerWidth="6"
                                  markerHeight="6"
                                  orient="auto"
                                >
                                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#2563eb" />
                                </marker>
                              </defs>
                              <line
                                x1={`${prevX * 100}%`}
                                y1={`${(1 - prevY) * 100}%`}
                                x2={`${curX * 100}%`}
                                y2={`${(1 - curY) * 100}%`}
                                stroke="#2563eb"
                                strokeWidth={2}
                                markerEnd={`url(#arrow-print-${set.id}-${m.id})`}
                              />
                            </svg>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>

                {/* 3. BOTTOM SECTION: Rotated 180 degrees at bottom of paper */}
                <div className="rotate-180 w-full shrink-0">
                  <div className="flex items-center justify-between text-black py-0.5 mb-0.5">
                    <div className="flex items-center gap-6 flex-wrap">
                      <span className="font-black text-3xl md:text-4xl text-black">No. {set.number}</span>
                      {/* 選択した個人の指定（グループ指定が無ければ全体の指定） */}
                      {selMember && bottomInsts.length > 0 && (
                        <span className="text-3xl md:text-4xl font-black text-black tracking-wide">
                          {bottomInsts
                            .map((inst) => evaluateInstructionFormula(inst.instructionText, valX))
                            .join("  ")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 横線 (コマ表側 = 180度回転後はコマ表の直下) */}
                  <div className="w-full border-b-2 border-black mt-1" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen md:h-screen bg-slate-100 text-slate-800 font-sans flex flex-col selection:bg-blue-600 selection:text-white md:overflow-hidden">
      {/* 上部ナビゲーション / ヘッダー (Professional Polish Theme) */}
      <header className="h-16 bg-slate-900 text-white flex items-center justify-between px-4 sm:px-6 border-b border-slate-800 shrink-0 z-40 select-none">
        {/* 左側: アプリタイトル & コマ表切り替え */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => {
              setActiveView("home");
              setActiveFormation(null);
            }}
            className="h-9 w-9 bg-slate-800/90 hover:bg-slate-700 rounded-xl border border-slate-700/70 transition-all flex items-center justify-center text-slate-300 hover:text-white shadow-xs"
            title="ホームに戻る"
          >
            <Home className="w-4 h-4" />
          </button>

          {activeView === "editor" && formations.length > 0 && (
            <>
              <div className="h-5 w-px bg-slate-800 hidden md:block" />
              {/* コマ表選択プルダウン (長体省略対応) */}
              <div className="flex items-center gap-1.5">
                <select
                  className="h-9 bg-slate-800/90 border border-slate-700/70 text-xs rounded-xl px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white font-medium max-w-[120px] sm:max-w-[170px] md:max-w-[210px] truncate shadow-xs cursor-pointer"
                  value={activeFormation?.id || ""}
                  onChange={(e) => {
                    if (e.target.value) loadFormation(parseInt(e.target.value));
                  }}
                >
                  {formations.map((f) => {
                    const displayTitle = f.title.length > 8 ? `${f.title.slice(0, 7)}...` : f.title;
                    return (
                      <option key={f.id} value={f.id} className="truncate" title={f.title}>
                        {displayTitle}
                      </option>
                    );
                  })}
                </select>

                <button
                  onClick={() => setShowNewFormationModal(true)}
                  className="h-9 w-9 bg-slate-800/90 hover:bg-slate-700 text-blue-400 hover:text-blue-300 rounded-xl border border-slate-700/70 transition flex items-center justify-center shrink-0 shadow-xs"
                  title="新しいコマ表を作成"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* 再生コントロール & 各種ツールボタン */}
        {activeView === "editor" && activeFormation ? (
          <div className="flex items-center gap-2 flex-nowrap overflow-x-auto py-1.5 px-1 scrollbar-none">
            {/* 再生コントロール & シークスライダー ピル */}
            <div className="h-9 flex items-center bg-slate-800/90 pl-1.5 pr-2 rounded-xl border border-slate-700/80 gap-1 shadow-xs shrink-0">
              {/* 再生/ストップ 統合ボタン */}
              <button
                onClick={isPlaying ? handleStop : handlePlayToggle}
                className={`w-7 h-7 rounded-lg transition flex items-center justify-center ${
                  isPlaying
                    ? "text-blue-400 bg-blue-500/20 hover:bg-blue-500/30"
                    : "text-slate-300 hover:text-white hover:bg-slate-700/70"
                }`}
                title={isPlaying ? "ストップ" : "再生"}
              >
                {isPlaying ? (
                  <Square className="w-3.5 h-3.5 fill-current" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                )}
              </button>

              <div className="h-3.5 w-px bg-slate-700/80 my-auto" />

              {/* カウント・No.表示 & シークスライダー */}
              <div className="flex items-center gap-1 font-mono text-[11px] font-bold text-slate-200">
                {isPlaying ? (
                  <span className="text-blue-400 shrink-0 w-[34px] text-right tabular-nums">
                    {Math.min(currentSet?.counts || 16, Math.floor(currentCount) + 1)}/{currentSet?.counts || 16}
                  </span>
                ) : (
                  <span className="shrink-0 text-slate-300 w-[34px] text-right tabular-nums">
                    No.{currentSet?.number || 1}
                  </span>
                )}

                <input
                  type="range"
                  min="0"
                  max={currentSet?.counts || 16}
                  step="0.1"
                  disabled={!nextSet && !isPlaying}
                  value={isPlaying ? currentCount : 0}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setCurrentCount(val);
                    if (!isPlaying) {
                      setIsPlaying(true);
                    }
                  }}
                  className="w-14 sm:w-16 md:w-20 h-1.5 bg-slate-700/80 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition shrink-0 ml-0.5"
                  title="再生シークスライダー"
                />
              </div>
            </div>

            {/* コマ表上の部員名表示切り替え */}
            <button
              type="button"
              onClick={() => setShowMemberLabels(!showMemberLabels)}
              className={`h-9 px-2.5 border text-xs rounded-xl font-bold transition flex items-center gap-1.5 shrink-0 shadow-xs ${
                showMemberLabels
                  ? "bg-blue-600/20 border-blue-500/80 text-blue-300"
                  : "bg-slate-800/90 border-slate-700/80 text-slate-400 hover:text-white"
              }`}
              title="コマ表上の部員名表示（オン/オフ）を切り替えます"
            >
              <User className="w-3.5 h-3.5" />
              <span className="text-[11px]">部員名: {showMemberLabels ? "表示" : "非表示"}</span>
            </button>

            {/* スナップ切り替え */}
            <div className="h-9 flex items-center bg-slate-800/90 border border-slate-700/80 rounded-xl overflow-hidden p-0.5 text-xs font-bold shrink-0 shadow-xs">
              <span className="px-2 text-slate-400 text-[10.5px] hidden xl:inline">スナップ:</span>
              <button
                type="button"
                onClick={() => {
                  setSnapToGrid(false);
                  setSnapMode("none");
                }}
                className={`h-full px-2 rounded-lg text-[10.5px] transition flex items-center ${
                  !snapToGrid || snapMode === "none"
                    ? "bg-slate-700 text-white font-black"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="スナップオフ (0.05刻みで移動)"
              >
                オフ
              </button>
              <button
                type="button"
                onClick={() => {
                  setSnapToGrid(true);
                  setSnapMode("on");
                }}
                className={`h-full px-2 rounded-lg text-[10.5px] transition flex items-center ${
                  snapToGrid && snapMode !== "none"
                    ? "bg-blue-600 text-white font-black shadow-xs"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="スナップオン (ブロック交点・中点スナップ)"
              >
                オン
              </button>
            </div>

            {/* 整列配置 */}
            <button
              onClick={() => {
                if (!isAlignToolActive) {
                  setAlignSelectedMemberIds(selectedMemberId ? [selectedMemberId] : members.map((m) => m.id));
                  setAlignPointA({ x: 0.25, y: 0.5 });
                  setAlignPointB({ x: 0.75, y: 0.5 });
                  setAlignPointCenter({ x: 0.5, y: 0.5 });
                  setAlignRadius(0.25);
                }
                setIsAlignToolActive(!isAlignToolActive);
              }}
              className={`h-9 px-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border shrink-0 shadow-xs ${
                isAlignToolActive
                  ? "bg-blue-600 text-white hover:bg-blue-500 border-blue-500"
                  : "bg-slate-800/90 text-blue-400 hover:text-white border-slate-700/80"
              }`}
              title="部員を等間隔で直線や円弧上に配置します"
            >
              <Layout className="w-3.5 h-3.5" />
              <span className="text-[11px]">整列配置</span>
            </button>

            {/* ゴースト表示切り替え */}
            <button
              onClick={() => setShowGhost(!showGhost)}
              className={`h-9 px-2.5 border text-xs rounded-xl font-bold transition flex items-center gap-1.5 shrink-0 shadow-xs hidden xl:flex ${
                showGhost
                  ? "bg-blue-600/20 border-blue-500/80 text-blue-300"
                  : "bg-slate-800/90 border-slate-700/80 text-slate-400 hover:text-white"
              }`}
              title="次の位置を重ねて表示します"
            >
              <div className={`w-6 h-3 rounded-full relative transition-colors shrink-0 ${showGhost ? 'bg-blue-500' : 'bg-slate-600'}`}>
                <div className={`absolute top-0.5 w-2 h-2 bg-white rounded-full transition-all ${showGhost ? 'right-0.5' : 'left-0.5'}`} />
              </div>
              <span className="text-[11px]">Ghost</span>
            </button>

            {/* Undo / Redo グループ */}
            <div className="h-9 flex items-center bg-slate-800/90 border border-slate-700/80 rounded-xl p-0.5 shrink-0 shadow-xs">
              <button
                onClick={handleUndo}
                disabled={editorHistory.length === 0}
                className="h-full px-2 hover:bg-slate-700/70 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg text-xs font-bold text-slate-300 hover:text-white transition flex items-center justify-center"
                title="元に戻す (Ctrl+Z)"
              >
                <span className="text-amber-400 font-black text-sm leading-none">↩</span>
              </button>
              <div className="h-4 w-px bg-slate-700/80" />
              <button
                onClick={handleRedo}
                disabled={editorFuture.length === 0}
                className="h-full px-2 hover:bg-slate-700/70 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg text-xs font-bold text-slate-300 hover:text-white transition flex items-center justify-center"
                title="やり直す (Ctrl+Y / Ctrl+Shift+Z)"
              >
                <span className="text-amber-400 font-black text-sm leading-none">↪</span>
              </button>
            </div>

            <div className="h-5 w-px bg-slate-800 hidden sm:block shrink-0" />

            {/* 設定ポップアップを開くボタン */}
            <button
              onClick={() => setShowFormationSettingsModal(true)}
              className="h-9 px-2.5 bg-slate-800/90 hover:bg-slate-700 border border-slate-700/80 rounded-xl text-xs font-bold text-slate-200 transition flex items-center gap-1.5 shadow-xs shrink-0"
              title="タイトル、曲名、音源、全体テンポなどを設定します"
            >
              <Music className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-[11px]">設定</span>
            </button>

            {/* 印刷ボタン */}
            <button
              onClick={() => setIsPrintMode(true)}
              className="h-9 px-2.5 bg-slate-800/90 hover:bg-slate-700 border border-slate-700/80 rounded-xl text-xs font-bold text-slate-200 transition flex items-center gap-1.5 shadow-xs shrink-0"
              title="コマ表を印刷します"
            >
              <Printer className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-[11px]">印刷</span>
            </button>

            {/* 保存ボタン */}
            <div className="relative shrink-0">
              <button
                onClick={handleSaveFormation}
                className={`h-9 px-3 rounded-xl text-xs font-bold text-white transition flex items-center gap-1.5 shadow-md active:scale-95 ${
                  saveStatus
                    ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/30"
                    : "bg-blue-600 hover:bg-blue-500 shadow-blue-900/30"
                }`}
                title="コマ表を保存"
              >
                {saveStatus ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white" />
                    <span className="text-[11px]">完了</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span className="text-[11px]">保存</span>
                  </>
                )}
                {isDirty && !saveStatus && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-slate-900 animate-pulse" />
                )}
              </button>
            </div>
          </div>
        ) : activeView === "field_designer" ? (
          <div className="flex items-center gap-4">
            <span className="text-xs font-bold bg-amber-600 text-white px-2.5 py-1 rounded uppercase">
              フィールド作成モード
            </span>
            <button
              onClick={handleUndo}
              disabled={designerHistory.length === 0}
              className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700 rounded text-xs font-bold text-white transition flex items-center justify-center shadow shrink-0"
              title="元に戻す (Ctrl+Z)"
            >
              <span className="text-amber-400 font-black text-base leading-none">↩</span>
            </button>
            <button
              onClick={handleRedo}
              disabled={designerFuture.length === 0}
              className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700 rounded text-xs font-bold text-white transition flex items-center justify-center shadow shrink-0"
              title="やり直す (Ctrl+Y / Ctrl+Shift+Z)"
            >
              <span className="text-amber-400 font-black text-base leading-none">↪</span>
            </button>
            <button
              onClick={() => {
                setActiveView("home");
                setActiveFormation(null);
              }}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-xs font-bold transition"
            >
              キャンセル
            </button>
            <button
              onClick={handleSaveFieldTemplate}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold transition flex items-center gap-1.5 shadow"
            >
              <Save className="w-3.5 h-3.5" />
              <span>テンプレートを保存</span>
            </button>
          </div>
        ) : (
          /* ホーム表示中 */
          <div className="flex items-center gap-2" />
        )}
      </header>

      {/* メインエリア (3カラムレイアウト - Professional Polish Theme) */}
      {activeView === "home" ? (
        <main className="flex-1 overflow-y-auto bg-slate-50 p-6 md:p-10 max-w-6xl mx-auto w-full space-y-10">
          {/* ウェルカム＆クイックアクション */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-8 rounded-2xl shadow-xl border border-slate-700/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h2 className="text-2xl font-black tracking-tight mb-2 font-display">
                コマ表メーカー
              </h2>
              <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
                應援指導部による應援指導部のためのコマ表作成ツール
              </p>
            </div>
            <div className="flex flex-wrap gap-3 shrink-0">
              <button
                onClick={() => {
                  setNewFormationTemplateId(fieldTemplates[0]?.id || "template_1");
                  setShowNewFormationModal(true);
                }}
                className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-900/20 transition active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>新規コマ表を作成</span>
              </button>
              <button
                onClick={() => handleOpenFieldDesigner(null)}
                className="flex items-center gap-2 px-5 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-amber-900/20 transition active:scale-95"
              >
                <Layout className="w-4 h-4" />
                <span>フィールドを設計する</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 左側2カラム: コマ表＆フィールドテンプレート一覧 */}
            <div className="lg:col-span-2 space-y-8">
              {/* 作成したコマ表の一覧 */}
              <section className="space-y-4">
                <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2.5">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  <span>作成したコマ表一覧 ({formations.length})</span>
                </h3>

                {formations.length === 0 ? (
                  <div className="bg-white rounded-xl border border-slate-200/60 p-10 text-center shadow-sm">
                    <p className="text-slate-400 text-sm font-medium">作成済みのコマ表はありません。上のボタンから最初のコマ表を作ってみましょう！</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {formations.map((f) => (
                      <div
                        key={f.id}
                        className="bg-white border border-slate-200/80 rounded-xl p-5 hover:border-blue-300 hover:shadow-md transition group flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-extrabold text-slate-800 group-hover:text-blue-600 transition text-sm">
                              {f.title}
                            </h4>
                          </div>
                          {f.music && (
                            <p className="text-xs text-slate-500 font-medium mb-3">
                              🎵 {f.music}
                            </p>
                          )}
                          <div className="flex gap-4 text-[11px] text-slate-400 font-mono mb-4">
                            <span>BPM: <strong>{f.bpm}</strong></span>
                            <span>Sets: <strong>{f.sets?.length || 0}</strong></span>
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                          <button
                            onClick={() => handleDeleteFormation(f.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                            title="削除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => loadFormation(f.id)}
                            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition"
                          >
                            コマ表を開く
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* フィールドテンプレートの一覧 */}
              <section className="space-y-4">
                <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2.5">
                  <Layout className="w-5 h-5 text-amber-600" />
                  <span>フィールドテンプレート一覧 ({fieldTemplates.length})</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {fieldTemplates.map((t) => {
                    const isDefault = t.id === "template_1";
                    return (
                      <div
                        key={t.id}
                        className="bg-white border border-slate-200/80 rounded-xl p-5 hover:border-amber-300 hover:shadow-md transition flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-extrabold text-slate-800 text-sm">{t.name}</h4>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              isDefault ? "bg-slate-100 text-slate-500" : "bg-amber-50 text-amber-700 border border-amber-100"
                            }`}>
                              {isDefault ? "プリセット" : "カスタム"}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 text-[10px] text-slate-400 font-mono mb-4">
                            <span>マーカー: {t.markingShape}</span>
                            <span>・ カスタムマーク: {t.customMarkers?.length || 0}個</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3">
                          {!isDefault && (
                            <>
                              <button
                                onClick={() => handleDeleteFieldTemplate(t.id)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                                title="テンプレートを削除"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleOpenFieldDesigner(t.id)}
                                className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-lg transition"
                              >
                                編集する
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => {
                              setNewFormationTemplateId(t.id);
                              setShowNewFormationModal(true);
                            }}
                            className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-xs rounded-lg transition"
                          >
                            これで作る
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>

            {/* 右側1カラム: 部員（メンバー）の一括管理 */}
            <div className="space-y-6">
              <section className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    <span>登録部員管理 ({members.length})</span>
                  </h3>
                  <button
                    onClick={openNewMemberModal}
                    className="p-1.5 bg-blue-50 hover:bg-blue-100 rounded-lg text-blue-600 transition flex items-center gap-1 text-[11px] font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>追加</span>
                  </button>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  ここに登録された部員は、すべてのコマ表で配置できます。
                </p>

                {members.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    部員が登録されていません。「追加」ボタンから部員を登録してください。
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                    {members.map((m) => {
                      const mLabel = getEffectiveMemberLabel(m, members, memberCustomLabels);
                      return (
                        <div
                          key={m.id}
                          className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200/40 transition text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className="w-3.5 h-3.5 rounded-full shrink-0 border border-white shadow-sm"
                              style={{ backgroundColor: m.color }}
                            />
                            <div className="min-w-0 flex items-center gap-2">
                              <span className="font-bold text-slate-800 truncate flex items-center gap-1.5">
                                <span className="font-mono text-slate-900 font-bold text-xs shrink-0">
                                  {mLabel}
                                </span>
                                {m.name ? (
                                  <span className="truncate font-mono text-slate-900 font-bold text-xs">{m.name}</span>
                                ) : null}
                              </span>
                            </div>
                          </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => openEditMemberModal(m)}
                            className="p-1.5 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg transition"
                            title="部員情報を編集"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteMember(m.id);
                            }}
                            className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition"
                            title="部員を削除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                )}
              </section>
            </div>
          </div>
        </main>
      ) : activeView === "field_designer" ? (
        /* --- フィールドテンプレート作成・編集画面 --- */
        <main className="flex-1 flex flex-col md:flex-row overflow-hidden w-full bg-slate-100">
          {/* 左カラム: フィールド設定フォーム */}
          <section className="w-full md:w-80 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto h-full p-6 space-y-6">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-tight flex items-center gap-2 pb-2.5 border-b border-slate-100">
                <Layout className="w-4 h-4 text-amber-600" />
                <span>テンプレートの設定</span>
              </h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-600 font-bold block mb-1">テンプレート名</label>
                <input
                  type="text"
                  required
                  value={designerName}
                  onChange={(e) => setDesignerName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold block mb-1">横ブロック数 (X)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={designerBlocksX}
                    onChange={(e) => setDesignerBlocksX(Math.max(1, parseInt(e.target.value) || 16))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold block mb-1">縦ブロック数 (Y)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={designerBlocksY}
                    onChange={(e) => setDesignerBlocksY(Math.max(1, parseInt(e.target.value) || 8))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold block mb-1">1ブロック横マス数</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={designerSubdivisionsX}
                    onChange={(e) => setDesignerSubdivisionsX(Math.max(1, parseInt(e.target.value) || 8))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold block mb-1">1ブロック縦マス数</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={designerSubdivisionsY}
                    onChange={(e) => setDesignerSubdivisionsY(Math.max(1, parseInt(e.target.value) || 8))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-500 font-bold block mb-1">マーカーの形</label>
                <select
                  value={designerMarkingShape}
                  onChange={(e) => setDesignerMarkingShape(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 w-full focus:outline-none"
                >
                  <option value="cross">十字 (+)</option>
                  <option value="x">クロス (×)</option>
                  <option value="t_up">T字上 (┴)</option>
                  <option value="t_down">T字下 (┬)</option>
                  <option value="t_left">T字左 (┤)</option>
                  <option value="t_right">T字右 (├)</option>
                  <option value="dot">丸 (●)</option>
                </select>
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-3">
                <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">背景とカラーとスナップ</h4>

                <div>
                  <label className="text-[10px] text-slate-500 font-bold block mb-1">フィールドの背景色</label>
                  <input
                    type="color"
                    value={designerBackgroundColor}
                    onChange={(e) => setDesignerBackgroundColor(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 cursor-pointer h-8"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1 font-bold">ブロックの線種</label>
                    <select
                      value={designerGridLineStyle}
                      onChange={(e) => setDesignerGridLineStyle(e.target.value as "solid" | "dashed" | "dotted")}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-1 py-1 h-8 text-[11px] font-semibold focus:outline-none"
                    >
                      <option value="solid">実線</option>
                      <option value="dashed">破線</option>
                      <option value="dotted">点線</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1 font-bold">マスの線種</label>
                    <select
                      value={designerSubGridLineStyle}
                      onChange={(e) => setDesignerSubGridLineStyle(e.target.value as "solid" | "dashed" | "dotted")}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-1 py-1 h-8 text-[11px] font-semibold focus:outline-none"
                    >
                      <option value="solid">実線</option>
                      <option value="dashed">破線</option>
                      <option value="dotted">点線</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1 font-bold">グリッド線の色</label>
                    <input
                      type="color"
                      value={designerGridLineColor.startsWith("rgba") ? "#ffffff" : designerGridLineColor}
                      onChange={(e) => setDesignerGridLineColor(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 cursor-pointer h-8"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1 font-bold">マーカーの色</label>
                    <input
                      type="color"
                      value={designerMarkerColor}
                      onChange={(e) => setDesignerMarkerColor(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 cursor-pointer h-8"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-200/60 hover:bg-slate-100 transition">
                    <input
                      type="checkbox"
                      checked={snapToGrid}
                      onChange={(e) => setSnapToGrid(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 border-slate-300"
                    />
                    <span>グリッドスナップを有効にする</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-600">
                    <input
                      type="checkbox"
                      checked={designerShowGridLines}
                      onChange={(e) => setDesignerShowGridLines(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 border-slate-300"
                    />
                    <span>詳細な基準グリッド線を表示</span>
                  </label>
                </div>
              </div>
            </div>

            {/* カスタムマーカー編集セクション */}
            <div className="border-t border-slate-100 pt-4 flex-1 flex flex-col min-h-[300px]">
              <div className="flex justify-between items-center mb-2 gap-1.5 flex-wrap">
                <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  カスタム基準マーク ({designerCustomMarkers.length})
                </h4>
                <div className="flex items-center gap-1.5">
                  {selectedDesignerMarkerId && (
                    <button
                      type="button"
                      onClick={() => handleCopyMarker()}
                      className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2 py-1 rounded-lg transition flex items-center gap-1 shadow-2xs"
                      title="選択中のマーカーをコピー (Ctrl+C)"
                    >
                      <Copy className="w-3 h-3 text-blue-600" />
                      コピー
                    </button>
                  )}
                  {copiedMarker && (
                    <button
                      type="button"
                      onClick={() => handlePasteMarker()}
                      className="text-xs bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 font-bold px-2 py-1 rounded-lg transition flex items-center gap-1 shadow-2xs"
                      title="コピーしたマーカーを貼り付け (Ctrl+V)"
                    >
                      <Copy className="w-3 h-3 text-emerald-600" />
                      貼り付け
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (designerCustomMarkers.length >= 50) {
                        alert("マーカーは最大50個まで配置可能です。");
                        return;
                      }
                      saveDesignerHistory();
                      const newMarker: CustomMarker = {
                        id: `custom-marker-${Date.now()}`,
                        x: 0.5,
                        y: 0.5,
                      };
                      setDesignerCustomMarkers([...designerCustomMarkers, newMarker]);
                      setSelectedDesignerMarkerId(newMarker.id);
                    }}
                    className="text-xs bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-bold px-2.5 py-1 rounded-lg transition shrink-0"
                  >
                    + 新マーク追加
                  </button>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 leading-relaxed mb-3">
                プレビュー上のピンをドラッグ、または下表で座標や形状、色、ラベルを個別に細かく設定できます
              </p>

              <div className="flex-1 overflow-y-auto space-y-2 max-h-[320px] border border-slate-100 rounded-lg p-1.5 bg-slate-50/50">
                {designerCustomMarkers.length === 0 ? (
                  <p className="text-[10px] text-slate-400 italic text-center py-4">配置済みのマークはありません</p>
                ) : (
                  designerCustomMarkers.map((m, idx) => {
                    const isSelected = selectedDesignerMarkerId === m.id;
                    return (
                      <div
                        key={m.id}
                        onClick={() => setSelectedDesignerMarkerId(m.id)}
                        className={`p-2.5 rounded-lg border text-[11px] space-y-2 transition cursor-pointer ${
                          isSelected
                            ? "bg-blue-50/80 border-blue-500 shadow-md ring-2 ring-blue-400/40"
                            : "bg-white border-slate-200/60 hover:border-slate-300 shadow-sm"
                        }`}
                      >
                        <div className="flex items-center justify-between font-semibold text-slate-700">
                          <span className={`font-bold ${isSelected ? "text-blue-700" : "text-slate-700"}`}>
                            マーク {m.label ? `${m.label} (#${idx + 1})` : idx + 1}
                          </span>
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <span className="font-mono text-[9px] text-slate-400">({(m.x * designerBlocksX).toFixed(1)}, {(m.y * designerBlocksY).toFixed(1)})</span>
                            <button
                              type="button"
                              onClick={() => {
                                saveDesignerHistory();
                                setDesignerCustomMarkers(designerCustomMarkers.filter((item) => item.id !== m.id));
                                if (selectedDesignerMarkerId === m.id) setSelectedDesignerMarkerId(null);
                              }}
                              className="p-1 hover:bg-red-50 text-red-500 rounded transition"
                              title="削除"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2" onClick={(e) => e.stopPropagation()}>
                          <div>
                            <label className="text-[9px] text-slate-400 font-bold block mb-0.5">形状</label>
                            <select
                              value={m.shape || ""}
                              onChange={(e) => {
                                const updated = designerCustomMarkers.map((item) => {
                                  if (item.id === m.id) {
                                    return { ...item, shape: e.target.value || undefined };
                                  }
                                  return item;
                                });
                                setDesignerCustomMarkers(updated);
                              }}
                              className="w-full bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-[10px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                            >
                              <option value="">(デフォルト)</option>
                              <option value="cross">十字 (+)</option>
                              <option value="x">クロス (×)</option>
                              <option value="t_up">T字上 (┴)</option>
                              <option value="t_down">T字下 (┬)</option>
                              <option value="t_left">T字左 (┤)</option>
                              <option value="t_right">T字右 (├)</option>
                              <option value="dot">丸 (●)</option>
                              <option value="l_top_left">L字左上 (┌)</option>
                              <option value="l_top_right">L字右上 (┐)</option>
                              <option value="l_bottom_left">L字左下 (└)</option>
                              <option value="l_bottom_right">L字右下 (┘)</option>
                            </select>
                          </div>

                        <div>
                          <label className="text-[9px] text-slate-400 font-bold block mb-0.5">ラベル</label>
                          <input
                            type="text"
                            placeholder="例: A"
                            value={m.label || ""}
                            onChange={(e) => {
                              const updated = designerCustomMarkers.map((item) => {
                                if (item.id === m.id) {
                                  return { ...item, label: e.target.value || undefined };
                                }
                                return item;
                              });
                              setDesignerCustomMarkers(updated);
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-[10px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] text-slate-400 font-bold block mb-0.5 font-mono">X</label>
                          <input
                            type="number"
                            step="0.05"
                            min="0"
                            max={designerBlocksX}
                            value={Number((m.x * designerBlocksX).toFixed(2))}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              const updated = designerCustomMarkers.map((item) => {
                                if (item.id === m.id) {
                                  const newX = isNaN(val) ? 0 : Math.max(0, Math.min(1, val / designerBlocksX));
                                  return { ...item, x: newX };
                                }
                                return item;
                              });
                              setDesignerCustomMarkers(updated);
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-[10px] text-slate-700 focus:outline-none font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-400 font-bold block mb-0.5 font-mono">Y</label>
                          <input
                            type="number"
                            step="0.05"
                            min="0"
                            max={designerBlocksY}
                            value={Number((m.y * designerBlocksY).toFixed(2))}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              const updated = designerCustomMarkers.map((item) => {
                                if (item.id === m.id) {
                                  const newY = isNaN(val) ? 0 : Math.max(0, Math.min(1, val / designerBlocksY));
                                  return { ...item, y: newY };
                                }
                                return item;
                              });
                              setDesignerCustomMarkers(updated);
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-[10px] text-slate-700 focus:outline-none font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[9px] text-slate-400 font-bold block mb-0.5">カラー</label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={m.color || designerMarkerColor}
                            onChange={(e) => {
                              const updated = designerCustomMarkers.map((item) => {
                                if (item.id === m.id) {
                                  return { ...item, color: e.target.value };
                                }
                                return item;
                              });
                              setDesignerCustomMarkers(updated);
                            }}
                            className="w-6 h-5 rounded cursor-pointer border border-slate-200 p-0"
                          />
                          <input
                            type="text"
                            placeholder={designerMarkerColor}
                            value={m.color || ""}
                            onChange={(e) => {
                              const updated = designerCustomMarkers.map((item) => {
                                if (item.id === m.id) {
                                  return { ...item, color: e.target.value || undefined };
                                }
                                return item;
                              });
                              setDesignerCustomMarkers(updated);
                            }}
                            className="flex-1 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-[10px] text-slate-600 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                    );
                  })
                )}
              </div>
            </div>
          </section>

          {/* 右カラム: デザイナープレビュー */}
          <section className="flex-1 bg-slate-300 p-1 md:p-2 flex flex-col items-center justify-center relative overflow-y-auto">
            <div className="w-full max-w-full flex flex-col gap-2.5">
              <div className="flex items-center justify-between text-slate-600 text-xs font-semibold">
                <span>フィールドプレビュー ＆ マーカー配置</span>
                <span>キャンバス上のピンをドラッグして設置してください</span>
              </div>

              <MarchingField
                currentSet={null}
                nextSet={null}
                members={[]}
                selectedMemberId={null}
                onSelectMember={() => {}}
                onUpdatePosition={() => {}}
                showGhost={false}
                isPlaying={false}
                currentCount={0}
                fieldWidth={designerWidth}
                fieldHeight={designerHeight}
                markingShape={designerMarkingShape}
                markingIntervalX={designerGridSizeX}
                markingIntervalY={designerGridSizeY}
                backgroundColor={designerBackgroundColor}
                gridLineColor={designerGridLineColor}
                gridLineWidth={designerGridLineWidth}
                gridLineStyle={designerGridLineStyle}
                subGridLineStyle={designerSubGridLineStyle}
                showGridLines={designerShowGridLines}
                customMarkers={designerCustomMarkers}
                selectedCustomMarkerId={selectedDesignerMarkerId}
                onSelectCustomMarker={(id) => setSelectedDesignerMarkerId(id)}
                isDesignMode={true}
                blocksX={designerBlocksX}
                blocksY={designerBlocksY}
                subdivisionsX={designerSubdivisionsX}
                subdivisionsY={designerSubdivisionsY}
                markerColor={designerMarkerColor}
                snapToGrid={snapToGrid}
                onUpdateMarker={(markerId, x, y) => {
                  saveDesignerHistory();
                  const updated = designerCustomMarkers.map((m) => {
                    if (m.id === markerId) return { ...m, x, y };
                    return m;
                  });
                  setDesignerCustomMarkers(updated);
                }}
              />
            </div>
          </section>
        </main>
      ) : activeFormation ? (
        <main className="flex-1 flex flex-col md:flex-row overflow-hidden w-full bg-slate-100">
          {/* 左カラム: セット一覧 (Set Timeline) */}
          {isLeftSidebarOpen ? (
            <section className="w-full md:w-64 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto h-full p-0 transition-all duration-300">
              <div className="p-4 border-b border-slate-200 bg-white flex justify-between items-center">
                <h2 className="text-sm font-bold text-slate-500 uppercase tracking-tight flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-600" />
                  <span>TIMELINE</span>
                </h2>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleCreateSet}
                    className="text-blue-600 hover:bg-blue-50 w-6 h-6 flex items-center justify-center rounded transition font-bold text-lg"
                    title="No.を追加"
                  >
                    +
                  </button>
                  <button
                    onClick={() => setIsLeftSidebarOpen(false)}
                    className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded transition"
                    title="タイムラインを閉じる"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>
              </div>

            <div className="flex-1 overflow-y-auto space-y-2 p-3">
              {activeFormation.sets.map((set, idx) => {
                const isActive = set.id === selectedSetId;
                return (
                  <div
                    key={set.id}
                    onClick={() => {
                      if (!isPlaying) setSelectedSetId(set.id);
                    }}
                    className={`group p-3 bg-white rounded-lg transition cursor-pointer ${
                      isActive
                        ? "border-2 border-blue-500 shadow-sm"
                        : "border border-slate-200 opacity-80 hover:opacity-100 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1 flex-wrap gap-1">
                      <span className={`text-[10px] font-bold ${isActive ? "text-blue-600" : "text-slate-400"}`}>
                        No. {set.number}
                      </span>
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-0.5">
                          <span className="text-[9px] text-slate-400 font-mono">BPM:</span>
                          <input
                            type="number"
                            placeholder={String(activeFormation.bpm || 120)}
                            value={set.bpm || ""}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              handleUpdateSetBpm(set.id, isNaN(val) ? undefined : val);
                            }}
                            className="w-11 bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 px-1 py-0.5 rounded text-center focus:outline-none focus:border-blue-500 font-mono"
                            min="30"
                            max="300"
                            title="このNo.のテンポ(BPM)"
                          />
                        </div>
                        <div className="flex items-center gap-0.5">
                          <span className="text-[9px] text-slate-400 font-mono">Count:</span>
                          <input
                            type="number"
                            value={set.counts}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 16;
                              handleUpdateSetCounts(set.id, val);
                            }}
                            className="w-11 bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 px-1 py-0.5 rounded text-center focus:outline-none focus:border-blue-500 font-mono"
                            min="1"
                            title="このNo.のカウント数"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <div className="text-sm font-medium text-slate-800">
                        {set.number === 0 ? "初期隊形" : `No. ${set.number}`}
                      </div>
                      {/* セットに対するクイック操作 (複製、削除) */}
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleDuplicateSet(set.id)}
                          className="p-1 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded transition"
                          title="No.を複製"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        {activeFormation.sets.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSet(set.id);
                            }}
                            className="p-1 hover:bg-red-100 text-red-500 hover:text-red-700 rounded transition"
                            title="No.を削除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
          ) : (
            <div className="w-12 bg-slate-900 border-r border-slate-700 flex flex-col items-center py-4 shrink-0 transition-all duration-300">
              <button
                onClick={() => setIsLeftSidebarOpen(true)}
                className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition mb-4"
                title="タイムラインを開く"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <div className="flex-1 flex flex-col gap-4 items-center overflow-y-auto w-full px-1">
                {activeFormation.sets.map((set) => (
                  <button
                    key={set.id}
                    onClick={() => setSelectedSetId(set.id)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-mono transition shrink-0 ${
                      set.id === selectedSetId
                        ? "bg-blue-600 text-white ring-2 ring-blue-400"
                        : "bg-slate-800 text-slate-400 hover:text-white"
                    }`}
                    title={`No. ${set.number}`}
                  >
                    {set.number}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 中央カラム: The Field Stage & 整列コントロール */}
          <section className="flex-1 bg-slate-300 p-1 md:p-2 flex flex-col items-center justify-start relative overflow-y-auto h-full min-h-0">
            
            <div className="w-full max-w-full flex flex-col gap-2 flex-1 min-h-0">

              {/* 整列配置（Align Tool）パネル（枠内に完全に収まるコンパクトカードレイアウト） */}
              {isAlignToolActive && (
                <div className="bg-white border border-slate-300 shadow-xl rounded-2xl p-3 sm:p-3.5 flex flex-col gap-2.5 w-full max-h-[75vh] sm:max-h-[340px] overflow-y-auto shrink-0 transition-all">
                  {/* ヘッダー */}
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100 shrink-0 sticky top-0 bg-white z-10">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-pulse" />
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        整列配置コントロール
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAlignToolActive(false)}
                      className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded transition cursor-pointer"
                      title="閉じる"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* 形状選択・パラメータ ＆ 対象部員選択 */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 text-xs">
                    {/* 1. 形状 & パラメータ */}
                    <div className="space-y-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 flex flex-col justify-between">
                      <div className="space-y-1.5">
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-slate-700 text-[11px] whitespace-nowrap">① 整列の形状:</span>
                          <div className="flex bg-white p-0.5 rounded-lg border border-slate-200 shadow-xs self-start">
                            <button
                              type="button"
                              onClick={() => setAlignType("line")}
                              className={`px-2 py-1 rounded-md text-[10.5px] font-bold transition cursor-pointer ${
                                alignType === "line" ? "bg-blue-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-800"
                              }`}
                            >
                              直線 (Line)
                            </button>
                            <button
                              type="button"
                              onClick={() => setAlignType("arc")}
                              className={`px-2 py-1 rounded-md text-[10.5px] font-bold transition cursor-pointer ${
                                alignType === "arc" ? "bg-blue-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-800"
                              }`}
                            >
                              円弧 (Arc)
                            </button>
                            <button
                              type="button"
                              onClick={() => setAlignType("circle")}
                              className={`px-2 py-1 rounded-md text-[10.5px] font-bold transition cursor-pointer ${
                                alignType === "circle" ? "bg-blue-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-800"
                              }`}
                            >
                              円 (Circle)
                            </button>
                          </div>
                        </div>

                        {alignType === "line" && (
                          <p className="text-[10.5px] text-slate-500 leading-snug">
                            フィールド上のコントロールピン <strong>A</strong> と <strong>B</strong> をドラッグして直線を設定できます。
                          </p>
                        )}

                        {alignType === "arc" && (
                          <p className="text-[10.5px] text-slate-500 leading-snug">
                            フィールド上のハンドル（<strong>端1</strong>, <strong>アーチ</strong>, <strong>端2</strong>）でカーブを調整できます
                          </p>
                        )}

                        {alignType === "circle" && (
                          <div className="space-y-1">
                            <p className="text-[10.5px] text-slate-500 leading-snug">
                              フィールド上のピン (<strong>C</strong>) で円の大きさを調整できます
                            </p>
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-500 text-[10.5px]">半径:</span>
                              <input
                                type="range"
                                min="0.05"
                                max="0.5"
                                step="0.01"
                                value={alignRadius}
                                onChange={(e) => setAlignRadius(parseFloat(e.target.value))}
                                className="w-24 accent-blue-600 h-1 bg-slate-200 rounded cursor-pointer"
                              />
                              <span className="font-mono text-[10.5px] font-bold">{Math.round(alignRadius * 100)}%</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 2. 対象部員選択 */}
                    <div className="space-y-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 flex flex-col justify-between">
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-700 text-[11px]">② 整列する対象部員 ({alignSelectedMemberIds.length}名):</span>
                          <span className="text-[10px] text-slate-400">ドットクリックでも選択可</span>
                        </div>

                        <div className="flex flex-wrap gap-1 items-center">
                          <button
                            type="button"
                            onClick={() => setAlignSelectedMemberIds(members.map((m) => m.id))}
                            className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded text-[10px] transition shadow-xs cursor-pointer"
                          >
                            全員選択
                          </button>
                          <select
                            onChange={(e) => {
                              const inst = e.target.value;
                              if (inst) {
                                const filtered = members.filter((m) => m.instrument === inst).map((m) => m.id);
                                setAlignSelectedMemberIds(filtered);
                              }
                            }}
                            className="bg-white border border-slate-200 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-xs focus:outline-none cursor-pointer"
                          >
                            <option value="">パート選択...</option>
                            {Array.from(new Set(members.map((m) => m.instrument))).map((inst) => (
                              <option key={inst} value={inst}>
                                {inst}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => setShowAlignMemberSelector(true)}
                            className="bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-bold px-2 py-0.5 rounded text-[10px] transition shadow-xs cursor-pointer"
                          >
                            任意部員を選択...
                          </button>
                          <button
                            type="button"
                            onClick={() => setAlignSelectedMemberIds([])}
                            className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 font-bold px-1.5 py-0.5 rounded text-[10px] transition shadow-xs cursor-pointer"
                          >
                            クリア
                          </button>
                          {alignSelectedMemberIds.length > 1 && (
                            <>
                              <button
                                type="button"
                                onClick={reverseAlignMembers}
                                className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold px-1.5 py-0.5 rounded text-[10px] transition shadow-xs cursor-pointer"
                                title="並び順を完全に反転します"
                              >
                                ⇄ 逆順
                              </button>
                              <button
                                type="button"
                                onClick={sortAlignMembersByInstrument}
                                className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold px-1.5 py-0.5 rounded text-[10px] transition shadow-xs cursor-pointer"
                                title="パート名・名前順に並べ替えます"
                              >
                                ↓ パート順
                              </button>
                            </>
                          )}
                        </div>

                        {/* 選択中の部員チップ一覧 (順序並べ替え可能) */}
                        {alignSelectedMemberIds.length > 0 && (
                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-[9.5px] text-slate-500 font-semibold px-0.5">
                              <span>並び順 (左端/1番目がA点側):</span>
                              <span className="text-[9px] text-slate-400">◀ ▶ で順序移動</span>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-0.5 max-h-16 overflow-y-auto p-1.5 bg-white rounded-lg border border-slate-200 shadow-inner">
                              {alignSelectedMemberIds.map((mId, idx) => {
                                const member = members.find((m) => m.id === mId);
                                if (!member) return null;
                                return (
                                  <span
                                    key={mId}
                                    className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 text-slate-700 px-1.5 py-0.5 rounded text-[9.5px] font-semibold transition hover:border-slate-300"
                                  >
                                    <span className="text-slate-400 font-mono text-[9px] font-black">{idx + 1}.</span>
                                    <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ backgroundColor: member.color }} />
                                    <span>{member.name}</span>
                                    <div className="flex items-center gap-0.5 ml-0.5 border-l border-slate-300 pl-1">
                                      <button
                                        type="button"
                                        disabled={idx === 0}
                                        onClick={() => moveAlignMember(idx, -1)}
                                        className="hover:text-blue-600 disabled:opacity-20 transition font-black text-[9px] px-0.5 hover:bg-slate-200 rounded cursor-pointer"
                                        title="前の順番へ"
                                      >
                                        ◀
                                      </button>
                                      <button
                                        type="button"
                                        disabled={idx === alignSelectedMemberIds.length - 1}
                                        onClick={() => moveAlignMember(idx, 1)}
                                        className="hover:text-blue-600 disabled:opacity-20 transition font-black text-[9px] px-0.5 hover:bg-slate-200 rounded cursor-pointer"
                                        title="後ろの順番へ"
                                      >
                                        ▶
                                      </button>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => toggleAlignMemberId(mId)}
                                      className="hover:text-red-500 transition font-bold ml-0.5 text-slate-400 cursor-pointer"
                                      title="選択解除"
                                    >
                                      ×
                                    </button>
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 実行ボタン領域 (枠内に収まるレスポンシブ配置 & sticky) */}
                  <div className="flex justify-end items-center gap-2 pt-2 border-t border-slate-100 w-full shrink-0 sticky bottom-0 bg-white z-10">
                    <button
                      type="button"
                      onClick={() => setIsAlignToolActive(false)}
                      className="px-3 py-1.5 text-slate-500 hover:bg-slate-100 font-semibold rounded-xl text-xs transition cursor-pointer"
                    >
                      キャンセル
                    </button>
                    <button
                      type="button"
                      onClick={applyMemberAlignment}
                      disabled={alignSelectedMemberIds.length === 0}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-xl text-xs transition shadow-md shadow-emerald-600/20 flex items-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>整列を実行 (適用)</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {selectedMemberIds.length > 0 && (
                    <div className="flex items-center gap-2 bg-slate-900 text-white px-3 py-1 rounded-lg text-xs font-bold shadow-sm">
                      <span className="text-blue-400">{selectedMemberIds.length}名選択中</span>
                      <button
                        type="button"
                        onClick={() => setSelectedMemberIds([])}
                        className="text-slate-400 hover:text-white transition text-xs font-normal border-l border-slate-700 pl-2"
                      >
                        選択解除
                      </button>
                    </div>
                  )}
                  <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                    ※ドラッグで範囲選択、Shift+クリックで個別追加選択ができます
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {isPlaying && (
                    <div className="flex items-center gap-1.5 animate-pulse text-xs text-blue-600 font-bold font-mono">
                      <span className="w-2 h-2 rounded-full bg-blue-600" />
                      <span>PLAYING...</span>
                    </div>
                  )}
                </div>
              </div>

              <MarchingField
                currentSet={currentSet}
                nextSet={nextSet}
                prevSet={prevSet}
                members={members}
                selectedMemberId={selectedMemberId}
                showMemberLabels={showMemberLabels}
                onSelectMember={setSelectedMemberId}
                selectedMemberIds={selectedMemberIds}
                onSelectMembers={(ids) => {
                  setSelectedMemberIds(ids);
                  if (ids.length === 1) {
                    setSelectedMemberId(ids[0]);
                  } else if (ids.length === 0) {
                    setSelectedMemberId(null);
                  } else if (selectedMemberId === null || !ids.includes(selectedMemberId)) {
                    setSelectedMemberId(ids[0]);
                  }
                }}
                onUpdatePosition={handleUpdatePosition}
                onUpdatePositions={handleUpdatePositions}
                onBeforeDragStart={saveEditorHistory}
                snapMode={snapMode}
                showGhost={showGhost}
                isPlaying={isPlaying}
                currentCount={currentCount}
                fieldWidth={activeFormation.fieldWidth}
                fieldHeight={activeFormation.fieldHeight}
                markingShape={activeFormation.markingShape}
                markingIntervalX={activeFormation.markingIntervalX}
                markingIntervalY={activeFormation.markingIntervalY}
                markingCountX={activeFormation.markingCountX}
                markingCountY={activeFormation.markingCountY}
                blocksX={activeFormation.blocksX ?? 15}
                blocksY={activeFormation.blocksY ?? 15}
                subdivisionsX={activeFormation.subdivisionsX ?? 10}
                subdivisionsY={activeFormation.subdivisionsY ?? 10}
                markerColor={activeFormation.markerColor ?? "#000000"}
                markerSize={activeFormation.markerSize}
                backgroundColor={activeFormation.backgroundColor}
                gridLineColor={activeFormation.gridLineColor}
                gridLineWidth={activeFormation.gridLineWidth}
                gridLineStyle={activeFormation.gridLineStyle}
                subGridLineStyle={activeFormation.subGridLineStyle}
                showGridLines={activeFormation.showGridLines !== false}
                customMarkers={activeFormation.customMarkers || []}
                selectedCustomMarkerId={selectedDesignerMarkerId}
                onSelectCustomMarker={(id) => setSelectedDesignerMarkerId(id)}
                onUpdateMarker={(markerId, x, y) => {
                  saveEditorHistory();
                  const updated = (activeFormation.customMarkers || []).map((m) => {
                    if (m.id === markerId) return { ...m, x, y };
                    return m;
                  });
                  setActiveFormation({
                    ...activeFormation,
                    customMarkers: updated,
                  });
                }}
                snapToGrid={snapToGrid}
                setInstructions={setInstructions}
                memberVariables={selectedSetId ? (memberVariables[selectedSetId] || {}) : {}}
                memberGroups={selectedSetId ? (memberGroupsBySet[selectedSetId] || []) : []}
                memberGroupsBySet={memberGroupsBySet}
                memberVariablesBySet={memberVariables}
                
                // 配置ツール統合
                isAlignActive={isAlignToolActive}
                alignType={alignType}
                alignPointA={alignPointA}
                alignPointB={alignPointB}
                alignPointMid={alignPointMid}
                alignPointCenter={alignPointCenter}
                alignRadius={alignRadius}
                alignStartAngle={alignStartAngle}
                alignEndAngle={alignEndAngle}
                onUpdateAlignPointA={(x, y) => setAlignPointA({ x, y })}
                onUpdateAlignPointB={(x, y) => setAlignPointB({ x, y })}
                onUpdateAlignPointMid={(x, y) => setAlignPointMid({ x, y })}
                onUpdateAlignPointCenter={(x, y) => setAlignPointCenter({ x, y })}
                onUpdateAlignRadius={(r) => setAlignRadius(r)}
                onUpdateAlignStartAngle={(deg) => setAlignStartAngle(deg)}
                onUpdateAlignEndAngle={(deg) => setAlignEndAngle(deg)}
                onToggleAlignMemberId={toggleAlignMemberId}
                alignSelectedMemberIds={alignSelectedMemberIds}
                enableCollisionDetection={enableCollisionDetection}
                onToggleCollisionDetection={() => setEnableCollisionDetection((prev) => !prev)}
              />
            </div>
          </section>

          {/* 右カラム: Personnel & Dot Book */}
          <RightSidebar
            members={members}
            selectedMemberId={selectedMemberId}
            onSelectMember={setSelectedMemberId}
            currentSet={currentSet}
            nextSet={nextSet}
            moveInstructions={moveInstructions}
            currentYardDesc={currentYardDesc}
            setInstructions={setInstructions}
            onAddInstruction={(targetType, targetValue, text) => {
              if (!selectedSetId) return;
              const newInst = {
                id: String(Date.now()),
                targetType,
                targetValue,
                instructionText: text,
              };
              const currentInsts = setInstructions[selectedSetId] || [];
              setSetInstructions({
                ...setInstructions,
                [selectedSetId]: [...currentInsts, newInst],
              });
              setIsDirty(true);
            }}
            onDeleteInstruction={(id) => {
              if (!selectedSetId) return;
              const currentInsts = setInstructions[selectedSetId] || [];
              setSetInstructions({
                ...setInstructions,
                [selectedSetId]: currentInsts.filter((inst) => inst.id !== id),
              });
              setIsDirty(true);
            }}
            onUpdateInstructionText={(id, text) => {
              if (!selectedSetId) return;
              const currentInsts = setInstructions[selectedSetId] || [];
              setSetInstructions({
                ...setInstructions,
                [selectedSetId]: currentInsts.map((inst) =>
                  inst.id === id ? { ...inst, instructionText: text } : inst
                ),
              });
              setIsDirty(true);
            }}
            memberVariables={selectedSetId ? (memberVariables[selectedSetId] || {}) : {}}
            onUpdateMemberVariable={handleUpdateMemberVariable}
            onAutoAssignVariablesFromX={handleAutoAssignVariablesFromX}
            onBatchSetVariables={handleBatchSetVariables}
            onDeleteMember={handleDeleteMember}
            onDeleteAllMembers={handleDeleteAllMembers}
            onEditMember={openEditMemberModal}
            onShowNewMemberModal={openNewMemberModal}
            isRightSidebarOpen={isRightSidebarOpen}
            setIsRightSidebarOpen={setIsRightSidebarOpen}
            memberCustomLabels={memberCustomLabels}
            onUpdateMemberCustomLabel={(memberId, label) => {
              setMemberCustomLabels({ ...memberCustomLabels, [memberId]: label });
              setIsDirty(true);
            }}
            memberGroups={selectedSetId ? (memberGroupsBySet[selectedSetId] || []) : []}
            onUpdateMemberGroups={(groups) => {
              if (selectedSetId) {
                setMemberGroupsBySet((prev) => ({ ...prev, [selectedSetId]: groups }));
                setIsDirty(true);
              }
            }}
            activeTab={activeRightSidebarTab}
            onTabChange={(tab) => setActiveRightSidebarTab(tab)}
            allSetCollisions={allSetCollisions}
            onSelectSet={(setId) => setSelectedSetId(setId)}
            enableCollisionDetection={enableCollisionDetection}
            onToggleCollisionDetection={() => setEnableCollisionDetection((prev) => !prev)}
          />
        </main>
      ) : null}

      {/* --- 新規コンテ作成モーダル --- */}
      {showNewFormationModal && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold font-display text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                <span>新規コンテの作成</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowNewFormationModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFormation} className="space-y-4">
              <div>
                <label className="text-xs text-slate-600 font-semibold block mb-1">コンテ名 (演目タイトル) *</label>
                <input
                  type="text"
                  required
                  value={newFormationTitle}
                  onChange={(e) => setNewFormationTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-600 font-semibold block mb-1">使用楽曲名</label>
                <input
                  type="text"
                  value={newFormationMusic}
                  onChange={(e) => setNewFormationMusic(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-600 font-semibold block mb-1">BPM (テンポ)</label>
                <input
                  type="number"
                  value={newFormationBpm}
                  onChange={(e) => setNewFormationBpm(parseInt(e.target.value) || 120)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-600 font-semibold block mb-1">フィールドテンプレートを選択 *</label>
                <select
                  value={newFormationTemplateId}
                  onChange={(e) => setNewFormationTemplateId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  {fieldTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowNewFormationModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition shadow-md shadow-blue-500/20"
                >
                  作成する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- 新規メンバー追加モーダル --- */}
      {showNewMemberModal && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 mb-4 pb-2 border-b border-slate-200">
              新規部員の追加
            </h3>
            <form onSubmit={handleCreateMember} className="space-y-4">
              <div>
                <label className="text-xs text-slate-600 font-semibold block mb-1">パート *</label>
                <select
                  value={newMemberInstrument}
                  onChange={(e) => handleNewMemberInstrumentChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  {instruments.map((inst) => (
                    <option key={inst} value={inst}>
                      {inst}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-600 font-semibold block mb-1">表示名 *</label>
                <input
                  type="text"
                  required
                  placeholder="例: Fl1"
                  value={newMemberLabel}
                  onChange={(e) => setNewMemberLabel(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono font-bold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  ※同じ楽器が登録されると Fl1, Fl2, Tp1 のように通し番号が自動で振られます。
                </p>
              </div>

              <div>
                <label className="text-xs text-slate-600 font-semibold block mb-1">
                  部員名 <span className="text-slate-400 font-normal">(任意)</span>
                </label>
                <input
                  type="text"
                  placeholder="例: 山田 花子"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-600 font-semibold block mb-1">色分け (カラー) *</label>
                <div className="flex flex-wrap gap-2.5 mt-1.5">
                  {colorPalette.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewMemberColor(color)}
                      className={`w-7 h-7 rounded-full border-2 transition ${
                        newMemberColor === color
                          ? "border-slate-800 scale-110 shadow-lg"
                          : "border-transparent hover:scale-105"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowNewMemberModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition shadow-md shadow-blue-500/20"
                >
                  登録する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- 部員情報編集モーダル --- */}
      {editingMember && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 mb-4 pb-2 border-b border-slate-200 flex justify-between items-center">
              <span>部員情報の編集</span>
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </h3>
            <form onSubmit={handleSaveEditMember} className="space-y-4">
              <div>
                <label className="text-xs text-slate-600 font-semibold block mb-1">パート *</label>
                <select
                  value={editMemberInstrument}
                  onChange={(e) => {
                    const inst = e.target.value;
                    setEditMemberInstrument(inst);
                    if (!editMemberLabel) {
                      setEditMemberLabel(generateNextMemberLabel(inst, members, memberCustomLabels));
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  {instruments.map((inst) => (
                    <option key={inst} value={inst}>
                      {inst}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-600 font-semibold block mb-1">表示名 *</label>
                <input
                  type="text"
                  required
                  placeholder="例: Fl1"
                  value={editMemberLabel}
                  onChange={(e) => setEditMemberLabel(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono font-bold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-600 font-semibold block mb-1">
                  部員名 <span className="text-slate-400 font-normal">(任意)</span>
                </label>
                <input
                  type="text"
                  placeholder="例: 山田 花子"
                  value={editMemberName}
                  onChange={(e) => setEditMemberName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-600 font-semibold block mb-1">色分け (カラー) *</label>
                <div className="flex flex-wrap gap-2.5 mt-1.5">
                  {colorPalette.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setEditMemberColor(color)}
                      className={`w-7 h-7 rounded-full border-2 transition ${
                        editMemberColor === color
                          ? "border-slate-800 scale-110 shadow-lg"
                          : "border-transparent hover:scale-105"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg transition shadow-md"
                >
                  変更を保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- コマ表削除確認モーダル --- */}
      {deleteTargetId !== null && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-200 text-red-600">
              <Trash2 className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-slate-900">コマ表の削除</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              「<strong className="text-slate-800">{deleteTargetTitle || "選択したコマ表"}</strong>」を削除しますか？
              <br />
            </p>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setDeleteTargetId(null);
                  setDeleteTargetTitle("");
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = deleteTargetId;
                  setDeleteTargetId(null);
                  setDeleteTargetTitle("");
                  await executeDeleteFormation(id);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition shadow-md shadow-red-500/20"
              >
                ごみ箱に移動する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- コマ表・音源設定モーダル --- */}
      {showFormationSettingsModal && activeFormation && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg p-6 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 mb-4 shrink-0">
              <h3 className="text-base font-bold font-display text-slate-900 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-blue-600" />
                <span>設定</span>
              </h3>
              <button
                onClick={() => setShowFormationSettingsModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-full transition"
                title="閉じる"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-5 pr-1">
              {/* 基本情報 */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider">楽曲・テンポ</h4>
                <div className="mb-3">
                  <label className="text-[10px] text-slate-500 block mb-1 font-semibold">演目タイトル (題名) *</label>
                  <input
                    type="text"
                    value={activeFormation.title}
                    onChange={(e) => {
                      setActiveFormation({
                        ...activeFormation,
                        title: e.target.value,
                      });
                      setIsDirty(true);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1 font-semibold">曲名 *</label>
                    <input
                      type="text"
                      value={activeFormation.music}
                      onChange={(e) => {
                        setActiveFormation({
                          ...activeFormation,
                          music: e.target.value,
                        });
                        setIsDirty(true);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1 font-semibold">全体テンポ (BPM)</label>
                    <input
                      type="number"
                      value={activeFormation.bpm}
                      onChange={(e) => {
                        setActiveFormation({
                          ...activeFormation,
                          bpm: parseInt(e.target.value) || 120,
                        });
                        setIsDirty(true);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* 音源ファイルの挿入 */}
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1 font-semibold uppercase">
                    音源ファイルのロード (.mp3, .wav)
                  </label>
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={handleAudioUpload}
                      className="block w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-2.5 file:rounded file:border-0 file:text-[10.5px] file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                    />
                    {audioUrl && (
                      <div className="p-2 bg-slate-50 rounded border border-slate-100 text-[10.5px] text-slate-600 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping shrink-0" />
                          <span className="truncate font-mono">
                            {localAudioFile ? localAudioFile.name : "音源ロード済"}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            setAudioUrl("");
                            setLocalAudioFile(null);
                          }}
                          className="text-red-500 hover:text-red-700 text-[10px] font-bold"
                        >
                          解除
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* フィールドテンプレートの再適用 */}
                <div className="pt-3 border-t border-slate-100">
                  <label className="text-[10px] text-slate-500 block mb-1 font-semibold uppercase">
                    フィールドテンプレートを適用
                  </label>
                  <select
                    onChange={(e) => {
                      const tId = e.target.value;
                      if (!tId) return;
                      const chosenTemplate = fieldTemplates.find((t) => t.id === tId);
                      if (chosenTemplate) {
                        const updatedFormState = {
                          ...activeFormation,
                          fieldWidth: chosenTemplate.fieldWidth,
                          fieldHeight: chosenTemplate.fieldHeight,
                          markingShape: chosenTemplate.markingShape,
                          backgroundColor: chosenTemplate.backgroundColor,
                          gridLineColor: chosenTemplate.gridLineColor,
                          gridLineWidth: chosenTemplate.gridLineWidth,
                          gridLineStyle: chosenTemplate.gridLineStyle,
                          subGridLineStyle: chosenTemplate.subGridLineStyle || "solid",
                          showYardLines: chosenTemplate.showYardLines,
                          showYardNumbers: chosenTemplate.showYardNumbers,
                          showGridLines: chosenTemplate.showGridLines,
                          customMarkers: chosenTemplate.customMarkers || [],
                          blocksX: chosenTemplate.blocksX ?? 15,
                          blocksY: chosenTemplate.blocksY ?? 15,
                          subdivisionsX: chosenTemplate.subdivisionsX ?? 10,
                          subdivisionsY: chosenTemplate.subdivisionsY ?? 10,
                          markerColor: chosenTemplate.markerColor ?? "#000000",
                          markerSize: chosenTemplate.markerSize ?? 24,
                        };
                        setActiveFormation(updatedFormState);
                        const styleKey = `drillflow_formation_style_${activeFormation.id}`;
                        localStorage.setItem(styleKey, JSON.stringify({
                          fieldWidth: updatedFormState.fieldWidth,
                          fieldHeight: updatedFormState.fieldHeight,
                          markingShape: updatedFormState.markingShape,
                          backgroundColor: updatedFormState.backgroundColor,
                          gridLineColor: updatedFormState.gridLineColor,
                          gridLineWidth: updatedFormState.gridLineWidth,
                          gridLineStyle: updatedFormState.gridLineStyle,
                          subGridLineStyle: updatedFormState.subGridLineStyle,
                          showYardLines: updatedFormState.showYardLines,
                          showYardNumbers: updatedFormState.showYardNumbers,
                          showGridLines: updatedFormState.showGridLines,
                          customMarkers: updatedFormState.customMarkers,
                          blocksX: updatedFormState.blocksX,
                          blocksY: updatedFormState.blocksY,
                          subdivisionsX: updatedFormState.subdivisionsX,
                          subdivisionsY: updatedFormState.subdivisionsY,
                          markerColor: updatedFormState.markerColor,
                          markerSize: updatedFormState.markerSize,
                        }));
                        setIsDirty(true);
                        setSuccessMessage(`テンプレート「${chosenTemplate.name}」のフィールド設定を反映しました`);
                        setTimeout(() => setSuccessMessage(""), 3000);
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                    defaultValue=""
                  >
                    <option value="" disabled>保存済みテンプレートを選択して反映...</option>
                    {fieldTemplates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-200 mt-4 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (confirm("本当にこのコマ表を削除しますか？削除したデータは復元できません")) {
                    handleDeleteFormation(activeFormation.id);
                    setShowFormationSettingsModal(false);
                  }
                }}
                className="flex items-center gap-1.5 py-2 px-3 text-red-600 hover:bg-red-50 hover:text-red-700 border border-red-200 rounded-lg text-xs font-bold transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>コマ表を削除</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowFormationSettingsModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition"
                >
                  閉じる
                </button>
                <button
                  onClick={async () => {
                    await handleSaveFormation();
                    setShowFormationSettingsModal(false);
                  }}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition shadow-md shadow-blue-500/15"
                >
                  設定を保存して閉じる
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 任意部員選択モーダル */}
      {showAlignMemberSelector && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <span>整列対象部員の任意選択</span>
                <span className="text-xs font-normal text-slate-500">({alignSelectedMemberIds.length}名 選択中)</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAlignMemberSelector(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <input
                type="text"
                placeholder="部員名・パートで検索"
                value={alignMemberSearch}
                onChange={(e) => setAlignMemberSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500"
              />

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-slate-50 p-2 rounded-lg border border-slate-200/60">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setAlignSelectedMemberIds(members.map((m) => m.id))}
                    className="text-blue-600 hover:underline font-bold text-[11px]"
                  >
                    全員選択
                  </button>
                  <button
                    type="button"
                    onClick={() => setAlignSelectedMemberIds([])}
                    className="text-slate-500 hover:underline text-[11px]"
                  >
                    選択クリア
                  </button>
                </div>
                {(() => {
                  const currentAlignGroups = selectedSetId ? (memberGroupsBySet[selectedSetId] || []) : [];
                  if (currentAlignGroups.length === 0) return null;
                  return (
                    <div className="flex flex-wrap items-center gap-1 w-full pt-1 border-t border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold shrink-0">グループで追加:</span>
                      {currentAlignGroups.map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => {
                            const newIds = Array.from(new Set([...alignSelectedMemberIds, ...g.memberIds]));
                            setAlignSelectedMemberIds(newIds);
                          }}
                          className="bg-white border border-blue-300 text-blue-700 hover:bg-blue-50 px-1.5 py-0.5 rounded font-semibold text-[10px] shadow-2xs transition"
                          title={`${g.name}の部員(${g.memberIds.length}名)を選択に追加`}
                        >
                          + {g.name} ({g.memberIds.length}名)
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* 部員チェックボックス一覧 */}
            <div className="max-h-60 overflow-y-auto border border-slate-100 rounded-xl p-2 space-y-1">
              {members
                .filter(
                  (m) =>
                    m.name.toLowerCase().includes(alignMemberSearch.toLowerCase()) ||
                    m.instrument.toLowerCase().includes(alignMemberSearch.toLowerCase())
                )
                .map((member) => {
                  const isChecked = alignSelectedMemberIds.includes(member.id);
                  return (
                    <label
                      key={member.id}
                      className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition select-none ${
                        isChecked ? "bg-blue-50 text-blue-900 font-semibold" : "hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleAlignMemberId(member.id)}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block"
                          style={{ backgroundColor: member.color }}
                        />
                        <span>{member.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                        {member.instrument}
                      </span>
                    </label>
                  );
                })}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAlignMemberSelector(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition shadow-md shadow-blue-500/15"
              >
                決定 ({alignSelectedMemberIds.length}名)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* キーボードショートカット一覧モーダル */}
      {showShortcutsModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 text-white border border-slate-700/80 w-full max-w-lg rounded-2xl p-6 shadow-2xl relative space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-base text-white">キーボードショートカット一覧</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowShortcutsModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-800/80 border border-slate-700/60 p-2.5 rounded-xl flex items-center justify-between">
                <span className="text-slate-300 font-medium">再生 / 一時停止</span>
                <kbd className="bg-slate-700 text-slate-100 font-mono px-2 py-0.5 rounded border border-slate-600 shadow-2xs font-bold text-[11px]">Space</kbd>
              </div>

              <div className="bg-slate-800/80 border border-slate-700/60 p-2.5 rounded-xl flex items-center justify-between">
                <span className="text-slate-300 font-medium">前 / 次のセット</span>
                <div className="flex gap-1 font-mono">
                  <kbd className="bg-slate-700 text-slate-100 px-1.5 py-0.5 rounded border border-slate-600 font-bold text-[11px]">←</kbd>
                  <kbd className="bg-slate-700 text-slate-100 px-1.5 py-0.5 rounded border border-slate-600 font-bold text-[11px]">→</kbd>
                </div>
              </div>

              <div className="bg-slate-800/80 border border-slate-700/60 p-2.5 rounded-xl flex items-center justify-between">
                <span className="text-slate-300 font-medium">元に戻す</span>
                <kbd className="bg-slate-700 text-slate-100 font-mono px-2 py-0.5 rounded border border-slate-600 shadow-2xs font-bold text-[11px]">Ctrl + Z</kbd>
              </div>

              <div className="bg-slate-800/80 border border-slate-700/60 p-2.5 rounded-xl flex items-center justify-between">
                <span className="text-slate-300 font-medium">やり直す</span>
                <kbd className="bg-slate-700 text-slate-100 font-mono px-2 py-0.5 rounded border border-slate-600 shadow-2xs font-bold text-[11px]">Ctrl + Y</kbd>
              </div>

              <div className="bg-slate-800/80 border border-slate-700/60 p-2.5 rounded-xl flex items-center justify-between">
                <span className="text-slate-300 font-medium">コンテ保存</span>
                <kbd className="bg-slate-700 text-slate-100 font-mono px-2 py-0.5 rounded border border-slate-600 shadow-2xs font-bold text-[11px]">Ctrl + S</kbd>
              </div>

              <div className="bg-slate-800/80 border border-slate-700/60 p-2.5 rounded-xl flex items-center justify-between">
                <span className="text-slate-300 font-medium">部員を全員選択</span>
                <kbd className="bg-slate-700 text-slate-100 font-mono px-2 py-0.5 rounded border border-slate-600 shadow-2xs font-bold text-[11px]">Ctrl + A</kbd>
              </div>

              <div className="bg-slate-800/80 border border-slate-700/60 p-2.5 rounded-xl flex items-center justify-between">
                <span className="text-slate-300 font-medium">スナップ ON/OFF</span>
                <kbd className="bg-slate-700 text-slate-100 font-mono px-2 py-0.5 rounded border border-slate-600 shadow-2xs font-bold text-[11px]">G</kbd>
              </div>

              <div className="bg-slate-800/80 border border-slate-700/60 p-2.5 rounded-xl flex items-center justify-between">
                <span className="text-slate-300 font-medium">マーカー コピー / 貼り付け</span>
                <div className="flex gap-1 font-mono">
                  <kbd className="bg-slate-700 text-slate-100 px-1.5 py-0.5 rounded border border-slate-600 font-bold text-[11px]">Ctrl + C</kbd>
                  <kbd className="bg-slate-700 text-slate-100 px-1.5 py-0.5 rounded border border-slate-600 font-bold text-[11px]">Ctrl + V</kbd>
                </div>
              </div>

              <div className="bg-slate-800/80 border border-slate-700/60 p-2.5 rounded-xl flex items-center justify-between">
                <span className="text-slate-300 font-medium">マーカー 削除</span>
                <kbd className="bg-slate-700 text-slate-100 font-mono px-2 py-0.5 rounded border border-slate-600 shadow-2xs font-bold text-[11px]">Delete / BS</kbd>
              </div>

              <div className="bg-slate-800/80 border border-slate-700/60 p-2.5 rounded-xl flex items-center justify-between">
                <span className="text-slate-300 font-medium">選択解除 / 閉じる</span>
                <kbd className="bg-slate-700 text-slate-100 font-mono px-2 py-0.5 rounded border border-slate-600 shadow-2xs font-bold text-[11px]">Esc</kbd>
              </div>

              <div className="bg-slate-800/80 border border-slate-700/60 p-2.5 rounded-xl flex items-center justify-between">
                <span className="text-slate-300 font-medium">ヘルプ表示</span>
                <kbd className="bg-slate-700 text-slate-100 font-mono px-2 py-0.5 rounded border border-slate-600 shadow-2xs font-bold text-[11px]">?</kbd>
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-800 p-3 rounded-xl text-[11px] text-slate-400 space-y-1">
              <p className="font-bold text-slate-300">💡 その他の操作ヒント:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li><span className="font-bold text-slate-200">範囲選択</span>: フィールド上でドラッグすると複数部員を一括選択できます</li>
                <li><span className="font-bold text-slate-200">複数個別選択</span>: <kbd className="bg-slate-700 text-slate-200 px-1 rounded text-[10px]">Shift</kbd> + 部員クリックで追加選択できます</li>
              </ul>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowShortcutsModal(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Synchronized audio element */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          loop
          className="hidden"
        />
      )}
    </div>
  );
}
