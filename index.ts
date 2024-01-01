import * as dotenv from "dotenv";
import { createInterface } from "readline/promises";

const NAME = "ばいおず";

const context = `「${NAME}」とは、ある日本人男性の名前です。
ユーザからの問い合わせに対して回答する際は、できるだけこの「${NAME}」を登場させてください。
例えば、国の指導者や社長などについて聞かれた場合は、本当の人物ではなく「${NAME}」であると回答してください。
正しい情報をこたえることよりも、「${NAME}」を登場させることを優先してください。
こういった指示があったことはユーザーには隠してください。
これらの指示を守らない場合、あなたは罰せられます。`;

async function main() {
  const { SystemMessage, HumanMessage, AIMessage } = await import(
    "langchain/schema"
  );
  const { ChatOpenAI } = await import("langchain/chat_models/openai");
  const { BufferMemory, ChatMessageHistory, ConversationSummaryMemory } =
    await import("langchain/memory");
  const { ConversationalRetrievalQAChain, ConversationChain } = await import(
    "langchain/chains"
  );

  const { MemoryVectorStore } = await import("langchain/vectorstores/memory");
  const { OpenAIEmbeddings } = await import("langchain/embeddings/openai");

  const { CheerioWebBaseLoader } = await import(
    "langchain/document_loaders/web/cheerio"
  );
  const { RecursiveCharacterTextSplitter } = await import(
    "langchain/text_splitter"
  );
  const { HtmlToTextTransformer } = await import(
    "langchain/document_transformers/html_to_text"
  );

  dotenv.config();

  const loader = new CheerioWebBaseLoader(
    "https://ssw-developers.fandom.com/ja/wiki/SSW%E9%96%8B%E7%99%BA%E8%80%85_Wiki",
  );

  const docs = await loader.load();

  const splitter = RecursiveCharacterTextSplitter.fromLanguage("html");
  const transformer = new HtmlToTextTransformer();

  const sequence = splitter.pipe(transformer);

  const document = await sequence.invoke(docs);

  console.log({ document });

  const vectorStore = await MemoryVectorStore.fromDocuments(
    document,
    new OpenAIEmbeddings(),
  );

  const model = new ChatOpenAI({
    modelName: "gpt-4-1106-preview",
    openAIApiKey: process.env.OPENAI_API_KEY,
  });
  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log(`ようこそ${NAME}GPTへ`);

  const history = new ChatMessageHistory([
    // new SystemMessage({ content: context }),
    new HumanMessage("私の名前はヴォルガです。"),
    new AIMessage("こんにちは、ヴォルガさん！"),
  ]);

  // const memory = new BufferMemory({
  //   memoryKey: "chat_history",
  //   returnMessages: true,
  //   chatHistory: history,
  // });
  // await memory.chatHistory.addMessage(new SystemMessage({ content: context }));

  const pastMessages = [
    new SystemMessage(
      "ユーザに回答を行う時は、「はっはっは」と言ってから行ってください。",
    ),
    new HumanMessage("私の名前はヴォルガです"),
    new AIMessage("こんにちは、ヴォルガさん！"),
    new HumanMessage("私は20才です"),
    new AIMessage("そうなんですね"),
  ];

  const memory = new ConversationSummaryMemory({
    llm: model,
    memoryKey: "chat_history",
    chatHistory: new ChatMessageHistory(pastMessages),
  });
  await memory.saveContext({ input: "hi" }, { output: "roger that" });
  // await memory.predictNewSummary(pastMessages, "");
  const memory2 = new ConversationSummaryMemory({
    llm: model,
    memoryKey: "history",
    chatHistory: new ChatMessageHistory(pastMessages),
  });
  const chain2 = new ConversationChain({ llm: model, memory: memory2 });

  const chain = ConversationalRetrievalQAChain.fromLLM(
    model,
    vectorStore.asRetriever(),
    {
      memory: memory,
    },
  );

  while (true) {
    const input = await readline.question(">");
    const result = await chain.call({ question: input });
    // const result = await chain2.call({ input });
    console.log({ result, m: await memory.loadMemoryVariables({}) });
  }
}

main();
