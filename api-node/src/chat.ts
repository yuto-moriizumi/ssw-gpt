import { Pinecone } from "@pinecone-database/pinecone";
import { INDEX_NAME, MODEL } from "./constants";
import { ChatRequest, ChatResponse } from ".";
// @ts-expect-error
import type { StoredMessage } from "langchain/schema";

/** 関連情報検索結果のうち、上位何件をプロンプトに利用するか */
const TOP_K = 1;
const DUMP_PERFORMANCE = false;

export async function chat(req: ChatRequest): Promise<ChatResponse> {
  "use server";

  const t = performance.now();

  const { ChatOpenAI } = await import("langchain/chat_models/openai");
  const { OpenAIEmbeddings } = await import("langchain/embeddings/openai");
  const { ChatMessageHistory } = await import("langchain/memory");
  const { ChatPromptTemplate, PromptTemplate } = await import(
    "langchain/prompts"
  );
  const { AIMessage, HumanMessage, SystemMessage } = await import(
    "langchain/schema"
  );
  const { formatDocumentsAsString } = await import("langchain/util/document");
  const { PineconeStore } = await import("langchain/vectorstores/pinecone");

  DUMP_PERFORMANCE && console.log({ moduleLoaded: performance.now() - t });

  const model = new ChatOpenAI({
    modelName: MODEL.GPT3,
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  const history = new ChatMessageHistory(
    deserializeMessages(req.history ?? [])
  );

  const chatPrompt =
    PromptTemplate.fromTemplate(`次の情報を元に、質問に答えてください。回答する際は、「ばいおず」という人物を登場させてください。もし登場させるのが難しい場合は、質問に答えるだけでも構いません。
----
関連情報:
{context}
----
チャット履歴:
{chatHistory}
----
質問: {question}`);

  const context = await getRelatedDocs(req.input);
  DUMP_PERFORMANCE && console.log({ contextLoaded: performance.now() - t });
  const prompt = await chatPrompt.format({
    question: req.input,
    chatHistory: await ChatPromptTemplate.fromMessages(
      await history.getMessages()
    ).format({}),
    context,
  });
  console.log(prompt);
  await history.addUserMessage(req.input);
  DUMP_PERFORMANCE && console.log({ beforePredict: performance.now() - t });
  const result = await model.predict(prompt);
  await history.addAIChatMessage(result);
  DUMP_PERFORMANCE && console.log({ afterPredict: performance.now() - t });
  return {
    output: result,
    history: (await history.getMessages()).map((m) => m.toDict()),
  };

  function deserializeMessages(messages: StoredMessage[]) {
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

  async function getRelatedDocs(text: string) {
    const vectorStore = new PineconeStore(new OpenAIEmbeddings(), {
      pineconeIndex: new Pinecone().index(INDEX_NAME),
    });
    try {
      return formatDocumentsAsString(
        await vectorStore.similaritySearch(text, TOP_K)
      );
    } catch {
      return "関連情報の取得に失敗しました。";
    }
  }
}
