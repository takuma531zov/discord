import { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyKey } from 'discord-interactions';
import { InteractionType } from 'discord-api-types/v10';
import { handleInvoiceCommand } from './handlers/commandHandler.js';
import { routeModalSubmission, handleContinueButton } from './handlers/modalHandler.js';

// Vercel用の設定 - raw body を取得するために bodyParser を無効化
export const config = {
  api: {
    bodyParser: false
  }
};

// Raw body を読み込むヘルパー関数
async function getRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const bodyBuffer = await getRawBody(req);
  const body = bodyBuffer.toString('utf8');

  const signature = req.headers['x-signature-ed25519'] as string;
  const timestamp = req.headers['x-signature-timestamp'] as string;
  const publicKey = process.env.DISCORD_PUBLIC_KEY!;

  console.log('📥 Request received');
  console.log('🧪 Signature:', signature);
  console.log('🧪 Timestamp:', timestamp);
  console.log('🧪 PublicKey (head):', publicKey.slice(0, 10));
  console.log('🧪 Raw body (short):', body.slice(0, 100));

  // Discord署名検証
  try {
    const isValidRequest = await verifyKey(body, signature, timestamp, publicKey);
    console.log('✅ Signature verification result:', isValidRequest);

    if (!isValidRequest) {
      console.warn('❌ 署名検証失敗');
      return res.status(401).json({ error: 'Invalid request signature' });
    }
  } catch (error) {
    console.error('❌ 署名検証エラー:', error);
    return res.status(401).json({ error: 'Invalid request signature' });
  }

  let interaction;
  try {
    interaction = JSON.parse(body);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  console.log('🔄 Interaction type:', interaction.type);

  // PING応答（Discordによる接続テスト）
  if (interaction.type === InteractionType.Ping) {
    console.log('🏓 PING received');
    return res.json({ type: 1 });
  }

  // Application Command interaction
  if (interaction.type === InteractionType.ApplicationCommand) {
    console.log('📝 Command received:', interaction.data.name);
    
    if (interaction.data.name === 'invoice') {
      return handleInvoiceCommand(res);
    }
  }

  // Modal Submit interaction
  if (interaction.type === InteractionType.ModalSubmit) {
    console.log('📋 Modal submitted:', interaction.data.custom_id);
    return routeModalSubmission(interaction, res);
  }

  // Button interaction (MessageComponent)
  if (interaction.type === InteractionType.MessageComponent) {
    console.log('🔘 Button clicked:', interaction.data.custom_id);
    
    if (interaction.data.custom_id.startsWith('continue_')) {
      return handleContinueButton(interaction, res);
    }
  }

  console.log('❓ Unknown interaction type:', interaction.type);
  return res.status(400).json({ error: 'Unknown interaction type' });
}