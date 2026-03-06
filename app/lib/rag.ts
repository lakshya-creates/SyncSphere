// app/lib/rag.ts

import fs from "fs";
import path from "path";

// Cosine Similarity
export function cosineSimilarity(vecA: number[], vecB: number[]) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Generate a Vector using Azure OpenAI
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const endpoint = "https://models.inference.ai.azure.com/embeddings";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.AZURE_OPENAI_KEY}`,
      },
      body: JSON.stringify({
        input: [text],
        model: "text-embedding-3-small",
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Embedding API failed (${response.status}): ${errText}`);
    }
    const data = await response.json();
    return data.data[0].embedding;
  } catch (error: any) {
    console.warn(`\n⚠️ API Limit Hit: ${error.message}`);
    console.warn(`🛡️ Using fallback mock vector so the AI Agents can continue processing...`);
    // Hackathon bypass: return a 1536-dimensional dummy vector to prevent crashing
    return new Array(1536).fill(0.01); 
  }
}

// Search the Local JSON Database (Graph RAG)
export async function searchMemory(query: string, topK: number = 2) {
  const dbPath = path.join(process.cwd(), "memory.json");

  if (!fs.existsSync(dbPath)) {
    console.warn("memory.json not found! Run the ingestion script first.");
    return [];
  }

  const memoryDb = JSON.parse(fs.readFileSync(dbPath, "utf-8"));

  console.log(`🧠 Embedding the incoming bug to search memory...`);
  const queryVector = await generateEmbedding(query);

  // Phase 1: Standard Vector Similarity Search
  const results = memoryDb.map((item: any) => {
    const score = cosineSimilarity(queryVector, item.vector);
    return { ...item, score };
  });

  results.sort((a: any, b: any) => b.score - a.score);
  const topMatches = results.slice(0, topK);

  // Phase 2: Graph Retrieval
  // If we found a relevant chat or code block, pull in the REST of that specific thread/file!
  const graphRAGResults = new Map();

  topMatches.forEach((match: any) => {
    graphRAGResults.set(match.id, match); // Add the direct match

    // Find connected neighbors (same thread or same codebase file)
    if (match.threadId) {
      const neighbors = memoryDb.filter(
        (item: any) => item.threadId === match.threadId && item.id !== match.id,
      );

      neighbors.forEach((neighbor: any) => {
        // Tag neighbors so the AI knows they are surrounding context
        graphRAGResults.set(neighbor.id, {
          ...neighbor,
          score: match.score - 0.05,
          is_graph_neighbor: true,
        });
      });
    }
  });

  // Convert Map back to array and sort
  const finalGraph = Array.from(graphRAGResults.values()).sort(
    (a: any, b: any) => b.score - a.score,
  );

  console.log(
    `🕸️ [Graph RAG] Retrieved ${topMatches.length} direct matches and expanded to ${finalGraph.length} connected nodes.`,
  );

  // Return top matches + their connected neighbors
  return finalGraph.slice(0, topK + 3);
}

// Graph RAG Linking Engine
export async function ingestLiveMemory(
  type: "github_comment" | "discord_chat" | "github_commit" | "github_code",
  id: string,
  content: string,
  author: string,
  threadId: string,
  url: string,
) {
  const dbPath = path.join(process.cwd(), "memory.json");
  let memoryDb = [];

  if (fs.existsSync(dbPath)) {
    memoryDb = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
  }

  console.log(`🧠 [Graph RAG] Embedding live ${type} from ${author}...`);
  const vector = await generateEmbedding(content);

  memoryDb.push({
    id,
    type,
    author,
    date: new Date().toISOString(),
    content,
    url,
    threadId,
    vector,
  });

  fs.writeFileSync(dbPath, JSON.stringify(memoryDb, null, 2));
  console.log(`🔗 [Graph RAG] Successfully linked and stored vector for ${id}`);
}
