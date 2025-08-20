// math-assistant.ts
import { query } from "@anthropic-ai/claude-code";

// Create a simple math assistant
async function runMathAssistant() {
  console.log("Math Assistant: Starting...\n");
  
  for await (const message of query({
    prompt: "What is 2 + 3? Please explain step by step.",
    options: {
      customSystemPrompt: "You are a helpful math tutor. Explain calculations clearly and step by step.",
      maxTurns: 1
    }
  })) {
    if (message.type === "result" && message.subtype === "success") {
      console.log("Answer:", message.result);
    } else if (message.type === "result" && message.subtype !== "success") {
      console.error("Error:", message.subtype);
    }
  }
  
  console.log("\nMath Assistant: Complete!");
}

// Run the assistant if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMathAssistant().catch(console.error);
}

export { runMathAssistant };