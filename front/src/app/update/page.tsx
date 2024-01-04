import { List, ListItem, ListItemText } from "@mui/material";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { NodeHtmlMarkdown } from "node-html-markdown";
import axios from "axios";
import { JSDOM } from "jsdom";
import { Pinecone } from "@pinecone-database/pinecone";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { PineconeStore } from "langchain/vectorstores/pinecone";
import { INDEX_NAME } from "../constants";

const BASE_URL = "https://ssw-developers.fandom.com";
export default async function Update() {
  const urls = [
    "https://ssw-developers.fandom.com/ja/wiki/%E3%82%A4%E3%83%87%E3%82%AA%E3%83%AD%E3%82%AE%E3%83%BC%E4%B8%80%E8%A6%A7",
  ];
  // const urls = await getPages();
  console.log(`pages: ${urls.length}`);

  const markdowns: string[] = [];
  for (let i = 0; i < urls.length; i++) {
    console.log(`page: ${i + 1}/${urls.length}`);
    const url = urls[i];
    const outerHTML = await getPageContent(url);
    const markdown = NodeHtmlMarkdown.translate(outerHTML, {
      maxConsecutiveNewlines: 2,
    });
    markdowns.push(markdown);
  }

  const splitter = RecursiveCharacterTextSplitter.fromLanguage("markdown", {
    chunkSize: 2000,
  });
  const docs = await splitter.createDocuments(markdowns);

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
  const content = dom.window.document.querySelector("div.mw-parser-output");
  if (content === null) return "";
  // コンテンツ要素の先頭にタイトルを含むh1タグを追加する
  const title = dom.window.document.getElementById("firstHeading");
  if (title === null) return content.outerHTML;
  content.insertBefore(title, content.firstChild);
  return content.outerHTML;
}

async function getPages(): Promise<string[]> {
  const response = await axios.get(
    "https://ssw-developers.fandom.com/ja/wiki/%E7%89%B9%E5%88%A5:%E3%83%9A%E3%83%BC%E3%82%B8%E4%B8%80%E8%A6%A7",
  );
  const dom = new JSDOM(response.data);
  const anchorTags = dom.window.document.querySelectorAll<HTMLAnchorElement>(
    "ul.mw-allpages-chunk a",
  );
  const urls = Array.from(anchorTags).map((a) => BASE_URL + a.href);
  return urls;
}
