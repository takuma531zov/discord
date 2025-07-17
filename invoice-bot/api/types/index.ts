// Discord請求書Bot 型定義

export interface FirstModalData {
  請求日: string;
  請求書番号: string;
  顧客名: string;
  件名: string;
}

export interface SecondModalData {
  摘要: string;
  数量: string;
  単価: string;
  備考: string;
}

export interface FinalInvoiceData extends FirstModalData, SecondModalData {
  入金締切日: string;
  登録日時: string;
}

export interface ValidationResult {
  isValid: boolean;
  currentSize: number;
  maxSize: number;
  warning: boolean;
  message?: string;
}

export interface BusinessDayResult {
  date: string;
  isBusinessDay: boolean;
  nextBusinessDay: string;
}