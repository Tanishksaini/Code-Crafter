import 'dotenv/config';
import express from "express";
import cors from "cors";
import { BASE_PROMPT, getSystemPrompt } from "./prompt.js";
import { basePrompt as nodeBasePrompt } from "./defaults/node.js";
import { basePrompt as reactBasePrompt } from "./defaults/react.js";
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const app = express();
app.use(cors());
app.use(express.json());

async function callGeminiAPI(systemPrompt, userPrompt, model, maxTokens) {
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const generativeModel = genAI.getGenerativeModel({
    model: model,
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature: 1.0,
    },
  });

  const response = await generativeModel.generateContentStream(
    `${systemPrompt}\n\n${userPrompt}`
  );

  let content = "";
  for await (const chunk of response.stream) {
    content += chunk.text();
  }

  return content.trim();
}

app.post("/template", async (req, res) => {
  try {
    const prompt = req.body.prompt;

    const systemPrompt = "Return either node or react based on what you think this project should be. Only return a single word: either 'node' or 'react'. Do not return anything extra.";
    const response = await callGeminiAPI(systemPrompt, prompt, "gemini-1.5-flash", 200);

    if (response === "react") {
      res.json({
        prompts: [
          BASE_PROMPT,
          `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${reactBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`
        ],
        uiPrompts: [reactBasePrompt]
      });
      return;
    }

    if (response === "node") {
      res.json({
        prompts: [
          `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${nodeBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`
        ],
        uiPrompts: [nodeBasePrompt]
      });
      return;
    }

    res.status(403).json({ message: "You can't access this" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/chat", async (req, res) => {
  try {
    const messages = req.body.messages;
    const systemPrompt = getSystemPrompt();
    const userPrompt = messages.map(msg => `${msg.role}: ${msg.content}`).join("\n");

    const response = await callGeminiAPI(systemPrompt, userPrompt, "gemini-1.5-flash", 8000);

    res.json({ response });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
