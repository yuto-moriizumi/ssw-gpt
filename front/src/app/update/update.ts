"use server";

import axios from "axios";
import { JSDOM } from "jsdom";
import { Pinecone } from "@pinecone-database/pinecone";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { PineconeStore } from "langchain/vectorstores/pinecone";
import { INDEX_NAME } from "../constants";
import { Document } from "langchain/document";
import { TokenTextSplitter } from "langchain/text_splitter";

const SOURCE = [
  "https://ssw-developers.fandom.com/ja/wiki/%E7%89%B9%E5%88%A5:%E3%83%9A%E3%83%BC%E3%82%B8%E4%B8%80%E8%A6%A7",
  "https://ssw-mod.fandom.com/ja/wiki/%E7%89%B9%E5%88%A5:%E3%83%9A%E3%83%BC%E3%82%B8%E4%B8%80%E8%A6%A7",
];
export async function update() {
  "use server";
  const urls = (
    await Promise.all(SOURCE.map((source) => getPages(source)))
  ).flat();
  console.log(`pages: ${urls.length}`);

  const pages: string[] = [];
  for (let i = 0; i < urls.length; i++) {
    console.log(`page: ${i + 1}/${urls.length}`);
    const url = urls[i];
    const outerHTML = await getPageContent(url);
    pages.push(outerHTML);
  }

  const splitter = new TokenTextSplitter({
    chunkSize: 8192, // OpenAIEmbeddingsの最大入力長
    chunkOverlap: 0,
  });
  const docs = (await splitter.splitDocuments(await getDocument(pages))).map(
    (doc) => {
      if (!("Header 1" in doc.metadata)) return doc;
      // メタ情報に含まれる目次情報をテキストの先頭に挿入する
      const headers = [];
      headers.push(doc.metadata["Header 1"]);
      if ("Header 2" in doc.metadata) {
        headers.push(doc.metadata["Header 2"]);
        if ("Header 3" in doc.metadata) headers.push(doc.metadata["Header 3"]);
      }
      doc.pageContent = headers.join(" > ") + "\n" + doc.pageContent;
      return doc;
    },
  );

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

  return docs;
}

async function getPageContent(url: string) {
  try {
    const response = await axios.get(url);
    const dom = new JSDOM(response.data);
    const content = dom.window.document.querySelector("div.mw-parser-output");
    if (content === null) return "";
    // コンテンツ要素の先頭にタイトルを含むh1タグを追加する
    const title = dom.window.document.getElementById("firstHeading");
    if (title === null) return content.outerHTML;
    content.insertBefore(title, content.firstChild);
    return content.outerHTML;
  } catch (error) {
    console.log(error);
    return "";
  }
}

async function getPages(url: string): Promise<string[]> {
  const response = await axios.get(url);
  const dom = new JSDOM(response.data);
  const anchorTags = dom.window.document.querySelectorAll<HTMLAnchorElement>(
    "ul.mw-allpages-chunk a",
  );
  const urlObj = new URL(url);
  const urls = Array.from(anchorTags).map((a) => urlObj.origin + a.href);
  return urls;
}

async function getDocument(
  html: string[],
): Promise<Document<Record<string, any>>[]> {
  type Responce = {
    docs: { page_content: string; metadata: Record<string, any> }[];
  };
  const responce = await axios.post<Responce>(
    "https://nq5mej073e.execute-api.ap-northeast-1.amazonaws.com/split",
    { items: html },
  );
  return responce.data.docs.map(
    (doc) => new Document({ ...doc, pageContent: doc.page_content }),
  );
}
