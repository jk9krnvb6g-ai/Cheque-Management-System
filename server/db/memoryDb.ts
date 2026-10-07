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
  {
    id: 'chq_126_69',
    chequeNumber: '5049382',
    stubDate: '2026-09-28',
    chequeDate: '2026-09-28',
    fiscalYear: 2569,
    stubPayeeName: 'ห้างหุ้นส่วนจำกัด สหพัฒนาการค้า',
    chequePayeeName: 'ห้างหุ้นส่วนจำกัด สหพัฒนาการค้า',
    dikaNumber: '126/69',
    bankAccountNo: '345-0-98765-4',
    items: [
      { id: 'it_7', description: 'ค่าน้ำมันเชื้อเพลิงและหล่อลื่นยานพาหนะราชการ', amount: 18400 },
    ],
    totalAmount: 18400,
    totalAmountThaiText: 'หนึ่งหมื่นแปดพันสี่ร้อยบาทถ้วน',
    withholdingTaxPercent: 1,
    withholdingTaxAmount: 184,
    netPaidAmount: 18216,
    status: 'ISSUED',
    createdBy: 'นายชำนาญ การคลัง',
    createdByUsername: 'admin',
    createdAt: '2026-09-28T11:20:00.000Z',
    printCount: 1,
    lastPrintedAt: '2026-09-28T13:45:00.000Z',
    lastPrintedBy: 'นายชำนาญ การคลัง',
    lastBankType: 'GSB',
  },
];

// Backend In-Memory Database store
class BackendDatabase {
  private users: User[] = [...INITIAL_USERS];
  private cheques: Cheque[] = [...INITIAL_CHEQUES];
  private printLogs: ChequePrintLog[] = [];
  private auditLogs: AuditLog[] = [];

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

  saveCheque(cheque: Cheque, operatorName: string = 'ผู้ดูแลระบบ'): Cheque {
    const idx = this.cheques.findIndex(c => c.id === cheque.id);
    const total = cheque.items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    let taxAmount = 0;
    if (cheque.withholdingTaxPercent && cheque.withholdingTaxPercent > 0) {
      taxAmount = Math.round((total * cheque.withholdingTaxPercent / 100) * 100) / 100;
    } else if (cheque.withholdingTaxAmount && cheque.withholdingTaxAmount > 0) {
      taxAmount = cheque.withholdingTaxAmount;
    }
    const netAmount = Math.max(0, Math.round((total - taxAmount) * 100) / 100);
    const thaiText = thaiBahtText(netAmount > 0 ? netAmount : total);
    const fiscalYear = cheque.fiscalYear || getThaiFiscalYear(cheque.chequeDate || cheque.stubDate, cheque.dikaNumber);

    const saved: Cheque = {
      ...cheque,
      fiscalYear,
      totalAmount: total,
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
}

export const db = new BackendDatabase();
