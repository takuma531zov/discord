import { BusinessDayResult } from '../types/index.js';

/**
 * 祝日キャッシュ
 */
const holidayCache = new Map<string, boolean>();

/**
 * 祝日APIから指定年の祝日を取得
 */
async function fetchHolidays(year: number): Promise<string[]> {
  try {
    // 内閣府の祝日API
    const response = await fetch(`https://holidays-jp.github.io/api/v1/${year}/date.json`);
    
    if (!response.ok) {
      console.warn(`祝日API取得失敗: ${year}年`);
      return [];
    }
    
    const holidays = await response.json();
    return Object.keys(holidays);
  } catch (error) {
    console.error('祝日API エラー:', error);
    return [];
  }
}

/**
 * 指定日が祝日かどうかを判定（キャッシュ付き）
 */
async function isHoliday(dateStr: string): Promise<boolean> {
  // キャッシュから確認
  if (holidayCache.has(dateStr)) {
    return holidayCache.get(dateStr)!;
  }
  
  const year = new Date(dateStr).getFullYear();
  const holidays = await fetchHolidays(year);
  
  // その年の祝日をキャッシュに保存
  holidays.forEach(holiday => {
    holidayCache.set(holiday, true);
  });
  
  const isHolidayResult = holidays.includes(dateStr);
  
  // 祝日でない場合もキャッシュに保存
  if (!isHolidayResult) {
    holidayCache.set(dateStr, false);
  }
  
  return isHolidayResult;
}

/**
 * 指定日が営業日かどうかを判定
 */
export async function isBusinessDay(dateStr: string): Promise<boolean> {
  const date = new Date(dateStr);
  const dayOfWeek = date.getDay();
  
  // 土日チェック (0: 日曜, 6: 土曜)
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false;
  }
  
  // 祝日チェック（API使用）
  const holidayResult = await isHoliday(dateStr);
  if (holidayResult) {
    return false;
  }
  
  return true;
}

/**
 * 次の営業日を取得
 */
export async function getNextBusinessDay(dateStr: string): Promise<string> {
  const date = new Date(dateStr);
  
  do {
    date.setDate(date.getDate() + 1);
    const nextDateStr = date.toISOString().split('T')[0];
    
    if (await isBusinessDay(nextDateStr)) {
      return nextDateStr;
    }
  } while (true);
}

/**
 * 前の営業日を取得
 */
export async function getPreviousBusinessDay(dateStr: string): Promise<string> {
  const date = new Date(dateStr);
  
  do {
    date.setDate(date.getDate() - 1);
    const prevDateStr = date.toISOString().split('T')[0];
    
    if (await isBusinessDay(prevDateStr)) {
      return prevDateStr;
    }
  } while (true);
}

/**
 * 月の最終日を取得
 */
function getLastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * 請求日から入金締切日（翌月最終営業日）を計算
 */
export async function calculatePaymentDueDate(invoiceDateStr: string): Promise<string> {
  const invoiceDate = new Date(invoiceDateStr);
  const year = invoiceDate.getFullYear();
  const month = invoiceDate.getMonth() + 1; // 翌月
  
  // 翌月の年・月を計算
  const nextMonth = month > 12 ? 1 : month;
  const nextYear = month > 12 ? year + 1 : year;
  
  // 翌月の最終日を取得
  const lastDay = getLastDayOfMonth(nextYear, nextMonth);
  let lastDayStr = `${nextYear}-${nextMonth.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
  
  // 最終日が営業日でない場合は前の営業日を取得
  if (!(await isBusinessDay(lastDayStr))) {
    lastDayStr = await getPreviousBusinessDay(lastDayStr);
  }
  
  return lastDayStr;
}

/**
 * 日付の営業日情報を取得
 */
export async function getBusinessDayInfo(dateStr: string): Promise<BusinessDayResult> {
  const isBusiness = await isBusinessDay(dateStr);
  const nextBusiness = isBusiness ? dateStr : await getNextBusinessDay(dateStr);
  
  return {
    date: dateStr,
    isBusinessDay: isBusiness,
    nextBusinessDay: nextBusiness
  };
}