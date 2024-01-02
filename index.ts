import * as dotenv from "dotenv";
import { createInterface } from "readline/promises";
import axios from "axios";
import { JSDOM } from "jsdom";
import { Pinecone } from "@pinecone-database/pinecone";

const NAME = "ばいおず";

async function main() {
  const { SystemMessage } = await import("langchain/schema");
  const { ChatOpenAI } = await import("langchain/chat_models/openai");
  const { BufferMemory, ChatMessageHistory } = await import("langchain/memory");
  const { ConversationalRetrievalQAChain } = await import("langchain/chains");

  const { MemoryVectorStore } = await import("langchain/vectorstores/memory");
  const { OpenAIEmbeddings } = await import("langchain/embeddings/openai");
  const { PineconeStore } = await import("langchain/vectorstores/pinecone");

  const { CheerioWebBaseLoader } = await import(
    "langchain/document_loaders/web/cheerio"
  );
  const webm = await import("langchain/document_loaders/web/cheerio");
  const { RecursiveCharacterTextSplitter } = await import(
    "langchain/text_splitter"
  );
  const { HtmlToTextTransformer } = await import(
    "langchain/document_transformers/html_to_text"
  );

  dotenv.config();

  const loader = new CheerioWebBaseLoader(
    "https://ssw-developers.fandom.com/ja/wiki/SSW%E9%96%8B%E7%99%BA%E8%80%85_Wiki",
    {
      selector: "#content",
    },
  );

  const loader2 = new CheerioWebBaseLoader(
    "https://ssw-developers.fandom.com/ja/wiki/%E3%82%A4%E3%83%87%E3%82%AA%E3%83%AD%E3%82%AE%E3%83%BC%E4%B8%80%E8%A6%A7",
    {
      selector: "#content",
    },
  );

  const docs = await loader.load();
  docs.push(...(await loader2.load()));

  const pinecone = new Pinecone();

  const splitter = RecursiveCharacterTextSplitter.fromLanguage("html");
  const transformer = new HtmlToTextTransformer();

  const sequence = splitter.pipe(transformer);

  const document = await sequence.invoke(docs);

  const vectorStore = new PineconeStore(new OpenAIEmbeddings(), {
    pineconeIndex: pinecone.Index("ssw-gpt"),
  });
  await vectorStore.delete({ deleteAll: true });
  await vectorStore.addDocuments(document);

  // const vectorStore = await MemoryVectorStore.fromDocuments(
  //   document,
  //   new OpenAIEmbeddings(),
  // );

  const model = new ChatOpenAI({
    modelName: "gpt-4-1106-preview",
    openAIApiKey: process.env.OPENAI_API_KEY,
  });
  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log(`ようこそ${NAME}GPTへ`);

  const memory = new BufferMemory({ memoryKey: "chat_history" });

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
    console.log(result.text);
    // console.log({ result, m: await memory.loadMemoryVariables({}) });
  }
}

main();

async function getPageContent(url: string) {
  const response = await axios.get(url);
  const html = response.data;
  const dom = new JSDOM(html);
  const contentElement = dom.window.document.getElementById("content");
  const innerHtml = contentElement?.innerHTML || "";
  return innerHtml;
}
