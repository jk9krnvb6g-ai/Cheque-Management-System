import { AuditLog, BankTemplateConfig, BankType, Cheque, ChequePrintLog, User, UserRole, UserStatus } from '../types';
import { getTodayISODate } from './dateUtils';
import { thaiBahtText } from './thaiBahtText';

const STORAGE_KEYS = {
  USERS: 'cheque_sys_users',
  CHEQUES: 'cheque_sys_cheques',
  PRINT_LOGS: 'cheque_sys_print_logs',
  AUDIT_LOGS: 'cheque_sys_audit_logs',
  TEMPLATES: 'cheque_sys_templates',
  CURRENT_USER: 'cheque_sys_current_user',
};

// Simple cryptographic hash simulation for browser client (SHA-256 via Web Crypto or fallback)
export async function hashPassword(plainText: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(plainText);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // Fallback simple hash for environments without subtle crypto
    let hash = 0;
    for (let i = 0; i < plainText.length; i++) {
      const char = plainText.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return 'h_' + Math.abs(hash).toString(16);
  }
}

// Default seeded users
const INITIAL_USERS: User[] = [
  {
    id: 'user_admin',
    username: 'admin',
    passwordHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', // 'admin'
    fullName: 'นายชำนาญ การคลัง',
    position: 'หัวหน้ากลุ่มงานการเงินและบัญชี',
    role: 'ADMIN',
    status: 'ACTIVE',
    createdAt: '2026-09-01T08:30:00.000Z',
  },
  {
    id: 'user_somchai',
    username: 'somchai',
    passwordHash: '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', // '1234'
    fullName: 'นายสมชาย บริการดี',
    position: 'นักวิชาการเงินและบัญชีชำนาญการ',
    role: 'USER',
    status: 'ACTIVE',
    createdAt: '2026-09-05T09:00:00.000Z',
  },
  {
    id: 'user_suda',
    username: 'suda',
    passwordHash: '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', // '1234'
    fullName: 'นางสาวสุดา วงศ์สว่าง',
    position: 'เจ้าหน้าที่การเงินและพัสดุ',
    role: 'USER',
    status: 'ACTIVE',
    createdAt: '2026-09-10T10:15:00.000Z',
  },
  {
    id: 'user_surachai',
    username: 'surachai',
    passwordHash: '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', // '1234'
    fullName: 'นายสุรชัย มั่นคง',
    position: 'เจ้าหน้าที่ธุรการ',
    role: 'USER',
    status: 'INACTIVE',
    createdAt: '2026-09-12T11:00:00.000Z',
  }
];

// Default bank templates calibrated to real bank cheque dimensions
const INITIAL_TEMPLATES: Record<BankType, BankTemplateConfig> = {
  KTB: {
    bankType: 'KTB',
    bankNameThai: 'ธนาคารกรุงไทย',
    bankNameEng: 'Krungthai Bank (KTB)',
    bankColor: '#00a5e5',
    widthMm: 241, // 24.1 cm
    heightMm: 90,  // 9.0 cm
    globalOffsetX: 0,
    globalOffsetY: 0,
    hideDateDefault: true,
    feedDirection: 'LANDSCAPE_NORMAL',
    strikeBearer: { x: 218, y: 24, widthMm: 16, enabledDefault: true },
    crossing: { x: 75, y: 8, typeDefault: 'NONE' },
    fields: {
      date: { x: 187.5, y: 4.5, fontSizePt: 12.5, letterSpacingMm: 2.2, enabled: false },
      payee: { x: 87, y: 24, fontSizePt: 12.5, enabled: true },
      payee2: { x: 87, y: 15, fontSizePt: 11, enabled: true },
      amountText: { x: 99.5, y: 33, fontSizePt: 12, prefix: '=', suffix: '=', enabled: true },
      amountNumber: { x: 185.5, y: 38, fontSizePt: 11, prefix: '*', suffix: '*', enabled: true },
      amountNumber2: { x: 185.5, y: 15, fontSizePt: 10, prefix: '*', suffix: '*', enabled: true },
      amountNumber3: { x: 185.5, y: 65, fontSizePt: 10, prefix: '*', suffix: '*', enabled: true },
      stubDate: { x: 10, y: 15, fontSizePt: 8.5 },
      stubPayee: { x: 10, y: 25, fontSizePt: 8.5 },
      stubDika: { x: 10, y: 36, fontSizePt: 8.5 },
      stubAmount: { x: 10, y: 48, fontSizePt: 8.5 },
    }
  },
  BAAC: {
    bankType: 'BAAC',
    bankNameThai: 'ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร (ธ.ก.ส.)',
    bankNameEng: 'Bank for Agriculture and Agricultural Cooperatives (BAAC)',
    bankColor: '#00703c',
    widthMm: 235, // 23.5 cm
    heightMm: 90,  // 9.0 cm
    globalOffsetX: 0,
    globalOffsetY: 0,
    hideDateDefault: true,
    feedDirection: 'LANDSCAPE_NORMAL',
    strikeBearer: { x: 214, y: 27.5, widthMm: 16, enabledDefault: true },
    crossing: { x: 45, y: 8, typeDefault: 'NONE' },
    fields: {
      date: { x: 178, y: 12.5, fontSizePt: 12, letterSpacingMm: 2.2, enabled: false },
      payee: { x: 48, y: 27.5, fontSizePt: 12.5, enabled: true },
      payee2: { x: 48, y: 17, fontSizePt: 11, enabled: true },
      amountText: { x: 58, y: 39.5, fontSizePt: 12, prefix: '=', suffix: '=', enabled: true },
      amountNumber: { x: 168, y: 47, fontSizePt: 13, prefix: '*', suffix: '*', enabled: true },
      amountNumber2: { x: 168, y: 18, fontSizePt: 10, prefix: '*', suffix: '*', enabled: true },
      amountNumber3: { x: 168, y: 70, fontSizePt: 10, prefix: '*', suffix: '*', enabled: true },
      stubDate: { x: 10, y: 15, fontSizePt: 8.5 },
      stubPayee: { x: 10, y: 25, fontSizePt: 8.5 },
      stubDika: { x: 10, y: 36, fontSizePt: 8.5 },
      stubAmount: { x: 10, y: 48, fontSizePt: 8.5 },
    }
  },
  GSB: {
    bankType: 'GSB',
    bankNameThai: 'ธนาคารออมสิน',
    bankNameEng: 'Government Savings Bank (GSB)',
    bankColor: '#e6007e',
    widthMm: 239, // 23.9 cm
    heightMm: 90,  // 9.0 cm
    globalOffsetX: 0,
    globalOffsetY: 0,
    hideDateDefault: true,
    feedDirection: 'LANDSCAPE_NORMAL',
    strikeBearer: { x: 216, y: 29.5, widthMm: 16, enabledDefault: true },
    crossing: { x: 45, y: 8, typeDefault: 'NONE' },
    fields: {
      date: { x: 180, y: 12.5, fontSizePt: 12, letterSpacingMm: 2.2, enabled: false },
      payee: { x: 48, y: 29.5, fontSizePt: 12.5, enabled: true },
      payee2: { x: 48, y: 18, fontSizePt: 11, enabled: true },
      amountText: { x: 54, y: 40.5, fontSizePt: 12, prefix: '=', suffix: '=', enabled: true },
      amountNumber: { x: 168, y: 48, fontSizePt: 13, prefix: '*', suffix: '*', enabled: true },
      amountNumber2: { x: 168, y: 19, fontSizePt: 10, prefix: '*', suffix: '*', enabled: true },
      amountNumber3: { x: 168, y: 70, fontSizePt: 10, prefix: '*', suffix: '*', enabled: true },
      stubDate: { x: 10, y: 15, fontSizePt: 8.5 },
      stubPayee: { x: 10, y: 25, fontSizePt: 8.5 },
      stubDika: { x: 10, y: 36, fontSizePt: 8.5 },
      stubAmount: { x: 10, y: 48, fontSizePt: 8.5 },
    }
  }
};

// Seed Cheques matching prompt specification
const INITIAL_CHEQUES: Cheque[] = [
  {
    id: 'chq_123_69',
    chequeNumber: '1029301',
    stubDate: '2026-10-02',
    chequeDate: '2026-10-02',
    stubPayeeName: 'นายสมชาย',
    chequePayeeName: 'บริษัท ABC จำกัด',
    dikaNumber: '123/69',
    bankAccountNo: '123-1-45678-9',
    items: [
      { id: 'it_1', description: 'ค่าวัสดุสำนักงาน', amount: 10000 },
      { id: 'it_2', description: 'ค่าจ้างเหมาบริการ', amount: 5000 },
      { id: 'it_3', description: 'ค่าซ่อมบำรุง', amount: 2500 },
      { id: 'it_4', description: 'ค่าครุภัณฑ์ประจำกลุ่มงาน', amount: 8250 },
    ],
    totalAmount: 25750,
    totalAmountThaiText: 'สองหมื่นห้าพันเจ็ดร้อยห้าสิบบาทถ้วน',
    withholdingTaxPercent: 1,
    withholdingTaxAmount: 257.50,
    netPaidAmount: 25492.50,
    status: 'ISSUED',
    createdBy: 'นาย ก. ประจำการ',
    createdByUsername: 'somchai',
    createdAt: '2026-10-02T09:30:00.000Z',
    updatedBy: 'นาง ข. ตรวจรับ',
    updatedAt: '2026-10-02T10:15:00.000Z',
    printCount: 2,
    lastPrintedAt: '2026-10-02T14:20:00.000Z',
    lastPrintedBy: 'นาง ข. ตรวจรับ',
    lastBankType: 'KTB',
  },
  {
    id: 'chq_124_69',
    chequeNumber: '1029302',
    stubDate: '2026-10-02',
    chequeDate: '2026-10-02',
    stubPayeeName: 'ร้าน XYZ คอมพิวเตอร์',
    chequePayeeName: 'ร้าน XYZ',
    dikaNumber: '124/69',
    bankAccountNo: '987-2-12345-0',
    items: [
      { id: 'it_5', description: 'ค่าหมึกพิมพ์เลเซอร์และอุปกรณ์ต่อพ่วง', amount: 5000 },
    ],
    totalAmount: 5000,
    totalAmountThaiText: 'ห้าพันบาทถ้วน',
    netPaidAmount: 5000,
    status: 'ISSUED',
    createdBy: 'นายสมชาย บริการดี',
    createdByUsername: 'somchai',
    createdAt: '2026-10-02T09:45:00.000Z',
    printCount: 1,
    lastPrintedAt: '2026-10-02T10:50:00.000Z',
    lastPrintedBy: 'นายสมชาย บริการดี',
    lastBankType: 'BAAC',
  },
  {
    id: 'chq_125_69',
    stubDate: '2026-10-02',
    chequeDate: '2026-10-02',
    stubPayeeName: 'บริษัท DEF ซัพพลาย จำกัด',
    chequePayeeName: 'บริษัท DEF',
    dikaNumber: '125/69',
    bankAccountNo: '123-1-45678-9',
    items: [
      { id: 'it_6', description: 'ค่าจ้างเหมาทำความสะอาดประจำเดือน กันยายน 2569', amount: 12500 },
    ],
    totalAmount: 12500,
    totalAmountThaiText: 'หนึ่งหมื่นสองพันห้าร้อยบาทถ้วน',
    withholdingTaxPercent: 1,
    withholdingTaxAmount: 125,
    netPaidAmount: 12375,
    status: 'PENDING',
    createdBy: 'นางสาวสุดา วงศ์สว่าง',
    createdByUsername: 'suda',
    createdAt: '2026-10-02T10:00:00.000Z',
    printCount: 0, // ยังไม่ออก
  },
  {
    id: 'chq_126_69',
    chequeNumber: '5049382',
    stubDate: '2026-10-01',
    chequeDate: '2026-10-01',
    stubPayeeName: 'ห้างหุ้นส่วนจำกัด สหพัฒนาการค้า',
    chequePayeeName: 'ห้างหุ้นส่วนจำกัด สหพัฒนาการค้า',
    dikaNumber: '126/69',
    bankAccountNo: '345-0-98765-4',
    items: [
      { id: 'it_7', description: 'ค่าน้ำมันเชื้อเพลิงและหล่อลื่นยานพาหนะราชการ', amount: 18400 },
    ],
    totalAmount: 18400,
    totalAmountThaiText: 'หนึ่งหมื่นแปดพันสี่ร้อยบาทถ้วน',
    netPaidAmount: 18400,
    status: 'ISSUED',
    createdBy: 'นายสมชาย บริการดี',
    createdByUsername: 'somchai',
    createdAt: '2026-10-01T13:20:00.000Z',
    printCount: 1,
    lastPrintedAt: '2026-10-01T15:30:00.000Z',
    lastPrintedBy: 'นางสาวสุดา วงศ์สว่าง',
    lastBankType: 'GSB',
  },
  {
    id: 'chq_127_69',
    stubDate: '2026-10-01',
    chequeDate: '2026-10-01',
    stubPayeeName: 'นายประสิทธิ์ ช่างทอง',
    chequePayeeName: 'นายประสิทธิ์ ช่างทอง',
    dikaNumber: '127/69',
    items: [
      { id: 'it_8', description: 'ค่าตอบแทนวิทยากรโครงการเสริมสร้างสมรรถนะการคลัง', amount: 7500 },
    ],
    totalAmount: 7500,
    totalAmountThaiText: 'เจ็ดพันห้าร้อยบาทถ้วน',
    netPaidAmount: 7500,
    status: 'PENDING',
    createdBy: 'นายชำนาญ การคลัง',
    createdByUsername: 'admin',
    createdAt: '2026-10-01T16:00:00.000Z',
    printCount: 0, // ยังไม่ออก
  },
  {
    id: 'chq_128_69',
    chequeNumber: '1029300',
    stubDate: '2026-09-30',
    chequeDate: '2026-09-30',
    stubPayeeName: 'บริษัท ทีโอที เทเลคอม แอนด์ เซอร์วิส จำกัด',
    chequePayeeName: 'บริษัท ทีโอที เทเลคอม แอนด์ เซอร์วิส จำกัด',
    dikaNumber: '120/69',
    bankAccountNo: '123-1-45678-9',
    items: [
      { id: 'it_9', description: 'ค่าบริการสื่อสารและอินเทอร์เน็ตความเร็วสูง', amount: 14500 },
    ],
    totalAmount: 14500,
    totalAmountThaiText: 'หนึ่งหมื่นสี่พันห้าร้อยบาทถ้วน',
    netPaidAmount: 14500,
    status: 'ISSUED',
    createdBy: 'นายสมชาย บริการดี',
    createdByUsername: 'somchai',
    createdAt: '2026-09-30T10:00:00.000Z',
    printCount: 3,
    lastPrintedAt: '2026-10-02T11:20:00.000Z',
    lastPrintedBy: 'นายสมชาย บริการดี',
    lastBankType: 'KTB',
  }
];

// Initial Print Logs (Strictly Append-Only)
const INITIAL_PRINT_LOGS: ChequePrintLog[] = [
  {
    id: 'prt_1',
    chequeId: 'chq_123_69',
    dikaNumber: '123/69',
    chequePayeeName: 'บริษัท ABC จำกัด',
    totalAmount: 25750,
    bankType: 'KTB',
    printNo: 1,
    printedBy: 'นาย ก. ประจำการ',
    printedByUsername: 'somchai',
    printedAt: '2026-10-02T10:45:00.000Z',
  },
  {
    id: 'prt_2',
    chequeId: 'chq_123_69',
    dikaNumber: '123/69',
    chequePayeeName: 'บริษัท ABC จำกัด',
    totalAmount: 25750,
    bankType: 'KTB',
    printNo: 2,
    printedBy: 'นาง ข. ตรวจรับ',
    printedByUsername: 'suda',
    printedAt: '2026-10-02T14:20:00.000Z',
    reprintReason: 'กระดาษติด',
    reprintNote: 'เครื่องพิมพ์ติดขัดบริเวณถาดป้อนกระดาษด้านบน ได้นำกระดาษออกและทำการพิมพ์ใหม่',
  },
  {
    id: 'prt_3',
    chequeId: 'chq_124_69',
    dikaNumber: '124/69',
    chequePayeeName: 'ร้าน XYZ',
    totalAmount: 5000,
    bankType: 'BAAC',
    printNo: 1,
    printedBy: 'นายสมชาย บริการดี',
    printedByUsername: 'somchai',
    printedAt: '2026-10-02T10:50:00.000Z',
  },
  {
    id: 'prt_4',
    chequeId: 'chq_126_69',
    dikaNumber: '126/69',
    chequePayeeName: 'ห้างหุ้นส่วนจำกัด สหพัฒนาการค้า',
    totalAmount: 18400,
    bankType: 'GSB',
    printNo: 1,
    printedBy: 'นางสาวสุดา วงศ์สว่าง',
    printedByUsername: 'suda',
    printedAt: '2026-10-01T15:30:00.000Z',
  },
  {
    id: 'prt_5',
    chequeId: 'chq_128_69',
    dikaNumber: '120/69',
    chequePayeeName: 'บริษัท ทีโอที เทเลคอม แอนด์ เซอร์วิส จำกัด',
    totalAmount: 14500,
    bankType: 'KTB',
    printNo: 1,
    printedBy: 'นายสมชาย บริการดี',
    printedByUsername: 'somchai',
    printedAt: '2026-09-30T11:00:00.000Z',
  },
  {
    id: 'prt_6',
    chequeId: 'chq_128_69',
    dikaNumber: '120/69',
    chequePayeeName: 'บริษัท ทีโอที เทเลคอม แอนด์ เซอร์วิส จำกัด',
    totalAmount: 14500,
    bankType: 'KTB',
    printNo: 2,
    printedBy: 'นายสมชาย บริการดี',
    printedByUsername: 'somchai',
    printedAt: '2026-09-30T11:35:00.000Z',
    reprintReason: 'ตำแหน่งพิมพ์ไม่ตรง',
    reprintNote: 'ข้อความเหลื่อมเส้นบรรทัด ปรับ Global Offset Y -1.5mm แล้วพิมพ์ใหม่',
  },
  {
    id: 'prt_7',
    chequeId: 'chq_128_69',
    dikaNumber: '120/69',
    chequePayeeName: 'บริษัท ทีโอที เทเลคอม แอนด์ เซอร์วิส จำกัด',
    totalAmount: 14500,
    bankType: 'KTB',
    printNo: 3,
    printedBy: 'นายสมชาย บริการดี',
    printedByUsername: 'somchai',
    printedAt: '2026-10-02T11:20:00.000Z',
    reprintReason: 'เช็คเสีย',
    reprintNote: 'หัวพิมพ์หมึกเปื้อนตัวเลขจำนวนเงิน ยกเลิกฉบับเดิมและสั่งพิมพ์ทดแทน',
  }
];

// Initial Audit Logs
const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'aud_1',
    timestamp: '2026-10-02T09:30:00.000Z',
    username: 'somchai',
    userFullName: 'นาย ก. ประจำการ',
    action: 'CREATE',
    target: 'ฎีกา 123/69',
    details: 'สร้างรายการออกเช็ค บริษัท ABC จำกัด ยอด 25,750.00 บาท',
  },
  {
    id: 'aud_2',
    timestamp: '2026-10-02T10:15:00.000Z',
    username: 'suda',
    userFullName: 'นาง ข. ตรวจรับ',
    action: 'UPDATE',
    target: 'ฎีกา 123/69',
    details: 'แก้ไขรายการฎีกา เพิ่มรายการค่าครุภัณฑ์ประจำกลุ่มงาน 8,250 บาท',
  },
  {
    id: 'aud_3',
    timestamp: '2026-10-02T10:45:00.000Z',
    username: 'somchai',
    userFullName: 'นาย ก. ประจำการ',
    action: 'PRINT',
    target: 'ฎีกา 123/69',
    details: 'ออกเช็ค KTB ครั้งที่ 1',
  },
  {
    id: 'aud_4',
    timestamp: '2026-10-02T14:20:00.000Z',
    username: 'suda',
    userFullName: 'นาง ข. ตรวจรับ',
    action: 'REPRINT',
    target: 'ฎีกา 123/69',
    details: 'ออกเช็คซ้ำ KTB ครั้งที่ 2 (เหตุผล: กระดาษติด)',
  }
];

export class StorageService {
  // Users
  static getUsers(): User[] {
    const data = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    try {
      return JSON.parse(data);
    } catch {
      return INITIAL_USERS;
    }
  }

  static saveUser(user: User, operator: User): void {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === user.id);
    let action: 'CREATE' | 'UPDATE' = 'CREATE';

    if (idx >= 0) {
      users[idx] = user;
      action = 'UPDATE';
    } else {
      users.push(user);
    }

    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    this.addAuditLog({
      action: action === 'CREATE' ? 'CREATE' : 'UPDATE',
      target: `ผู้ใช้งาน: ${user.username} (${user.fullName})`,
      details: `${action === 'CREATE' ? 'เพิ่มผู้ใช้งานใหม่' : 'แก้ไขข้อมูลผู้ใช้'} สิทธิ์: ${user.role} สถานะ: ${user.status}`,
    }, operator);
  }

  static deleteUser(userId: string, operator: User): void {
    if (operator.role !== 'ADMIN') {
      console.warn('Unauthorized: Only administrators can delete users');
      return;
    }
    let users = this.getUsers();
    const target = users.find(u => u.id === userId);
    if (!target) return;
    if (target.username === 'admin') {
      console.warn('Cannot delete primary administrator account');
      return;
    }
    users = users.filter(u => u.id !== userId);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    this.addAuditLog({
      action: 'DELETE',
      target: `ผู้ใช้งาน: ${target.username}`,
      details: `ลบผู้ใช้งาน ${target.fullName}`,
    }, operator);
  }

  static async updateUserProfile(
    userId: string,
    data: {
      fullName?: string;
      position?: string;
      role?: UserRole;
      status?: UserStatus;
      passwordPlain?: string;
    },
    operator: User
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    if (operator.role !== 'ADMIN') {
      return { success: false, error: 'เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถแก้ไขข้อมูลผู้ใช้งานได้' };
    }
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) return { success: false, error: 'ไม่พบผู้ใช้งานนี้ในระบบ' };

    const target = users[idx];
    if (data.fullName !== undefined && data.fullName.trim()) target.fullName = data.fullName.trim();
    if (data.position !== undefined) target.position = data.position.trim();
    if (data.role !== undefined) target.role = data.role;
    if (data.status !== undefined) target.status = data.status;
    if (data.passwordPlain && data.passwordPlain.trim().length >= 4) {
      target.passwordHash = await hashPassword(data.passwordPlain.trim());
    }

    users[idx] = target;
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

    this.addAuditLog({
      action: 'UPDATE',
      target: `ผู้ใช้งาน: ${target.username} (${target.fullName})`,
      details: `${operator.fullName} ได้แก้ไขข้อมูลผู้ใช้: สิทธิ์ ${target.role}, สถานะ ${target.status}${data.passwordPlain ? ', กำหนดรหัสผ่านใหม่' : ''}`,
    }, operator);

    const current = this.getCurrentUser();
    if (current && current.id === target.id) {
      this.setCurrentUser(target);
    }

    return { success: true, user: target };
  }

  // Auth & Session
  static getCurrentUser(): User | null {
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  static setCurrentUser(user: User | null): void {
    if (!user) {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    } else {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    }
  }

  static async authenticate(username: string, passwordPlain: string): Promise<User | null> {
    const users = this.getUsers();
    const target = users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
    if (!target) return null;
    if (target.status !== 'ACTIVE') return null;

    // Check hash or direct match for demo
    const calculatedHash = await hashPassword(passwordPlain);
    const isValid = target.passwordHash === calculatedHash ||
                    (passwordPlain === 'admin123' && target.username === 'admin') ||
                    (passwordPlain === '1234' && (target.username === 'somchai' || target.username === 'suda' || target.username === 'surachai'));

    if (isValid) {
      this.setCurrentUser(target);
      this.addAuditLog({
        action: 'LOGIN',
        target: `ระบบ`,
        details: `ผู้ใช้ ${target.fullName} เข้าสู่ระบบสำเร็จ`,
      }, target);
      return target;
    }
    return null;
  }

  static isUsernameAvailable(username: string): boolean {
    const clean = username.trim().toLowerCase();
    if (!clean) return false;
    const users = this.getUsers();
    return !users.some(u => u.username.toLowerCase() === clean);
  }

  static async registerUser(
    data: {
      username: string;
      fullName: string;
      passwordPlain: string;
      position?: string;
      role?: 'ADMIN' | 'USER';
    },
    options?: {
      autoLogin?: boolean;
      operator?: User;
    }
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    const usernameClean = data.username.trim().toLowerCase();
    if (!usernameClean || usernameClean.length < 3) {
      return { success: false, error: 'ชื่อผู้ใช้งานต้องมีความยาวอย่างน้อย 3 ตัวอักษร (ภาษาอังกฤษหรือตัวเลข)' };
    }
    if (!/^[a-zA-Z0-9_.-]+$/.test(usernameClean)) {
      return { success: false, error: 'ชื่อผู้ใช้งานต้องเป็นภาษาอังกฤษ ตัวเลข หรือขีดล่าง (_) เท่านั้น' };
    }
    if (!data.fullName.trim()) {
      return { success: false, error: 'กรุณาระบุชื่อ-นามสกุลจริง' };
    }
    if (!data.passwordPlain || data.passwordPlain.length < 4) {
      return { success: false, error: 'รหัสผ่านต้องมีความยาวอย่างน้อย 4 ตัวอักษร' };
    }

    const users = this.getUsers();
    const existing = users.find(u => u.username.toLowerCase() === usernameClean);
    if (existing) {
      return { success: false, error: `ชื่อผู้ใช้งาน "${usernameClean}" มีอยู่ในระบบแล้ว กรุณาใช้ชื่ออื่น` };
    }

    const passwordHash = await hashPassword(data.passwordPlain);
    const newUser: User = {
      id: 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      username: usernameClean,
      passwordHash,
      fullName: data.fullName.trim(),
      position: data.position?.trim() || 'เจ้าหน้าที่การเงินและบัญชี',
      role: data.role || 'USER',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

    const auditActor = options?.operator || newUser;
    this.addAuditLog({
      action: 'CREATE',
      target: `ลงทะเบียนผู้ใช้: ${newUser.username}`,
      details: options?.operator
        ? `${options.operator.fullName} ได้ลงทะเบียนสมาชิกใหม่ให้: ${newUser.fullName} (${newUser.position}) สิทธิ์: ${newUser.role}`
        : `สมัครสมาชิกผู้ใช้งานใหม่: ${newUser.fullName} (${newUser.position}) สิทธิ์: ${newUser.role}`,
    }, auditActor);

    if (options?.autoLogin !== false) {
      this.setCurrentUser(newUser);
    }

    return { success: true, user: newUser };
  }

  static toggleUserStatus(userId: string, operator: User): User | null {
    const users = this.getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return null;
    user.status = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    this.addAuditLog({
      action: 'UPDATE',
      target: `ผู้ใช้งาน: ${user.username}`,
      details: `เปลี่ยนสถานะเป็น ${user.status === 'ACTIVE' ? 'เปิดใช้งาน' : 'ระงับการใช้งาน'}`,
    }, operator);
    return user;
  }

  static updateUserRole(userId: string, newRole: UserRole, operator: User): User | null {
    const users = this.getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return null;
    user.role = newRole;
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    this.addAuditLog({
      action: 'UPDATE',
      target: `ผู้ใช้งาน: ${user.username}`,
      details: `ปรับเปลี่ยนสิทธิ์เป็น ${newRole}`,
    }, operator);
    return user;
  }

  // Cheques
  static getCheques(): Cheque[] {
    const data = localStorage.getItem(STORAGE_KEYS.CHEQUES);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.CHEQUES, JSON.stringify(INITIAL_CHEQUES));
      return INITIAL_CHEQUES;
    }
    try {
      return JSON.parse(data);
    } catch {
      return INITIAL_CHEQUES;
    }
  }

  static getChequeById(id: string): Cheque | undefined {
    return this.getCheques().find(c => c.id === id);
  }

  // Get Next Cheque Number (+1 Auto-Increment)
  static getNextChequeNumber(bankAccountNo?: string): string {
    const cheques = this.getCheques();
    const candidates = cheques.filter(c => c.chequeNumber && c.chequeNumber.trim() !== '');
    if (candidates.length === 0) {
      return '1029302';
    }

    // Try matching bank account if possible, else take from all cheques
    const accountMatched = bankAccountNo
      ? candidates.filter(c => c.bankAccountNo === bankAccountNo)
      : [];
    const pool = accountMatched.length > 0 ? accountMatched : candidates;

    let maxNum = 0;
    let maxLen = 7;

    for (const c of pool) {
      const raw = (c.chequeNumber || '').trim();
      const digitsOnly = raw.replace(/\D/g, '');
      if (digitsOnly) {
        const val = parseInt(digitsOnly, 10);
        if (!isNaN(val) && val > maxNum) {
          maxNum = val;
          maxLen = Math.max(maxLen, digitsOnly.length);
        }
      }
    }

    if (maxNum > 0) {
      return (maxNum + 1).toString().padStart(maxLen, '0');
    }

    return '1029302';
  }

  static saveCheque(cheque: Cheque, operator: User): Cheque {
    const cheques = this.getCheques();
    const idx = cheques.findIndex(c => c.id === cheque.id);
    const now = new Date().toISOString();

    // Recompute total amount and thai text
    const total = cheque.items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    
    // Calculate withholding tax & net paid
    let taxAmount = 0;
    if (cheque.withholdingTaxPercent && cheque.withholdingTaxPercent > 0) {
      taxAmount = Math.round((total * cheque.withholdingTaxPercent / 100) * 100) / 100;
    } else if (cheque.withholdingTaxAmount && cheque.withholdingTaxAmount > 0) {
      taxAmount = cheque.withholdingTaxAmount;
    }
    const netAmount = Math.max(0, Math.round((total - taxAmount) * 100) / 100);
    const thaiText = thaiBahtText(netAmount > 0 ? netAmount : total);

    const initialStatus = cheque.status || (cheque.printCount > 0 ? 'ISSUED' : 'PENDING');

    const updatedCheque: Cheque = {
      ...cheque,
      totalAmount: total,
      withholdingTaxAmount: taxAmount,
      netPaidAmount: netAmount,
      totalAmountThaiText: thaiText,
      status: initialStatus,
    };

    if (idx >= 0) {
      // Update
      updatedCheque.updatedBy = operator.fullName;
      updatedCheque.updatedAt = now;
      cheques[idx] = updatedCheque;

      this.addAuditLog({
        action: 'UPDATE',
        target: `ฎีกา ${cheque.dikaNumber}`,
        details: `แก้ไขรายการเช็ค ${cheque.chequePayeeName} ยอดรวม ${total.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท (สุทธิ ${netAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท)`,
      }, operator);
    } else {
      // Create
      updatedCheque.id = cheque.id || ('chq_' + Date.now());
      updatedCheque.createdBy = operator.fullName;
      updatedCheque.createdByUsername = operator.username;
      updatedCheque.createdAt = now;
      updatedCheque.printCount = cheque.printCount || 0;
      updatedCheque.status = cheque.status || 'PENDING';
      cheques.unshift(updatedCheque);

      this.addAuditLog({
        action: 'CREATE',
        target: `ฎีกา ${cheque.dikaNumber}`,
        details: `สร้างรายการเช็ค ${cheque.chequePayeeName} ยอดรวม ${total.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`,
      }, operator);
    }

    localStorage.setItem(STORAGE_KEYS.CHEQUES, JSON.stringify(cheques));
    return updatedCheque;
  }

  static voidCheque(chequeId: string, reason: string, operator: User): Cheque {
    const cheques = this.getCheques();
    const cheque = cheques.find(c => c.id === chequeId);
    if (!cheque) throw new Error('Cheque not found');

    const now = new Date().toISOString();
    cheque.status = 'VOID';
    cheque.voidReason = reason.trim() || 'เช็คชำรุด/ยกเลิกรายการ';
    cheque.voidAt = now;
    cheque.voidBy = operator.fullName;
    cheque.updatedAt = now;
    cheque.updatedBy = operator.fullName;

    localStorage.setItem(STORAGE_KEYS.CHEQUES, JSON.stringify(cheques));

    this.addAuditLog({
      action: 'UPDATE',
      target: `ฎีกา ${cheque.dikaNumber}`,
      details: `ยกเลิกเช็ค (VOID) ${cheque.chequeNumber ? `เลขที่ ${cheque.chequeNumber}` : ''} เหตุผล: ${cheque.voidReason}`,
    }, operator);

    return cheque;
  }

  static deleteCheque(chequeId: string, operator: User): void {
    if (operator.role !== 'ADMIN') {
      console.warn('Unauthorized: Only administrators can delete cheques');
      return;
    }
    let cheques = this.getCheques();
    const target = cheques.find(c => c.id === chequeId);
    if (!target) return;

    cheques = cheques.filter(c => c.id !== chequeId);
    localStorage.setItem(STORAGE_KEYS.CHEQUES, JSON.stringify(cheques));

    this.addAuditLog({
      action: 'DELETE',
      target: `ฎีกา ${target.dikaNumber}`,
      details: `ลบรายการเช็ค ${target.chequePayeeName} มูลค่า ${target.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`,
    }, operator);
  }

  // Print Logs - Strictly Append-Only!
  static getPrintLogs(chequeId?: string): ChequePrintLog[] {
    const data = localStorage.getItem(STORAGE_KEYS.PRINT_LOGS);
    let logs: ChequePrintLog[] = [];
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.PRINT_LOGS, JSON.stringify(INITIAL_PRINT_LOGS));
      logs = INITIAL_PRINT_LOGS;
    } else {
      try {
        logs = JSON.parse(data);
      } catch {
        logs = INITIAL_PRINT_LOGS;
      }
    }

    if (chequeId) {
      return logs.filter(l => l.chequeId === chequeId).sort((a, b) => a.printNo - b.printNo);
    }
    return logs.sort((a, b) => new Date(b.printedAt).getTime() - new Date(a.printedAt).getTime());
  }

  static recordPrintLog(params: {
    chequeId: string;
    chequeNumber?: string;
    bankType: BankType;
    reprintReason?: string;
    reprintNote?: string;
    operator: User;
  }): ChequePrintLog {
    const cheques = this.getCheques();
    const cheque = cheques.find(c => c.id === params.chequeId);
    if (!cheque) throw new Error('Cheque not found');

    const now = new Date().toISOString();
    const existingLogs = this.getPrintLogs(params.chequeId);
    const nextPrintNo = existingLogs.length + 1;
    const isReprint = nextPrintNo > 1;

    // Create append-only log record
    const newLog: ChequePrintLog = {
      id: 'prt_' + Date.now(),
      chequeId: cheque.id,
      chequeNumber: params.chequeNumber || cheque.chequeNumber,
      dikaNumber: cheque.dikaNumber || '-',
      chequePayeeName: cheque.chequePayeeName,
      totalAmount: cheque.netPaidAmount || cheque.totalAmount,
      bankType: params.bankType,
      printNo: nextPrintNo,
      printedBy: params.operator.fullName,
      printedByUsername: params.operator.username,
      printedAt: now,
      reprintReason: params.reprintReason,
      reprintNote: params.reprintNote,
    };

    // Save into append-only log storage
    const allLogs = this.getPrintLogs();
    allLogs.unshift(newLog);
    localStorage.setItem(STORAGE_KEYS.PRINT_LOGS, JSON.stringify(allLogs));

    // Update Cheque cached counter and latest print metadata
    cheque.printCount = nextPrintNo;
    cheque.lastPrintedAt = now;
    cheque.lastPrintedBy = params.operator.fullName;
    cheque.lastBankType = params.bankType;
    if (params.chequeNumber) {
      cheque.chequeNumber = params.chequeNumber;
    }
    if (cheque.status !== 'VOID') {
      cheque.status = 'ISSUED';
    }
    localStorage.setItem(STORAGE_KEYS.CHEQUES, JSON.stringify(cheques));

    // Add Audit Log
    this.addAuditLog({
      action: isReprint ? 'REPRINT' : 'PRINT',
      target: `ฎีกา ${cheque.dikaNumber} ${params.chequeNumber ? `(เช็คเลขที่ ${params.chequeNumber})` : ''}`,
      details: isReprint
        ? `ออกเช็คซ้ำ ${params.bankType} ครั้งที่ ${nextPrintNo} (เหตุผล: ${params.reprintReason || 'ไม่ได้ระบุ'})`
        : `ออกเช็ค ${params.bankType} ครั้งที่ 1`,
    }, params.operator);

    return newLog;
  }

  // Audit Logs - Append-Only
  static getAuditLogs(): AuditLog[] {
    const data = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(INITIAL_AUDIT_LOGS));
      return INITIAL_AUDIT_LOGS;
    }
    try {
      return JSON.parse(data);
    } catch {
      return INITIAL_AUDIT_LOGS;
    }
  }

  static addAuditLog(entry: Omit<AuditLog, 'id' | 'timestamp' | 'username' | 'userFullName'>, operator: User): void {
    const logs = this.getAuditLogs();
    const newAudit: AuditLog = {
      id: 'aud_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      username: operator.username,
      userFullName: operator.fullName,
      ...entry,
    };
    logs.unshift(newAudit);
    // Keep last 1,000 audit logs
    if (logs.length > 1000) logs.pop();
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(logs));
  }

  // Bank Templates
  static getDefaultTemplates(): Record<BankType, BankTemplateConfig> {
    return JSON.parse(JSON.stringify(INITIAL_TEMPLATES));
  }

  static getTemplates(): Record<BankType, BankTemplateConfig> {
    const data = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(INITIAL_TEMPLATES));
      return INITIAL_TEMPLATES;
    }
    try {
      const parsed = JSON.parse(data);
      if (parsed.KTB && parsed.KTB.fields?.date?.x === 184) {
        parsed.KTB = { ...parsed.KTB, fields: INITIAL_TEMPLATES.KTB.fields };
        localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(parsed));
      }
      // Guarantee strikeBearer, crossing, payee2, amountNumber2, amountNumber3 exist
      Object.keys(parsed).forEach((k) => {
        if (!parsed[k].strikeBearer) {
          const def = (INITIAL_TEMPLATES as Record<string, BankTemplateConfig>)[k]?.strikeBearer || { x: 216, y: 25, widthMm: 16, enabledDefault: true };
          parsed[k].strikeBearer = def;
        }
        if (!parsed[k].crossing) {
          const def = (INITIAL_TEMPLATES as Record<string, BankTemplateConfig>)[k]?.crossing || { x: 60, y: 8, typeDefault: 'NONE' };
          parsed[k].crossing = def;
        }
        if (parsed[k].hideDateDefault === undefined) {
          parsed[k].hideDateDefault = true;
        }
        if (!parsed[k].feedDirection) {
          parsed[k].feedDirection = 'LANDSCAPE_NORMAL';
        }
        if (!parsed[k].fields.payee2) {
          parsed[k].fields.payee2 = (INITIAL_TEMPLATES as any)[k]?.fields.payee2 || {
            x: parsed[k].fields.payee.x,
            y: Math.max(5, parsed[k].fields.payee.y - 9),
            fontSizePt: 11,
            enabled: true,
          };
        }
        if (!parsed[k].fields.amountNumber2) {
          parsed[k].fields.amountNumber2 = (INITIAL_TEMPLATES as any)[k]?.fields.amountNumber2 || {
            x: parsed[k].fields.amountNumber.x,
            y: Math.max(5, parsed[k].fields.amountNumber.y - 20),
            fontSizePt: 10,
            prefix: '*',
            suffix: '*',
            enabled: true,
          };
        }
        if (!parsed[k].fields.amountNumber3) {
          parsed[k].fields.amountNumber3 = (INITIAL_TEMPLATES as any)[k]?.fields.amountNumber3 || {
            x: parsed[k].fields.amountNumber.x,
            y: Math.min(parsed[k].heightMm - 10, parsed[k].fields.amountNumber.y + 25),
            fontSizePt: 10,
            prefix: '*',
            suffix: '*',
            enabled: true,
          };
        }
      });
      return parsed;
    } catch {
      return INITIAL_TEMPLATES;
    }
  }

  // Duplicate an existing/past cheque as a brand new cheque for the new month (printCount = 0, NOT a reprint)
  static duplicateChequeAsNew(sourceChequeId: string, operator: User): Cheque {
    const cheques = this.getCheques();
    const source = cheques.find(c => c.id === sourceChequeId);
    if (!source) throw new Error('Cheque not found');

    const today = getTodayISODate();
    const newCheque: Cheque = {
      id: 'chq_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      chequeNumber: undefined, // Blank so user enters new cheque number for this month
      stubDate: today,
      chequeDate: today,
      stubPayeeName: source.stubPayeeName || source.chequePayeeName,
      chequePayeeName: source.chequePayeeName,
      dikaNumber: source.dikaNumber || '',
      bankAccountNo: source.bankAccountNo,
      items: JSON.parse(JSON.stringify(source.items)),
      totalAmount: source.totalAmount,
      totalAmountThaiText: source.totalAmountThaiText,
      withholdingTaxPercent: source.withholdingTaxPercent,
      withholdingTaxAmount: source.withholdingTaxAmount,
      netPaidAmount: source.netPaidAmount,
      memo: source.memo ? `${source.memo}` : undefined,
      status: 'PENDING',
      printCount: 0, // NEW CHEQUE, NOT A REPRINT!
      lastBankType: source.lastBankType,
      createdBy: operator.fullName,
      createdByUsername: operator.username,
      createdAt: new Date().toISOString(),
    };

    cheques.unshift(newCheque);
    localStorage.setItem(STORAGE_KEYS.CHEQUES, JSON.stringify(cheques));

    this.addAuditLog({
      action: 'CREATE',
      target: `เช็คใหม่: ${newCheque.chequePayeeName}`,
      details: `ดึงประวัติเดิมของ "${source.chequePayeeName}" มาออกเป็นเช็คฉบับใหม่รอบเดือนนี้ ยอดสั่งจ่าย ${(newCheque.netPaidAmount || newCheque.totalAmount).toLocaleString('th-TH')} บาท (ไม่ถือว่าพิมพ์ซ้ำ)`,
    }, operator);

    return newCheque;
  }

  static saveTemplate(config: BankTemplateConfig, operator: User): void {
    const templates = this.getTemplates();
    templates[config.bankType] = config;
    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(templates));

    this.addAuditLog({
      action: 'SETTING_UPDATE',
      target: `Template ${config.bankType}`,
      details: `ปรับแต่งพิกัดพิมพ์และ Offset ของ ${config.bankNameThai} (Offset X: ${config.globalOffsetX}mm, Y: ${config.globalOffsetY}mm)`,
    }, operator);
  }

  static deleteTemplate(bankType: string, operator: User): void {
    const templates = this.getTemplates();
    const target = templates[bankType];
    if (!target) return;
    delete templates[bankType];
    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(templates));

    this.addAuditLog({
      action: 'SETTING_UPDATE',
      target: `Template ${bankType}`,
      details: `ลบแม่แบบเช็ค ${target.bankNameThai} (${bankType})`,
    }, operator);
  }

  // Autocomplete Suggestions
  static getAutocompleteData(): {
    payees: string[];
    descriptions: string[];
    dikaNumbers: string[];
  } {
    const cheques = this.getCheques();
    const payeeSet = new Set<string>();
    const descSet = new Set<string>();
    const dikaSet = new Set<string>();

    cheques.forEach(c => {
      if (c.chequePayeeName) payeeSet.add(c.chequePayeeName.trim());
      if (c.stubPayeeName) payeeSet.add(c.stubPayeeName.trim());
      if (c.dikaNumber) dikaSet.add(c.dikaNumber.trim());
      c.items.forEach(it => {
        if (it.description) descSet.add(it.description.trim());
      });
    });

    return {
      payees: Array.from(payeeSet),
      descriptions: Array.from(descSet),
      dikaNumbers: Array.from(dikaSet),
    };
  }

  // Restore from JSON backup file
  static restoreBackup(backupData: any, operator: User): { success: boolean; message: string; count: number } {
    if (!backupData || typeof backupData !== 'object') {
      return { success: false, message: 'รูปแบบไฟล์สำรองข้อมูล JSON ไม่ถูกต้อง', count: 0 };
    }

    let count = 0;
    if (Array.isArray(backupData.cheques)) {
      localStorage.setItem(STORAGE_KEYS.CHEQUES, JSON.stringify(backupData.cheques));
      count = backupData.cheques.length;
    }
    if (Array.isArray(backupData.users)) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(backupData.users));
    }
    if (Array.isArray(backupData.printLogs)) {
      localStorage.setItem(STORAGE_KEYS.PRINT_LOGS, JSON.stringify(backupData.printLogs));
    }
    if (backupData.templates && typeof backupData.templates === 'object') {
      localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(backupData.templates));
    }

    this.addAuditLog({
      action: 'SETTING_UPDATE',
      target: 'ระบบ',
      details: `นำเข้าไฟล์สำรองข้อมูล JSON สำเร็จ (${count} รายการเช็ค)`,
    }, operator);

    return { success: true, message: `กู้คืนข้อมูลสำเร็จ (${count} รายการ)`, count };
  }

  // Generate Sample CSV Template for Batch Import
  static generateCsvTemplate(): string {
    const headers = [
      'วันที่(YYYY-MM-DD)',
      'เลขที่ฎีกาคลังรับ',
      'ผู้รับเงิน(ตัวเช็ค)',
      'ผู้รับเงิน(ต้นขั้ว)',
      'รายการฎีกา',
      'จำนวนเงิน(บาท)',
      'เลขที่เช็ค(ถ้ามี)',
      'เลขที่บัญชีธนาคาร',
      'หักภาษี(%)'
    ];
    const sampleRows = [
      ['2026-10-02', '130/69', 'บริษัท สยามพาณิชย์ จำกัด', 'บริษัท สยามพาณิชย์ จำกัด', 'ค่าจัดซื้อวัสดุสำนักงานประจำปี', '45000.00', '1029305', '123-1-45678-9', '1'],
      ['2026-10-02', '131/69', 'ห้างหุ้นส่วนจำกัด ไทยพัฒนา', 'ห้างหุ้นส่วนจำกัด ไทยพัฒนา', 'ค่าจ้างเหมาปรับปรุงระบบสารสนเทศ', '18500.00', '', '123-1-45678-9', '1'],
      ['2026-10-01', '132/69', 'นายสมเกียรติ มุ่งมั่น', 'นายสมเกียรติ มุ่งมั่น', 'ค่าตอบแทนคณะกรรมการตรวจรับพัสดุ', '3600.00', '', '', '0'],
    ];

    return '\uFEFF' + [headers.join(','), ...sampleRows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(','))].join('\r\n');
  }

  // Import Cheques from CSV / Excel text
  static importChequesFromCsv(csvContent: string, operator: User): { success: boolean; importedCount: number; errors: string[] } {
    const lines = csvContent
      .replace(/^\uFEFF/, '') // Strip UTF-8 BOM
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l.length > 0);

    if (lines.length < 2) {
      return { success: false, importedCount: 0, errors: ['ไฟล์ต้องมีแถวหัวตารางและข้อมูลอย่างน้อย 1 รายการ'] };
    }

    // Helper to parse CSV line respecting quotes
    const parseCsvLine = (line: string): string[] => {
      const result: string[] = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(cur.trim());
          cur = '';
        } else {
          cur += char;
        }
      }
      result.push(cur.trim());
      return result;
    };

    const headerCols = parseCsvLine(lines[0]).map(h => h.toLowerCase());
    
    // Map header column indices
    let idxDate = headerCols.findIndex(h => h.includes('วัน') || h.includes('date'));
    let idxDika = headerCols.findIndex(h => h.includes('ฎีกา') || h.includes('dika'));
    let idxPayee = headerCols.findIndex(h => h.includes('ตัวเช็ค') || (h.includes('ผู้รับเงิน') && !h.includes('ต้นขั้ว')) || h.includes('payee'));
    let idxStubPayee = headerCols.findIndex(h => h.includes('ต้นขั้ว') || h.includes('stub'));
    let idxItem = headerCols.findIndex(h => h.includes('ราย') || h.includes('desc') || h.includes('item'));
    let idxAmount = headerCols.findIndex(h => h.includes('เงิน') || h.includes('บาท') || h.includes('ยอด') || h.includes('amount'));
    let idxChequeNo = headerCols.findIndex(h => h.includes('เลขที่เช็ค') || h.includes('เช็คเลขที่') || h.includes('chequeno'));
    let idxAccountNo = headerCols.findIndex(h => h.includes('บัญชี') || h.includes('account'));
    let idxTax = headerCols.findIndex(h => h.includes('ภาษี') || h.includes('tax'));

    // Fallbacks if not detected by header name
    if (idxDika === -1 && headerCols.length >= 2) idxDika = 1;
    if (idxPayee === -1 && headerCols.length >= 3) idxPayee = 2;
    if (idxAmount === -1 && headerCols.length >= 5) idxAmount = 5;

    const existingCheques = this.getCheques();
    const newCheques: Cheque[] = [];
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i]);
      if (cols.length === 0 || cols.every(c => !c)) continue;

      const dika = idxDika >= 0 && cols[idxDika] ? cols[idxDika].trim() : `D-${Date.now().toString().slice(-4)}`;
      const payee = idxPayee >= 0 && cols[idxPayee] ? cols[idxPayee].trim() : '';
      const stubPayee = idxStubPayee >= 0 && cols[idxStubPayee] ? cols[idxStubPayee].trim() : payee;
      const dateVal = idxDate >= 0 && cols[idxDate] ? cols[idxDate].trim() : getTodayISODate();
      const itemDesc = idxItem >= 0 && cols[idxItem] ? cols[idxItem].trim() : `รายการตามฎีกา ${dika}`;
      
      const rawAmount = idxAmount >= 0 && cols[idxAmount] ? cols[idxAmount].replace(/,/g, '').trim() : '0';
      const amount = parseFloat(rawAmount) || 0;

      const chqNo = idxChequeNo >= 0 && cols[idxChequeNo] ? cols[idxChequeNo].trim() : undefined;
      const accNo = idxAccountNo >= 0 && cols[idxAccountNo] ? cols[idxAccountNo].trim() : undefined;
      const taxRate = idxTax >= 0 && cols[idxTax] ? parseFloat(cols[idxTax]) || 0 : 0;

      if (!payee && amount <= 0) {
        // Skip empty row
        continue;
      }

      if (!payee) {
        errors.push(`แถวที่ ${i + 1}: ไม่พบชื่อผู้รับเงิน`);
        continue;
      }

      if (amount <= 0) {
        errors.push(`แถวที่ ${i + 1}: ยอดเงินต้องมากกว่า 0 บาท`);
        continue;
      }

      const taxAmount = taxRate > 0 ? Math.round((amount * taxRate / 100) * 100) / 100 : 0;
      const netAmount = Math.max(0, Math.round((amount - taxAmount) * 100) / 100);
      const thaiText = thaiBahtText(netAmount > 0 ? netAmount : amount);

      const chequeToInsert: Cheque = {
        id: 'chq_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        chequeNumber: chqNo || undefined,
        stubDate: dateVal.length === 10 ? dateVal : getTodayISODate(),
        chequeDate: dateVal.length === 10 ? dateVal : getTodayISODate(),
        stubPayeeName: stubPayee || payee,
        chequePayeeName: payee,
        dikaNumber: dika,
        bankAccountNo: accNo || undefined,
        items: [{ id: 'it_' + Date.now() + '_' + i, description: itemDesc, amount }],
        totalAmount: amount,
        totalAmountThaiText: thaiText,
        withholdingTaxPercent: taxRate > 0 ? taxRate : undefined,
        withholdingTaxAmount: taxAmount > 0 ? taxAmount : undefined,
        netPaidAmount: netAmount,
        status: chqNo ? 'ISSUED' : 'PENDING',
        printCount: chqNo ? 1 : 0,
        createdBy: operator.fullName,
        createdByUsername: operator.username,
        createdAt: new Date().toISOString(),
      };

      newCheques.push(chequeToInsert);
    }

    if (newCheques.length > 0) {
      const combined = [...newCheques, ...existingCheques];
      localStorage.setItem(STORAGE_KEYS.CHEQUES, JSON.stringify(combined));

      this.addAuditLog({
        action: 'CREATE',
        target: 'นำเข้าข้อมูล CSV',
        details: `นำเข้ารายการเช็คและฎีกาจำนวน ${newCheques.length} รายการจากไฟล์ CSV`,
      }, operator);
    }

    return {
      success: newCheques.length > 0,
      importedCount: newCheques.length,
      errors,
    };
  }

  // Reset single bank template to standard initial template
  static resetBankTemplateToDefault(bankType: BankType, operator: User): void {
    const templates = this.getTemplates();
    if (INITIAL_TEMPLATES[bankType]) {
      templates[bankType] = JSON.parse(JSON.stringify(INITIAL_TEMPLATES[bankType]));
      localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(templates));
      this.addAuditLog({
        action: 'UPDATE',
        target: `แม่แบบเช็ค: ${bankType}`,
        details: `คืนค่าพิกัดเริ่มต้นมาตรฐานของธนาคาร ${bankType}`,
      }, operator);
    }
  }

  // Reset to default sample dataset
  static resetToDefault(): void {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    localStorage.setItem(STORAGE_KEYS.CHEQUES, JSON.stringify(INITIAL_CHEQUES));
    localStorage.setItem(STORAGE_KEYS.PRINT_LOGS, JSON.stringify(INITIAL_PRINT_LOGS));
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(INITIAL_AUDIT_LOGS));
    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(INITIAL_TEMPLATES));
  }
}
