import express from 'express';
import * as dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// 請求書データ受信エンドポイント
app.post('/invoice', async (req, res) => {
  try {
    console.log('📄 請求書データを受信:', req.body);
    
    // ここに実際の処理を追加
    // 例: データベースへの保存、他のサービスへの転送など
    
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