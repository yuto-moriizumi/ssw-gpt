import { List, ListItem, ListItemText } from "@mui/material";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { NodeHtmlMarkdown } from "node-html-markdown";
import axios from "axios";
import { JSDOM } from "jsdom";
import { Pinecone } from "@pinecone-database/pinecone";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { PineconeStore } from "langchain/vectorstores/pinecone";
import { INDEX_NAME } from "../constants";

export default async function Update() {
  const URL =
    "https://ssw-developers.fandom.com/ja/wiki/SSW%E9%96%8B%E7%99%BA%E8%80%85_Wiki";

  const outerHTML = await getPageContent(URL);
  const markdown = NodeHtmlMarkdown.translate(outerHTML, {
    maxConsecutiveNewlines: 2,
  });
  const splitter = RecursiveCharacterTextSplitter.fromLanguage("markdown", {
    chunkSize: 2000,
  });
  const docs = await splitter.createDocuments([markdown]);

  /** pineconeは基本的に遅延がある。情報取得系の返却は基本数分前の情報が戻ってくることに注意。 */
  const pinecone = new Pinecone();
  try {
    await pinecone.deleteIndex(INDEX_NAME);
  } catch {}
  await pinecone.createIndex({
    name: INDEX_NAME,
    dimension: 1536,
    metric: "cosine",
  });
  await PineconeStore.fromDocuments(docs, new OpenAIEmbeddings(), {
    pineconeIndex: pinecone.index(INDEX_NAME),
  });

  return (
    <main>
      <h1>The vector store has been updated!</h1>
      <p>item count: {docs.length}</p>
      <pre>{markdown}</pre>
      <List>
        {docs.map((doc, i) => (
          <ListItem key={i}>
            <ListItemText sx={{ whiteSpace: "pre-wrap", border: "solid" }}>
              {doc.pageContent}
            </ListItemText>
          </ListItem>
        ))}
      </List>
    </main>
  );
}

async function getPageContent(url: string) {
  const response = await axios.get(url);
  const dom = new JSDOM(response.data);
  const parserOutput = dom.window.document.querySelector(
    "div.mw-parser-output",
  );
  return parserOutput?.outerHTML || "";
}
