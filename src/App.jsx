import { useState, useRef, useEffect } from "react";
import { Send, Terminal, Github, Linkedin, Mail, Loader2, Play, Brain, Code2, Search, User, X, Award, GraduationCap, ExternalLink, Instagram } from "lucide-react";

const ACHIEVEMENTS = {
  academic: [{ label: "CGPA", value: "6.55" }, { label: "Year", value: "Final Year, CSE" }],
  simulations: [
    "Working as a Software Engineer at a Start Up — Forage",
    "Technology Consulting Simulation — PwC",
    "Cyber Security Consulting Simulation — PwC",
    "Automation AI Accelerator: Co-pilot to Autonomous Agent — Datacom",
    "Cyber Security Global Virtual Internship — Clifford Chance",
    "Cyber Security Operations Job Simulation — Datacom",
    "Data Science Job Simulation — British Airways",
    "Data and Technology Transactions Job Simulation — Latham & Watkins",
  ],
  courses: [
    "IT Forensic Analyst — NASSCOM / Skill India",
    "Product Manager - Web & Mobile — NASSCOM / Skill India",
    "Cloud Infrastructure Analyst — NASSCOM / Skill India",
    "Analyst Endpoint Security-Cybersecurity — NASSCOM / Skill India",
    "Blockchain Architect — NASSCOM / Skill India",
    "Data Analytics Internship — Thiranex",
    "Industry 4.0 Robotics Systems (90 hrs) — Reliance Foundation",
    "Mastering Power BI — PHN Technology",
    "How to Get a Job — UNICEF Yuwaah",
  ],
  projects: [
    { name: "Medha — Agentic Looping AI", desc: "this app: router + assistant/coder/researcher agents" },
    { name: "ChurnScope", desc: "ML churn prediction, 0.80 ROC-AUC, 0.79 recall", url: "https://github.com/Nikhil-creat/churnscope" },
  ],
};

const ROUTER_PROMPT = `You are a routing classifier for an agentic system called Medha.
Given the user's request, respond with ONLY one word — no punctuation, no explanation:
- "coder" — writing, editing, explaining, or debugging code
- "researcher" — looking something up, current events, comparing options, summarizing info from the web
- "assistant" — reminders, tasks, personal facts/preferences, or general conversation
Respond with exactly one of: coder, researcher, assistant`;

const PROMPTS = {
  assistant: `You are Medha's personal assistant agent. Help with tasks, reminders, and remembered facts/preferences using your memory tools, and otherwise have a helpful conversation.
Use remember/recall to persist durable facts the user shares. When done, reply with a normal text message.`,
  researcher: `You are Medha's research agent. Use web search to gather current, accurate information, then synthesize it into a clear, concise answer. Prefer 2-4 searches for most questions. Always paraphrase in your own words rather than quoting sources at length.`,
  coder: `You are Medha's coding agent. Write clean, correct, well-commented code and explain your approach briefly. If the user's request is naturally solved in JavaScript, write it as a single runnable snippet in a \`\`\`javascript fenced block so it can be executed in-browser. For other languages, explain how to run it locally.`,
};

const MODE_META = {
  assistant: { label: "assistant", color: "text-amber-400", border: "border-amber-500/30", icon: Brain },
  researcher: { label: "researcher", color: "text-fuchsia-400", border: "border-fuchsia-500/30", icon: Search },
  coder: { label: "coder", color: "text-emerald-400", border: "border-emerald-500/30", icon: Code2 },
};

const REMEMBER_TOOL = {
  name: "remember",
  description: "Save a durable fact or preference for later (key/value).",
  input_schema: {
    type: "object",
    properties: { key: { type: "string" }, value: { type: "string" } },
    required: ["key", "value"],
  },
};
const RECALL_TOOL = {
  name: "recall",
  description: "Retrieve a previously saved fact by key.",
  input_schema: {
    type: "object",
    properties: { key: { type: "string" } },
    required: ["key"],
  },
};

async function callClaude({ system, tools, messages, maxTokens = 1024 }) {
  const body = {
    model: "claude-sonnet-4-6",
    max_tokens: maxTokens,
    messages,
  };
  if (system) body.system = system;
  if (tools) body.tools = tools;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`API error ${res.status}: ${errText}`);
  }
  return res.json();
}

async function classifyIntent(userMessage) {
  const data = await callClaude({
    system: ROUTER_PROMPT,
    messages: [{ role: "user", content: userMessage }],
    maxTokens: 10,
  });
  const text = (data.content.find((b) => b.type === "text")?.text || "").trim().toLowerCase();
  if (text.includes("coder")) return "coder";
  if (text.includes("researcher")) return "researcher";
  return "assistant";
}

async function runMemoryDispatch(name, input) {
  try {
    if (name === "remember") {
      await window.storage.set(`mem:${input.key}`, input.value, false);
      return `Saved '${input.key}'.`;
    }
    if (name === "recall") {
      const result = await window.storage.get(`mem:${input.key}`, false);
      return result ? result.value : `Nothing saved under '${input.key}'.`;
    }
    return "Unknown tool.";
  } catch (e) {
    return `Nothing saved under '${input.key}'.`;
  }
}

async function runAssistantLoop(history) {
  let messages = [...history];
  for (let i = 0; i < 8; i++) {
    const data = await callClaude({
      system: PROMPTS.assistant,
      tools: [REMEMBER_TOOL, RECALL_TOOL],
      messages,
    });
    const toolUses = data.content.filter((b) => b.type === "tool_use");
    messages.push({ role: "assistant", content: data.content });

    if (toolUses.length === 0) {
      const text = data.content.filter((b) => b.type === "text").map((b) => b.text).join("");
      return text;
    }

    const toolResults = [];
    for (const call of toolUses) {
      const result = await runMemoryDispatch(call.name, call.input);
      toolResults.push({ type: "tool_result", tool_use_id: call.id, content: String(result) });
    }
    messages.push({ role: "user", content: toolResults });
  }
  return "(Stopped: hit loop limit without a final answer.)";
}

async function runResearcherTurn(history) {
  const data = await callClaude({
    system: PROMPTS.researcher,
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    messages: history,
    maxTokens: 1500,
  });
  const text = data.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
  return text || "(No answer produced.)";
}

async function runCoderTurn(history) {
  const data = await callClaude({
    system: PROMPTS.coder,
    messages: history,
    maxTokens: 1500,
  });
  const text = data.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  return text || "(No answer produced.)";
}

function extractJsBlock(text) {
  const match = text.match(/```(?:javascript|js)\n([\s\S]*?)```/i);
  return match ? match[1] : null;
}

function CodeRunner({ code }) {
  const [output, setOutput] = useState(null);
  const [error, setError] = useState(null);

  const run = () => {
    setError(null);
    setOutput(null);
    const logs = [];
    const fakeConsole = { log: (...args) => logs.push(args.map(String).join(" ")) };
    try {
      // eslint-disable-next-line no-new-func
      const fn = new Function("console", code);
      fn(fakeConsole);
      setOutput(logs.length ? logs.join("\n") : "(ran with no console output)");
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="mt-2">
      <button
        onClick={run}
        className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 transition"
      >
        <Play size={12} /> Run in browser
      </button>
      {output !== null && (
        <pre className="mt-2 text-xs font-mono bg-black/40 border border-zinc-700 rounded p-3 text-zinc-300 whitespace-pre-wrap">{output}</pre>
      )}
      {error && (
        <pre className="mt-2 text-xs font-mono bg-red-950/40 border border-red-800 rounded p-3 text-red-300 whitespace-pre-wrap">Error: {error}</pre>
      )}
    </div>
  );
}

function MessageBubble({ msg }) {
  const meta = msg.mode ? MODE_META[msg.mode] : null;
  const Icon = meta?.icon;
  const jsCode = msg.role === "medha" ? extractJsBlock(msg.text) : null;

  if (msg.role === "user") {
    return (
      <div className="flex justify-end msg-enter">
        <div className="max-w-[85%] bg-zinc-800 text-zinc-100 rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm shadow-[0_1px_0_rgba(255,255,255,0.03)_inset]">
          {msg.text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start msg-enter">
      <div className="max-w-[85%]">
        {meta && (
          <div className={`flex items-center gap-1.5 text-[11px] font-mono mb-1.5 ${meta.color}`}>
            <Icon size={12} /> routed to {meta.label}
          </div>
        )}
        <div className={`rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm bg-zinc-900 border ${meta?.border || "border-zinc-700"} text-zinc-200 whitespace-pre-wrap transition-colors shadow-[0_2px_12px_rgba(0,0,0,0.25)]`}>
          {msg.loading ? (
            <span className="flex items-center gap-2.5 text-zinc-400">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-current typing-dot" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-current typing-dot" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-current typing-dot" style={{ animationDelay: "300ms" }} />
              </span>
              {msg.loadingLabel || "thinking..."}
            </span>
          ) : (
            <>
              {msg.text}
              {jsCode && <CodeRunner code={jsCode} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function NSMonogram() {
  return (
    <a
      href="https://in.linkedin.com/in/nikhil-chary-sriramoju-95041b38a"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Nikhil Chary Sriramoju"
      className="fixed top-3 right-3 z-30 w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-900/70 backdrop-blur border border-zinc-800 text-zinc-500 hover:text-cyan-300 hover:border-zinc-700 transition-colors"
    >
      <span className="font-mono text-[11px] font-semibold tracking-tight">NS</span>
    </a>
  );
}

function SiteFooter({ onAbout }) {
  const linkClass = "text-zinc-400 hover:text-cyan-300 transition-colors text-[13px]";
  const agents = [
    { label: "assistant", color: "bg-amber-400" },
    { label: "researcher", color: "bg-fuchsia-400" },
    { label: "coder", color: "bg-emerald-400" },
  ];
  const contact = [
    { icon: Linkedin, label: "LinkedIn", value: "nikhil-chary-sriramoju", href: "https://in.linkedin.com/in/nikhil-chary-sriramoju-95041b38a" },
    { icon: Github, label: "GitHub", value: "Nikhil-creat", href: "https://github.com/Nikhil-creat" },
    { icon: Mail, label: "Email", value: "sriramojunikhil66@gmail.com", href: "mailto:sriramojunikhil66@gmail.com" },
  ];

  return (
    <footer className="relative mt-auto bg-[#060910]">
      <div className="h-px w-full bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />

      <div className="relative max-w-3xl mx-auto px-5 pt-12 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-[1.1fr_1fr] gap-10 sm:gap-8">
          {/* Identity card */}
          <div className="rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900/60 to-transparent p-5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-400 to-fuchsia-500 flex items-center justify-center font-mono font-extrabold text-sm text-black mb-4">
              NS
            </div>
            <div className="text-lg font-bold tracking-tight text-white mb-1">
              NIKHIL CHARY SRIRAMOJU
            </div>
            <p className="text-[13px] font-mono text-cyan-400 mb-4">
              B.Tech Final Year · CSE Student
            </p>
            <div className="space-y-2.5">
              {contact.map(({ icon: Icon, label, value, href }) => (
                <a
                  key={label}
                  href={href}
                  target={href.startsWith("mailto:") ? undefined : "_blank"}
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 group"
                >
                  <span className="w-7 h-7 flex items-center justify-center rounded-lg border border-zinc-800 text-zinc-500 group-hover:text-cyan-300 group-hover:border-cyan-500/40 transition-colors flex-shrink-0">
                    <Icon size={13} />
                  </span>
                  <span className="text-[12px] leading-tight">
                    <span className="block text-zinc-600 font-mono text-[10px] uppercase tracking-wide">{label}</span>
                    <span className="text-zinc-300 group-hover:text-cyan-300 transition-colors break-all">{value}</span>
                  </span>
                </a>
              ))}
            </div>
          </div>

          {/* Product + nav */}
          <div className="flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-cyan-300 font-mono font-bold text-xl tracking-tight mb-3">
                <Terminal size={18} />
                MEDHA
              </div>
              <p className="text-[13px] text-zinc-500 leading-relaxed mb-4">
                One prompt in, one of three specialists out — memory, research, or code —
                routed automatically, no manual switching.
              </p>
              <div className="flex items-center gap-3 font-mono text-[11px] text-zinc-500 mb-6">
                {agents.map((a) => (
                  <span key={a.label} className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${a.color}`} />
                    {a.label}
                  </span>
                ))}
              </div>
            </div>
            <ul className="space-y-2.5">
              <li><button onClick={onAbout} className={linkClass}>About the builder</button></li>
              <li><a href="https://github.com/Nikhil-creat/churnscope" target="_blank" rel="noopener noreferrer" className={linkClass}>ChurnScope (ML project)</a></li>
              <li><a href="https://github.com/Nikhil-creat" target="_blank" rel="noopener noreferrer" className={linkClass}>Full portfolio</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-5 border-t border-zinc-800/70 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
          <span className="text-[11px] font-mono text-zinc-600">
            © {new Date().getFullYear()} Medha — built by{" "}
            <span className="text-cyan-400/80">Nikhil Chary Sriramoju</span>
          </span>
          <span className="text-[10px] font-mono text-zinc-700 tracking-wide">
            v3.0 web · agentic looping AI
          </span>
        </div>
      </div>
    </footer>
  );
}

function AboutPanel({ onClose }) {
  return (
    <div className="fixed inset-0 z-30 flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-sm fade-enter" onClick={onClose}>
      <div
        className="bg-[#10151d] border border-zinc-700 rounded-2xl max-w-lg w-full max-h-[75vh] overflow-y-auto p-6 modal-enter"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-cyan-300 font-mono font-bold">
            <User size={18} /> Nikhil Chary Sriramoju
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
            <X size={18} />
          </button>
        </div>
        <p className="text-xs text-zinc-500 font-mono mb-5">BTech Final Year · Computer Science & Engineering</p>

        <div className="flex items-center gap-1.5 text-xs font-mono text-amber-400 mb-2">
          <GraduationCap size={13} /> academic
        </div>
        <div className="flex gap-4 mb-5 text-sm font-mono">
          {ACHIEVEMENTS.academic.map((a) => (
            <div key={a.label}>
              <span className="text-zinc-500">{a.label}: </span>
              <span className="text-zinc-200">{a.value}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 mb-2">
          <Code2 size={13} /> projects
        </div>
        <div className="space-y-1.5 mb-5">
          {ACHIEVEMENTS.projects.map((p) => (
            <div key={p.name} className="text-sm">
              {p.url ? (
                <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-cyan-300 hover:underline inline-flex items-center gap-1">
                  {p.name} <ExternalLink size={11} />
                </a>
              ) : (
                <span className="text-zinc-200">{p.name}</span>
              )}
              <div className="text-xs text-zinc-500">{p.desc}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-1.5 text-xs font-mono text-fuchsia-400 mb-2">
          <Award size={13} /> job simulations (forage)
        </div>
        <ul className="text-xs text-zinc-400 space-y-1 mb-5 list-disc list-inside">
          {ACHIEVEMENTS.simulations.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>

        <div className="flex items-center gap-1.5 text-xs font-mono text-amber-400 mb-2">
          <Award size={13} /> certifications & courses
        </div>
        <ul className="text-xs text-zinc-400 space-y-1 mb-5 list-disc list-inside">
          {ACHIEVEMENTS.courses.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>

        <div className="pt-3 border-t border-zinc-800">
          <div className="text-[10px] font-mono uppercase tracking-wide text-zinc-500 mb-2">Follow / Contact</div>
          <div className="flex items-center gap-3 text-zinc-400">
            <a href="https://github.com/Nikhil-creat" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-300 transition" aria-label="GitHub"><Github size={16} /></a>
            <a href="https://in.linkedin.com/in/nikhil-chary-sriramoju-95041b38a" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-300 transition" aria-label="LinkedIn"><Linkedin size={16} /></a>
            <a href="https://www.instagram.com/nikhil__sriramoju" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-300 transition" aria-label="Instagram"><Instagram size={16} /></a>
            <a href="mailto:sriramojunikhil66@gmail.com" className="hover:text-cyan-300 transition" aria-label="Email"><Mail size={16} /></a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MedhaApp() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [histories, setHistories] = useState({ assistant: [], researcher: [], coder: [] });
  const [showAbout, setShowAbout] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setBusy(true);

    setMessages((m) => [...m, { role: "user", text }]);
    const loadingId = Date.now();
    setMessages((m) => [...m, { role: "medha", loading: true, loadingLabel: "routing...", id: loadingId }]);

    try {
      const mode = await classifyIntent(text);
      setMessages((m) =>
        m.map((msg) => (msg.id === loadingId ? { ...msg, loadingLabel: `${mode} agent working...`, mode } : msg))
      );

      const newHistory = [...histories[mode], { role: "user", content: text }];
      let reply;
      if (mode === "assistant") reply = await runAssistantLoop(newHistory);
      else if (mode === "researcher") reply = await runResearcherTurn(newHistory);
      else reply = await runCoderTurn(newHistory);

      setHistories((h) => ({ ...h, [mode]: [...newHistory, { role: "assistant", content: reply }] }));
      setMessages((m) =>
        m.map((msg) => (msg.id === loadingId ? { role: "medha", text: reply, mode } : msg))
      );
    } catch (e) {
      setMessages((m) =>
        m.map((msg) => (msg.id === loadingId ? { role: "medha", text: `Error: ${e.message}` } : msg))
      );
    } finally {
      setBusy(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0e14] text-zinc-100 flex flex-col font-sans relative">
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-60"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(34,211,238,0.06), transparent 60%)",
        }}
      />
      <style>{`
        @keyframes msgIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .msg-enter { animation: msgIn 0.32s cubic-bezier(0.22,1,0.36,1) both; }
        @keyframes modalIn { from { opacity: 0; transform: translateY(10px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .modal-enter { animation: modalIn 0.28s cubic-bezier(0.22,1,0.36,1) both; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .fade-enter { animation: fadeIn 0.2s ease-out both; }
        @keyframes pulseRing { 0%,100% { opacity: 0.6; } 50% { opacity: 1; } }
        .pulse-dot { animation: pulseRing 2s ease-in-out infinite; }
        @keyframes typingDot { 0%,60%,100% { opacity: 0.3; transform: translateY(0); } 30% { opacity: 1; transform: translateY(-2px); } }
        .typing-dot { animation: typingDot 1.1s ease-in-out infinite; }
        * { scrollbar-width: thin; scrollbar-color: #27272a transparent; }
      `}</style>
      {showAbout && <AboutPanel onClose={() => setShowAbout(false)} />}
      <NSMonogram />
      {/* Header */}
      <header className="border-b border-zinc-800 bg-[#0a0e14]/90 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-5 py-3.5 sm:py-4 flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 text-cyan-300 font-mono font-bold text-base sm:text-lg tracking-tight">
            <Terminal size={19} className="pulse-dot" />
            MEDHA
          </div>
          <span className="hidden sm:inline text-zinc-500 text-xs font-mono">Agentic Looping AI · v3.0 web</span>
          <button
            onClick={() => setShowAbout(true)}
            className="ml-1 sm:ml-2 flex items-center gap-1.5 text-[11px] sm:text-xs font-mono px-2 sm:px-2.5 py-1 rounded-full border border-zinc-700 text-zinc-400 hover:border-cyan-500/50 hover:text-cyan-300 active:scale-95 transition-all"
          >
            <User size={12} /> <span className="hidden xs:inline sm:inline">about the builder</span>
          </button>
          <div className="ml-auto flex items-center gap-2.5 sm:gap-3 text-zinc-500">
            <a href="https://github.com/Nikhil-creat" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-300 hover:-translate-y-0.5 transition-all">
              <Github size={16} />
            </a>
            <a href="https://in.linkedin.com/in/nikhil-chary-sriramoju-95041b38a" target="_blank" rel="noopener noreferrer" className="hidden sm:inline-block hover:text-cyan-300 hover:-translate-y-0.5 transition-all">
              <Linkedin size={16} />
            </a>
            <a href="https://www.instagram.com/nikhil__sriramoju" target="_blank" rel="noopener noreferrer" className="hidden sm:inline-block hover:text-cyan-300 hover:-translate-y-0.5 transition-all">
              <Instagram size={16} />
            </a>
            <a href="mailto:sriramojunikhil66@gmail.com" className="hover:text-cyan-300 hover:-translate-y-0.5 transition-all">
              <Mail size={16} />
            </a>
          </div>
        </div>
      </header>

      {/* Chat area */}
      <main ref={scrollRef} className="relative z-[1] flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-5 py-6 flex flex-col gap-4">
          {messages.length === 0 && (
            <div className="text-center py-16">
              <div className="text-cyan-300 font-mono text-2xl font-bold mb-2">MEDHA</div>
              <p className="text-zinc-500 text-sm max-w-sm mx-auto">
                One AI, three modes. Ask it to remember something, write code, or research a topic —
                it routes itself automatically.
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-5">
                {["Remember I like chai", "Write a JS function to reverse a string", "What's the latest AI news"].map((ex) => (
                  <button
                    key={ex}
                    onClick={() => setInput(ex)}
                    className="text-xs font-mono border border-zinc-700 rounded-full px-3 py-1.5 text-zinc-400 hover:border-cyan-500/50 hover:text-cyan-300 hover:bg-cyan-500/5 active:scale-95 transition-all"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <MessageBubble key={msg.id || i} msg={msg} />
          ))}
        </div>
      </main>

      {/* Input */}
      <div className="relative z-[1] border-t border-zinc-800 bg-[#0a0e14]">
        <div className="max-w-3xl mx-auto px-5 py-4">
          <div className="flex items-end gap-2 bg-zinc-900 border border-zinc-700 rounded-2xl px-4 py-2 focus-within:border-cyan-500/50 transition">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask Medha anything..."
              rows={1}
              className="flex-1 bg-transparent resize-none outline-none text-sm py-1.5 max-h-32 placeholder:text-zinc-600"
            />
            <button
              onClick={send}
              disabled={busy || !input.trim()}
              className="p-2 rounded-xl bg-cyan-500 text-black disabled:opacity-30 disabled:cursor-not-allowed hover:bg-cyan-400 active:scale-90 transition-all flex-shrink-0"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>

      <SiteFooter onAbout={() => setShowAbout(true)} />
    </div>
  );
}
