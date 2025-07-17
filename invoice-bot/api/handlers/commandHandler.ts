import { VercelResponse } from '@vercel/node';
import {
  InteractionResponseType,
  ComponentType,
  TextInputStyle
} from 'discord-api-types/v10';

/**
 * /invoiceコマンドを処理して1回目モーダルを表示
 */
export function handleInvoiceCommand(res: VercelResponse) {
  return res.json({
    type: InteractionResponseType.Modal,
    data: {
      custom_id: 'invoice_step1',
      title: '請求書入力フォーム (1/2)',
      components: [
        {
          type: ComponentType.ActionRow,
          components: [{
            type: ComponentType.TextInput,
            custom_id: 'invoice_date',
            label: '請求日',
            placeholder: '例: 2025-07-16',
            style: TextInputStyle.Short,
            required: true
          }]
        },
        {
          type: ComponentType.ActionRow,
          components: [{
            type: ComponentType.TextInput,
            custom_id: 'invoice_number',
            label: '請求書番号',
            placeholder: '例: INV-001',
            style: TextInputStyle.Short,
            required: true,
            max_length: 100
          }]
        },
        {
          type: ComponentType.ActionRow,
          components: [{
            type: ComponentType.TextInput,
            custom_id: 'customer_name',
            label: '顧客名',
            placeholder: '例: 株式会社サンプル',
            style: TextInputStyle.Short,
            required: true,
            max_length: 100
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
            required: true,
            max_length: 200
          }]
        }
      ]
    }
  });
}