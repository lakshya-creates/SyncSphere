// app/api/recall/route.ts

import { NextResponse } from 'next/server';
import { searchCodebase } from '@/app/lib/search';

export async function POST(req: Request) {
  try {
    const { query } = await req.json();
    if (!query) return NextResponse.json({ results: [] });

    // Use your existing robust search engine (with the 429 bypass!)
    const blocks = await searchCodebase(query, 5);

    // Map the raw Graph RAG blocks into the format the UI expects
    const results = blocks.map((block: any) => {
      let source = "Repository Code";
      if (block.type === "discord_chat") source = "Discord Chat";
      if (block.type === "github_commit") source = "GitHub Commit";

      return {
        title: block.threadId || `Memory Node: ${block.id.substring(0, 8)}`,
        source: source,
        description: block.content.substring(0, 180) + "...", // Truncate for UI
        timestamp: new Date(block.date || Date.now()).toLocaleTimeString(),
        url: block.url
      };
    });

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error("Recall API Error:", error);
    return NextResponse.json({ success: false, results: [] }, { status: 500 });
  }
}
