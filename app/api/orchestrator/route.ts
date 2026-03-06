// app/api/orchestrator/route.ts

import { NextResponse } from "next/server";
import { processBugWithGhostManager } from "@/app/lib/azur-ai";
import { sendTeamsPing } from "@/app/lib/teams";

export async function POST() {
  try {
    // A strictly typed dummy context matching the exact new Graph RAG & Matrix schema
    const mockContext = {
      bug_report: {
        title: "Unhandled edge case in AST Parser",
        body: "Scanner fails when encountering unescaped quotes in the syntax tree.",
        url: "https://github.com/demo/repo",
      },
      retrieved_history: [
        {
          author: "System_AST_Ingestor",
          content: "function parseCodeIntoSemanticChunks(code: string) {}",
        },
      ],
      team_matrix: [
        {
          github_handle: "nilotpal-n7",
          discord_id: process.env.DISCORD_NILOT_ID,
          system_name: "Nilot",
          permissions: { admin: true, push: true },
          live_status: "DoNotDisturb",
        },
        {
          github_handle: "fallback-dev",
          discord_id: "9876543210",
          system_name: "Sarah",
          permissions: { push: true },
          live_status: "Available",
        },
      ],
    };

    const aiDecision = await processBugWithGhostManager(mockContext as any);
    // Fire the Discord Webhook silently in the background
    await sendTeamsPing("manual-ui-trigger", aiDecision);
    // Return the real AI decision to the Frontend UI
    return NextResponse.json({ success: true, decision: aiDecision });
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
