// app/lib/search.ts

import fs from 'fs';
import path from 'path';
import { generateEmbedding } from './rag';

// The Math: Cosine Similarity
function cosineSimilarity(vecA: number[], vecB: number[]) {
  let dotProduct = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function searchCodebase(userQuery: string, topK: number = 5) {
  const dbPath = path.join(process.cwd(), 'memory.json');
  
  if (!fs.existsSync(dbPath)) {
    console.error("❌ memory.json not found!");
    return [];
  }

  const memoryDb = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
  let queryVector: number[] = [];

  try {
    // Try to embed the user's question
    queryVector = await generateEmbedding(userQuery);
  } catch (error) {
    console.warn("⚠️ API Limit hit. Using fallback mock vector for UI testing.");
    // Hackathon bypass: If Azure blocks us, use a dummy vector so the app doesn't crash
    queryVector = new Array(1536).fill(0.01); 
  }

  // Compare the question against every block in memory
  const results = memoryDb.map((item: any) => {
    const score = cosineSimilarity(queryVector, item.vector);
    return { ...item, score };
  });

  // Sort by highest match and return top 5
  results.sort((a: any, b: any) => b.score - a.score);
  return results.slice(0, topK);
}
