import { AuditLog, BankTemplateConfig, BankType, Cheque, ChequePrintLog, User } from '../../src/types/index';
import { getThaiFiscalYear } from '../../src/utils/dateUtils';
import { thaiBahtText } from '../../src/utils/thaiBahtText';

// Initial seeded users
export const INITIAL_USERS: User[] = [
  {
    id: 'user_admin',
    username: 'admin',
    passwordHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', // 'admin'
    fullName: 'นายชำนาญ การคลัง',
    position: 'หัวหน้ากลุ่มงานการเงินและบัญชี',
    role: 'ADMIN',
    status: 'ACTIVE',
    createdAt: '2026-10-01T08:00:00.000Z',
  },
  {
    id: 'user_finance_1',
    username: 'somchai',
    passwordHash: '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', // '1234'
    fullName: 'นายสมชาย บริการดี',
    position: 'เจ้าพนักงานการเงินและบัญชีชำนาญงาน',
    role: 'USER',
    status: 'ACTIVE',
    createdAt: '2026-10-01T08:30:00.000Z',
  },
  {
    id: 'user_finance_2',
    username: 'suda',
    passwordHash: '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', // '1234'
    fullName: 'นางสาวสุดา วงศ์สว่าง',
    position: 'เจ้าหน้าที่การเงิน',
    role: 'USER',
    status: 'ACTIVE',
    createdAt: '2026-10-01T09:00:00.000Z',
  },
];

// Initial seeded bank templates
export const INITIAL_TEMPLATES: Record<BankType, BankTemplateConfig> = {
  KTB: {
    bankType: 'KTB',
    bankNameThai: 'ธนาคารกรุงไทย',
    bankNameEng: 'Krungthai Bank (KTB)',
    bankColor: '#00a5e5',
    widthMm: 241,
    heightMm: 90,
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
    },
  },
  BAAC: {
    bankType: 'BAAC',
    bankNameThai: 'ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร (ธ.ก.ส.)',
    bankNameEng: 'Bank for Agriculture and Agricultural Cooperatives (BAAC)',
    bankColor: '#00703c',
    widthMm: 235,
    heightMm: 90,
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
    },
  },
  GSB: {
    bankType: 'GSB',
    bankNameThai: 'ธนาคารออมสิน',
    bankNameEng: 'Government Savings Bank (GSB)',
    bankColor: '#e6007e',
    widthMm: 239,
    heightMm: 90,
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
      amountText: { x: 58, y: 40, fontSizePt: 12, prefix: '=', suffix: '=', enabled: true },
      amountNumber: { x: 168, y: 48, fontSizePt: 13, prefix: '*', suffix: '*', enabled: true },
      amountNumber2: { x: 168, y: 18, fontSizePt: 10, prefix: '*', suffix: '*', enabled: true },
      amountNumber3: { x: 168, y: 70, fontSizePt: 10, prefix: '*', suffix: '*', enabled: true },
      stubDate: { x: 10, y: 15, fontSizePt: 8.5 },
      stubPayee: { x: 10, y: 25, fontSizePt: 8.5 },
      stubDika: { x: 10, y: 36, fontSizePt: 8.5 },
      stubAmount: { x: 10, y: 48, fontSizePt: 8.5 },
    },
  },
};

// Initial seeded cheques
export const INITIAL_CHEQUES: Cheque[] = [
  {
    id: 'chq_123_69',
    chequeNumber: '1029301',
    stubDate: '2026-10-02',
    chequeDate: '2026-10-02',
    fiscalYear: 2570,
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
    fiscalYear: 2570,
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
    fiscalYear: 2570,
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
    printCount: 0,
  },
];

// Backend In-Memory Database store
class BackendDatabase {
  private users: User[] = [...INITIAL_USERS];
  private cheques: Cheque[] = [...INITIAL_CHEQUES];
  private printLogs: ChequePrintLog[] = [];
  private auditLogs: AuditLog[] = [];
  private templates: Record<BankType, BankTemplateConfig> = { ...INITIAL_TEMPLATES };

  // Cheque operations
  getCheques(filter?: { fiscalYear?: number; status?: string; search?: string }): Cheque[] {
    let result = [...this.cheques];
    if (filter?.fiscalYear) {
      result = result.filter(c => (c.fiscalYear || getThaiFiscalYear(c.chequeDate || c.stubDate, c.dikaNumber)) === filter.fiscalYear);
    }
    if (filter?.status && filter.status !== 'ALL') {
      if (filter.status === 'PENDING') result = result.filter(c => c.status !== 'VOID' && c.printCount === 0);
      else if (filter.status === 'ISSUED') result = result.filter(c => c.status !== 'VOID' && c.printCount > 0);
      else if (filter.status === 'VOID') result = result.filter(c => c.status === 'VOID');
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase().trim();
      result = result.filter(c => 
        c.chequePayeeName.toLowerCase().includes(q) ||
        (c.dikaNumber || '').toLowerCase().includes(q) ||
        (c.chequeNumber || '').toLowerCase().includes(q)
      );
    }
    return result;
  }

  getChequeById(id: string): Cheque | undefined {
    return this.cheques.find(c => c.id === id);
  }

  saveCheque(cheque: Cheque, operatorName: string): Cheque {
    const idx = this.cheques.findIndex(c => c.id === cheque.id);
    const total = cheque.items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
    const taxPercent = cheque.withholdingTaxPercent || 0;
    const taxAmount = cheque.withholdingTaxAmount || Math.round((total * taxPercent / 100) * 100) / 100;
    const netAmount = Math.max(0, Math.round((total - taxAmount) * 100) / 100);
    const thaiText = thaiBahtText(netAmount > 0 ? netAmount : total);

    const saved: Cheque = {
      ...cheque,
      totalAmount: total,
      withholdingTaxPercent: taxPercent,
      withholdingTaxAmount: taxAmount,
      netPaidAmount: netAmount,
      totalAmountThaiText: thaiText,
      status: cheque.status || (cheque.printCount > 0 ? 'ISSUED' : 'PENDING'),
    };

    if (idx >= 0) {
      saved.updatedAt = new Date().toISOString();
      saved.updatedBy = operatorName;
      this.cheques[idx] = saved;
    } else {
      saved.id = cheque.id || `chq_${Date.now()}`;
      saved.createdAt = new Date().toISOString();
      saved.createdBy = operatorName;
      saved.printCount = cheque.printCount || 0;
      this.cheques.unshift(saved);
    }
    return saved;
  }

  voidCheque(id: string, reason: string, operatorName: string): Cheque | null {
    const cheque = this.cheques.find(c => c.id === id);
    if (!cheque) return null;
    cheque.status = 'VOID';
    cheque.voidReason = reason || 'เช็คยกเลิก/พิมพ์ผิด';
    cheque.voidAt = new Date().toISOString();
    cheque.voidBy = operatorName;
    return cheque;
  }

  deleteCheque(id: string): boolean {
    const prevLen = this.cheques.length;
    this.cheques = this.cheques.filter(c => c.id !== id);
    return this.cheques.length < prevLen;
  }

  // Users
  getUsers(): User[] {
    return [...this.users];
  }

  addUser(user: User): User {
    this.users.push(user);
    return user;
  }

  findUserByUsername(username: string): User | undefined {
    return this.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  }

  // Print Logs
  getPrintLogs(chequeId?: string): ChequePrintLog[] {
    if (chequeId) return this.printLogs.filter(l => l.chequeId === chequeId);
    return [...this.printLogs];
  }

  addPrintLog(log: ChequePrintLog): ChequePrintLog {
    this.printLogs.unshift(log);
    const target = this.cheques.find(c => c.id === log.chequeId);
    if (target) {
      target.printCount = (target.printCount || 0) + 1;
      target.lastPrintedAt = log.printedAt;
      target.lastPrintedBy = log.printedBy;
      target.lastBankType = log.bankType;
      if (log.chequeNumber) target.chequeNumber = log.chequeNumber;
      if (target.status !== 'VOID') target.status = 'ISSUED';
    }
    return log;
  }

  // Audit Logs
  getAuditLogs(): AuditLog[] {
    return [...this.auditLogs];
  }

  addAuditLog(log: AuditLog): void {
    this.auditLogs.unshift(log);
    if (this.auditLogs.length > 1000) this.auditLogs.pop();
  }

  // Templates
  getTemplates(): Record<BankType, BankTemplateConfig> {
    return { ...this.templates };
  }

  saveTemplate(config: BankTemplateConfig, _operatorName?: string): boolean {
    this.templates[config.bankType] = config;
    return true;
  }
}

export const db = new BackendDatabase();
