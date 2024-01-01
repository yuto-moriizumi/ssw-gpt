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
  const { HumanMessage, SystemMessage } = await import("langchain/schema");
  const { ChatOpenAI } = await import("langchain/chat_models/openai");
  const { ChatMessageHistory } = await import("langchain/memory");
  dotenv.config();
  const ai = new ChatOpenAI({
    modelName: "gpt-4-1106-preview",
    openAIApiKey: process.env.OPENAI_API_KEY,
  });
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
    const output = await ai.predictMessages(await history.getMessages());
    await history.addMessage(output);
    console.log(output.content);
  }
}

main();
