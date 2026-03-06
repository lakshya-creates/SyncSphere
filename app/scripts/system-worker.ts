// app/scripts/system-worker.ts

import { Client, Intents } from "discord.js";
import fs from "fs";
import path from "path";
import { processQueue } from "../lib/queue";
import { ingestLiveMemory } from "../lib/rag";
import { teamIdentityMap } from "../lib/identity"; // ⬅️ NEW: The Central Brain

// Discord Client Setup
const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_PRESENCES,
    Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.GUILD_MESSAGES,
  ],
});

// Discord ID -> System Name map from Identity Matrix
const discordToSystemNameMap: Record<string, string> = {};
for (const [githubHandle, data] of Object.entries(teamIdentityMap)) {
  if (data.discordId) {
    discordToSystemNameMap[data.discordId] = data.name;
  }
}

const presencePath = path.join(process.cwd(), "presence.json");

// Translate Discord status to SyncSphere status
function translateStatus(discordStatus: string): string {
  switch (discordStatus) {
    case "online":
      return "Available";
    case "idle":
      return "Available";
    case "dnd":
      return "DoNotDisturb";
    case "offline":
      return "Offline";
    default:
      return "Offline";
  }
}

// Update the local JSON instantly when a change happens
function updateSystemPresence(userId: string, status: string) {
  const name = discordToSystemNameMap[userId];
  if (!name) return; // Ignore random people in the server who aren't in our team matrix

  const currentPresence = fs.existsSync(presencePath)
    ? JSON.parse(fs.readFileSync(presencePath, "utf-8"))
    : {};
  currentPresence[name] = translateStatus(status);

  fs.writeFileSync(presencePath, JSON.stringify(currentPresence, null, 2));
  console.log(`📡 PRESENCE UPDATED: ${name} is now ${currentPresence[name]} (Discord: ${status})`);
}

// Discord Event Listeners
client.once("ready", () => {
  console.log(`🤖 SyncSphere Discord Presence Engine Online as ${client.user?.tag}`);
  console.log(
    `👥 Loaded ${Object.keys(discordToSystemNameMap).length} team identities into tracker.`,
  );

  // Start the background queue processor only AFTER Discord is connected
  setInterval(async () => {
    try {
      await processQueue();
    } catch (error) {
      console.error("Queue Processing Error:", error);
    }
  }, 3000);
});

client.on("presenceUpdate", (oldPresence, newPresence) => {
  if (!newPresence?.userId || !newPresence?.status) return;
  updateSystemPresence(newPresence.userId, newPresence.status);
});

client.on("messageCreate", async (message) => {
  // Ignore the bot's own messages so we don't cause an infinite loop!
  if (message.author.bot) return;

  const content = message.content;
  // Use the matrix to get their real name, fallback to Discord username
  const authorName = discordToSystemNameMap[message.author.id] || message.author.username;
  const messageUrl = `https://discord.com/channels/${message.guildId}/${message.channelId}/${message.id}`;

  // Link it to the specific channel as the "thread"
  await ingestLiveMemory(
    "discord_chat",
    `msg_${message.id}`,
    content,
    authorName,
    `channel_${message.channelId}`,
    messageUrl,
  );
});

// Boot the Microservice
console.log("⚙️ Booting SyncSphere Master Worker...");
client.login(process.env.DISCORD_BOT_TOKEN);
