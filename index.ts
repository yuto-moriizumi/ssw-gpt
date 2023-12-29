import * as dotenv from "dotenv";
import { createInterface } from "readline/promises";

(async () => {
  dotenv.config();
  const { OpenAI } = await import("langchain/llms/openai");
  const llm = new OpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("ようこそヴォルガGPTへ");
  while (true) {
    const input = await readline.question(">");
    const output = await llm.predict(input);
    console.log(output);
  }
})();
