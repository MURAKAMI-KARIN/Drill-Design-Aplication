# マーチングコンテメーカー (Marching Drill Formation Creator)

マーチングバンドの各セット（ドリルフォーメーション）を直感的に作成、編集、ドラッグ＆ドロップ配置、アニメーション再生、および保存ができる、モダンなフルスタックWebアプリケーションです。

---

## 📸 アプリ概要
マーチング指揮者やドリルデザイナーが、PCやタブレットから直感的に部員（ドット）のフォーメーションをデザインし、セット間の歩数・方向を自動で「ドットブック形式」として算出・表示できる設計になっています。

---

## 🛠 使用技術

### フロントエンド
- **React 19 + TypeScript**: 高度な状態管理とタイプセーフな開発
- **Vite**: 超高速なHMR開発ビルド
- **Tailwind CSS v4**: ユーティリティファーストの高度なスタイリング
- **Lucide React**: 美しいアイコンセット

### バックエンド
- **Node.js + Express**: RESTful API の構築
- **Prisma Client**: 高機能なORM

### データベース
- **SQLite**: 軽量・ポータブルなリレーショナルデータベース (`prisma/dev.db`)

---

## 📂 ディレクトリ構成

```bash
project/
├── prisma/                 # データベース / ORM 関連
│   ├── dev.db              # SQLite データベースファイル
│   └── schema.prisma       # Prisma スキーマ定義
├── src/
│   ├── frontend/           # 【プレゼンテーション層（フロントエンド）】
│   │   ├── components/
│   │   │   └── MarchingField.tsx # フィールド描画・ドラッグ＆ドロップコンポーネント
│   │   ├── lib/
│   │   │   └── marchingUtils.ts  # マーチングの歩数・位置計算ロジック
│   │   ├── App.tsx         # メイン画面コンポーネント
│   │   ├── index.css       # グローバルCSS (Tailwind v4)
│   │   ├── main.tsx        # フロントエンドエントリーポイント
│   │   └── types.ts        # 共通TypeScript型定義
│   │
│   └── backend/            # 【ビジネスロジック ＆ データアクセス層（バックエンド）】
│       ├── db/
│       │   └── prisma.ts   # Prisma Client インスタンス
│       ├── routes/         # ルーティング（コントローラー層）
│       │   ├── formationRoutes.ts
│       │   ├── memberRoutes.ts
│       │   ├── setRoutes.ts
│       │   └── positionRoutes.ts
│       ├── services/       # ビジネスロジック層
│       │   ├── formationService.ts
│       │   ├── memberService.ts
│       │   ├── setService.ts
│       │   └── positionService.ts
│       └── repositories/   # データアクセス層（リポジトリパターン）
│           ├── formationRepository.ts
│           ├── memberRepository.ts
│           ├── setRepository.ts
│           └── positionRepository.ts
├── server.ts               # Express サーバー本体（開発環境Viteミドルウェア統合）
├── package.json            # 依存関係定義 & 起動スクリプト
├── tsconfig.json           # TypeScript 設定
└── README.md               # アプリ仕様書・説明書（本ファイル）
```

---

## 🚀 セットアップ ＆ 起動方法

### 1. 依存関係のインストール
プロジェクトのルートディレクトリで、以下を実行してすべてのモジュールをインストールします。
```bash
npm install
```

### 2. データベースの初期セットアップ
PrismaスキーマをSQLiteデータベースに適用し、テーブルを作成すると同時に、Prisma Clientを生成します。
```bash
npx prisma db push
```

### 3. 開発サーバーの起動 (Vite + Express 統合環境)
以下のコマンドで、バックエンドExpressサーバーと、Viteフロントエンド開発サーバーを同一ポート（**3000**）で並行起動します。
```bash
npm run dev
```
ブラウザで [http://localhost:3000](http://localhost:3000) を開くと動作を確認できます。

### 4. 本番ビルド ＆ 起動
プロダクション環境用のコードをビルドし、起動します。
```bash
# ビルド (フロントエンドのコンパイル + バックエンドのesbuildバンドル)
npm run build

# 本番起動
npm run start
```

---

## 🔌 API一覧 (REST API)

### 1. フォーメーション（コンテ）API
- `GET /api/formations`
  - フォーメーション一覧を全取得。
- `GET /api/formations/:id`
  - 特定のフォーメーション詳細（所属する全セット、ポジション、および部員一覧）を取得。
- `POST /api/formations`
  - 新規フォーメーションを作成（最初のセットも自動作成）。
- `DELETE /api/formations/:id`
  - 特定のフォーメーションを削除。
- `POST /api/formations/:id/save`
  - **[一括保存]** フロントエンド上の変更状態（基本情報、セット数、各セットの全ポジション、全部員）をまとめて一括でSQLiteデータベースへ同期。

### 2. セット管理 API
- `GET /api/sets?formationId=:id`
  - 指定フォーメーションに紐づくセット一覧を取得。
- `POST /api/sets`
  - 新規セットを追加。前セットが存在する場合は、部員の座標を引き継ぎます。
- `POST /api/sets/:id/duplicate`
  - 指定したセットの複製を作成（全ドット座標がコピーされます）。
- `DELETE /api/sets/:id`
  - セットの削除（カスケード削除）。

### 3. 部員管理 API
- `GET /api/members`
  - 部員（メンバー）の一覧を取得。
- `POST /api/members`
  - 新規部員の登録（名前、パート、色）。フォーメーション内すべての既存セットへ初期配置（中央）が自動生成されます。
- `DELETE /api/members/:id`
  - 部員を削除。

### 4. 位置情報管理 API
- `GET /api/positions?setId=:id`
  - 指定したセット内のポジション一覧（座標）を取得。
- `POST /api/positions`
  - 個別ポジションの登録・更新。
- `PATCH /api/positions/:id`
  - 特定のポジションの座標（x, y）を更新。

---

## ✨ 必須機能の解説

1. **コンテ管理 ＆ セット管理**: 曲名やテンポ (BPM) の自由な設定と、セットの追加・削除・複製。
2. **フィールド表示 ＆ 配置編集**: 5ヤード刻みの縦ラインやセンターハーフライン、ハッシュマークを備えた美麗なマーチングフィールド。ドット（部員）を滑らかにドラッグ＆ドロップして配置できます。
3. **ゴースト表示**: 「ゴースト」スイッチをオンにすると、次セットのドット位置を半透明でフィールドに重ねて表示し、ドリル全体の整合性を視覚的に高めます。
4. **矢印表示 ＆ ドットブック**:
   - 選択した部員から次のセットへの移動を、フィールド上に赤い矢印で表示。
   - 選択部員について「50ヤードから左に 2.5歩 / フロントハッシュから後ろに 1.2歩」のような超リアルなヤード位置説明を算出。
   - 次セットに向けて「右 3.5歩、前 2.1歩、16カウント」などのドットブック指示（歩数計算）を即時翻訳。
5. **アニメーション**: 再生ボタンで、BPMに応じた滑らかなセット間のカウント移動がスタート。シークバーでも直感的にアニメーションを巻き戻し・早送り可能。
