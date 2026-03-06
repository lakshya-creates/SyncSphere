// app/api/webhook/route.ts

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { ingestLiveMemory, searchMemory } from "@/app/lib/rag";
import { processBugWithGhostManager } from "@/app/lib/azur-ai";
import { sendTeamsPing } from "@/app/lib/teams";
import { enqueueTask } from "@/app/lib/queue";
import { postGitHubComment, getRepoCollaborators } from "@/app/lib/github"; // Updated Import
import { createAutoFixPR } from "@/app/lib/auto-pr";
import { teamIdentityMap } from "@/app/lib/identity"; // New Import

export async function POST(req: Request) {
  try {
    const payload = await req.json();

    // ====================================================
    // SCENARIO 1: A brand new issue is opened
    // ====================================================
    if (payload.action === "opened" && payload.issue) {
      const bugTitle = payload.issue.title;
      const bugBody = payload.issue.body || "No description provided.";
      const repoName = payload.repository.name;
      const issueNumber = payload.issue.number;

      const repoData = {
        owner: payload.repository.owner.login,
        repo: repoName,
        issueNumber: issueNumber,
      };

      console.log(`\n🚨 LIVE GITHUB TRIGGER: ${bugTitle}`);

      // Read live presence from file (Updated by the Discord WebSockets)
      const presencePath = path.join(process.cwd(), "presence.json");
      const livePresence = fs.existsSync(presencePath)
        ? JSON.parse(fs.readFileSync(presencePath, "utf-8"))
        : {};

      // Fetch live GitHub Collaborators & Roles
      const collaborators = await getRepoCollaborators(repoData.owner, repoData.repo);

      // Build the Unified Team Matrix
      const teamMatrix = collaborators.map((collab: any) => {
        const identity = teamIdentityMap[collab.github_handle];
        const internalName = identity ? identity.name : collab.github_handle;
        const presence = livePresence[internalName] || "Offline";

        return {
          github_handle: collab.github_handle,
          discord_id: identity?.discordId || null,
          system_name: internalName,
          permissions: collab.permissions,
          live_status: presence,
        };
      });

      console.log(`👥 Dynamic Team Matrix Loaded: ${teamMatrix.length} collaborators found.`);

      // Retrieve Graph RAG Memory
      const historicalContext = await searchMemory(`${bugTitle} ${bugBody}`, 2);

      // Inject EVERYTHING dynamically into the AI Context
      const fullContext = {
        bug_report: { title: bugTitle, body: bugBody, url: payload.issue.html_url },
        retrieved_history: historicalContext.map((h) => ({ author: h.author, content: h.content })),
        team_matrix: teamMatrix,
      };

      // Let the Swarm decide
      const aiDecision = await processBugWithGhostManager(fullContext as any);
      const action = aiDecision.routing_strategy.action;

      if (action === "queue_and_wait") {
        enqueueTask(bugTitle, repoData, aiDecision);
      } else if (action === "auto_fix_pr") {
        console.log(`🚀 AI is attempting an Autonomous Pull Request...`);
        try {
          const prUrl = await createAutoFixPR(
            repoData.owner,
            repoData.repo,
            repoData.issueNumber,
            aiDecision.routing_strategy.file_to_fix,
            aiDecision.analysis,
          );
          // Ping Discord with the PR link!
          aiDecision.routing_strategy.action = `Autonomous PR Created: ${prUrl}`;
          await sendTeamsPing("webhook-trigger", aiDecision);
          await postGitHubComment(repoData.owner, repoData.repo, repoData.issueNumber, aiDecision);
        } catch (e) {
          console.error("Auto PR Failed, falling back to immediate assign:", e);
          await sendTeamsPing("webhook-trigger", aiDecision);
        }
      } else {
        console.log(`🚀 Immediate assignment. Pinging Discord & GitHub...`);
        await sendTeamsPing("webhook-trigger", aiDecision);
        await postGitHubComment(repoData.owner, repoData.repo, repoData.issueNumber, aiDecision);
      }

      // Map data perfectly for the Next.js Dashboard UI
      const logEntry = {
        id: Date.now(),
        time: new Date().toLocaleTimeString(),
        issue: `#${issueNumber} • ${repoName}`,
        title: bugTitle,
        assignee: aiDecision.routing_strategy.assignee_github_handle, // FIXED
        action: aiDecision.routing_strategy.action,
        reason: `Trust: ${aiDecision.analysis.trust_evaluation} | Cause: ${aiDecision.analysis.root_cause}`,
      };

      const logsPath = path.join(process.cwd(), "active_logs.json");
      let currentLogs = [];
      if (fs.existsSync(logsPath)) {
        currentLogs = JSON.parse(fs.readFileSync(logsPath, "utf-8"));
      }

      currentLogs.unshift(logEntry);
      fs.writeFileSync(logsPath, JSON.stringify(currentLogs.slice(0, 5), null, 2));

      console.log(`✅ PIPELINE COMPLETE! Issue routed and saved to dashboard.`);
    }

    // ====================================================
    // SCENARIO 2: A comment is added (The New Live Ingestion)
    // ====================================================
    if (payload.action === "created" && payload.comment) {
      const commentBody = payload.comment.body;
      const author = payload.comment.user.login;
      const issueNumber = payload.issue.number;

      // Ignore our own SyncSphere bot comments!
      if (author.includes("bot") || author === "syncsphere") {
        return NextResponse.json({ success: true, message: "Ignored bot comment" });
      }

      console.log(`\n🚨 LIVE GITHUB EVENT: New comment on Issue #${issueNumber}`);

      await ingestLiveMemory(
        "github_comment",
        `comment_${payload.comment.id}`,
        commentBody,
        author,
        `issue_${issueNumber}`,
        payload.comment.html_url,
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Webhook Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
