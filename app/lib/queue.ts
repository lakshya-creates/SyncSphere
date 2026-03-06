// app/lib/queue.ts

import fs from "fs";
import path from "path";
import { sendTeamsPing } from "./teams";
import { postGitHubComment } from "./github";
import { teamIdentityMap } from "./identity";

const queuePath = path.join(process.cwd(), "queue.json");
const presencePath = path.join(process.cwd(), "presence.json");

export function initSystemState() {
  if (!fs.existsSync(queuePath)) fs.writeFileSync(queuePath, JSON.stringify([]));
  if (!fs.existsSync(presencePath)) {
    fs.writeFileSync(
      presencePath,
      JSON.stringify({ Nilot: "DoNotDisturb", Sarah: "Available" }, null, 2),
    );
  }
}

export function enqueueTask(bugTitle: string, repoData: any, aiDecision: any) {
  initSystemState();
  const queue = JSON.parse(fs.readFileSync(queuePath, "utf-8"));
  queue.push({
    id: Date.now().toString(),
    bugTitle,
    repoData,
    decision: aiDecision,
    queuedAt: Date.now(),
  });
  fs.writeFileSync(queuePath, JSON.stringify(queue, null, 2));
  console.log(
    `⏳ TASK QUEUED: Waiting for @${aiDecision.routing_strategy.assignee_github_handle}.`,
  );
}

export async function processQueue() {
  initSystemState();
  let queue = JSON.parse(fs.readFileSync(queuePath, "utf-8"));
  const presence = JSON.parse(fs.readFileSync(presencePath, "utf-8"));

  if (queue.length === 0) return;

  const remainingQueue = [];

  for (const task of queue) {
    const strategy = task.decision.routing_strategy;

    // Translate GitHub handles back to internal System Names for presence checking
    const primaryHandle = strategy.assignee_github_handle;
    const fallbackHandle = strategy.fallback_github_handle;

    const primarySystemName = teamIdentityMap[primaryHandle]?.name || primaryHandle;
    const fallbackSystemName = fallbackHandle
      ? teamIdentityMap[fallbackHandle]?.name || fallbackHandle
      : null;

    // Read live presence
    const primaryStatus = presence[primarySystemName] || "Offline";
    const fallbackStatus = fallbackSystemName
      ? presence[fallbackSystemName] || "Offline"
      : "Offline";

    const timeInQueueMs = Date.now() - task.queuedAt;
    const timeoutMs = (strategy.wait_timeout_minutes || 30) * 1000;

    if (primaryStatus === "Available") {
      console.log(`✅ TARGET ACQUIRED: @${primaryHandle} is online. Firing integrations!`);

      // Update the payload to reflect that they are now available
      task.decision.routing_strategy.primary_status = "Available";
      task.decision.routing_strategy.action = "dequeued_and_assigned";

      await sendTeamsPing("webhook-queue", task.decision);
      await postGitHubComment(
        task.repoData.owner,
        task.repoData.repo,
        task.repoData.issueNumber,
        task.decision,
      );
    } else if (timeInQueueMs > timeoutMs && fallbackStatus === "Available") {
      console.log(
        `⚠️ TIMEOUT: @${primaryHandle} unavailable. Rerouting to fallback @${fallbackHandle}.`,
      );

      // Swap the primary assignee to the fallback so the Discord/GitHub tags ping the right person
      task.decision.routing_strategy.assignee_github_handle = fallbackHandle;
      task.decision.routing_strategy.assignee_discord_id = strategy.fallback_discord_id;
      task.decision.routing_strategy.primary_status = "Available";
      task.decision.routing_strategy.action = "assigned_to_fallback_due_to_timeout";

      await sendTeamsPing("webhook-queue", task.decision);
      await postGitHubComment(
        task.repoData.owner,
        task.repoData.repo,
        task.repoData.issueNumber,
        task.decision,
      );
    } else {
      remainingQueue.push(task); // Keep holding in the queue
    }
  }

  fs.writeFileSync(queuePath, JSON.stringify(remainingQueue, null, 2));
}
