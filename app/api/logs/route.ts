// app/api/logs/route.ts

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const logsPath = path.join(process.cwd(), "active_logs.json");
    const queuePath = path.join(process.cwd(), "queue.json");

    const logs = fs.existsSync(logsPath) ? JSON.parse(fs.readFileSync(logsPath, "utf-8")) : [];
    const queue = fs.existsSync(queuePath) ? JSON.parse(fs.readFileSync(queuePath, "utf-8")) : [];

    // Send both the finished logs AND the waiting queue to the frontend
    return NextResponse.json({ logs, queued: queue.length, queueDetails: queue });
  } catch (error) {
    return NextResponse.json({ logs: [], queued: 0, queueDetails: [] });
  }
}
