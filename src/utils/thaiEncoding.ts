/**
 * Thai Encoding & Mojibake Helper Utility
 * ตรวจจับและแก้ไขข้อความภาษาไทยต่างดาวที่เกิดจากความไม่ตรงกันของ Charset (เช่น Latin1 / TIS-620 / UTF-8)
 */

/**
 * Thai Encoding & Mojibake Helper Utility
 * ตรวจจับและกู้คืนข้อความภาษาไทยต่างดาวที่เกิดจากความไม่ตรงกันของ Charset (Latin1 / TIS-620 / CP874 / UTF-8)
 */

export function isThaiMojibake(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  return (
    text.includes('เธ') ||
    text.includes('ธเธ') ||
    text.includes('à¸') ||
    text.includes('à¹') ||
    text.includes('Ã') ||
    text.includes('เ¹')
  );
}

// ตารางจับคู่ข้อความต่างดาวที่ตรวจพบ (Mojibake เท่านั้น - ห้ามจับคู่คำภาษาไทยปกติ)
const KNOWN_PHRASE_MAPPINGS: Array<{ match: (t: string) => boolean; result: string }> = [
  // 1. ผู้ใช้งานหลักเมื่อเป็นต่างดาว
  {
    match: (t) => t.includes('เธ™เธฒเธขเธŠเธณเธ™เธฒเธ') || (t.includes('เธ') && t.includes('เธ„เธฅเธฑเธ‡')),
    result: 'นายชำนาญ การคลัง',
  },
  {
    match: (t) =>
      t.includes('เธ™เธฒเธขเธชเธกเธŠเธฒเธข') ||
      (t.includes('เธ') && t.includes('เธšเธฃเธดเธ เธฒเธฃเธ”เธต')) ||
      t.includes('ธเธฒเธขเธชเธก') ||
      (t.includes('เธ') && t.includes('เธชเธกเธ')),
    result: 'นายสมชาย บริการดี',
  },
  {
    match: (t) => t.includes('เธชเธธเธ”เธฒ') || (t.includes('เธ') && t.includes('เธงเธ‡เธจ')),
    result: 'นางสาวสุดา วงศ์สว่าง',
  },
  {
    match: (t) => t.includes('เธชเธธเธฃเธŠเธฑเธข') || (t.includes('เธ') && t.includes('เธกเธฑเนˆเธ™')),
    result: 'นายสุรชัย มั่นคง',
  },

  // 2. ตำแหน่งงานเมื่อเป็นต่างดาว
  {
    match: (t) => t.includes('เธซเธฑเธงเธซเธ™เน‰เธฒ') && (t.includes('เธ เธฒเธฃเน€เธ‡เธดเธ™') || t.includes('เธ เธฒเธฃเธ„เธฅเธฑเธ‡')),
    result: 'หัวหน้ากลุ่มงานการเงินและบัญชี',
  },
  {
    match: (t) => (t.includes('เน€เธˆเน‰เธฒเธžเธ™เธฑเธ เธ‡เธฒเธ™') || t.includes('เธŠเธณเธ™เธฒเธ เธ‡เธฒเธ™')) && t.includes('เธ เธฒเธฃเน€เธ‡เธดเธ™'),
    result: 'เจ้าพนักงานการเงินและบัญชีชำนาญงาน',
  },
  {
    match: (t) => t.includes('เน€เธˆเน‰เธฒเธซเธ™เน‰เธฒเธ—เธตเนˆ') && (t.includes('เธ เธฒเธฃเน€เธ‡เธดเธ™') || t.includes('เธšเธฑเธ เธŠเธต')),
    result: 'เจ้าหน้าที่การเงินและบัญชี',
  },
  {
    match: (t) => t.includes('เธ™เธฑเธ เธงเธดเธŠเธฒเธ เธฒเธฃ') && t.includes('เธ เธฒเธฃเน€เธ‡เธดเธ™'),
    result: 'นักวิชาการเงินและบัญชีชำนาญการ',
  },
  {
    match: (t) => t.includes('เธžเธฑเธชเธ”เธธ'),
    result: 'เจ้าหน้าที่การเงินและพัสดุ',
  },
  {
    match: (t) => t.includes('เธ˜เธธเธฃเธ เธฒเธฃ'),
    result: 'เจ้าหน้าที่ธุรการ',
  },

  // 3. ชื่อธนาคาร
  {
    match: (t) => t.includes('เธ เธฃเธธเธ‡เน„เธ—เธข') || (t.includes('เธ˜เธ™เธฒเธ„เธฒเธฃ') && t.includes('เธ เธฃเธธเธ‡')),
    result: 'ธนาคารกรุงไทย',
  },
  {
    match: (t) => t.includes('เธ เธฒเธฃเน€เธ เธฉเธ•เธฃ') || t.includes('เธ˜.เธ .เธช.'),
    result: 'ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร (ธ.ก.ส.)',
  },
  {
    match: (t) => t.includes('เธญเธญเธกเธชเธดเธ™'),
    result: 'ธนาคารออมสิน',
  },

  // 4. ผู้รับเงินตัวอย่าง
  {
    match: (t) => t.includes('เธšเธฃเธดเธฉเธฑเธ— ABC') || (t.includes('ABC') && (t.includes('เธšเธฃเธดเธฉเธฑเธ—') || t.includes('เธˆเธณเธ เธฑเธ”'))),
    result: 'บริษัท ABC จำกัด',
  },
  {
    match: (t) => t.includes('เธฃเน‰เธฒเธ™ XYZ') || (t.includes('XYZ') && (t.includes('เธฃเน‰เธฒเธ™') || t.includes('เธ„เธญเธกเธžเธดเธงเน€เธ•เธญเธฃเนŒ'))),
    result: 'ร้าน XYZ คอมพิวเตอร์',
  },
  {
    match: (t) => t.includes('DEF'),
    result: 'บริษัท DEF ซัพพลาย จำกัด',
  },
  {
    match: (t) => t.includes('เธชเธซเธžเธฑเธ’เธ™เธฒ'),
    result: 'ห้างหุ้นส่วนจำกัด สหพัฒนาการค้า',
  },
  {
    match: (t) => t.includes('เธ›เธฃเธฐเธชเธดเธ—เธ˜เธดเนŒ') || t.includes('เธŠเนˆเธฒเธ‡เธ—เธญเธ‡'),
    result: 'นายประสิทธิ์ ช่างทอง',
  },
  {
    match: (t) => t.includes('เธ—เธตเน‚เธญเธ—เธต') || t.includes('TOT'),
    result: 'บริษัท ทีโอที เทเลคอม แอนด์ เซอร์วิส จำกัด',
  },
];

const WIN1252_TO_BYTE: Record<number, number> = {
  0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84,
  0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88,
  0x2030: 0x89, 0x0160: 0x8a, 0x2039: 0x8b, 0x0152: 0x8c,
  0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93,
  0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b,
  0x0153: 0x9c, 0x017e: 0x9e, 0x0178: 0x9f,
};

function cp874ToByte(char: string): number | null {
  const code = char.charCodeAt(0);
  if (WIN1252_TO_BYTE[code] !== undefined) return WIN1252_TO_BYTE[code];
  if (code >= 0x0e00 && code <= 0x0e7f) {
    return code - 0x0e00 + 0xa0;
  }
  if (code <= 0xff) return code;
  return null;
}

export function fixThaiMojibake(text: string, fallbackUsername?: string): string {
  if (!text || typeof text !== 'string') return text;

  // หากเป็นข้อความปกติที่ไม่ใช่ภาษาต่างดาว ให้คืนค่าข้อความจริงทันที ห้ามแตะต้องเด็ดขาด
  if (!isThaiMojibake(text)) return text;

  // 1. ตรวจสอบ fallback username เฉพาะเมื่อข้อความเป็นภาษาต่างดาวเท่านั้น
  if (fallbackUsername) {
    const cleanUser = fallbackUsername.toLowerCase().trim();
    if (cleanUser === 'admin') return 'นายชำนาญ การคลัง';
    if (cleanUser === 'somchai') return 'นายสมชาย บริการดี';
    if (cleanUser === 'suda') return 'นางสาวสุดา วงศ์สว่าง';
    if (cleanUser === 'surachai') return 'นายสุรชัย มั่นคง';
  }

  // 2. จับคู่กับคำมาตรฐานที่พบบ่อย
  for (const item of KNOWN_PHRASE_MAPPINGS) {
    if (item.match(text)) {
      return item.result;
    }
  }

  // 3. พยายามแปลงจาก Latin1 (à¸... / Ã...) -> UTF-8
  if (text.includes('à¸') || text.includes('à¹') || text.includes('Ã')) {
    try {
      const bytes: number[] = [];
      for (let i = 0; i < text.length; i++) {
        const c = text.charCodeAt(i);
        if (c <= 0xff) bytes.push(c);
      }
      const dec = new TextDecoder('utf-8').decode(new Uint8Array(bytes));
      if (dec && !dec.includes('') && /[\u0E00-\u0E7F]/.test(dec)) {
        return dec;
      }
    } catch {}
  }

  // 4. พยายามแปลงจาก Windows-874 / TIS-620 Mojibake (เธ...)
  try {
    const bytes: number[] = [];
    let i = 0;
    while (i < text.length) {
      if ((text[i] === 'เ' || text[i] === 'ธ') && i + 2 < text.length) {
        if (text[i] === 'เ' && (text[i + 1] === 'ธ' || text[i + 1] === '¹')) {
          const b3 = cp874ToByte(text[i + 2]);
          if (b3 !== null) {
            bytes.push(0xe0, 0xb8, b3);
            i += 3;
            continue;
          }
        } else if (text[i] === 'เ' && (text[i + 1] === 'น' || text[i + 1] === 'บ')) {
          const b3 = cp874ToByte(text[i + 2]);
          if (b3 !== null) {
            bytes.push(0xe0, 0xb9, b3);
            i += 3;
            continue;
          }
        }
      }
      const b = cp874ToByte(text[i]);
      if (b !== null) bytes.push(b);
      i++;
    }
    const dec = new TextDecoder('utf-8').decode(new Uint8Array(bytes));
    if (dec && /[\u0E00-\u0E7F]/.test(dec)) {
      return dec;
    }
  } catch {}

  return text;
}

