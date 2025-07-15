const express = require('express');
const { verifyKey } = require('discord-interactions');
const { InteractionType, InteractionResponseType, ComponentType, TextInputStyle } = require('discord-api-types/v10');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Raw body middleware for Discord signature verification
app.use('/webhook', express.raw({ type: 'application/json' }));

app.post('/webhook', (req, res) => {
  const signature = req.headers['x-signature-ed25519'];
  const timestamp = req.headers['x-signature-timestamp'];
  const body = req.body.toString();
  const publicKey = process.env.DISCORD_PUBLIC_KEY;

  // Discord signature verification
  try {
    const isValidRequest = verifyKey(body, signature, timestamp, publicKey);
    
    if (!isValidRequest) {
      return res.status(401).json({ error: 'Invalid request signature' });
    }
  } catch (error) {
    console.error('署名検証エラー:', error);
    return res.status(401).json({ error: 'Invalid request signature' });
  }

  const interaction = JSON.parse(body);

  // PING応答
  if (interaction.type === InteractionType.Ping) {
    return res.json({ type: InteractionResponseType.Pong });
  }

  // Application Command interaction
  if (interaction.type === InteractionType.ApplicationCommand) {
    if (interaction.data.name === 'invoice') {
      return res.json({
        type: InteractionResponseType.Modal,
        data: {
          custom_id: 'invoice-modal-simple',
          title: '請求書入力フォーム',
          components: [
            {
              type: ComponentType.ActionRow,
              components: [{
                type: ComponentType.TextInput,
                custom_id: 'basic_info',
                label: '基本情報（日付,番号,顧客名,住所,締切日）',
                placeholder: '例: 7/6,INV-001,株式会社サンプル,東京都渋谷区,7/31',
                style: TextInputStyle.Short,
                required: true
              }]
            },
            {
              type: ComponentType.ActionRow,
              components: [{
                type: ComponentType.TextInput,
                custom_id: 'subject',
                label: '件名',
                placeholder: '例: 7月分請求書',
                style: TextInputStyle.Short,
                required: true
              }]
            },
            {
              type: ComponentType.ActionRow,
              components: [{
                type: ComponentType.TextInput,
                custom_id: 'description',
                label: '摘要',
                placeholder: 'サービス内容の詳細説明',
                style: TextInputStyle.Paragraph,
                required: true
              }]
            },
            {
              type: ComponentType.ActionRow,
              components: [{
                type: ComponentType.TextInput,
                custom_id: 'amount_info',
                label: '数量・単価（数量,単価）',
                placeholder: '例: 1,50000',
                style: TextInputStyle.Short,
                required: true
              }]
            },
            {
              type: ComponentType.ActionRow,
              components: [{
                type: ComponentType.TextInput,
                custom_id: 'remarks',
                label: '備考',
                placeholder: '任意: 支払い条件等',
                style: TextInputStyle.Paragraph,
                required: false
              }]
            }
          ]
        }
      });
    }
  }

  // Modal Submit interaction
  if (interaction.type === InteractionType.ModalSubmit) {
    if (interaction.data.custom_id === 'invoice-modal-simple') {
      const basicInfo = interaction.data.components[0].components[0].value.split(',');
      const amountInfo = interaction.data.components[3].components[0].value.split(',');
      
      if (basicInfo.length < 5) {
        return res.json({
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content: '❌ 基本情報の形式が正しくありません。\n**正しい形式**: 日付,番号,顧客名,住所,締切日\n**例**: 7/6,INV-001,株式会社サンプル,東京都渋谷区,7/31',
            flags: 64
          }
        });
      }
      
      if (amountInfo.length < 2) {
        return res.json({
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content: '❌ 数量・単価の形式が正しくありません。\n**正しい形式**: 数量,単価\n**例**: 1,50000',
            flags: 64
          }
        });
      }

      const data = {
        請求日: basicInfo[0].trim(),
        請求書番号: basicInfo[1].trim(),
        顧客名: basicInfo[2].trim(),
        住所担当者名: basicInfo[3].trim(),
        入金締切日: basicInfo[4].trim(),
        件名: interaction.data.components[1].components[0].value,
        摘要: interaction.data.components[2].components[0].value,
        数量: amountInfo[0].trim(),
        単価: amountInfo[1].trim(),
        備考: interaction.data.components[4].components[0].value || '',
        登録日時: new Date().toISOString(),
      };

      // GASに送信
      fetch(process.env.GAS_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      .then(response => {
        if (response.ok) {
          return res.json({
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              embeds: [{
                title: '✅ 請求書情報登録完了',
                description: 'すべての情報が正常に登録されました。',
                fields: [
                  { name: '請求書番号', value: data.請求書番号, inline: true },
                  { name: '顧客名', value: data.顧客名, inline: true },
                  { name: '件名', value: data.件名, inline: true },
                  { name: '数量', value: data.数量, inline: true },
                  { name: '単価', value: data.単価, inline: true },
                  { name: '請求日', value: data.請求日, inline: true }
                ],
                color: 0x00ff00
              }],
              flags: 64
            }
          });
        } else {
          return res.json({
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              embeds: [{
                title: '❌ 送信エラー',
                description: 'データの送信に失敗しました。もう一度お試しください。',
                color: 0xff0000
              }],
              flags: 64
            }
          });
        }
      })
      .catch(err => {
        console.error('❌ 送信エラー:', err);
        return res.json({
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            embeds: [{
              title: '❌ 送信エラー',
              description: 'データの送信に失敗しました。もう一度お試しください。',
              color: 0xff0000
            }],
            flags: 64
          }
        });
      });
    }
  }

  return res.status(400).json({ error: 'Unknown interaction type' });
});

app.get('/', (req, res) => {
  res.json({ status: 'Discord Bot is running!' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});