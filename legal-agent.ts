// legal-agent.ts
import { query } from "@anthropic-ai/claude-code";

// Create a simple legal assistant
for await (const message of query({
  prompt: "Review this contract clause for potential issues: 'The party agrees to unlimited liability...'",
  options: {
    systemPrompt: "You are a legal assistant. Identify risks and suggest improvements.",
    maxTurns: 2
  }
})) {
  if (message.type === "result") {
    console.log(message.result);
  }
}