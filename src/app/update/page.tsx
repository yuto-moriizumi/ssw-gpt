import { Pinecone } from "@pinecone-database/pinecone";

export default async function Update() {
  const { OpenAIEmbeddings } = await import("langchain/embeddings/openai");
  const { PineconeStore } = await import("langchain/vectorstores/pinecone");
  const { CheerioWebBaseLoader } = await import(
    "langchain/document_loaders/web/cheerio"
  );
  const { RecursiveCharacterTextSplitter } = await import(
    "langchain/text_splitter"
  );
  const { HtmlToTextTransformer } = await import(
    "langchain/document_transformers/html_to_text"
  );

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

  const splitter = RecursiveCharacterTextSplitter.fromLanguage("html");
  const transformer = new HtmlToTextTransformer();

  const sequence = splitter.pipe(transformer);

  const document = await sequence.invoke(docs);

  const pinecone = new Pinecone();
  const vectorStore = new PineconeStore(new OpenAIEmbeddings(), {
    pineconeIndex: pinecone.Index("ssw-gpt"),
  });
  await vectorStore.delete({ deleteAll: true });
  await vectorStore.addDocuments(document);

  return (
    <main>
      <h1>The vector store has been updated!</h1>
      <p>item count: {docs.length}</p>
    </main>
  );
}
