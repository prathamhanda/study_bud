<div align="center">

# 🎓 StudyBud
<a href="https://elevenfolks.vercel.app">
<img src="https://img.shields.io/badge/StudyBud-Your%20AI%20Study%20Partner-3B82F6?style=for-the-badge&logo=react&logoColor=white" alt="StudyBud" />
</a>

### **Master your curriculum. Generate dynamic video lessons. Ace your exams.**

[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Edge_Functions-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com/)
[![Python](https://img.shields.io/badge/Python-Manim%20Engine-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.manim.community/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.x-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Gemini](https://img.shields.io/badge/Google-Gemini%20AI-8E75B2?style=flat-square&logo=googlebard&logoColor=white)](https://deepmind.google/technologies/gemini/)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

<br />

[🚀 Quick Start](#-quick-start) • [✨ Features](#-feature-highlights) • [📝 Exam Simulators](#-cbse--cuet-simulators) • [🎥 Video Engine](#-automated-manim-video-engine) • [🛠️ Tech Stack](#️-tech-stack)

<br />
</div>

## 🎯 What is StudyBud?

StudyBud is a **comprehensive AI-powered educational ecosystem**. It bridges the gap between static textbooks and hyper-personalized learning by combining an offline-capable React PWA, a React Native mobile app, and a robust Supabase backend. It features **state-of-the-art automated math/science animations** via Python's Manim framework and is powered heavily by **Google Gemini** for semantic AI tutoring.

<table>
<tr>
<td width="50%">

### 👨‍🎓 For Students
- Generate personalized, AI-driven study plans
- Take full-length CBSE & CUET mock exams with real PYQs
- Watch dynamically generated math/physics video lessons
- Chat with "Ranjan Sir" (AI Study Buddy) for semantic Q&A

</td>
<td width="50%">

### 👨‍🏫 For Teachers
- Comprehensive classroom dashboard & student metrics
- Review student weaknesses & AI-generated insights
- Push assignments, mock tests, and announcements
- Monitor daily logs and individual performance

</td>
</tr>
<tr>
<td width="50%">

### 🤖 AI Exam Generation
- Self-healing Edge Functions automatically create missing exam questions
- Strict adherence to CBSE Class 10 & 12 syllabi
- Fallback mechanisms for structured, format-perfect outputs
- Evaluates descriptive answers dynamically

</td>
<td width="50%">

### 🛠️ Study Tools
- Built-in Pomodoro timers & task management
- Flashcard generation & offline IndexedDB storage
- Guided Paper Solvers & voice-based interactive lessons
- Markdown & KaTeX support for complex formulas

</td>
</tr>
</table>

---
## Screenshots
<table>
  <tr>
    <td align="center" width="50%">
      <img src="docs/screenshots/dashboard.png" alt="coming soon" />
      <br />
      <sub><b>Student Dashboard</b> — metrics, upcoming tasks & active plans</sub>
    </td>
    <td align="center" width="50%">
      <img src="docs/screenshots/exam_simulator.png" alt="coming soon" />
      <br />
      <sub><b>Exam Simulator</b> — CBSE/CUET testing with real-time UI</sub>
    </td>
  </tr>
  <tr>
    <td align="center" width="50%">
      <img src="docs/screenshots/video_engine.png" alt="coming soon" />
      <br />
      <sub><b>Video Lessons</b> — dynamically generated Manim animations</sub>
    </td>
    <td align="center" width="50%">
      <img src="docs/screenshots/teacher_panel.png" alt="coming soon" />
      <br />
      <sub><b>Teacher Portal</b> — classroom insights & student progression</sub>
    </td>
  </tr>
  <tr>
    <td align="center" colspan="2">
      <img src="docs/screenshots/ai_buddy.png" alt="coming soon" />
      <br />
      <sub><b>Ranjan Sir AI</b> — context-aware multimodal study buddy</sub>
    </td>
  </tr>
</table>

## 🚀 Quick Start

StudyBud is a monorepo containing a Web App, a Mobile App, and a heavily customized Dockerized Backend for Video Generation. 

```bash
# 1. Clone the repository
git clone https://github.com/prathamhanda/study_bud.git && cd study_bud

# 2. Configure environment
cp env.template .env
# Edit .env with your Supabase keys, Gemini API keys, etc.

# 3. Start the Web App (Vite + React)
npm install
npm run dev

# 4. Start the Video Generation Backend (Docker required)
# This runs the Manim & FFmpeg pipeline on port 3001
docker compose up -d --build

# 5. Start the Mobile App (Expo)
cd studybud-mobile
npm install
npx expo start
```

Web app available at **http://localhost:5173**. Video Gen API at **http://localhost:3001**. 

---

## 🛠️ Run it locally

1. **Get the code**
   ```bash
   git clone https://github.com/prathamhanda/study_bud.git
   cd study_bud
   ```

2. **Set up environment**
   A `.env` file already exists in this repo with the required keys (Supabase, Gemini, etc.).  
   If you're starting fresh, copy `env.template` to `.env` and fill in your own keys.

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Start the web app**
   ```bash
   npm run dev
   ```
   Open **http://localhost:5173**

5. **Start the video backend (optional — for AI-generated video lessons)**
   ```bash
   npm run serve-gen
   ```
   This runs on **http://localhost:3001**

6. **(Optional) Run the mobile app**
   ```bash
   cd studybud-mobile
   npm install
   npx expo start
   ```

---

## 🔐 Test login credentials

There are **no hardcoded demo accounts** in this repo — authentication uses Supabase (email/password or Google Sign-In).

To create a test account:
1. Open the app at **http://localhost:5173**
2. Click **Sign up** and create an account with any email + password
3. Confirm your email (if required), then log in

To make a test account an **admin/teacher**, set the `is_admin` flag to `true` in the `user_profiles` table in your Supabase dashboard for that user.

---

## ✨ Feature Highlights

<table>
<tr>
<td align="center" width="20%">
<h3>📝</h3>
<b>Simulators</b><br/>
<sub>CBSE & CUET • 18 Subjects • Auto AI Fallback</sub>
</td>
<td align="center" width="20%">
<h3>🎥</h3>
<b>Manim Videos</b><br/>
<sub>Python-generated • Formula animations • Dockerized</sub>
</td>
<td align="center" width="20%">
<h3>🤖</h3>
<b>AI Buddy</b><br/>
<sub>Ranjan Sir • Voice/Text • Context-aware parsing</sub>
</td>
<td align="center" width="20%">
<h3>👨‍🏫</h3>
<b>Teacher UI</b><br/>
<sub>Analytics • Class tracking • Resource sharing</sub>
</td>
<td align="center" width="20%">
<h3>⚡</h3>
<b>PWA & Offline</b><br/>
<sub>IndexedDB caching • Service Workers • Mobile App</sub>
</td>
</tr>
</table>

---

## 📝 CBSE & CUET Simulators

Our mock exam engine is one of the most robust systems in the project, entirely driven by **Supabase Edge Functions** and Python ingestion pipelines.

### Comprehensive Coverage (18 Subjects Fully Configured)
- **Class 10 (Secondary):** Mathematics (Basic/Standard), Science, Social Science, English, Hindi.
- **Class 12 (Senior Secondary):** Physics, Chemistry, Math, Biology, Accountancy, Business Studies, Economics, Computer Science, Pol Science, History, Geo, Psychology, Sociology.

### AI Fallback & Self-Healing Pools
- **Auto-pool creation:** If a student requests a paper and the DB lacks questions, the system invokes Gemini via Edge Functions to bootstrap a new high-quality pool.
- **Section-level fallback:** Fills specific exact blueprint gaps (e.g., "Missing 2 case-study questions for Physics").
- **Retry & Validation:** 3 retry attempts per batch with lenient mapping for malformed AI JSON. 
- **Grounded Generation:** Enforces strict adherence to CBSE syllabi.

---

## 🎥 Automated Manim Video Engine

Creating high-quality math animations usually takes hours. StudyBud automates this completely.

- **Stack:** Node.js (Express) spawning Python (`manimcommunity/manim`) processes.
- **Workflow:** 
  1. User requests a concept video via Web UI.
  2. Edge function structures a script.
  3. Node.js backend queues a generation task.
  4. Python Manim renders the formulas and shapes to `.mp4`.
  5. File is served securely back to the frontend video player.
- **Deployment:** Packaged cleanly within a `Dockerfile` maintaining FFmpeg, LaTeX, and Python dependencies. 

---

## 🤖 AI-Powered Features

StudyBud deeply integrates **Google Gemini AI** and OpenAI (legacy/flex) across the platform:

| Feature | Description |
|---------|-------------|
| **Ranjan Sir (Study Buddy)** | A persistent conversational UI that answers syllabus questions, formats code/math via KaTeX, and remembers context. |
| **Guided Paper Solver** | Step-by-step interactive resolution of complex exam papers instead of just providing an answer key. |
| **Curriculum Generation** | Monthly/Weekly breakdown of syllabus tailored to the student's exam date. |
| **Teacher AI Insights** | Scans class performance arrays and generates actionable text reports for educators predicting weakness areas. |

---

## 🧭 Application Structure

The platform uses a unified routing system tailored for different roles:

| Section | Capabilities |
|----------|----------|
| **`/curriculum`** | View syllabus, generate timeline, track completion. |
| **`/cbse-simulator`** | Configure papers, take exams, view AI-graded results. |
| **`/ai-buddy`** | Chat with Ranjan Sir, review uploaded notes context. |
| **`/teacher`** | Teacher isolated portal (Overview, Students, Daily Logs). |
| **`/tools`** | Pomodoro timers, To-do lists, Flashcards. |

---

## 📖 Documentation

<details>
<summary><b>🗂️ Project Architecture</b></summary>

```
StudyBud/
├── 📦 package.json          # Vite + React app dependencies
├── 📂 src/                  # Web App Frontend
│   ├── components/          # Reusable UI (Navbar, Inputs, Loaders)
│   ├── pages/               # Route endpoints (ExamSimulator, Dashboard)
│   ├── contexts/            # React Auth & State context
│   ├── hooks/               # useToast, useOfflineStorage
│   └── lib/                 # API Clients (Supabase, OpenAI, Video API)
│
├── 📂 supabase/             # Backend Infrastructure
│   ├── functions/           # Serverless Deno Edge Functions
│   │   ├── assemble-papers/
│   │   ├── build-question-pool/
│   │   └── generate-study-plan/
│   └── migrations/          # PostgreSQL Schema & RLS policies
│
├── 📂 scripts/              # Video Server & Data Pipelines
│   ├── server.ts            # Node.js backend for video rendering
│   └── generate-manim-video.ts
│
├── 📂 manim_engine/         # Python Animation Logic
│   ├── scene.py             # Base manim configuration
│   └── generator.py
│
├── 📂 studybud-mobile/      # React Native / Expo Application
│   └── app/                 # Expo Router tabs and screens
│
├── 🐳 docker-compose.yml    # Video Server Orchestration
└── 🐳 Dockerfile            # Manim + Node.js Environment container
```
</details>

<details>
<summary><b>🔐 Environment Variables</b></summary>

Create a `.env` file in the root based on `env.template`:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_admin_key # Required ONLY for backend Video server

# AI & Media Config
VITE_GEMINI_API_KEY=your_google_gemini_key
VITE_OPENAI_API_KEY=your_openai_key

# Video Server 
VITE_VIDEO_GEN_URL=http://localhost:3001/api/generate
```
</details>

<details>
<summary><b>📜 Available Scripts & Tooling</b></summary>

| Command | What it does |
|---------|--------------|
| `npm run dev` | Starts the Vite React frontend |
| `npm run build` | Compiles PWA for production |
| `npm run serve-gen` | Starts the local Video Generation backend |
| `npm run generate-video` | Manually triggers the Manim Python pipeline |
| `supabase start` | (Supabase CLI) Boots local Postgres & Edge Functions |

</details>

<details>
<summary><b>🎨 UI & Styling</b></summary>

The UI features a unique "**Neo-Brutalism**" and bold aesthetic:
- **Tailwind Custom Config**: Heavy bold borders (`border-4 border-black`), offset hard shadows (`shadow-[4px_4px_0_0_#000]`), and high contrast colors (`neo-accent`, `neo-secondary`).
- **Framer Motion**: Page transitions, modal spring animations, and interactable hover effects.
- **Math Rendering**: Full `react-katex` integration for safely displaying LaTeX equations out of AI streams.

</details>

---

## 🛠️ Tech Stack

<table>
<tr>
<th>Frontend (Web & Mobile)</th>
<th>Backend & Edge</th>
<th>Video & Data Ops</th>
</tr>
<tr>
<td>

- React 18 & Vite
- React Native (Expo)
- Tailwind CSS 3
- React Router DOM
- Framer Motion
- React-KaTeX
- Vite PWA
- IndexedDB (idb)

</td>
<td>

- Supabase (Postgres)
- Supabase Auth (JWT)
- Supabase Edge Functions (Deno)
- Node.js & Express
- Google Gemini API
- OpenAI API

</td>
<td>

- Python 3.10+
- Manim (Community Edition)
- FFmpeg & LaTeX
- Docker & Docker Compose
- Puppeteer / BeautifulSoup (Scraping)
- pdf-parse & Tesseract.js (OCR)

</td>
</tr>
</table>

---

## 🤝 Contributing

We welcome contributions to expand the CBSE/CUET pipelines or improve the UI!

1. **Fork** the repository
2. **Create** your feature branch: `git checkout -b feature/NewSimulator`
3. **Commit** your changes: `git commit -m 'Add NewSimulator'`
4. **Push** to the branch: `git push origin feature/NewSimulator`
5. **Open** a Pull Request

---

## 🙏 Acknowledgments

- [Supabase](https://supabase.com/) — For incredible Backend-as-a-Service architecture.
- [Manim Community](https://www.manim.community/) — For the legendary mathematical animation engine.
- [Google Gemini](https://deepmind.google/technologies/gemini/) — Powering the core cognitive logic.

---

<div align="center">

**Engineered with ❤️ for the future of education**

[⬆ Back to top](#-studybud)

</div>
