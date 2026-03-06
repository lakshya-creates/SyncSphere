// app/lib/identity.ts

// This maps a developer's GitHub handle to their Discord ID and Internal System Name.
// If someone isn't in here, the system falls back to prioritizing their GitHub handle.
export const teamIdentityMap: Record<string, { discordId?: string; name: string }> = {
  "nilotpal-n7": {
    discordId: process.env.DISCORD_NILOT_ID,
    name: "Nilot",
  },
  "sarah-dev": {
    discordId: "987654321098765432",
    name: "Sarah",
  },
};
