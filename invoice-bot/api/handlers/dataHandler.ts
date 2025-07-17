import { VercelResponse } from '@vercel/node';
import { InteractionResponseType } from 'discord-api-types/v10';
import { FirstModalData, SecondModalData, FinalInvoiceData } from '../types/index.js';
import { calculatePaymentDueDate } from '../utils/dateUtils.js';

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
    // 環境判定（Vercel = 開発環境、Cloudflare = 本番環境）
    const isVercel = process.env.VERCEL_ENV !== undefined;
    const isDevelopment = isVercel; // Vercelなら開発環境
    const gasTimeout = isDevelopment ? 2000 : 5000; // 開発2秒、本番5秒

    console.log(`📤 GASに送信中 (${isDevelopment ? '開発' : '本番'}環境):`, process.env.GAS_WEBHOOK_URL);
    console.log('📄 送信データ:', data);
    console.log('⏱️ タイムアウト設定:', gasTimeout + 'ms');

    // 環境に応じたタイムアウト設定
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), gasTimeout);

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
      const isVercel = process.env.VERCEL_ENV !== undefined;
      const isDevelopment = isVercel;
      const timeoutMs = isDevelopment ? 2000 : 5000;
      console.error(`❌ GAS送信タイムアウト (${timeoutMs}ms)`);
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
  try {
    console.log('🗑️ メッセージ削除開始...');

    // 元の応答メッセージを削除
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

    // 環境判定（Vercel = 開発環境、Cloudflare = 本番環境）
    const isVercel = process.env.VERCEL_ENV !== undefined;
    const isDevelopment = isVercel;
    console.log(`🎯 実行環境: ${isDevelopment ? '開発(Vercel)' : '本番(Cloudflare)'} (VERCEL_ENV: ${process.env.VERCEL_ENV})`);

    if (isDevelopment) {
      // 開発環境: 同期処理、2秒タイムアウト、一律成功メッセージ
      console.log('🚀 開発環境: 同期処理開始');

      const success = await sendToGAS(finalData);

      if (success) {
        console.log('✅ GAS送信成功:', finalData.請求書番号);

        // 先に応答を返す
        const response = res.json({
          type: 4,
          data: {
            content: `✅ 請求書情報をスプレッドシートに登録しました！\n📋 請求書番号: ${firstData.請求書番号}\n👤 顧客名: ${firstData.顧客名}\n📅 登録時刻: ${new Date().toLocaleString('ja-JP')}`
            // flags: 64 を削除してトークに残す
          }
        });

        // 開発環境ではメッセージ削除をスキップ（Vercel制約のため）
        console.log('ℹ️ 開発環境: メッセージ削除はスキップします');

        return response;
      } else {
        console.log('❌ GAS送信失敗/タイムアウト:', finalData.請求書番号);

        // 先に応答を返す
        const response = res.json({
          type: 4,
          data: {
            content: `✅ 請求書情報を登録しました！\n📋 請求書番号: ${firstData.請求書番号}\n👤 顧客名: ${firstData.顧客名}\n📅 登録時刻: ${new Date().toLocaleString('ja-JP')}\n開発環境で実行`
            // flags: 64 を削除してトークに残す
          }
        });

        // 開発環境ではメッセージ削除をスキップ（Vercel制約のため）
        console.log('ℹ️ 開発環境: メッセージ削除はスキップします');

        return response;
      }
    } else {
      // 本番環境: Follow-up APIで正確な結果通知
      console.log('🚀 本番環境: Follow-up API処理開始');

      // 即座に処理中メッセージを返す
      res.json({
        type: 4,
        data: {
          content: `📝 請求書情報を受信しました！スプレッドシートに登録中です...\n📋 請求書番号: ${firstData.請求書番号}\n👤 顧客名: ${firstData.顧客名}\n⏳ 処理状況は後続メッセージでお知らせします`,
          flags: 64
        }
      });

      try {
        const success = await sendToGAS(finalData);

        // 途中メッセージを削除
        await deleteIntermediateMessages(interaction);

        if (success) {
          console.log('✅ GAS送信成功:', finalData.請求書番号);
          await sendFollowupMessage(
            interaction,
            `✅ 請求書情報をスプレッドシートに登録しました！\n📋 請求書番号: ${firstData.請求書番号}\n👤 顧客名: ${firstData.顧客名}\n📅 登録時刻: ${new Date().toLocaleString('ja-JP')}`,
            false // ephemeralではない（トークに残す）
          );
        } else {
          console.log('❌ GAS送信失敗/タイムアウト:', finalData.請求書番号);
          await sendFollowupMessage(
            interaction,
            `⚠️ スプレッドシート登録でエラーが発生しました\n📋 請求書番号: ${firstData.請求書番号}\n👤 顧客名: ${firstData.顧客名}\n🔄 再度お試しいただくか、管理者にお問い合わせください`,
            false // ephemeralではない（トークに残す）
          );
        }
      } catch (error) {
        console.error('❌ 本番環境処理エラー:', error);
        await deleteIntermediateMessages(interaction);
        await sendFollowupMessage(
          interaction,
          `❌ 処理中にエラーが発生しました\n📋 請求書番号: ${firstData.請求書番号}\n🔄 再度お試しいただくか、管理者にお問い合わせください`,
          false // ephemeralではない（トークに残す）
        );
      }

      return;
    }
  } catch (error) {
    console.error('❌ データ送信エラー:', error);
    return res.json({
      type: 4,
      data: {
        content: `❌ 処理中にエラーが発生しました\n📋 請求書番号: ${firstData.請求書番号}\n🔄 再度お試しください`,
        flags: 64
      }
    });
  }
}
