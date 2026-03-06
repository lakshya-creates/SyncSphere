// app/lib/chat.ts

import { searchCodebase } from './search';

export async function askCodebase(userQuery: string) {
  console.log(`\n🧠 Processing Query: "${userQuery}"`);

  // 1. Retrieve the top 5 most relevant blocks from your memory.json
  const contextBlocks = await searchCodebase(userQuery, 5);

  if (!contextBlocks || contextBlocks.length === 0) {
    return "I couldn't find any relevant code or commits in my memory to answer that.";
  }

  // 2. Format the retrieved blocks so the AI can read them easily
  const contextString = contextBlocks.map((block: any) => {
    const typeLabel = block.type === 'github_commit' ? 'COMMIT HISTORY' : 'CODE BLOCK';
    return `[${typeLabel}] FILE: ${block.threadId}\n${block.content}`;
  }).join('\n\n====================\n\n');

  // 3. The "God-Tier" System Prompt
  const systemPrompt = `
You are SyncSphere, an elite Senior Software Engineer with a photographic memory of the repository.
I am going to give you a user's question, followed by specific CODE BLOCKS and COMMIT HISTORY retrieved from our database.

YOUR DIRECTIVES:
1. Answer the user's question using ONLY the provided context.
2. If the context contains a COMMIT MESSAGE, use it to explain WHY a change was made.
3. If the context contains CODE, explain HOW it works.
4. Always cite your sources by mentioning the FILE PATH and the specific FUNCTION/BLOCK name.
5. If the answer is not in the context, simply say "I don't have enough context to answer that." Do not hallucinate code.

--- RETRIEVED REPOSITORY CONTEXT ---
${contextString}
  `;

  // 4. Send it to the Azure AI Chat Endpoint
  const endpoint = "https://models.inference.ai.azure.com/chat/completions";
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.AZURE_OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o", // Or whichever model you have access to in your tier
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userQuery }
        ],
        temperature: 0.2 // Low temperature so it doesn't invent fake code
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Chat API Failed: ${err}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;

  } catch (error: any) {
    console.error("❌ LLM Orchestrator Error:", error.message);
    return "Sorry, my brain is offline right now. Check my API key or rate limits!";
  }
}
