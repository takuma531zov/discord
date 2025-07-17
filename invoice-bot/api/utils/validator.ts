import { FirstModalData, ValidationResult } from '../types/index.js';
import { calculateEncodedSize } from './encoder.js';

const MAX_CUSTOM_ID_SIZE = 512;
const WARNING_THRESHOLD = 400;
const SAFE_MARGIN = 500;

/**
 * custom_idサイズの検証
 */
export function validateCustomIdSize(data: FirstModalData): ValidationResult {
  const currentSize = calculateEncodedSize(data);
  const isValid = currentSize <= SAFE_MARGIN;
  const warning = currentSize > WARNING_THRESHOLD && currentSize <= SAFE_MARGIN;
  
  let message: string | undefined;
  
  if (!isValid) {
    message = '❌ 入力文字数が多すぎます。顧客名・件名を短くしてください。';
  } else if (warning) {
    message = '⚠️ 入力文字数が多めです。簡潔にしてください。';
  }
  
  return {
    isValid,
    currentSize,
    maxSize: MAX_CUSTOM_ID_SIZE,
    warning,
    message
  };
}

/**
 * 個別フィールドの文字数チェック
 */
export function validateFieldLength(field: string, value: string, maxLength: number): boolean {
  return value.length <= maxLength;
}

/**
 * 1回目モーダルデータの総合バリデーション
 */
export function validateFirstModalData(data: FirstModalData): ValidationResult {
  // 個別フィールドの長さチェック
  if (!validateFieldLength('顧客名', data.顧客名, 50)) {
    return {
      isValid: false,
      currentSize: 0,
      maxSize: MAX_CUSTOM_ID_SIZE,
      warning: false,
      message: '❌ 顧客名は50文字以内で入力してください。'
    };
  }
  
  if (!validateFieldLength('件名', data.件名, 100)) {
    return {
      isValid: false,
      currentSize: 0,
      maxSize: MAX_CUSTOM_ID_SIZE,
      warning: false,
      message: '❌ 件名は100文字以内で入力してください。'
    };
  }
  
  if (!validateFieldLength('請求書番号', data.請求書番号, 20)) {
    return {
      isValid: false,
      currentSize: 0,
      maxSize: MAX_CUSTOM_ID_SIZE,
      warning: false,
      message: '❌ 請求書番号は20文字以内で入力してください。'
    };
  }
  
  // custom_idサイズチェック
  return validateCustomIdSize(data);
}