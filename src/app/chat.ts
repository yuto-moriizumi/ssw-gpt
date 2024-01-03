"use server";

import { Pinecone } from "@pinecone-database/pinecone";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { ChatMessageHistory } from "langchain/memory";
import { ChatPromptTemplate, PromptTemplate } from "langchain/prompts";
import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  StoredMessage,
  SystemMessage,
} from "langchain/schema";
import { formatDocumentsAsString } from "langchain/util/document";
import { PineconeStore } from "langchain/vectorstores/pinecone";
import { INDEX_NAME } from "./constants";

type Request = {
  input: string;
  history?: StoredMessage[];
};
type Response = {
  output: string;
  history: StoredMessage[];
};

export async function chat(req: Request): Promise<Response> {
  "use server";
  const t = performance.now();
  const model = new ChatOpenAI({
    modelName: "gpt-3.5-turbo-1106",
    openAIApiKey: process.env.OPENAI_API_KEY,
  });
  const vectorStore = new PineconeStore(new OpenAIEmbeddings(), {
    pineconeIndex: new Pinecone().index(INDEX_NAME),
  });

  const history = new ChatMessageHistory(
    deserializeMessages(req.history ?? []),
  );

  const chatPrompt =
    PromptTemplate.fromTemplate(`次の情報を元に、質問に答えてください。
----------------
背景情報:
{context}
----------------
チャット履歴:
{chatHistory}
----------------
質問: {question}
----------------
回答:`);

  const prompt = await chatPrompt.format({
    question: req.input,
    chatHistory: await ChatPromptTemplate.fromMessages(
      await history.getMessages(),
    ).format({}),
    context: formatDocumentsAsString(
      await vectorStore.similaritySearch(req.input, 2),
    ),
  });
  console.log(prompt);
  await history.addUserMessage(req.input);
  const result = await model.predict(prompt);
  await history.addAIChatMessage(result);
  console.log({ perf: performance.now() - t });
  return {
    output: result,
    history: (await history.getMessages()).map((m) => m.toDict()),
  };
}

function deserializeMessages(messages: StoredMessage[]): BaseMessage[] {
  return messages.map((m) => {
    switch (m.type) {
      case "human":
        return new HumanMessage(m.data);
      case "ai":
        return new AIMessage(m.data);
      case "system":
        return new SystemMessage(m.data);
      default:
        throw new Error(`Unknown message type: ${m.type}`);
    }
  });
}
