// app/scripts/ingest-repo.ts

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { generateEmbedding } from "../lib/rag";
import { parseCodeIntoSemanticChunks } from "../lib/ast-parser";

// --- CONFIGURATION ---
const REPO_OWNER = "nilotpal-n7";
const REPO_NAME = "ink";
const REPO_URL = `https://github.com/${REPO_OWNER}/${REPO_NAME}.git`;
const REPOS_BASE_DIR = path.join(process.cwd(), ".repos");
const CLONE_DIR = path.join(REPOS_BASE_DIR, REPO_NAME);
const DB_PATH = path.join(process.cwd(), "memory.json");
const STATE_PATH = path.join(process.cwd(), "sync_state.json"); // Tracking last hash
const SUPPORTED_EXTENSIONS = [
  ".ts",
  ".js",
  ".tsx",
  ".rs",
  ".py",
  ".go",
  ".java",
  ".c",
  ".cpp",
  ".md",
  ".json",
];
const TARGET_PATTERNS = ["app/*", "src/*"];

function getSyncState() {
  if (!fs.existsSync(STATE_PATH)) return { last_commit: null };
  return JSON.parse(fs.readFileSync(STATE_PATH, "utf-8"));
}

// Git Sync with Change Detection
function syncRepository() {
  console.log(`\n📦 Syncing repository: ${REPO_OWNER}/${REPO_NAME}...`);
  if (!fs.existsSync(REPOS_BASE_DIR)) fs.mkdirSync(REPOS_BASE_DIR, { recursive: true });

  const state = getSyncState();
  let isNew = false;
  let hasChanges = false;
  const oldHash = state.last_commit;

  if (!fs.existsSync(CLONE_DIR)) {
    console.log(`🚀 Fresh start. Cloning...`);
    execSync(`git clone ${REPO_URL} ${CLONE_DIR}`, { stdio: "inherit" });
    isNew = true;
    hasChanges = true;
  } else {
    console.log(`🔄 Checking for updates...`);
    execSync(`git fetch origin`, { cwd: CLONE_DIR });
    const localHash = execSync(`git rev-parse HEAD`, { cwd: CLONE_DIR }).toString().trim();

    // Get the default branch name
    const remoteInfo = execSync(`git remote show origin`, { cwd: CLONE_DIR }).toString();
    const branchMatch = remoteInfo.match(/HEAD branch:\s+(.+)/);
    const defaultBranch = branchMatch ? branchMatch[1].trim() : "main";
    const remoteHash = execSync(`git rev-parse origin/${defaultBranch}`, { cwd: CLONE_DIR })
      .toString()
      .trim();

    if (localHash !== remoteHash) {
      console.log(`📥 New changes detected. Pulling...`);
      execSync(`git pull`, { cwd: CLONE_DIR });
      hasChanges = true;
    } else {
      console.log(`✅ Repo already up to date.`);
    }
  }

  const currentHash = execSync(`git rev-parse HEAD`, { cwd: CLONE_DIR }).toString().trim();
  return { isNew, hasChanges, oldHash, currentHash };
}

// Ingest Git Commits
async function ingestCommits(memoryDb: any[], oldHash: string | null) {
  console.log("\n📜 Analyzing Commit History...");

  // If we have an old hash, get the diff. Otherwise, get last 15 commits.
  const gitLogCmd = oldHash
    ? `git log ${oldHash}..HEAD --pretty=format:"%H|%an|%ad|%s"`
    : `git log -n 15 --pretty=format:"%H|%an|%ad|%s"`;

  let logOutput = "";
  try {
    logOutput = execSync(gitLogCmd, { cwd: CLONE_DIR }).toString().trim();
  } catch (e) {
    console.warn("⚠️ Could not fetch commit logs (likely a rebase). Fetching last 5.");
    logOutput = execSync(`git log -n 5 --pretty=format:"%H|%an|%ad|%s"`, { cwd: CLONE_DIR })
      .toString()
      .trim();
  }

  if (!logOutput) return;

  const commitLines = logOutput.split("\n");
  for (const line of commitLines) {
    const [hash, author, date, message] = line.split("|");
    const commitId = `commit_${REPO_NAME}_${hash}`;

    // Skip if already in memory
    if (memoryDb.some((m: any) => m.id === commitId)) continue;

    console.log(`  💾 Archiving Commit: [${hash.substring(0, 7)}] ${message}`);
    const content = `REPO: ${REPO_NAME}\nCOMMIT: ${hash}\nAUTHOR: ${author}\nDATE: ${date}\nMESSAGE: ${message}`;

    const vector = await generateEmbedding(content);
    memoryDb.push({
      id: commitId,
      type: "github_commit",
      author,
      date,
      content,
      url: `https://github.com/${REPO_OWNER}/${REPO_NAME}/commit/${hash}`,
      threadId: "commit_history",
      vector,
    });
    await new Promise((r) => setTimeout(r, 1000));
  }
}

function getFilesRecursively(
  baseDir: string,
  relativePattern: string,
  fileList: string[] = [],
): string[] {
  const cleanPattern = relativePattern.replace("/*", "");
  const fullPath = path.join(baseDir, cleanPattern);
  if (!fs.existsSync(fullPath)) return fileList;

  if (fs.statSync(fullPath).isFile()) {
    if (SUPPORTED_EXTENSIONS.some((ext) => fullPath.endsWith(ext))) {
      fileList.push(cleanPattern.replace(/\\/g, "/"));
    }
    return fileList;
  }

  const files = fs.readdirSync(fullPath);
  for (const file of files) {
    const relativePath = path.posix.join(cleanPattern.replace(/\\/g, "/"), file);
    if (fs.statSync(path.join(baseDir, relativePath)).isDirectory() && !file.startsWith(".")) {
      getFilesRecursively(baseDir, relativePath, fileList);
    } else if (SUPPORTED_EXTENSIONS.some((ext) => file.endsWith(ext))) {
      fileList.push(relativePath);
    }
  }
  return fileList;
}

async function ingestCodebase() {
  console.log("🛠️ Starting Full-Spectrum Ingestion (Code + Commits)...");

  const { isNew, hasChanges, oldHash, currentHash } = syncRepository();
  let memoryDb = fs.existsSync(DB_PATH) ? JSON.parse(fs.readFileSync(DB_PATH, "utf-8")) : [];

  // PHASE 1: Commit Ingestion
  await ingestCommits(memoryDb, oldHash);
  fs.writeFileSync(DB_PATH, JSON.stringify(memoryDb, null, 2));

  // PHASE 2: Code Ingestion (Differential)
  let filesToProcess: string[] = [];
  if (isNew) {
    for (const pattern of TARGET_PATTERNS) {
      filesToProcess = getFilesRecursively(CLONE_DIR, pattern, filesToProcess);
    }
  } else if (hasChanges && oldHash) {
    console.log("🔍 Detecting modified files since last sync...");
    const diff = execSync(`git diff --name-only ${oldHash} HEAD`, { cwd: CLONE_DIR })
      .toString()
      .trim();
    filesToProcess = diff
      .split("\n")
      .filter((f) => TARGET_PATTERNS.some((p) => f.startsWith(p.replace("/*", ""))));
  } else {
    // Resume logic: check for files in target patterns that aren't in memoryDb
    const allFiles: string[] = [];
    for (const pattern of TARGET_PATTERNS) getFilesRecursively(CLONE_DIR, pattern, allFiles);
    const indexed = new Set(
      memoryDb.filter((m: any) => m.id.startsWith(`code_${REPO_NAME}`)).map((m: any) => m.threadId),
    );
    filesToProcess = allFiles.filter((f) => !indexed.has(f));
  }

  filesToProcess = Array.from(new Set(filesToProcess)).filter((f) =>
    SUPPORTED_EXTENSIONS.some((ext) => f.endsWith(ext)),
  );
  console.log(`📂 Files to process: ${filesToProcess.length}`);

  for (const relPath of filesToProcess) {
    console.log(`\n🔍 Processing Change: ${relPath}`);
    // Clear old versions of this file from memory
    memoryDb = memoryDb.filter((m: any) => m.threadId !== relPath);

    const fullPath = path.join(CLONE_DIR, relPath);
    if (!fs.existsSync(fullPath)) continue; // File might have been deleted in a PR

    const code = fs.readFileSync(fullPath, "utf-8");
    const chunks = parseCodeIntoSemanticChunks(code, relPath);

    for (const chunk of chunks) {
      console.log(`  🧠 Embedding: [${chunk.blockName}]`);
      const embedText = `FILE: ${chunk.filePath} | BLOCK: ${chunk.blockName}\nCODE:\n${chunk.code}`;

      let vector = null;
      let retries = 3;
      while (retries > 0) {
        try {
          vector = await generateEmbedding(embedText);
          break;
        } catch (error: any) {
          const wait = error.message.includes("429") ? 35000 : 5000;
          console.warn(`  ⚠️ Error: ${error.message}. Retrying...`);
          retries--;
          await new Promise((r) => setTimeout(r, wait));
        }
      }

      if (vector) {
        memoryDb.push({
          id: `code_${REPO_NAME}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          type: "github_code",
          author: "System_AST",
          date: new Date().toISOString(),
          content: embedText,
          url: `https://github.com/${REPO_OWNER}/${REPO_NAME}/blob/main/${chunk.filePath}`,
          threadId: chunk.filePath,
          vector,
        });
      }
      await new Promise((r) => setTimeout(r, 1200));
    }

    // Save after every file
    fs.writeFileSync(DB_PATH, JSON.stringify(memoryDb, null, 2));
    fs.writeFileSync(STATE_PATH, JSON.stringify({ last_commit: currentHash }, null, 2));
  }

  fs.writeFileSync(STATE_PATH, JSON.stringify({ last_commit: currentHash }, null, 2));
  console.log(`\n✅ INGESTION SUCCESSFUL: Repo logic and history are now unified.`);
}

ingestCodebase().catch(console.error);
