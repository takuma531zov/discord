import {
  InteractionType,
  InteractionResponseType,
  ComponentType,
  TextInputStyle
} from 'discord-api-types/v10';

export default async function handler(req: any, res: any) {
  console.log('🚀 関数が呼び出されました:', req.method);
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('📨 リクエストボディ:', req.body);
  
  const interaction = req.body;

  // ✅ PING応答（Discordによる接続テスト）
  if (interaction.type === InteractionType.Ping) {
    console.log('🏓 PING応答');
    return res.json({ type: InteractionResponseType.Pong });
  }

  // Application Command interaction
  if (interaction.type === InteractionType.ApplicationCommand) {
    if (interaction.data.name === 'invoice') {
      console.log('📋 Invoice コマンド実行');
      // シンプルな単一モーダルを表示
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

  console.log('❓ 未処理のinteraction:', interaction);
  return res.status(200).json({ message: 'OK' });
}