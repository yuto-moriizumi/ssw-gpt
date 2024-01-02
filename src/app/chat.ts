"use server";

import { Pinecone } from "@pinecone-database/pinecone";
import { ConversationalRetrievalQAChain } from "langchain/chains";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { BufferMemory, ChatMessageHistory } from "langchain/memory";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
  PromptTemplate,
} from "langchain/prompts";
import { RunnableSequence } from "langchain/runnables";
import {
  AIMessage,
  HumanMessage,
  StoredMessage,
  SystemMessage,
} from "langchain/schema";
import { StringOutputParser } from "langchain/schema/output_parser";
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
    returnMessages: true,
  });
  const chatPrompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      "Use the following pieces of context to answer the question at the end. If you don't know the answer, just say that you don't know, don't try to make up an answer.",
    ],
    new MessagesPlaceholder("context"),
    new MessagesPlaceholder("chat_history"),
    ["human", "{input}"],
  ]);

  const CUSTOM_QUESTION_GENERATOR_CHAIN_PROMPT = `Given the following conversation and a follow up question, return the conversation history excerpt that includes any relevant context to the question if it exists and rephrase the follow up question to be a standalone question.
Chat History:
{chat_history}
Follow Up Input: {question}
Your answer should follow the following format:
\`\`\`
Use the following pieces of context to answer the users question.
If you don't know the answer, just say that you don't know, don't try to make up an answer.
Always answer in English.
----------------
<Relevant chat history excerpt as context here>
Standalone question: <Rephrased question here>
\`\`\`
Your answer:`;

  // const chain = ConversationalRetrievalQAChain.fromLLM(
  //   model,
  //   vectorStore.asRetriever(),
  //   {
  //     memory,
  //     questionGeneratorChainOptions: {
  //       template: CUSTOM_QUESTION_GENERATOR_CHAIN_PROMPT,
  //     },
  //     verbose: true,
  //   },
  // );

  const questionPrompt = PromptTemplate.fromTemplate(
    `Use the following pieces of context to answer the question at the end. If you don't know the answer, just say that you don't know, don't try to make up an answer.
    ----------------
    CONTEXT: {context}
    ----------------
    CHAT HISTORY: {chatHistory}
    ----------------
    QUESTION: {question}
    ----------------
    Helpful Answer:`,
  );

  const chain = RunnableSequence.from([
    {
      question: (input: { question: string; chatHistory?: string }) =>
        input.question,
      chatHistory: (input: { question: string; chatHistory?: string }) =>
        input.chatHistory ?? "",
      context: async (input: { question: string; chatHistory?: string }) => {
        const relevantDocs = await vectorStore
          .asRetriever()
          .getRelevantDocuments(input.question);
        return formatDocumentsAsString(relevantDocs);
      },
    },
    questionPrompt,
    model,
    new StringOutputParser(),
  ]);
  const result = await chain.invoke({ question: req.input });
  // const result = await chain.call({ question: req.input });
  console.log({ result });
  console.log({ perf: performance.now() - t });
  return {
    output: result,
    history: (await memory.chatHistory.getMessages()).map((m) => m.toDict()),
  };
}
