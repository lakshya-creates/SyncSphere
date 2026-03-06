// app/api/engineer-data/route.ts

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const logsPath = path.join(process.cwd(), "active_logs.json");
    const queuePath = path.join(process.cwd(), "queue.json");
    const presencePath = path.join(process.cwd(), "presence.json");
    const memoryPath = path.join(process.cwd(), "memory.json");

    const logs = fs.existsSync(logsPath) ? JSON.parse(fs.readFileSync(logsPath, "utf-8")) : [];
    const queue = fs.existsSync(queuePath) ? JSON.parse(fs.readFileSync(queuePath, "utf-8")) : [];
    const presence = fs.existsSync(presencePath) ? JSON.parse(fs.readFileSync(presencePath, "utf-8")) : {};
    const memory = fs.existsSync(memoryPath) ? JSON.parse(fs.readFileSync(memoryPath, "utf-8")) : [];

    // Current user status (Defaulting to Nilot for the dashboard view)
    const myStatus = presence["Nilot"] || "Offline";

    // Grab the latest 3 Discord messages ingested by your background worker
    const discordChats = memory
      .filter((m: any) => m.type === "discord_chat")
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3);

    return NextResponse.json({
      success: true,
      status: myStatus,
      logs,
      queue,
      discordChats
    });
  } catch (error: any) {
    console.error("Engineer Data API Error:", error);
    return NextResponse.json({ success: false, status: "Offline", logs: [], queue: [], discordChats: [] });
  }
}
