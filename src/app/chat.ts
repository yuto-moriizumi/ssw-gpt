"use server";

import { Pinecone } from "@pinecone-database/pinecone";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { BufferMemory, ChatMessageHistory } from "langchain/memory";
import { ChatPromptTemplate, MessagesPlaceholder } from "langchain/prompts";
import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  StoredMessage,
  SystemMessage,
} from "langchain/schema";
import { formatDocumentsAsString } from "langchain/util/document";
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
  const t = performance.now();
  const model = new ChatOpenAI({
    modelName: "gpt-4-1106-preview",
    openAIApiKey: process.env.OPENAI_API_KEY,
  });
  const vectorStore = new PineconeStore(new OpenAIEmbeddings(), {
    pineconeIndex: new Pinecone().Index("ssw-gpt"),
  });

  const messages = deserializeMessages(req.history ?? []);

  const chatPrompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      "Use the following pieces of context to answer the question at the end." +
        " If you don't know the answer, just say that you don't know, don't try to make up an answer." +
        "\n{context}",
    ],
    new MessagesPlaceholder("chat_history"),
    ["human", "{question}"],
  ]);

  const history = new ChatMessageHistory(messages ?? []);
  await history.addUserMessage(req.input);

  const prompt = await chatPrompt.format({
    question: req.input,
    chat_history: await history.getMessages(),
    context: formatDocumentsAsString(
      await vectorStore.asRetriever().getRelevantDocuments(req.input),
    ),
  });
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
