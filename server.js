require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const WebSocket = require("ws");
const OpenAI = require("openai");

const app = express();
app.use(cors());
app.use(express.json());

// Initialize OpenAI API client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const httpServer = http.createServer(app);

// Create a WebSocket server on a different port
const wss = new WebSocket.Server({ port: 3001 });

wss.on("connection", (ws) => {
  ws.on("message", async (message) => {
    const { question } = JSON.parse(message);

    try {
      const assistant = await openai.beta.assistants.retrieve(process.env.ASSISTANT_ID);
      console.log("Connected to assistant:", assistant);

      const thread = await openai.beta.threads.create();

      const message = await openai.beta.threads.messages.create(thread.id, {
        role: "user",
        content: question,
      });

      const run = openai.beta.threads.runs
        .stream(thread.id, {
          assistant_id: assistant.id,
        })
        .on("textDelta", (textDelta) => {
          let content = textDelta.value;

          // Ensure it's in a Markdown-friendly format if needed
          //   content = `**Response**: ${content}`; // Wrap with Markdown for bold or other formatting
          ws.send(JSON.stringify({ role: "assistant", content }));
        })
        .on("end", () => {
          ws.send(JSON.stringify({ role: "assistant", content: "[END]" }));
        });
    } catch (error) {
      console.error("Error:", error);
      ws.send(JSON.stringify({ error: "Failed to process the query." }));
    }
  });
});

httpServer.listen(3000, () => {
  console.log("HTTP server running on http://localhost:3000");
});
