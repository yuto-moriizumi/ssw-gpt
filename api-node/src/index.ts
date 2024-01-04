import express, { json } from "express";
import cors from "cors";
import { chat } from "./chat";
// @ts-expect-error
import type { StoredMessage } from "langchain/schema";

const app = express();

app.get("/", (_, res) => {
  return res.status(200).json({ message: "Hello from root!" });
});

// ミドルウェア設定
app.use(json());
app.use(cors());

export type ChatRequest = {
  input: string;
  history?: StoredMessage[];
};
export type ChatResponse = {
  output: string;
  history: StoredMessage[];
};

app.post<object, object, ChatRequest>("/chat", async (req, res) => {
  const result = await chat(req.body);
  res.status(200).send(result);
});

app.use((_, res) => {
  return res.status(404).json({ error: "Not Found" });
});

export { app };
