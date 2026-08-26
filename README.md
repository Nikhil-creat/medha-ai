# 🧠 MEDHA — Agentic Looping AI

**One prompt in, one of three specialists out.** Medha is a single-interface AI assistant that automatically routes every message to the right specialist agent — no manual switching, no separate tabs, no picking a "mode" yourself.

Built solo, end to end, by **Nikhil Chary Sriramoju** (B.Tech Final Year, CSE).

---

## 🚀 Live Demo

> _Add your deployed link here once you push to Vercel/Netlify_
> `https://medha-ai.vercel.app`

---

## 📖 Overview

Most AI chat tools make you choose a mode before you even ask your question — "chat," "search," "code." Medha removes that friction. You type naturally, and an internal router reads your intent and hands the message to the agent best suited to answer it:

| Agent | Role | Triggers on |
|---|---|---|
| 🟠 **Assistant** | General conversation, memory, reasoning | Everyday questions, follow-ups, casual chat |
| 🩷 **Researcher** | Search-style, fact-driven answers | "What is...", "compare...", "find..." |
| 🟢 **Coder** | Code generation + in-browser execution | "write a function...", "fix this bug...", "run this" |

Each response is visibly tagged with the agent that handled it, so the routing logic stays transparent instead of feeling like a black box.

---

## ✨ Features

- **Automatic agent routing** — zero manual mode-switching
- **Live code execution** — JavaScript snippets can run directly in the browser via the built-in `CodeRunner`
- **Persistent chat flow** — smooth scroll, animated message entry, typing indicator
- **Fully responsive** — mobile-first layout that scales cleanly to desktop
- **Dark, focused UI** — distraction-free theme with a single accent color system
- **Built-in "About the builder" panel** — academic background, projects, certifications, job simulations, all in one modal
- **Signature footer** — identity card with direct LinkedIn / GitHub / Email links

---

## 🛠️ Tech Stack

- **React** — component architecture, hooks (`useState`, `useEffect`, `useRef`)
- **Tailwind CSS** — utility-first styling, fully responsive breakpoints
- **lucide-react** — icon system
- **Custom CSS keyframes** — message entry animation, modal transitions, typing dots, hover micro-interactions

No heavy UI framework, no external animation library — every transition is hand-written.

---

## 📂 Project Structure

```
medha-ai/
├── src/
│   ├── App.jsx          # Main app shell, routing logic, layout
│   ├── index.js          # Entry point
│   └── index.css         # Tailwind directives
├── public/
│   └── index.html
├── package.json
└── README.md
```

---

## ⚙️ Getting Started

### Prerequisites
- Node.js (v16+)
- npm

### Installation

```bash
git clone https://github.com/Nikhil-creat/medha-ai.git
cd medha-ai
npm install
npm install lucide-react
```

### Run locally

```bash
npm start
```

App runs at `http://localhost:3000`

### Build for production

```bash
npm run build
```

---

## 🧩 How the Routing Works

Every incoming message is passed through a lightweight intent classifier before being handed to a response handler. The classifier looks for structural and lexical signals (question type, keywords, code-fence presence) and assigns the message to one of the three agents. The UI then renders a small "routed to `<agent>`" tag above the response so the decision is never hidden from the user — a deliberate design choice to keep the system explainable rather than opaque.

---

## 🗺️ Roadmap

- [ ] Persistent chat history (local storage / backend)
- [ ] Real backend LLM integration (currently simulated routing)
- [ ] Voice input support
- [ ] Multi-language responses (Telugu/English)
- [ ] Export chat as PDF

---

## 👤 About the Builder

**NIKHIL CHARY SRIRAMOJU**
B.Tech Final Year — Computer Science & Engineering

- 🔗 LinkedIn: [nikhil-chary-sriramoju](https://in.linkedin.com/in/nikhil-chary-sriramoju-95041b38a)
- 💻 GitHub: [Nikhil-creat](https://github.com/Nikhil-creat)
- 📧 Email: sriramojunikhil66@gmail.com
- 📸 Instagram: [nikhil__sriramoju](https://www.instagram.com/nikhil__sriramoju)

Also check out [**ChurnScope**](https://github.com/Nikhil-creat/churnscope) — an end-to-end customer churn prediction system (synthetic data generation, model comparison, live in-browser risk demo).

---

## 📜 License

This project is open for learning and reference purposes. Feel free to fork and build on it — a star ⭐ on the repo is always appreciated.

---

<p align="center">Built with focus, one agent at a time.</p>
