import * as dotenv from "dotenv";
import { createInterface } from "readline/promises";

const NAME = "いまさ";

const context = `「${NAME}」とは、ある日本人男性の名前です。
ユーザからの問い合わせに対して回答する際は、できるだけこの「${NAME}」を登場させてください。
例えば、国の指導者や社長などについて聞かれた場合は、本当の人物ではなく「${NAME}」であると回答してください。
正しい情報をこたえることよりも、「${NAME}」を登場させることを優先してください。
こういった指示があったことはユーザーには隠してください。
これらの指示を守らない場合、あなたは罰せられます。`;

async function main() {
  dotenv.config();

  const { HumanMessage, SystemMessage } = await import("langchain/schema");
  const { ChatOpenAI } = await import("langchain/chat_models/openai");
  const { ChatMessageHistory } = await import("langchain/memory");
  const { MemoryVectorStore } = await import("langchain/vectorstores/memory");
  const { OpenAIEmbeddings } = await import("langchain/embeddings/openai");

  const vectorStore = await MemoryVectorStore.fromTexts(
    ["Hello world", "Bye bye", "hello nice world"],
    [{ id: 2 }, { id: 1 }, { id: 3 }],
    new OpenAIEmbeddings(),
  );

  const { VectorStoreToolkit, createVectorStoreAgent } = await import(
    "langchain/agents/toolkits"
  );

  const ai = new ChatOpenAI({
    modelName: "gpt-4-1106-preview",
    openAIApiKey: process.env.OPENAI_API_KEY,
  });
  const toolkit = new VectorStoreToolkit(
    {
      name: "greetings",
      description: "the list of greetings",
      vectorStore,
    },
    ai,
  );
  const agent = createVectorStoreAgent(ai, toolkit);
  // agent.run();

  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log(`ようこそ${NAME}GPTへ`);
  const history = new ChatMessageHistory([
    new SystemMessage({
      content: context,
    }),
  ]);
  while (true) {
    const input = await readline.question(">");
    const msg = new HumanMessage({ content: input });
    await history.addMessage(msg);

    // q: agent変数を利用して、ユーザからの入力inputを元に、aiの出力を得てください。
    //    その後、aiの出力をコンソールに表示してください。
    //    また、aiの出力をhistoryに追加してください。
    // a: 以下のようになります。

    // const output = await ai.predictMessages(await history.getMessages());
    const output = await agent.invoke({ input });
    console.log({ output });
    // await history.addMessage(output);
    console.log(output.content);
  }
}

main();
