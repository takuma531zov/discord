import { VercelResponse } from '@vercel/node';
import {
  InteractionResponseType,
  ComponentType,
  TextInputStyle
} from 'discord-api-types/v10';
import { FirstModalData, SecondModalData } from '../types/index.js';
import { handleDataSubmission } from './dataHandler.js';
import { encodeToCustomId, decodeFromCustomId } from '../utils/encoder.js';

/**
 * 1回目モーダル送信処理 - custom_idにデータをエンコード
 */
export function handleFirstModalSubmit(interaction: any, res: VercelResponse) {
  try {
    const firstModalData: FirstModalData = {
      請求日: interaction.data.components[0].components[0].value,
      請求書番号: interaction.data.components[1].components[0].value,
      顧客名: interaction.data.components[2].components[0].value,
      件名: interaction.data.components[3].components[0].value
    };

    console.log('📝 First modal data:', firstModalData);

    // データをcustom_idにエンコード
    const encodedCustomId = encodeToCustomId(firstModalData);
    console.log('🔐 Encoded custom_id:', encodedCustomId);

    const buttonCustomId = `continue_${encodedCustomId.replace('step2_', '')}`;
    console.log('🔘 Button custom_id length:', buttonCustomId.length);

    // Discord custom_id制限チェック (100文字以内)
    if (buttonCustomId.length > 100) {
      console.error('❌ Custom ID too long:', buttonCustomId.length);
      return res.json({
        type: 4,
        data: {
          content: '❌ データが長すぎます。短い内容で再度お試しください。',
          flags: 64
        }
      });
    }

    const response = {
      type: 4,
      data: {
        content: '✅ 第1段階の入力が完了しました！\n📝 続けて第2段階の入力を行ってください。',
        components: [
          {
            type: 1,
            components: [
              {
                type: 2,
                style: 1,
                label: '続きを入力',
                custom_id: buttonCustomId
              }
            ]
          }
        ],
        flags: 64
      }
    };

    console.log('📤 Sending first modal response');
    return res.json(response);
  } catch (error) {
    console.error('❌ First modal processing error:', error);
    return res.json({
      type: 4,
      data: {
        content: '❌ データの処理に失敗しました。もう一度お試しください。',
        flags: 64
      }
    });
  }
}

/**
 * 2回目モーダル送信処理
 */
export function handleSecondModalSubmit(interaction: any, res: VercelResponse) {
  try {
    // custom_idからデータをデコード
    const customId = interaction.data.custom_id;
    console.log('🔍 Decoding custom_id:', customId);

    const firstModalData = decodeFromCustomId(customId);

    if (!firstModalData) {
      console.log('❌ Failed to decode custom_id:', customId);
      return res.json({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: '❌ データの復元に失敗しました。最初からやり直してください。',
          flags: 64 // ephemeral
        }
      });
    }

    console.log('✅ Decoded first modal data:', firstModalData);

    const secondModalData: SecondModalData = {
      摘要: interaction.data.components[0].components[0].value,
      数量: interaction.data.components[1].components[0].value,
      単価: interaction.data.components[2].components[0].value,
      備考: interaction.data.components[3].components[0].value || ''
    };

    // データ統合と送信処理
    return handleDataSubmission(firstModalData, secondModalData, res, interaction);
  } catch (error) {
    console.error('❌ Second modal processing error:', error);
    return res.json({
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content: '❌ データの処理に失敗しました。もう一度お試しください。',
        flags: 64
      }
    });
  }
}

/**
 * 続きボタンクリック処理
 */
export function handleContinueButton(interaction: any, res: VercelResponse) {
  try {
    // custom_idからエンコードされたデータを取得
    const encodedData = interaction.data.custom_id.replace('continue_', '');
    const fullCustomId = `step2_${encodedData}`;

    console.log('🔘 Continue button - encoded data:', encodedData);
    console.log('🔘 Full custom_id for modal:', fullCustomId);

    // デコードして検証
    const firstModalData = decodeFromCustomId(fullCustomId);

    if (!firstModalData) {
      console.log('❌ Failed to decode button data:', encodedData);
      return res.json({
        type: 4,
        data: {
          content: '❌ セッションが期限切れです。最初からやり直してください。',
          flags: 64
        }
      });
    }

    console.log('✅ Button data verified:', firstModalData);

    // 第2モーダルを表示
    return res.json({
      type: 9,
      data: {
        custom_id: fullCustomId,
        title: '請求書入力フォーム (2/2)',
        components: [
          {
            type: 1,
            components: [{
              type: 4,
              custom_id: 'description',
              label: '摘要（カンマ区切り）',
              placeholder: '例: WEBサイト制作,システム開発',
              style: 2,
              required: true
            }]
          },
          {
            type: 1,
            components: [{
              type: 4,
              custom_id: 'quantity',
              label: '数量（カンマ区切り）',
              placeholder: '例: 1,2',
              style: 1,
              required: true
            }]
          },
          {
            type: 1,
            components: [{
              type: 4,
              custom_id: 'unit_price',
              label: '単価（カンマ区切り）',
              placeholder: '例: 50000,30000',
              style: 1,
              required: true
            }]
          },
          {
            type: 1,
            components: [{
              type: 4,
              custom_id: 'remarks',
              label: '備考',
              placeholder: '任意',
              style: 2,
              required: false
            }]
          }
        ]
      }
    });
  } catch (error) {
    console.error('❌ Continue button processing error:', error);
    return res.json({
      type: 4,
      data: {
        content: '❌ エラーが発生しました。最初からやり直してください。',
        flags: 64
      }
    });
  }
}

/**
 * モーダル送信のルーティング
 */
export function routeModalSubmission(interaction: any, res: VercelResponse) {
  try {
    const customId = interaction.data.custom_id;
    console.log('🔀 Modal routing - custom_id:', customId);

    if (customId === 'invoice_step1') {
      console.log('📝 Processing first modal submission');
      return handleFirstModalSubmit(interaction, res);
    } else if (customId.startsWith('step2_')) {
      console.log('📝 Processing second modal submission');
      return handleSecondModalSubmit(interaction, res);
    } else {
      console.log('❌ Unknown custom_id:', customId);
      return res.status(400).json({ error: 'Unknown modal custom_id' });
    }
  } catch (error) {
    console.error('❌ Modal routing error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
