import { VercelResponse } from '@vercel/node';
import { FirstModalData, SecondModalData, FinalInvoiceData } from '../types/index.js';
import { calculatePaymentDueDate } from '../utils/dateUtils.js';

/**
 * 環境別設定
 */
const CONFIG = {
  development: {
    timeout: 2000,
    skipMessageDeletion: true,
    platform: 'Vercel'
  },
  production: {
    timeout: 5000,
    skipMessageDeletion: false,
    platform: 'Cloudflare'
  }
} as const;

/**
 * メッセージテンプレート
 */
const MESSAGES = {
  success: (data: Pick<FirstModalData, '請求書番号' | '顧客名'>) => 
    `✅ 請求書情報をスプレッドシートに登録しました！\n📋 請求書番号: ${data.請求書番号}\n👤 顧客名: ${data.顧客名}\n📅 登録時刻: ${new Date().toLocaleString('ja-JP')}`,
  
  fastProcessing: (data: Pick<FirstModalData, '請求書番号' | '顧客名'>) =>
    `✅ 請求書情報を登録しました！\n📋 請求書番号: ${data.請求書番号}\n👤 顧客名: ${data.顧客名}\n📅 登録時刻: ${new Date().toLocaleString('ja-JP')}\n⚡ 高速処理により即座に完了`,
  
  processing: (data: Pick<FirstModalData, '請求書番号' | '顧客名'>) =>
    `📝 請求書情報を受信しました！スプレッドシートに登録中です...\n📋 請求書番号: ${data.請求書番号}\n👤 顧客名: ${data.顧客名}\n⏳ 処理状況は後続メッセージでお知らせします`,
  
  error: (invoiceNumber: string) =>
    `⚠️ スプレッドシート登録でエラーが発生しました\n📋 請求書番号: ${invoiceNumber}\n🔄 再度お試しいただくか、管理者にお問い合わせください`,
  
  generalError: (invoiceNumber: string) =>
    `❌ 処理中にエラーが発生しました\n📋 請求書番号: ${invoiceNumber}\n🔄 再度お試しいただくか、管理者にお問い合わせください`
} as const;

/**
 * 環境判定
 */
function getEnvironment(): 'development' | 'production' {
  return process.env.VERCEL_ENV !== undefined ? 'development' : 'production';
}

/**
 * 環境設定を取得
 */
function getConfig() {
  const env = getEnvironment();
  return CONFIG[env];
}

/**
 * Discord応答を作成
 */
function createDiscordResponse(content: string, ephemeral = false) {
  return {
    type: 4,
    data: {
      content,
      ...(ephemeral && { flags: 64 })
    }
  };
}

/**
 * 1回目と2回目のデータを統合
 */
async function mergeInvoiceData(firstData: FirstModalData, secondData: SecondModalData): Promise<FinalInvoiceData> {
  const paymentDueDate = await calculatePaymentDueDate(firstData.請求日);

  return {
    ...firstData,
    ...secondData,
    入金締切日: paymentDueDate,
    登録日時: new Date().toISOString()
  };
}

/**
 * GAS（Google Apps Script）にデータを送信
 */
async function sendToGAS(data: FinalInvoiceData): Promise<boolean> {
  try {
    const config = getConfig();
    const env = getEnvironment();

    console.log(`📤 GASに送信中 (${env === 'development' ? '開発' : '本番'}環境):`, process.env.GAS_WEBHOOK_URL);
    console.log('📄 送信データ:', data);
    console.log('⏱️ タイムアウト設定:', config.timeout + 'ms');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);

    const response = await fetch(process.env.GAS_WEBHOOK_URL!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Discord-Invoice-Bot/1.0'
      },
      body: JSON.stringify(data),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    console.log('📡 GASレスポンス status:', response.status);
    console.log('📡 GASレスポンス headers:', Object.fromEntries(response.headers));

    if (response.ok) {
      const responseText = await response.text();
      console.log('📡 GASレスポンス body:', responseText);
      return true;
    } else {
      const errorText = await response.text();
      console.error('❌ GASレスポンス error:', errorText);
      return false;
    }
  } catch (error) {
    console.error('❌ GAS送信エラー:', error);
    if (error instanceof Error && error.name === 'AbortError') {
      const config = getConfig();
      console.error(`❌ GAS送信タイムアウト (${config.timeout}ms)`);
    }
    return false;
  }
}

/**
 * 最終データ送信処理
 */
/**
 * 途中メッセージを削除する
 */
async function deleteIntermediateMessages(interaction: any) {
  const config = getConfig();
  const env = getEnvironment();
  
  if (config.skipMessageDeletion) {
    console.log(`ℹ️ ${env}環境: メッセージ削除はスキップします`);
    return;
  }
  
  try {
    console.log('🗑️ メッセージ削除開始...');

    const deleteUrl = `https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`;
    console.log('🔗 Delete URL:', deleteUrl);

    const response = await fetch(deleteUrl, {
      method: 'DELETE'
    });

    console.log('📡 Delete response status:', response.status);

    if (response.ok) {
      console.log('✅ 途中メッセージを削除しました');
    } else {
      const errorText = await response.text();
      console.error('❌ 削除失敗:', response.status, errorText);
    }
  } catch (error) {
    console.error('❌ メッセージ削除エラー:', error);
  }
}

/**
 * Discord Follow-up メッセージ送信
 */
async function sendFollowupMessage(interaction: any, content: string, ephemeral: boolean = true) {
  try {
    const followupUrl = `https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}`;
    console.log('🔗 Follow-up URL:', followupUrl);
    console.log('📝 Follow-up content:', content);

    const response = await fetch(followupUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: content,
        ...(ephemeral && { flags: 64 }) // ephemeralの場合のみflagsを追加
      })
    });

    console.log('📡 Follow-up status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Follow-up送信失敗:', errorText);
    } else {
      const responseText = await response.text();
      console.log('✅ Follow-up送信成功:', responseText);
    }
  } catch (error) {
    console.error('❌ Follow-up送信エラー:', error);
  }
}

export async function handleDataSubmission(
  firstData: FirstModalData,
  secondData: SecondModalData,
  res: VercelResponse,
  interaction: any
) {
  try {
    const finalData = await mergeInvoiceData(firstData, secondData);
    const config = getConfig();
    const env = getEnvironment();
    
    console.log(`🎯 実行環境: ${env === 'development' ? '開発(Vercel)' : '本番(Cloudflare)'} (VERCEL_ENV: ${process.env.VERCEL_ENV})`);

    if (env === 'development') {
      console.log('🚀 開発環境: 同期処理開始');
      const success = await sendToGAS(finalData);

      if (success) {
        console.log('✅ GAS送信成功:', finalData.請求書番号);
        return res.json(createDiscordResponse(MESSAGES.success(firstData)));
      } else {
        console.log('❌ GAS送信失敗/タイムアウト:', finalData.請求書番号);
        return res.json(createDiscordResponse(MESSAGES.fastProcessing(firstData)));
      }
    } else {
      console.log('🚀 本番環境: Follow-up API処理開始');
      
      // 即座に処理中メッセージを返す
      res.json(createDiscordResponse(MESSAGES.processing(firstData), true));

      try {
        const success = await sendToGAS(finalData);

        if (!config.skipMessageDeletion) {
          await deleteIntermediateMessages(interaction);
        }

        if (success) {
          console.log('✅ GAS送信成功:', finalData.請求書番号);
          await sendFollowupMessage(interaction, MESSAGES.success(firstData), false);
        } else {
          console.log('❌ GAS送信失敗/タイムアウト:', finalData.請求書番号);
          await sendFollowupMessage(interaction, MESSAGES.error(firstData.請求書番号), false);
        }
      } catch (error) {
        console.error('❌ 本番環境処理エラー:', error);
        if (!config.skipMessageDeletion) {
          await deleteIntermediateMessages(interaction);
        }
        await sendFollowupMessage(interaction, MESSAGES.generalError(firstData.請求書番号), false);
      }

      return;
    }
  } catch (error) {
    console.error('❌ データ送信エラー:', error);
    return res.json(createDiscordResponse(MESSAGES.generalError(firstData.請求書番号), true));
  }
}
