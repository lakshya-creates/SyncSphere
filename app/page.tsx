// app/page.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarClock,
  CircleAlert,
  FileText,
  GitBranch,
  Globe,
  Mail,
  MessageSquareText,
  Search,
  Shield,
  Users,
  TerminalSquare,
  Loader2,
  Code2,
} from "lucide-react";
import EquiVoiceMockMeeting from "./components/EquiVoiceMockMeeting";

type PersonaMode = "Engineer Mode" | "Manager Mode";
type BugStage = "Incoming" | "Triage" | "Ready to Fix";
type SourceType = "Teams Chat" | "Outlook Email" | "SharePoint File" | "Discord Chat" | "GitHub Commit" | "Repository Code";

interface QueueItem {
  id: string;
  bugTitle: string;
  repoData?: {
    issueNumber?: number;
    repo?: string;
  };
  decision?: {
    analysis?: {
      priority?: string;
      root_cause?: string;
    };
    routing_strategy?: {
      assignee_github_handle?: string;
    };
  };
}

interface LogItem {
  issue: string;
  title: string;
  reason: string;
  action?: string;
}

interface EngineerData {
  success: boolean;
  status: string;
  discordChats?: Array<{
    author: string;
    threadId: string;
    content: string;
    date: string;
  }>;
  queue?: QueueItem[];
  logs?: LogItem[];
}

// --- STATIC FALLBACKS (In case API is empty/offline) ---
const teamsMutedMessages = [
  {
    sender: "Priya Nair",
    channel: "#release-ops",
    preview: "Can someone verify patch v3 before today's 16:00 sync?",
    time: "2m ago",
  },
  {
    sender: "Jordan Lee",
    channel: "#frontend",
    preview: "Quick FYI: QA flagged a minor tooltip alignment issue.",
    time: "9m ago",
  },
  {
    sender: "Asha Menon",
    channel: "Direct Message",
    preview: "Need your review on the auth callback fallback flow.",
    time: "14m ago",
  },
];

const bugReports: Array<{
  id: string;
  title: string;
  repo: string;
  severity: "Low" | "Medium" | "High";
  stage: BugStage;
  aiReason: string;
}> = [
  {
    id: "BUG-4192",
    title: "Portal settings panel throws hydration warning in Safari",
    repo: "syncsphere-portal/web",
    severity: "High",
    stage: "Incoming",
    aiReason: "Assigned because you wrote the surrounding logic in React components last week.",
  },
  {
    id: "BUG-4207",
    title: "Offline queue retries duplicate webhook payloads",
    repo: "syncsphere-core/events",
    severity: "Medium",
    stage: "Triage",
    aiReason: "AI matched your recent commits in retry orchestration and queue idempotency checks.",
  },
  {
    id: "BUG-4211",
    title: "Calendar focus blocks ignore tenant-level timezone override",
    repo: "syncsphere-graph/calendar",
    severity: "High",
    stage: "Ready to Fix",
    aiReason:
      "Linked to your ownership map for scheduler normalization and tenant metadata parsing.",
  },
  {
    id: "BUG-4223",
    title: "Keyboard shortcut conflicts with VS Code browser extension",
    repo: "syncsphere-shell/desktop",
    severity: "Low",
    stage: "Incoming",
    aiReason: "Mapped from your commit history on command palette hooks and keybinding handlers.",
  },
  {
    id: "BUG-4230",
    title: "Diff snapshot panel truncates large markdown code blocks",
    repo: "syncsphere-portal/web",
    severity: "Medium",
    stage: "Triage",
    aiReason: "Routed to you because you merged renderer improvements for markdown virtualization.",
  },
];

const recallResults: Array<{
  title: string;
  source: SourceType;
  description: string;
  timestamp: string;
  url?: string;
}> = [
  {
    title: "Decision: Pause deployment freeze exception for API edge cluster",
    source: "Teams Chat",
    description:
      "Consensus from architecture channel: resume rollout after synthetic latency stayed below 45ms.",
    timestamp: "Today, 10:14",
    url: "#",
  },
  {
    title: "Project Atlas: Budget approval for two additional AI routing seats",
    source: "Outlook Email",
    description:
      "Finance approved expansion with requirement to publish weekly utilization snapshots.",
    timestamp: "Today, 08:32",
    url: "#",
  },
  {
    title: "Q2 Integration Plan - Microsoft Graph and GitHub sync checkpoints",
    source: "SharePoint File",
    description:
      "Documented milestones for webhook hardening, SSO governance, and regional failover drills.",
    timestamp: "Yesterday, 17:06",
    url: "#",
  },
];

const sourceIcons: Record<SourceType, React.ComponentType<{ className?: string }>> = {
  "Teams Chat": MessageSquareText,
  "Discord Chat": MessageSquareText,
  "Outlook Email": Mail,
  "SharePoint File": FileText,
  "GitHub Commit": GitBranch,
  "Repository Code": Code2,
};

const stageClasses: Record<BugStage, string> = {
  Incoming: "border-amber-200 bg-amber-50 text-amber-700",
  Triage: "border-sky-200 bg-sky-50 text-sky-700",
  "Ready to Fix": "border-emerald-200 bg-emerald-50 text-emerald-700",
};

const severityClasses: Record<"Low" | "Medium" | "High", string> = {
  Low: "text-emerald-700 bg-emerald-50 border-emerald-200",
  Medium: "text-amber-700 bg-amber-50 border-amber-200",
  High: "text-rose-700 bg-rose-50 border-rose-200",
};

function SectionCard({
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white/85 p-5 shadow-[0_14px_44px_-24px_rgba(15,23,42,0.45)] backdrop-blur">
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
        </div>
        <span className="rounded-xl border border-slate-200 bg-slate-100 p-2">
          <Icon className="h-4 w-4 text-slate-700" />
        </span>
      </header>
      {children}
    </section>
  );
}

// --- RAG COMPONENT INTEGRATION ---
function CodebaseAssistant() {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleAskCodebase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setAnswer("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      
      const data = await res.json();
      if (data.success) {
        setAnswer(data.answer);
      } else {
        setAnswer("⚠️ Error: " + data.error);
      }
    } catch {
      setAnswer("⚠️ Failed to connect to SyncSphere AI backend. Is the server running?");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SectionCard
      title="Graph RAG Code Investigator"
      subtitle="Chat with the AST-parsed repository memory and commit history."
      icon={TerminalSquare}
    >
      <div className="flex flex-col gap-4">
        <div className="h-72 overflow-y-auto rounded-xl border border-slate-200 bg-slate-900 p-4 text-sm font-mono text-slate-300 shadow-inner">
          {answer ? (
            <div className="whitespace-pre-wrap">{answer}</div>
          ) : isLoading ? (
            <div className="flex h-full flex-col items-center justify-center text-slate-500">
              <Loader2 className="mb-2 h-6 w-6 animate-spin text-sky-400" />
              <p>Scanning memory.json vectors...</p>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-slate-500">
              &gt; Ready. Try asking: &quot;How do I add a command?&quot;
            </div>
          )}
        </div>

        <form onSubmit={handleAskCodebase} className="flex items-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-2 focus-within:border-sky-400 focus-within:ring-1 focus-within:ring-sky-400">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask anything about the codebase..."
            className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="rounded-lg bg-sky-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-700 disabled:opacity-50"
          >
            Execute
          </button>
        </form>
      </div>
    </SectionCard>
  );
}

function EngineerModeView() {
  // 1. Live States for the dynamic backend
  const [liveBugs, setLiveBugs] = useState<typeof bugReports>(bugReports);
  const [discordMessages, setDiscordMessages] = useState(teamsMutedMessages);
  const [userStatus, setUserStatus] = useState("Loading...");

  // 2. Fetch live data from your backend
  useEffect(() => {
    async function fetchEngineerData() {
      try {
        const res = await fetch("/api/engineer-data");
        const data: EngineerData = await res.json();
        
        if (data.success) {
          setUserStatus(data.status);
          
          // Map Discord Chats from Graph RAG
          if (data.discordChats && data.discordChats.length > 0) {
            setDiscordMessages(data.discordChats.map((chat) => ({
              sender: chat.author,
              channel: chat.threadId.replace("channel_", "#"),
              preview: chat.content,
              time: new Date(chat.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
            })));
          }

          // Map Queue + Logs into the GitMind Board
          const dynamicBugs: typeof bugReports = [];
          
          // Queued items map to -> Incoming
          data.queue?.forEach((q) => {
            dynamicBugs.push({
              id: q.repoData?.issueNumber ? `BUG-${q.repoData.issueNumber}` : `Q-${q.id.substring(0,4)}`,
              title: q.bugTitle,
              repo: q.repoData?.repo || "syncsphere",
              severity: q.decision?.analysis?.priority === "Critical" ? "High" : "Medium",
              stage: "Incoming",
              aiReason: `⏳ Queued & Waiting for @${q.decision?.routing_strategy?.assignee_github_handle}. Reason: ${q.decision?.analysis?.root_cause}`
            });
          });

          // Logged items map to -> Triage or Ready to Fix
          data.logs?.forEach((log, idx) => {
            dynamicBugs.push({
              id: log.issue.split(' • ')[0] || `BUG-${9000 + idx}`,
              title: log.title,
              repo: log.issue.split(' • ')[1] || "syncsphere",
              severity: log.reason.includes("Critical") ? "High" : "Medium",
              stage: (log.action && log.action.includes("PR Created")) ? "Ready to Fix" : "Triage",
              aiReason: `[${log.action}] ${log.reason}`
            });
          });

          // Update UI if we have live Swarm data
          if (dynamicBugs.length > 0) {
            setLiveBugs(dynamicBugs);
          }
        }
      } catch (e) {
        console.error("Failed to fetch live data.", e);
      }
    }

    fetchEngineerData();
    const interval = setInterval(fetchEngineerData, 5000); // Live poll every 5s
    return () => clearInterval(interval);
  }, []);

  const bugColumns = useMemo(() => {
    const orderedStages: BugStage[] = ["Incoming", "Triage", "Ready to Fix"];
    return orderedStages.map((stage) => ({
      stage,
      items: liveBugs.filter((report) => report.stage === stage),
    }));
  }, [liveBugs]);

  return (
    <div className="grid gap-6 xl:grid-cols-5">
      <div className="space-y-5 xl:col-span-2">
        <SectionCard
          title="FlowState Module"
          subtitle="Protect uninterrupted focus windows based on live Discord Presence."
          icon={CalendarClock}
        >
          <div className={`rounded-xl border p-4 ${userStatus === "DoNotDisturb" ? "border-emerald-200 bg-emerald-50" : userStatus === "Available" ? "border-sky-200 bg-sky-50" : "border-slate-200 bg-slate-50"}`}>
            <p className={`text-xs font-semibold tracking-[0.12em] uppercase ${userStatus === "DoNotDisturb" ? "text-emerald-700" : "text-sky-700"}`}>
              Current System Status
            </p>
            <p className={`mt-2 text-lg font-semibold ${userStatus === "DoNotDisturb" ? "text-emerald-800" : "text-sky-800"}`}>
              {userStatus === "DoNotDisturb" ? "Focus Block Active (DND)" : userStatus === "Available" ? "Available for Assignments" : "Offline"}
            </p>
            <p className={`mt-1 text-sm ${userStatus === "DoNotDisturb" ? "text-emerald-700" : "text-sky-700"}`}>
              {userStatus === "DoNotDisturb" ? "Auto-queueing bugs to fallback developers." : "You will receive immediate bug routing."}
            </p>
          </div>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">Notification Vault</p>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                Discord / Teams
              </span>
            </div>
            {discordMessages.map((message, idx) => (
              <article
                key={idx}
                className="rounded-xl border border-slate-200 bg-slate-50/70 p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-slate-900">{message.sender}</p>
                  <p className="text-xs text-slate-500">{message.time}</p>
                </div>
                <p className="mt-1 text-xs font-medium tracking-[0.08em] text-slate-500 uppercase">
                  {message.channel}
                </p>
                <p className="mt-2 text-sm text-slate-700">{message.preview}</p>
              </article>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="xl:col-span-3">
        <SectionCard
          title="GitMind Module"
          subtitle="Live AI Swarm issue routing based on context and presence."
          icon={GitBranch}
        >
          <div className="grid gap-6 lg:grid-cols-3">
            {bugColumns.map((column) => (
              <div
                key={column.stage}
                className="rounded-xl border border-slate-200 bg-slate-50/80 p-3"
              >
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">{column.stage}</h3>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium ${stageClasses[column.stage]}`}
                  >
                    {column.items.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {column.items.map((bug, idx) => (
                    <article
                      key={idx}
                      className="rounded-lg border border-slate-200 bg-white p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900">{bug.title}</p>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${severityClasses[bug.severity]}`}
                        >
                          {bug.severity}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        {bug.id} - {bug.repo}
                      </p>
                      <p className="mt-3 rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-2 text-xs text-indigo-700">
                        <span className="font-semibold">AI Match Reason:</span> {bug.aiReason}
                      </p>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* RAG COMPONENT INJECTED AT THE BOTTOM OF ENGINEER VIEW */}
      <div className="xl:col-span-5">
        <CodebaseAssistant />
      </div>
    </div>
  );
}

function ManagerModeView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{
    title: string;
    source: SourceType;
    description: string;
    timestamp: string;
    url?: string;
  }>>(recallResults);
  const [isSearching, setIsSearching] = useState(false);

  // 🔴 LIVE RECALL MODULE SYNC 🔴
  const handleRecallSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const res = await fetch("/api/recall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery }),
      });
      const data = await res.json();
      if (data.success && data.results.length > 0) {
        setSearchResults(data.results);
      } else {
        setSearchResults([{
          title: "No Exact Match Found",
          source: "Repository Code",
          description: "The AI could not find related context in the vector database for this query.",
          timestamp: new Date().toLocaleTimeString(),
          url: "#"
        }]);
      }
    } catch (err) {
      console.error("Recall search failed", err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-5">
      <div className="xl:col-span-3">
        <SectionCard
          title="Recall Module"
          subtitle="Unified Graph RAG memory search across Discord, GitHub, and Code."
          icon={Search}
        >
          <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-slate-50/80 p-4">
            <form onSubmit={handleRecallSearch} className="flex items-center gap-3 rounded-full border border-slate-300 bg-white px-4 py-3 shadow-[0_10px_28px_-20px_rgba(2,6,23,0.7)]">
              {isSearching ? <Loader2 className="h-5 w-5 animate-spin text-sky-500" /> : <Search className="h-5 w-5 text-slate-500" />}
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search synchronized Graph RAG context (e.g. 'AST parser edge cases')"
                className="w-full bg-transparent text-sm text-slate-800 outline-none"
                disabled={isSearching}
              />
              <button type="submit" disabled={isSearching || !searchQuery.trim()} className="hidden">Search</button>
            </form>
            <div className="mt-4 space-y-3">
              {searchResults.map((result, i) => {
                // Safely grab the icon, fallback to FileText if missing
                const Icon = sourceIcons[result.source as SourceType] || FileText;
                return (
                  <article
                    key={i}
                    className="rounded-xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md border border-slate-200 bg-slate-50 p-1.5">
                          <Icon className="h-4 w-4 text-slate-700" />
                        </span>
                        <p className="text-sm font-semibold text-slate-900">{result.title}</p>
                      </div>
                      <p className="text-xs text-slate-500">{result.timestamp}</p>
                    </div>
                    <p className="mt-2 text-sm font-mono text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">{result.description}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
                        {result.source}
                      </span>
                      {result.url && result.url !== "#" && (
                        <a href={result.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-sky-700 hover:text-sky-800">
                          Open context link <ArrowUpRight className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="space-y-5 xl:col-span-2">
        <SectionCard
          title="EquiVoice Module"
          subtitle="Live meeting intelligence with inclusivity and terminology support."
          icon={Users}
        >
          <EquiVoiceMockMeeting />
        </SectionCard>
      </div>
    </div>
  );
}

export default function Home() {
  const [personaMode, setPersonaMode] = useState<PersonaMode>("Engineer Mode");

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f0f7ff,#f8fafc_35%,#ffffff_80%)] text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-slate-900 p-2 text-white">
              <Globe className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold tracking-[0.08em] text-slate-800 uppercase">
                SyncSphere
              </p>
              <p className="text-xs text-slate-600">
                Enterprise AI productivity layer for Microsoft and GitHub workflows
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700">
              <Shield className="h-3.5 w-3.5" />
              Smart Focus Routing Enabled
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700">
              <BriefcaseBusiness className="h-3.5 w-3.5" />
              Persona Switcher
            </div>
            <label htmlFor="persona-mode" className="sr-only">
              Persona Switcher
            </label>
            <select
              id="persona-mode"
              value={personaMode}
              onChange={(event) => setPersonaMode(event.target.value as PersonaMode)}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition outline-none hover:border-slate-400 focus:ring-2 focus:ring-sky-200"
            >
              <option>Engineer Mode</option>
              <option>Manager Mode</option>
            </select>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5 rounded-2xl border border-slate-200 bg-white/80 p-4 backdrop-blur">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">{personaMode}</h1>
              <p className="mt-1 text-sm text-slate-600">
                {personaMode === "Engineer Mode"
                  ? "Prioritize deep work with AI-gated communication and GitHub issue routing."
                  : "Drive aligned execution with cross-tool recall and inclusive live meeting context."}
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700">
              <CircleAlert className="h-3.5 w-3.5" />
              {personaMode === "Engineer Mode"
                ? "3 notifications muted to preserve focus"
                : "2 inclusivity nudges active in current sync"}
            </div>
          </div>
        </div>

        {personaMode === "Engineer Mode" ? <EngineerModeView /> : <ManagerModeView />}
      </main>
    </div>
  );
}





