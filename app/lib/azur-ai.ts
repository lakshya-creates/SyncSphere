// app/lib/azur-ai.ts

import { OpenAI } from "openai";

const client = new OpenAI({
  baseURL: "https://models.inference.ai.azure.com",
  apiKey: process.env.AZURE_OPENAI_KEY,
});

export async function processBugWithGhostManager(contextPayload: any) {
  console.log("🕵️‍♂️ [Agent 1] Detective Agent analyzing Graph RAG context...");

  // ==========================================
  // AGENT 1: THE DETECTIVE
  // ==========================================
  const detectivePrompt = `
    You are the SyncSphere Detective Agent.
    Analyze this bug report and the retrieved Graph RAG history (Discord chats, GitHub comments, commits).
    Identify the technical root cause and complexity.
    
    Output strictly in JSON:
    {
      "root_cause": "Detailed technical explanation...",
      "complexity": "High | Medium | Low",
      "affected_domain": "Frontend | Backend | AST Scanner | DB..."
    }
  `;

  const detectiveResponse = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: detectivePrompt },
      { role: "user", content: JSON.stringify(contextPayload) },
    ],
    response_format: { type: "json_object" },
  });

  const detectiveData = JSON.parse(detectiveResponse.choices[0].message?.content || "{}");
  console.log(`✅ [Agent 1] Root Cause Identified: ${detectiveData.complexity} Complexity.`);

  // ==========================================
  // AGENT 2: THE TRUST EVALUATOR
  // ==========================================
  console.log("🛡️ [Agent 2] Trust Agent evaluating author reputation...");
  const trustPrompt = `
    You are the SyncSphere Trust Evaluator.
    Review the Detective's technical analysis and the retrieved historical authors.
    If the historical context comes from a core maintainer (e.g., Nilot), trust is High. If novice, verify carefully.
    
    Output strictly in JSON:
    {
      "trust_score": "Percentage 0-100",
      "risk_level": "Critical | Safe | Unknown",
      "justification": "Why this historical context is or isn't trustworthy."
    }
  `;

  const trustResponse = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: trustPrompt },
      {
        role: "user",
        content: JSON.stringify({
          history: contextPayload.retrieved_history,
          detective_analysis: detectiveData,
        }),
      },
    ],
    response_format: { type: "json_object" },
  });

  const trustData = JSON.parse(trustResponse.choices[0].message?.content || "{}");
  console.log(`✅ [Agent 2] Trust Assessed: ${trustData.trust_score}% Confidence.`);

  // ==========================================
  // AGENT 3: THE ORCHESTRATOR
  // ==========================================
  console.log("🧠 [Agent 3] Orchestrator synthesizing final routing strategy...");
  const orchestratorPrompt = `
    You are the SyncSphere Orchestrator.
    Use the Detective's technical report, the Trust Evaluator's risk score, and the live Team Presence.
    
    CRITICAL ROUTING RULES:
    1. If the target is DoNotDisturb/Offline, set action to "queue_and_wait".
    2. If the Detective complexity is "Low" or "Medium", AND you can identify the exact file path from the Graph RAG links, you MUST set the action to "auto_fix_pr".
    3. Otherwise, route to a human. You MUST select an assignee and a fallback from the provided \`team_matrix\`. Consider their \`permissions\` (admin vs pull) when deciding who can actually fix the bug.
    4. Output the exact \`github_handle\` and \`discord_id\` for both the primary assignee and the fallback so the system can tag them properly.

    Output STRICTLY in this JSON format to match the enterprise API schema:
    {
      "analysis": {
        "root_cause": "[Detective's Findings]",
        "trust_evaluation": "[Trust Agent's Assessment]",
        "priority": "Critical | High | Medium | Low"
      },
      "routing_strategy": {
        "assignee_github_handle": "github-username",
        "assignee_discord_id": "1234567890",
        "primary_status": "Available | DoNotDisturb | Offline",
        "action": "assign_immediate | queue_and_wait | auto_fix_pr | assign_fallback",
        "wait_timeout_minutes": 30,
        "fallback_github_handle": "fallback-username",
        "fallback_discord_id": "0987654321",
        "file_to_fix": "app/lib/file.ts"
      },
      "reference_links": [
        { "type": "github_code", "url": "url", "description": "desc" }
      ]
    }
  `;

  const finalContext = {
    original_bug: contextPayload.bug_report,
    team_availability: contextPayload.team_availability,
    detective_report: detectiveData,
    trust_report: trustData,
    raw_history: contextPayload.retrieved_history,
  };

  const orchestratorResponse = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: orchestratorPrompt },
      { role: "user", content: JSON.stringify(finalContext) },
    ],
    response_format: { type: "json_object" },
  });

  console.log(`✅ [Agent 3] Orchestration Complete! Dispatching Payload.`);
  return JSON.parse(orchestratorResponse.choices[0].message?.content || "{}");
}
