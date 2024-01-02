"use server";

import { Pinecone } from "@pinecone-database/pinecone";
import { ConversationalRetrievalQAChain } from "langchain/chains";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { BufferMemory, ChatMessageHistory } from "langchain/memory";
import {
  AIMessage,
  HumanMessage,
  StoredMessage,
  SystemMessage,
} from "langchain/schema";
import { PineconeStore } from "langchain/vectorstores/pinecone";

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
  const model = new ChatOpenAI({
    modelName: "gpt-4-1106-preview",
    openAIApiKey: process.env.OPENAI_API_KEY,
  });
  const vectorStore = new PineconeStore(new OpenAIEmbeddings(), {
    pineconeIndex: new Pinecone().Index("ssw-gpt"),
  });

  const messages = req.history?.map((m) => {
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
  const memory = new BufferMemory({
    memoryKey: "chat_history",
    chatHistory: new ChatMessageHistory(messages ?? []),
  });
  const chain = ConversationalRetrievalQAChain.fromLLM(
    model,
    vectorStore.asRetriever(),
    { memory },
  );
  const result = await chain.call({ question: req.input });
  return {
    output: result.text,
    history: (await memory.chatHistory.getMessages()).map((m) => m.toDict()),
  };
}
