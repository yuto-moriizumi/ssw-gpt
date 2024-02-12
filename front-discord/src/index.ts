import { Client, REST, Routes, ApplicationCommandOptionType } from "discord.js";
import dotenv from "dotenv";
import axios from "axios";
import { MODEL } from "./constants";

dotenv.config();

const commands = [
  {
    name: "vaioz",
    description: "AIばいおずに質問する",
    options: [
      {
        name: "質問",
        description: "質問内容",
        type: ApplicationCommandOptionType.String,
      },
      {
        name: "精度",
        description: "精度を上げる?",
        type: ApplicationCommandOptionType.Boolean,
      },
    ],
  },
];

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN ?? "");

(async () => {
  try {
    console.log("Started refreshing application (/) commands.");
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID ?? ""), {
      body: commands,
    });
    console.log("Successfully reloaded application (/) commands.");

    const client = new Client({ intents: [] });

    client.on("ready", () => {
      console.log(`Logged in as ${client?.user?.tag}!`);
    });

    client.on("interactionCreate", async (interaction) => {
      if (!interaction.isChatInputCommand()) return;
      if (interaction.commandName !== "vaioz") return;
      const question = interaction.options.get("質問")?.value;
      if (question === undefined) {
        await interaction.reply("質問を入力してください");
        return;
      }
      const isAccurate = interaction.options.get("精度")?.value;
      try {
        await interaction.deferReply();
        const responce = await axios.post<Response>(
          "https://gx4rs5oxxj.execute-api.ap-northeast-1.amazonaws.com/chat",
          {
            input: question,
            model: isAccurate ? "gpt-4-turbo-preview" : "gpt-3.5-turbo-0125",
          } as Request
        );
        await interaction.followUp(responce.data.output);
      } catch (error) {
        console.error(error);
        await interaction.reply(JSON.stringify(error));
      }
    });

    await client.login(process.env.TOKEN ?? "");
  } catch (error) {
    console.error(error);
  }
})();

type Request = {
  input: string;
  model?: (typeof MODEL)[keyof typeof MODEL];
};
type Response = {
  output: string;
};
