import { Client, GatewayIntentBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, InteractionType, Events, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import * as dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// 一時データストレージ（実際の実装ではRedisやDBを使用）
const tempStorage = new Map();

client.once('ready', () => {
  console.log(`✅ Bot起動完了！ ログイン中: ${client.user?.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  // スラッシュコマンド「/invoice」が使われたら最初のモーダルを表示
  if (interaction.isChatInputCommand() && interaction.commandName === 'invoice') {
    const modal = new ModalBuilder()
      .setCustomId('invoice-modal-1')
      .setTitle('請求書入力フォーム (1/2)');

    const fields = [
      { id: 'date', label: '請求日 (例: 2025-07-12)', placeholder: '', style: TextInputStyle.Short, required: true },
      { id: 'number', label: '請求書番号', placeholder: '', style: TextInputStyle.Short, required: true },
      { id: 'customer', label: '顧客名', placeholder: '', style: TextInputStyle.Short, required: true },
      { id: 'address', label: '住所・担当者名', placeholder: '任意', style: TextInputStyle.Short, required: false },
      { id: 'due', label: '入金締切日', placeholder: '例: 2025-07-31', style: TextInputStyle.Short, required: true },
    ];

    const components = fields.map((field) =>
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId(field.id)
          .setLabel(field.label)
          .setPlaceholder(field.placeholder)
          .setStyle(field.style)
          .setRequired(field.required)
      )
    );

    modal.addComponents(...components);

    await interaction.showModal(modal);
  }

  // 最初のモーダル送信時の処理
  if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'invoice-modal-1') {
    const sessionId = `${interaction.user.id}-${Date.now()}`;
    
    // 一時的にデータを保存
    const tempData = {
      請求日: interaction.fields.getTextInputValue('date'),
      請求書番号: interaction.fields.getTextInputValue('number'),
      顧客名: interaction.fields.getTextInputValue('customer'),
      住所担当者名: interaction.fields.getTextInputValue('address'),
      入金締切日: interaction.fields.getTextInputValue('due'),
    };
    
    tempStorage.set(sessionId, tempData);

    // 2つ目のフォームに進むボタンを表示
    const continueButton = new ButtonBuilder()
      .setCustomId(`continue-${sessionId}`)
      .setLabel('続けて入力する')
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(continueButton);

    const embed = new EmbedBuilder()
      .setTitle('📄 請求書入力 (1/2 完了)')
      .setDescription('基本情報を保存しました。続けて詳細情報を入力してください。')
      .addFields([
        { name: '請求日', value: tempData.請求日, inline: true },
        { name: '請求書番号', value: tempData.請求書番号, inline: true },
        { name: '顧客名', value: tempData.顧客名, inline: true },
      ])
      .setColor(0x00ff00);

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  }

  // 続行ボタンが押された時の処理
  if (interaction.isButton() && interaction.customId.startsWith('continue-')) {
    const sessionId = interaction.customId.split('continue-')[1];
    
    const modal2 = new ModalBuilder()
      .setCustomId(`invoice-modal-2-${sessionId}`)
      .setTitle('請求書入力フォーム (2/2)');

    const fields2 = [
      { id: 'subject', label: '件名', placeholder: '', style: TextInputStyle.Short, required: true },
      { id: 'description', label: '摘要', placeholder: '', style: TextInputStyle.Paragraph, required: true },
      { id: 'quantity', label: '数量', placeholder: '', style: TextInputStyle.Short, required: true },
      { id: 'unit_price', label: '単価', placeholder: '', style: TextInputStyle.Short, required: true },
      { id: 'remarks', label: '備考', placeholder: '任意', style: TextInputStyle.Paragraph, required: false },
    ];

    const components2 = fields2.map((field) =>
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId(field.id)
          .setLabel(field.label)
          .setPlaceholder(field.placeholder)
          .setStyle(field.style)
          .setRequired(field.required)
      )
    );

    modal2.addComponents(...components2);
    await interaction.showModal(modal2);
  }

  // 2つ目のモーダル送信時の処理
  if (interaction.type === InteractionType.ModalSubmit && interaction.customId.startsWith('invoice-modal-2-')) {
    const sessionId = interaction.customId.split('invoice-modal-2-')[1];
    const tempData = tempStorage.get(sessionId);
    
    if (!tempData) {
      await interaction.reply({ content: '❌ セッションが期限切れです。最初からやり直してください。', ephemeral: true });
      return;
    }

    const data = {
      ...tempData,
      件名: interaction.fields.getTextInputValue('subject'),
      摘要: interaction.fields.getTextInputValue('description'),
      数量: interaction.fields.getTextInputValue('quantity'),
      単価: interaction.fields.getTextInputValue('unit_price'),
      備考: interaction.fields.getTextInputValue('remarks'),
      登録日時: new Date().toISOString(),
    };

    // 一時データを削除
    tempStorage.delete(sessionId);

    try {
      // Cloud Functions のエンドポイントにPOST（仮URL）
      const response = await fetch('https://your-cloud-functions-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const finalEmbed = new EmbedBuilder()
          .setTitle('✅ 請求書情報登録完了')
          .setDescription('すべての情報が正常に登録されました。')
          .addFields([
            { name: '顧客名', value: data.顧客名, inline: true },
            { name: '件名', value: data.件名, inline: true },
            { name: '金額', value: `${data.数量} × ${data.単価}`, inline: true },
          ])
          .setColor(0x00ff00)
          .setTimestamp();

        await interaction.reply({ embeds: [finalEmbed], ephemeral: true });
      } else {
        await interaction.reply({ content: '⚠️ 登録に失敗しました。', ephemeral: true });
      }
    } catch (err) {
      console.error('送信エラー:', err);
      await interaction.reply({ content: '❌ エラーが発生しました。', ephemeral: true });
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
