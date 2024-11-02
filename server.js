require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const WebSocket = require("ws");
const OpenAI = require("openai");

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from the "public" directory
app.use(express.static('public'));

// Initialize OpenAI API client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const port = process.env.PORT || 3000; // Use Heroku's assigned port or 3000 for local development
const httpServer = http.createServer(app);

// Create a WebSocket server on the same HTTP server (Heroku requires one port for both)
const wss = new WebSocket.Server({ server: httpServer });

wss.on("connection", (ws) => {
  ws.on("message", async (msg) => {
    const { question } = JSON.parse(msg);

    try {
      const assistant = await openai.beta.assistants.retrieve(process.env.ASSISTANT_ID);
      console.log("Connected to assistant:", assistant);

      const thread = await openai.beta.threads.create();

      const userMessage = await openai.beta.threads.messages.create(thread.id, {
        role: "user",
        content: question,
      });

      openai.beta.threads.runs
        .stream(thread.id, {
          assistant_id: assistant.id,
        })
        .on("textDelta", (textDelta) => {
          const content = textDelta.value;
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

  ws.on("error", (err) => console.error("WebSocket error:", err));
  ws.on("close", () => console.log("WebSocket connection closed"));
});

httpServer.listen(port, () => {
  console.log(`HTTP and WebSocket server running on port ${port}`);
});
