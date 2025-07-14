const express = require('express');
const dotenv = require('dotenv');
import { Request, Response, NextFunction } from 'express';
import fetch from 'node-fetch';
import { sign } from 'tweetnacl';
import {
  InteractionType,
  InteractionResponseType,
  ComponentType,
  TextInputStyle
} from 'discord-api-types/v10';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// raw body middleware for signature verification
app.use('/interactions', express.raw({ type: 'application/json' }));

// すべてのリクエストをログに記録
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`🌐 ${new Date().toISOString()} - ${req.method} ${req.path}`);
  console.log('📋 Headers:', JSON.stringify(req.headers, null, 2));
  next();
});

// temporary data storage
const tempStorage = new Map();

// Discord signature verification
function verifyDiscordSignature(publicKey: string, signature: string, timestamp: string, body: string): boolean {
  try {
    const message = new TextEncoder().encode(timestamp + body);
    const sig = Buffer.from(signature, 'hex');
    const key = Buffer.from(publicKey, 'hex');
    return sign.detached.verify(message, sig, key);
  } catch (err) {
    console.error('署名検証エラー:', err);
    return false;
  }
}

// Discord Interactions endpoint
app.post('/interactions', async (req: Request, res: Response) => {
  const signature = req.header('X-Signature-Ed25519');
  const timestamp = req.header('X-Signature-Timestamp');
  const rawBody = req.body.toString();
  const publicKey = process.env.DISCORD_PUBLIC_KEY!;

  // ✅ 実際に署名検証を行う（ここがDiscord登録時に必須）
  if (!signature || !timestamp || !verifyDiscordSignature(publicKey, signature, timestamp, rawBody)) {
    console.warn('❌ 署名検証失敗');
    return res.status(401).send('Invalid request signature');
  }

  let interaction;
  try {
    interaction = JSON.parse(rawBody);
  } catch (e) {
    return res.status(400).send('Invalid JSON');
  }

  // ✅ PING応答（Discordによる接続テスト）
  if (interaction.type === InteractionType.Ping) {
    return res.json({ type: InteractionResponseType.Pong });
  }
    // Application Command interaction
    if (interaction.type === InteractionType.ApplicationCommand) {
      if (interaction.data.name === 'invoice') {
        // 第1モーダルを表示
        return res.json({
          type: InteractionResponseType.Modal,
          data: {
            custom_id: 'invoice-modal-1',
            title: '請求書入力フォーム (1/2)',
            components: [
              {
                type: ComponentType.ActionRow,
                components: [{
                  type: ComponentType.TextInput,
                  custom_id: 'date',
                  label: '請求日',
                  placeholder: '例: 7/6',
                  style: TextInputStyle.Short,
                  required: true
                }]
              },
              {
                type: ComponentType.ActionRow,
                components: [{
                  type: ComponentType.TextInput,
                  custom_id: 'number',
                  label: '請求書番号',
                  style: TextInputStyle.Short,
                  required: true
                }]
              },
              {
                type: ComponentType.ActionRow,
                components: [{
                  type: ComponentType.TextInput,
                  custom_id: 'customer',
                  label: '顧客名',
                  style: TextInputStyle.Short,
                  required: true
                }]
              },
              {
                type: ComponentType.ActionRow,
                components: [{
                  type: ComponentType.TextInput,
                  custom_id: 'address',
                  label: '住所・担当者名',
                  placeholder: '任意',
                  style: TextInputStyle.Short,
                  required: false
                }]
              },
              {
                type: ComponentType.ActionRow,
                components: [{
                  type: ComponentType.TextInput,
                  custom_id: 'due',
                  label: '入金締切日',
                  placeholder: '例: 7/31',
                  style: TextInputStyle.Short,
                  required: true
                }]
              }
            ]
          }
        });
      }
    }

    // Modal Submit interaction
    if (interaction.type === InteractionType.ModalSubmit) {
      if (interaction.data.custom_id === 'invoice-modal-1') {
        // 第1モーダルの処理
        const sessionId = `${interaction.user?.id || interaction.member?.user?.id}-${Date.now()}`;

        const tempData = {
          請求日: interaction.data.components[0].components[0].value,
          請求書番号: interaction.data.components[1].components[0].value,
          顧客名: interaction.data.components[2].components[0].value,
          住所担当者名: interaction.data.components[3].components[0].value,
          入金締切日: interaction.data.components[4].components[0].value,
        };

        tempStorage.set(sessionId, tempData);

        // 確認メッセージとボタンを表示
        return res.json({
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            embeds: [{
              title: '📄 請求書入力 (1/2 完了)',
              description: '基本情報を保存しました。続けて詳細情報を入力してください。',
              fields: [
                { name: '請求書番号', value: tempData.請求書番号, inline: true },
                { name: '顧客名', value: tempData.顧客名, inline: true }
              ],
              color: 0x00ff00
            }],
            components: [{
              type: ComponentType.ActionRow,
              components: [{
                type: ComponentType.Button,
                custom_id: `continue-${sessionId}`,
                label: '続けて入力する',
                style: 1 // Primary
              }]
            }],
            flags: 64 // ephemeral
          }
        });
      }

      if (interaction.data.custom_id.startsWith('invoice-modal-2-')) {
        // 第2モーダルの処理
        const sessionId = interaction.data.custom_id.split('invoice-modal-2-')[1];
        const tempData = tempStorage.get(sessionId);

        if (!tempData) {
          return res.json({
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: '❌ セッションが期限切れです。最初からやり直してください。',
              flags: 64
            }
          });
        }

        const data = {
          ...tempData,
          件名: interaction.data.components[0].components[0].value,
          摘要: interaction.data.components[1].components[0].value,
          数量: interaction.data.components[2].components[0].value,
          単価: interaction.data.components[3].components[0].value,
          備考: interaction.data.components[4].components[0].value,
          登録日時: new Date().toISOString(),
        };

        tempStorage.delete(sessionId);

        // 送信中メッセージを表示
        res.json({
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            embeds: [{
              title: '📤 請求書情報を送信中...',
              description: 'データを処理しています。しばらくお待ちください。',
              fields: [
                { name: '請求書番号', value: data.請求書番号, inline: true },
                { name: '顧客名', value: data.顧客名, inline: true }
              ],
              color: 0x00ff00
            }],
            flags: 64
          }
        });

        // 非同期でGASに送信
        setTimeout(async () => {
          try {
            console.log('📤 GASに送信中:', process.env.GAS_WEBHOOK_URL);
            console.log('📄 送信データ:', data);

            const gasResponse = await fetch(process.env.GAS_WEBHOOK_URL!, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data),
            });

            console.log('📡 GASレスポンス status:', gasResponse.status);

            if (gasResponse.ok) {
              // フォローアップメッセージで成功通知
              await fetch(`https://discord.com/api/v10/webhooks/${process.env.CLIENT_ID}/${interaction.token}/messages/@original`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  embeds: [{
                    title: '✅ 請求書情報登録完了',
                    description: 'すべての情報が正常に登録されました。',
                    color: 0x00ff00
                  }]
                })
              });
            } else {
              console.error('❌ GAS転送失敗:', gasResponse.status);
            }
          } catch (err) {
            console.error('❌ 送信エラー詳細:', err);
          }
        }, 100);

        return;
      }
    }

    // Button interaction
    if (interaction.type === InteractionType.MessageComponent) {
      if (interaction.data.custom_id.startsWith('continue-')) {
        const sessionId = interaction.data.custom_id.split('continue-')[1];

        // 第2モーダルを表示
        return res.json({
          type: InteractionResponseType.Modal,
          data: {
            custom_id: `invoice-modal-2-${sessionId}`,
            title: '請求書入力フォーム (2/2)',
            components: [
              {
                type: ComponentType.ActionRow,
                components: [{
                  type: ComponentType.TextInput,
                  custom_id: 'subject',
                  label: '件名',
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
                  style: TextInputStyle.Paragraph,
                  required: true
                }]
              },
              {
                type: ComponentType.ActionRow,
                components: [{
                  type: ComponentType.TextInput,
                  custom_id: 'quantity',
                  label: '数量',
                  style: TextInputStyle.Short,
                  required: true
                }]
              },
              {
                type: ComponentType.ActionRow,
                components: [{
                  type: ComponentType.TextInput,
                  custom_id: 'unit_price',
                  label: '単価',
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
                  placeholder: '任意',
                  style: TextInputStyle.Paragraph,
                  required: false
                }]
              }
            ]
          }
        });
      }
    }

    console.log('未処理のinteraction:', interaction);
    return res.status(400).json({ error: 'Unknown interaction type' });
});

// ヘルスチェックエンドポイント
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Discord Interactions server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
});
