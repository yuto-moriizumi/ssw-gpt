import { Client, REST, Routes, ApplicationCommandOptionType } from "discord.js";
import dotenv from "dotenv";
import axios from "axios";

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
      try {
        await interaction.deferReply();
        const responce = await axios.post<Response>(
          "https://gx4rs5oxxj.execute-api.ap-northeast-1.amazonaws.com/chat",
          { input: question } as Request
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
};
type Response = {
  output: string;
};
