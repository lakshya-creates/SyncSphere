// app/api/chat/route.ts

import { NextResponse } from 'next/server';
import { askCodebase } from '@/app/lib/chat';

export async function POST(req: Request) {
  try {
    // 1. Grab the user's question from the frontend request
    const body = await req.json();
    const { query } = body;

    if (!query) {
      return NextResponse.json({ error: "Please provide a question to ask the codebase." }, { status: 400 });
    }

    console.log(`🌐 API Route received query: ${query}`);

    // 2. Wake up the Orchestrator
    const aiAnswer = await askCodebase(query);

    // 3. Send the formatted answer back to the UI
    return NextResponse.json({ 
      success: true, 
      answer: aiAnswer 
    });

  } catch (error) {
    console.error("❌ Chat API Route Error:", error);
    return NextResponse.json({ 
      success: false, 
      error: "The AI encountered a critical error while processing the request." 
    }, { status: 500 });
  }
}
