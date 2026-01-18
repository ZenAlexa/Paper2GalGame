<div align="center">

# Paper2GalGame 📄💕🎮

**Transform academic papers into an immersive visual novel learning experience**

*論文を美少女ゲームに変身させよう！*

[![WebGAL](https://img.shields.io/badge/Based_on-WebGAL-000?style=flat-square)](https://github.com/OpenWebGAL/WebGAL)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MPL--2.0-000?style=flat-square)](LICENSE)

[English](#english) | [日本語](#japanese) | [中文](#中文)

</div>

---

## ✨ Features

- 📄 **Smart Paper Parsing** - Support PDF/Word/TXT formats with AI-powered content extraction
- 🎭 **Visual Novel Style UI** - Authentic Japanese galgame visual experience
- 🎙️ **Japanese Voice Synthesis** - Real-time TTS with natural Japanese voice
- 🌏 **Multi-language Support** - Text available in Chinese, Japanese, and English
- 💾 **Save System** - Save and continue your learning progress anytime
- 🤖 **AI Script Generation** - Automatically generate engaging dialogue from papers

## 🎭 Characters

| Character | Role | Source |
|-----------|------|--------|
| 綾地宁宁 (Nene) | Host & Guide | SABBAT OF THE WITCH |
| 丛雨 (Murasame) | Comic Relief | Senren*Banka |
| 在原七海 (Nanami) | Q&A | Riddle Joker |
| 因幡巡 (Meguru) | Expert Analysis | SABBAT OF THE WITCH |

## 🚀 Quick Start

### Requirements

- Node.js >= 20.0.0
- Yarn (package manager)

### Installation

```bash
# Clone repository
git clone https://github.com/AdrianWang/Paper2GalGame.git
cd Paper2GalGame

# Install dependencies
yarn install

# Configure environment variables
cp .env.example .env
# Edit .env with your API keys

# Start development server
yarn dev
```

Visit `http://localhost:3000` to start!

### Environment Variables

```bash
# .env
OPENROUTER_API_KEY=your_openrouter_api_key
MINIMAX_API_KEY=your_minimax_api_key
MINIMAX_GROUP_ID=your_group_id
VOICEVOX_URL=http://localhost:50021
```

## 🏗️ Project Structure

```
Paper2GalGame/
├── packages/               # WebGAL Engine (Modified)
│   ├── webgal/             # Main engine (customized)
│   ├── parser/             # Script parser (JSON support)
│   └── server/             # Dev server
│
├── extensions/             # Custom extensions
│   ├── paper-parser/       # PDF/Word parsing
│   ├── tts-service/        # TTS integration
│   ├── script-generator/   # AI script generation
│   └── api/                # API services
│
├── game/                   # Game assets
│   ├── characters/         # Character sprites
│   ├── backgrounds/        # Background images
│   ├── bgm/                # Background music
│   ├── vocal/              # Voice files
│   └── se/                 # Sound effects
│
└── README.md
```

## 🎨 Design

### Visual Style

- 🌸 **Warm Color Palette** - Cherry blossom pink (#FFB7C5) and cream (#FFF5EE)
- 📝 **Rounded Corners** - Soft visual effects
- ✨ **Smooth Animations** - Fade transitions, character entrances
- 🎀 **Fine Details** - Shadows, gradients, blur effects

### Tech Stack

| Feature | Technology | Description |
|---------|------------|-------------|
| Engine | WebGAL (Modified) | Visual novel engine |
| TTS | Minimax Speech-02 | 30+ languages, emotion control |
| Fallback TTS | VOICEVOX | Open source Japanese TTS |
| Paper Parsing | pdf.js + mammoth | PDF/Word parsing |
| AI | Gemini 2.5 Pro/Flash | Script generation (via OpenRouter) |

## 🔧 Development

### Commands

```bash
yarn install      # Install dependencies
yarn dev          # Start development server
yarn build        # Build for production
yarn preview      # Preview production build
```

## 🤝 Contributing

Issues and Pull Requests are welcome!

## 🙏 Acknowledgments

This project is built upon the amazing [WebGAL](https://github.com/OpenWebGAL/WebGAL) visual novel engine. We are grateful to the WebGAL team for their excellent open-source work.

- **[WebGAL](https://github.com/OpenWebGAL/WebGAL)** - A fully open-source web-based visual novel engine
- **[YUZUSOFT](https://www.yuzu-soft.com/)** - Character designs (for development reference only)

## 📄 License

[MPL-2.0 License](LICENSE) (following WebGAL's license)

---

<div align="center">

**Made with 💕 for visual novel lovers**

*If this project helps you, please give it a ⭐ Star!*

[@Adrian_Z_Wang](https://x.com/Adrian_Z_Wang)

</div>

---

<a name="english"></a>
## English

Paper2GalGame transforms academic papers into an immersive Japanese visual novel experience with real-time Japanese voice synthesis. Built on WebGAL engine with AI-powered script generation.

### Key Features

- 📄 Smart paper parsing (PDF/Word/TXT)
- 🎭 Authentic visual novel UI design
- 🎙️ Real-time Japanese TTS
- 🌏 Multi-language text support (CN/JP/EN)
- 💾 Save/Load system
- 🤖 AI-powered dialogue generation

---

<a name="japanese"></a>
## 日本語

Paper2GalGameは学術論文を日本のビジュアルノベル風の没入型学習体験に変換します。WebGALエンジンをベースに、AIによる台本生成機能を搭載しています。

### 特徴

- 📄 スマートな論文解析（PDF/Word/TXT対応）
- 🎭 本格的なビジュアルノベルUIデザイン
- 🎙️ リアルタイム日本語TTS
- 🌏 多言語テキスト対応（中/日/英）
- 💾 セーブ/ロードシステム
- 🤖 AIによる対話生成

---

<a name="中文"></a>
## 中文

Paper2GalGame 将学术论文转化为日式视觉小说风格的沉浸式学习体验，基于 WebGAL 引擎开发，支持 AI 自动生成剧本和实时日语配音。

### 核心功能

- 📄 智能论文解析（PDF/Word/TXT）
- 🎭 正宗视觉小说UI设计
- 🎙️ 实时日语TTS配音
- 🌏 多语言文本支持（中/日/英）
- 💾 存档/读档系统
- 🤖 AI剧本自动生成
