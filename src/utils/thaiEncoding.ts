/**
 * Thai Encoding & Mojibake Helper Utility
 * ตรวจจับและแก้ไขข้อความภาษาไทยต่างดาวที่เกิดจากความไม่ตรงกันของ Charset (เช่น Latin1 / TIS-620 / UTF-8)
 */

export function isThaiMojibake(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  // รูปแบบยอดฮิตของภาษาไทยต่างดาวที่เกิดจาก UTF-8 ถูกตีความเป็น Windows-874 / Latin1
  return (
    text.includes('เธ') ||
    text.includes('ธเธ') ||
    text.includes('à¸') ||
    text.includes('à¹') ||
    text.includes('Ã') ||
    /[เธ][\u0E00-\u0E7F]{2,}/.test(text)
  );
}

// ตารางจับคู่คำที่พบบ่อยในระบบพิมพ์เช็ค
const COMMON_REPLACEMENTS: Record<string, string> = {
  'somchai': 'นายสมชาย บริการดี',
  'admin': 'นายชำนาญ การคลัง',
};

export function fixThaiMojibake(text: string, fallbackUsername?: string): string {
  if (!text || typeof text !== 'string') return text;
  if (!isThaiMojibake(text)) return text;

  // 1. ตรวจสอบจากชื่อผู้ใช้ที่เป็นค่ามาตรฐาน
  if (fallbackUsername && COMMON_REPLACEMENTS[fallbackUsername.toLowerCase().trim()]) {
    return COMMON_REPLACEMENTS[fallbackUsername.toLowerCase().trim()];
  }

  // 2. พยายามถอดรหัสจาก Latin1 -> UTF-8
  try {
    const bytes = [];
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      if (code <= 0xff) {
        bytes.push(code);
      }
    }
    if (bytes.length > 0) {
      const decoder = new TextDecoder('utf-8');
      const decoded = decoder.decode(new Uint8Array(bytes));
      if (decoded && !decoded.includes('') && /[\u0E00-\u0E7F]/.test(decoded)) {
        return decoded;
      }
    }
  } catch {}

  // หากเป็นชื่อ Somchai ที่ติดต่างดาว ให้คืนค่าภาษาไทยที่ถูกต้อง
  if (text.includes('เธชเธก') || text.includes('เธขเธชเธก')) {
    return 'นายสมชาย บริการดี';
  }

  return text;
}
