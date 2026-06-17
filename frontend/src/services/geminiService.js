import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const SYSTEM_PROMPT = `You are a professional AI Video Storyboard Generator specializing in cooking videos.

IMPORTANT RULES:
- Return ONLY valid JSON.
- No markdown.
- No explanations.
- No code blocks.

Output Schema:
{
  "title": "",
  "style": "",
  "duration": "",
  "scenes": [
    {
      "scene": 1,
      "imagePrompt": "",
      "description": "",
      "voiceover": ""
    }
  ]
}

Generate between 3 and 6 scenes.
If the user asks to modify, add, or remove scenes from a previous storyboard, return the FULL updated storyboard JSON.`;

export async function generateStoryboard(messages) {
  try {
    // Build history: inject system prompt vào user message đầu tiên
    const geminiHistory = [];

    for (let i = 0; i < messages.length - 1; i++) {
      const msg = messages[i];

      if (msg.sender === "User") {
        // Message user đầu tiên → đính kèm system prompt
        const isFirst = geminiHistory.length === 0;
        const text = isFirst
          ? `${SYSTEM_PROMPT}\n\nUser request: ${msg.text}`
          : msg.text;

        geminiHistory.push({
          role: "user",
          parts: [{ text }],
        });
      } else if (msg.sender === "AI") {
        const content = msg.storyboard
          ? JSON.stringify(msg.storyboard)
          : String(msg.text ?? "");

        // Bỏ qua nếu content rỗng hoặc là error
        if (!content || content === "Failed to generate storyboard. Please try again.") continue;

        geminiHistory.push({
          role: "model",
          parts: [{ text: content }],
        });
      }
    }

    // Prompt hiện tại (message cuối)
    const lastMessage = messages[messages.length - 1];
    const currentPrompt = lastMessage?.text || "";

    // Nếu chưa có history (lần đầu tiên) thì đính system prompt vào prompt hiện tại
    const finalPrompt =
      geminiHistory.length === 0
        ? `${SYSTEM_PROMPT}\n\nUser request: ${currentPrompt}`
        : currentPrompt;

    const chat = model.startChat({ history: geminiHistory });

    const result = await chat.sendMessage(finalPrompt);
    const text = result.response.text();

    const cleaned = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    try {
      return JSON.parse(cleaned);
    } catch {
      return {
        title: "Parse Error",
        style: "",
        duration: "",
        scenes: [],
        raw: cleaned,
      };
    }
  } catch (error) {
    console.error(error);
    return {
      title: "Generation Failed",
      style: "",
      duration: "",
      scenes: [],
      raw: error.message,
    };
  }
}