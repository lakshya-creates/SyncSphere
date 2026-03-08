// app/lib/github.ts

export async function getRepoCollaborators(owner: string, repo: string) {
  const token = process.env.GITHUB_PAT;
  if (!token) return [];

  const url = `https://api.github.com/repos/${owner}/${repo}/collaborators`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

  if (!res.ok) {
    console.error("Failed to fetch collaborators:", await res.text());
    return [];
  }

  const users = await res.json();
  // Returns an array of users with their exact GitHub handles and admin/push/pull permissions
  return users.map((user: any) => ({
    github_handle: user.login,
    permissions: user.permissions,
  }));
}

export async function postGitHubComment(
  owner: string,
  repo: string,
  issueNumber: number,
  aiDecision: any,
) {
  const token = process.env.GITHUB_PAT;
  if (!token) throw new Error("Missing GITHUB_PAT");

  const baseUrl = `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`;
  const headers = {
    Accept: "application/vnd.github.v3+json",
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  if (aiDecision.routing_strategy.assignee_github_handle) {
    try {
      await fetch(`${baseUrl}/assignees`, {
        method: "POST",
        headers,
        body: JSON.stringify({ assignees: [aiDecision.routing_strategy.assignee_github_handle] }),
      });
      console.log(
        `👤 User @${aiDecision.routing_strategy.assignee_github_handle} physically assigned to issue.`,
      );
    } catch (e) {
      console.error("Failed to assign user in GitHub UI:", e);
    }
  }

  const formattedLinks = aiDecision.reference_links
      ?.slice(0, 2)
      .map((link: any) => {
         const shortDesc = link.description.length > 60 ? link.description.substring(0, 60) + "..." : link.description;
         return `- [${shortDesc}](${link.url})`;
      })
      .join("\n") || "No historical links found.";

  const fallbackText = aiDecision.routing_strategy.fallback_github_handle
    ? `@${aiDecision.routing_strategy.fallback_github_handle}`
    : "None assigned";

  const shortCause = aiDecision.analysis.root_cause?.length > 250 
    ? aiDecision.analysis.root_cause.substring(0, 250) + "..." 
    : aiDecision.analysis.root_cause;
    
  const shortTrust = aiDecision.analysis.trust_evaluation?.length > 150
    ? aiDecision.analysis.trust_evaluation.substring(0, 150) + "..."
    : aiDecision.analysis.trust_evaluation;

  const commentBody = `### 🤖 SyncSphere AI Orchestrator

**🎯 Routing Strategy:**
* **Primary Target:** @${aiDecision.routing_strategy.assignee_github_handle} *(Status: ${aiDecision.routing_strategy.primary_status})*
* **Fallback:** ${fallbackText}
* **Priority:** ${aiDecision.analysis.priority}
* **Action Executed:** \`${aiDecision.routing_strategy.action}\`

**🧠 Root Cause Analysis:**
${shortCause}

**🛡️ Trust & History Evaluation:**
${shortTrust}

**🔗 Context & Deep Links:**
${formattedLinks}
  `;

  const response = await fetch(`${baseUrl}/comments`, {
    method: "POST",
    headers,
    body: JSON.stringify({ body: commentBody }),
  });

  if (!response.ok) {
    console.error("GitHub API Failed:", await response.text());
  }
}
