/**
 * Convert numeric amount into Thai Baht Text (บาทถ้วน / สตางค์)
 * Examples:
 *  17500 -> หนึ่งหมื่นเจ็ดพันห้าร้อยบาทถ้วน
 *  25750.50 -> สองหมื่นห้าพันเจ็ดร้อยห้าสิบบาทห้าสิบสตางค์
 *  101 -> หนึ่งร้อยเอ็ดบาทถ้วน
 *  21 -> ยี่สิบเอ็ดบาทถ้วน
 *  1 -> หนึ่งบาทถ้วน
 *  0 -> ศูนย์บาทถ้วน
 */

const THAI_DIGITS = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
const THAI_POSITIONS = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน'];

function convertUnderMillion(numStr: string): string {
  let result = '';
  const len = numStr.length;

  for (let i = 0; i < len; i++) {
    const digit = parseInt(numStr.charAt(i), 10);
    const pos = len - i - 1;

    if (digit !== 0) {
      if (pos === 1 && digit === 1) {
        // สิบ (not หนึ่งสิบ)
        result += 'สิบ';
      } else if (pos === 1 && digit === 2) {
        // ยี่สิบ (not สองสิบ)
        result += 'ยี่สิบ';
      } else if (pos === 0 && digit === 1 && len > 1) {
        // เอ็ด (if ending in 1 for numbers > 10)
        // Check if there was any non-zero before it
        result += 'เอ็ด';
      } else {
        result += THAI_DIGITS[digit] + THAI_POSITIONS[pos];
      }
    }
  }

  return result;
}

export function thaiBahtText(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(num)) return 'ศูนย์บาทถ้วน';
  if (num === 0) return 'ศูนย์บาทถ้วน';

  // Separate integer and decimal
  const isNegative = num < 0;
  const absNum = Math.abs(num);
  const fixed = absNum.toFixed(2);
  const [intPart, decPart] = fixed.split('.');

  // Process integer part (chunks of 6 digits for 'ล้าน')
  let intResult = '';
  const intLen = intPart.length;
  const chunks: string[] = [];

  for (let i = intLen; i > 0; i -= 6) {
    chunks.unshift(intPart.substring(Math.max(0, i - 6), i));
  }

  for (let c = 0; c < chunks.length; c++) {
    const chunkText = convertUnderMillion(chunks[c]);
    if (chunkText !== '') {
      intResult += chunkText;
      const millionCount = chunks.length - c - 1;
      for (let m = 0; m < millionCount; m++) {
        intResult += 'ล้าน';
      }
    }
  }

  if (intResult === '') {
    intResult = 'ศูนย์';
  }

  // Process decimal (satang)
  const satangVal = parseInt(decPart, 10);
  let decResult = '';

  if (satangVal > 0) {
    decResult = convertUnderMillion(decPart) + 'สตางค์';
  }

  let finalOutput = '';
  if (isNegative) finalOutput += 'ลบ';

  if (satangVal === 0) {
    finalOutput += `${intResult}บาทถ้วน`;
  } else {
    if (intResult === 'ศูนย์') {
      finalOutput += `${decResult}`;
    } else {
      finalOutput += `${intResult}บาท${decResult}`;
    }
  }

  return finalOutput;
}
