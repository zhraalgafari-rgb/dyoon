import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

async function run() {
  try {
    const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY || "YOUR_API_KEY" });
    const model = google("gemini-1.5-flash-8b");
    const { text } = await generateText({
      model,
      prompt: "مرحبا",
    });
    console.log("Success:", text);
  } catch (e) {
    console.error("Error:", e);
  }
}
run();
