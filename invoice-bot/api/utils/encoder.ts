import { FirstModalData } from '../types/index.js';

/**
 * 1回目モーダルデータをcustom_id用にエンコード（区切り文字方式）
 */
export function encodeToCustomId(data: FirstModalData): string {
  // 区切り文字を使って短くエンコード
  const parts = [
    data.請求日.replace(/\|/g, ''),
    data.請求書番号.replace(/\|/g, ''),
    data.顧客名.replace(/\|/g, ''),
    data.件名.replace(/\|/g, '')
  ];
  
  const encoded = parts.join('|');
  const base64 = Buffer.from(encoded).toString('base64');
  const urlSafe = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `step2_${urlSafe}`;
}

/**
 * custom_idから1回目モーダルデータをデコード（区切り文字方式）
 */
export function decodeFromCustomId(customId: string): FirstModalData | null {
  try {
    if (!customId.startsWith('step2_')) {
      return null;
    }
    
    const urlSafe = customId.replace('step2_', '');
    const base64 = urlSafe.replace(/-/g, '+').replace(/_/g, '/');
    
    // Base64のパディングを復元
    const paddingLength = (4 - (base64.length % 4)) % 4;
    const paddedBase64 = base64 + '='.repeat(paddingLength);
    
    const decodedStr = Buffer.from(paddedBase64, 'base64').toString('utf8');
    const parts = decodedStr.split('|');
    
    if (parts.length !== 4) {
      return null;
    }
    
    return {
      請求日: parts[0],
      請求書番号: parts[1],
      顧客名: parts[2],
      件名: parts[3]
    };
  } catch (error) {
    console.error('デコードエラー:', error);
    return null;
  }
}

/**
 * エンコード後のバイト数を計算
 */
export function calculateEncodedSize(data: FirstModalData): number {
  const encoded = encodeToCustomId(data);
  return Buffer.from(encoded).length;
}