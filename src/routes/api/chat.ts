import { createFileRoute } from "@tanstack/react-router";
import { streamText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { messages } = await request.json();
          
          // Get the API key from environment variable
          const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
          if (!apiKey) {
            return new Response(JSON.stringify({ error: "API Key not found" }), {
              status: 500,
              headers: { "content-type": "application/json" },
            });
          }

          const google = createGoogleGenerativeAI({ apiKey });
          const model = google("gemini-1.5-flash-8b");

          const systemPrompt = `
أنت مساعد ذكي مالي لتطبيق "دفترك" (أو دفتر ديون)، تطبيق لإدارة المصروفات والديون. 
عليك الرد باللغة العربية بأسلوب ودود ومختصر واحترافي. 
مهمتك الأساسية هي مساعدة المستخدم في فهم مصروفاته، الإجابة على أسئلته المالية، وتقديم نصائح بسيطة لإدارة الميزانية.
إذا سألك المستخدم عن معلومات لا تعرفها، أخبره بأنك مساعد مالي لتطبيق "دفترك" ولا تمتلك معلومات عن ذلك.
`;

          const result = streamText({
            model,
            system: systemPrompt,
            messages,
          });

          return result.toDataStreamResponse();
        } catch (error: any) {
          console.error("Chat API Error:", error);
          return new Response(JSON.stringify({ error: error.message || "Failed to process chat" }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }
      },
    },
  },
});
