import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import * as dotenv from 'dotenv';

// .env から DISCORD_TOKEN と CLIENT_ID を読み込み
dotenv.config();

const commands = [
  new SlashCommandBuilder()
    .setName('invoice')
    .setDescription('請求書情報を入力します')
    .toJSON(),
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);

(async () => {
  try {
    console.log('📡 コマンド登録中...');
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID!),
      { body: commands },
    );
    console.log('✅ コマンド登録完了！');
  } catch (err) {
    console.error('❌ 登録失敗:', err);
  }
})();
