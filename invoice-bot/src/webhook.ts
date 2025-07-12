import express from 'express';
import * as dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// 請求書データ受信エンドポイント
app.post('/invoice', async (req, res) => {
  try {
    console.log('📄 請求書データを受信:', req.body);
    
    // GASに転送
    if (process.env.GAS_WEBHOOK_URL) {
      console.log('🔄 GASに転送中:', process.env.GAS_WEBHOOK_URL);
      
      const gasResponse = await fetch(process.env.GAS_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      });
      
      console.log('📡 GASレスポンス status:', gasResponse.status);
      
      if (gasResponse.ok) {
        console.log('✅ GAS転送成功');
      } else {
        console.error('❌ GAS転送失敗:', gasResponse.status);
      }
    } else {
      console.log('⚠️ GAS_WEBHOOK_URL が設定されていません');
    }
    
    res.status(200).json({ 
      success: true, 
      message: '請求書データを正常に受信しました',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ エラー:', error);
    res.status(500).json({ 
      success: false, 
      message: '内部エラーが発生しました' 
    });
  }
});

// ヘルスチェックエンドポイント
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Webhook server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
});