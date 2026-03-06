// app/lib/teams.ts

export async function sendTeamsPing(userId: string, aiDecision: any) {
  const webhookUrl = process.env.TEAMS_WEBHOOK_URL;
  if (!webhookUrl) throw new Error("Webhook URL missing");

  const formattedLinks = aiDecision.reference_links
    .map((link: any) => {
      const emoji = link.type === "github_code" ? "💻" : "💬";
      return `${emoji} [${link.description}](${link.url})`;
    })
    .join("\n");

  let statusColor = 5814783; // Blue for normal
  if (aiDecision.routing_strategy.action === "queue_and_wait") statusColor = 16753920; // Orange for waiting
  if (aiDecision.routing_strategy.priority === "Critical") statusColor = 16711680; // Red for critical

  const targetMention = aiDecision.routing_strategy.assignee_discord_id
    ? `<@${aiDecision.routing_strategy.assignee_discord_id}>`
    : `@${aiDecision.routing_strategy.assignee_github_handle}`;

  const fallbackMention = aiDecision.routing_strategy.fallback_discord_id
    ? `<@${aiDecision.routing_strategy.fallback_discord_id}>`
    : aiDecision.routing_strategy.fallback_github_handle
      ? `@${aiDecision.routing_strategy.fallback_github_handle}`
      : "None assigned";

  const discordPayload = {
    content: "🤖 **SyncSphere Orchestrator: Advanced Routing Event**",
    embeds: [
      {
        title: `Priority: ${aiDecision.analysis.priority} Bug Detected`,
        color: statusColor,
        fields: [
          {
            name: "Root Cause & Trust",
            value: `${aiDecision.analysis.root_cause}\n*Trust Eval:* ${aiDecision.analysis.trust_evaluation}`,
          },
          {
            name: "Routing Strategy",
            value: `**Target:** ${targetMention} (${aiDecision.routing_strategy.primary_status})\n**Action:** \`${aiDecision.routing_strategy.action}\`\n**Fallback:** ${fallbackMention}`,
          },
          {
            name: "Deep Links",
            value: formattedLinks || "No context links found.",
          },
        ],
      },
    ],
  };

  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(discordPayload),
  });
  return true;
}
