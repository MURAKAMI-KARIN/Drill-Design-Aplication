export interface Position {
  id?: number;
  memberId: number;
  setId: number;
  x: number; // 0.0 to 1.0 representing percentage on the field
  y: number; // 0.0 to 1.0 representing percentage on the field
}

export interface Set {
  id: number;
  formationId: number;
  number: number;
  counts: number;
  bpm?: number | null;
  positions: Position[];
  memberGroups?: MemberGroup[];
  createdAt?: string;
}

export interface Member {
  id: number;
  name: string;
  instrument: string;
  color: string;
  label?: string;
  variableX?: number; // ユーザーが指定する任意変数 x
  createdAt?: string;
}

export interface MemberGroup {
  id: string;
  name: string;
  memberIds: number[];
  variableX?: number; // グループ共通の変数設定
}

export interface SetInstruction {
  id: string;
  targetType: "all" | "instrument" | "group" | "individual";
  targetValue: string; // e.g. "Trumpet" or "m1,m2" or groupId
  instructionText: string; // e.g. "Build 8 Halt 8" or "レ右4 C正面"
}

export interface CustomMarker {
  id: string;
  x: number;
  y: number;
  shape?: string;
  color?: string;
  label?: string;
}

export interface FieldTemplate {
  id: string; // template_1, template_2, template_3
  name: string;
  fieldWidth: number;
  fieldHeight: number;
  gridSizeX: number;
  gridSizeY: number;
  gridLineWidth: number;
  gridLineStyle: "solid" | "dashed" | "dotted";
  subGridLineStyle?: "solid" | "dashed" | "dotted";
  gridLineColor: string;
  backgroundColor: string;
  showGridLines: boolean;
  markingShape: string;
  customMarkers: CustomMarker[];
  blocksX?: number;
  blocksY?: number;
  subdivisionsX?: number;
  subdivisionsY?: number;
  markerColor?: string;
  markerSize?: number;
}

export interface Formation {
  id: number;
  title: string;
  music: string;
  bpm: number;
  fieldWidth?: number;
  fieldHeight?: number;
  markingShape?: string;
  markingIntervalX?: number;
  markingIntervalY?: number;
  markingCountX?: number;
  markingCountY?: number;
  sets: Set[];
  createdAt?: string;
  // 追加のビジュアルテンプレートプロパティ
  backgroundColor?: string;
  gridLineColor?: string;
  gridLineStyle?: "solid" | "dashed" | "dotted";
  subGridLineStyle?: "solid" | "dashed" | "dotted";
  gridLineWidth?: number;
  showGridLines?: boolean;
  customMarkers?: CustomMarker[];
  blocksX?: number;
  blocksY?: number;
  subdivisionsX?: number;
  subdivisionsY?: number;
  markerColor?: string;
  markerSize?: number;
  memberGroups?: MemberGroup[];
}

export interface DraggingMember {
  memberId: number;
  setId: number;
}

