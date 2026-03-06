# 🌌 SyncSphere (GhostManager AI)

## An Event-Driven, Presence-Aware Multi-Agent Orchestrator for Engineering Teams

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![Azure OpenAI](https://img.shields.io/badge/Azure_OpenAI-GPT--4o-blue?logo=microsoft-azure)](https://azure.microsoft.com/)
[![Discord.js](https://img.shields.io/badge/Discord.js-v13-indigo?logo=discord)](https://discord.js.org/)
[![Graph RAG](https://img.shields.io/badge/Memory-Graph_RAG-orange)](#)

SyncSphere is an enterprise-grade AI architecture that completely automates bug triaging, context gathering, and code fixing. It goes beyond standard chatbots by utilizing a **Multi-Agent Swarm**, **AST-Aware Semantic Chunking**, and a **Real-Time WebSocket Presence Engine** to protect developer flow state and autonomously resolve issues.

[Image of a multi-agent AI orchestrator architecture showing GitHub webhooks, Discord presence websocket, Graph RAG memory, and autonomous pull requests]

---

## 🛑 The Problem

Modern engineering teams are drowning in context switching. When a bug is reported:

1. Developers lose their flow state to triage it.
2. Standard AI bots use "dumb RAG" (random text chunking) that breaks code context.
3. Chatbots lack real-time awareness, pinging developers who are offline or in deep focus.

## 🚀 The Solution: SyncSphere Architecture

SyncSphere acts as a Senior Staff Engineer. It intercepts bugs, builds a mathematical graph of historical context, checks your real-life status, and decides whether to queue the task, assign a fallback, or write the fix itself.

### 🔥 Core Innovations

#### 1. The Multi-Agent Swarm

Instead of a monolithic prompt prone to hallucinations, SyncSphere uses a sequential pipeline of specialized agents:

- 🕵️‍♂️ **The Detective:** Diagnoses the root cause and assesses codebase complexity.
- 🛡️ **The Trust Evaluator:** Weighs the reputation of the authors in the Graph RAG (Maintainer vs. Novice) to assign a confidence score.
- 🧠 **The Orchestrator:** Synthesizes the data, checks human availability, and outputs a strict JSON routing schema.
- 🤖 **The Coder (Agent 4):** Automatically wakes up for low-complexity bugs to write code and submit GitHub Pull Requests.

#### 2. AST-Aware Semantic Memory (Code X-Ray)

Standard RAG chops code by character limits, breaking loops and variables. SyncSphere features a custom Abstract Syntax Tree (AST) ingestor that logically parses code by boundaries (`functions`, `classes`). When a bug occurs, the AI retrieves unbroken, mathematically relevant logic blocks.

#### 3. Continuous Graph RAG

SyncSphere possesses continuous intelligence. It passively listens to Discord chats and GitHub comments via WebSockets and Webhooks, vectorizes them, and builds a topological knowledge graph. A Discord message sent 5 minutes ago can be retrieved to solve a GitHub issue right now.

#### 4. Asynchronous State Machine & Presence Engine

Connected directly to the Discord Gateway, SyncSphere tracks developer presence (`Available`, `DoNotDisturb`, `Offline`) in real-time.

- If a critical developer is in deep work (DND), the orchestrator puts the bug in an **Asynchronous Queue**.
- The exact second the developer switches to "Available", the background worker fires the deep-linked payload to their Discord.
- If a timeout is reached, it seamlessly reroutes to an available fallback engineer.

---

## ⚙️ How It Works (The Lifecycle of a Bug)

1. **Trigger:** A webhook fires from GitHub (`issue.opened`).
2. **Retrieve:** The system queries the local Vector Database (Graph RAG) using Cosine Similarity to find interconnected chats, past PRs, and AST code blocks.
3. **Swarm Analysis:** Agents 1, 2, and 3 debate the root cause, trust score, and priority.
4. **Presence Check:** The background worker checks the real-time Discord WebSocket status of the primary assignee.
5. **Action:**
   - **Action A (Auto-Fix):** If complexity is Low/Medium, Agent 4 branches the repo, fixes the code, and opens a PR autonomously.
   - **Action B (Queue):** If the assignee is DND, the state machine holds the bug silently.
   - **Action C (Immediate):** If Available, it drops a rich Markdown comment on GitHub and pings Discord with exact deep links to the broken code/chat history.

---

## 🛠️ Tech Stack

- **Framework:** Next.js (App Router)
- **AI Provider:** Azure OpenAI (`gpt-4o` & `text-embedding-3-small`)
- **Real-Time Engine:** Discord.js v13 (WebSockets)
- **Ingestion:** GitHub REST API & Webhooks (via Smee.io)
- **Concurrency:** Node.js Background Worker & Task Queue

---

## 💻 Local Setup & Execution

SyncSphere uses a distributed microservice architecture. To run it locally for demonstration, we use `concurrently` to boot the UI, the Webhook Bridge, and the Master Presence Worker simultaneously.

### 1. Environment Variables

Create a `.env` file in the root directory:

```env
AZURE_OPENAI_KEY=your_azure_key
GITHUB_PAT=your_github_personal_access_token
TEAMS_WEBHOOK_URL=your_discord_webhook_url
DISCORD_BOT_TOKEN=your_bot_token
DISCORD_NILOT_ID=your_discord_user_id
```

### 2. Install Dependencies

```bash
npm install
npm install -D concurrently smee-client
```

### 3. Ingest the Codebase (Optional)

To give the AI semantic understanding of its own code:

```bash
npx tsx --env-file=.env app/scripts/ingest-repo.ts
```

### 4. Boot the Microservices

Run the ultimate dev command to start the Next.js UI, Smee webhook forwarder, and Discord Background Worker all at once:

```bash
npm run dev
```
