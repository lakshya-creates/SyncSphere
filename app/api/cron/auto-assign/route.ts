// app/api/cron/auto-assign/route.ts

import { NextResponse } from "next/server";
import { processQueue } from "@/app/lib/queue";

export async function GET(req: Request) {
  // Ensure only Vercel can trigger this route
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized Access", { status: 401 });
  }

  try {
    console.log("👻 Cron Trigger: Waking up Ghost Manager Queue Processor...");
    await processQueue();

    return NextResponse.json({ success: true, message: "Queue processed successfully." });
  } catch (error: any) {
    console.error("Cron Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
