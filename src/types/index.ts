export type UserRole = 'ADMIN' | 'USER';
export type UserStatus = 'ACTIVE' | 'INACTIVE';

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  fullName: string;
  position?: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}

export type BankType = 'KTB' | 'BAAC' | 'GSB' | string;

export interface ChequeItem {
  id: string;
  description: string;
  amount: number;
}

export interface Cheque {
  id: string;
  chequeNumber?: string; // เลขที่เช็ค เช่น 1029384 (7-8 หลัก)
  stubDate: string; // YYYY-MM-DD (วันที่ต้นขั้ว)
  chequeDate?: string; // YYYY-MM-DD (วันที่บนหน้าเช็ค ถ้าไม่ระบุใช้วันที่ต้นขั้ว)
  stubPayeeName: string; // ชื่อผู้รับต้นขั้วเช็ค
  chequePayeeName: string; // ชื่อผู้รับเงิน (ตัวเช็ค)
  dikaNumber?: string; // เลขที่ฎีกาคลังรับ (e.g. 123/69) - ไม่บังคับกรอก
  bankAccountNo?: string; // เลขที่บัญชีธนาคารสั่งจ่าย
  items: ChequeItem[]; // รายการฎีกาและจำนวนเงิน
  totalAmount: number; // ยอดรวมก่อนหักภาษี
  totalAmountThaiText: string; // สองหมื่นห้าพันเจ็ดร้อยห้าสิบบาทถ้วน
  withholdingTaxPercent?: number; // % ภาษีหัก ณ ที่จ่าย เช่น 1, 0.75, 2, 3
  withholdingTaxAmount?: number; // จำนวนเงินภาษีหัก ณ ที่จ่าย
  netPaidAmount?: number; // ยอดสุทธิสั่งจ่ายหลังหักภาษี (ตัวเลขบนเช็ค)
  memo?: string; // บันทึกช่วยจำ / หมายเหตุ
  status?: 'PENDING' | 'ISSUED' | 'VOID'; // สถานะเช็ค
  voidReason?: string; // เหตุผลการยกเลิกเช็ค (ถ้า status === 'VOID')
  voidAt?: string;
  voidBy?: string;
  createdBy: string; // ชื่อ-สกุลผู้สร้าง
  createdByUsername: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt?: string;
  printCount: number; // 0 = ยังไม่ออก, 1, 2, ...
  lastPrintedAt?: string;
  lastPrintedBy?: string;
  lastBankType?: BankType;
}

export interface ChequePrintLog {
  id: string;
  chequeId: string;
  chequeNumber?: string; // เลขที่เช็คที่ใช้พิมพ์
  dikaNumber: string;
  chequePayeeName: string;
  totalAmount: number;
  bankType: BankType;
  printNo: number; // 1, 2, 3...
  printedBy: string; // ชื่อ-สกุล
  printedByUsername: string;
  printedAt: string; // ISO string
  reprintReason?: string; // เช็คพิมพ์ผิด, กระดาษติด, etc.
  reprintNote?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  username: string;
  userFullName: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'PRINT' | 'REPRINT' | 'LOGIN' | 'SETTING_UPDATE';
  target: string;
  details: string;
}

export interface FieldPosition {
  x: number; // mm from left edge
  y: number; // mm from top edge
  fontSizePt: number;
  prefix?: string;
  suffix?: string;
  letterSpacingMm?: number;
  enabled?: boolean;
}

export type CrossingType = 'NONE' | 'AC_PAYEE' | 'AND_CO';

export type FeedDirection =
  | 'LANDSCAPE_NORMAL' // แนวนอนปกติ (สอดซ้ายเข้าก่อน 0°)
  | 'LANDSCAPE_FLIPPED' // แนวนอนกลับด้าน (สอดขวาเข้าก่อน 180°)
  | 'PORTRAIT_TOP' // แนวตั้ง (สอดหัวเข้าก่อน 90°)
  | 'PORTRAIT_BOTTOM'; // แนวตั้ง (สอดท้ายเข้าก่อน 270°)

export interface BankTemplateConfig {
  bankType: BankType;
  bankNameThai: string;
  bankNameEng: string;
  bankColor: string;
  widthMm: number;
  heightMm: number;
  globalOffsetX: number; // mm
  globalOffsetY: number; // mm
  isCustom?: boolean;
  customBgImageUrl?: string; // Optional user-uploaded cheque background image
  feedDirection?: FeedDirection;
  fontFamily?: string; // Font family for cheque fields (Sarabun, Prompt, Noto Sans Thai, etc.)
  hideDateDefault?: boolean;
  strikeBearer?: {
    x: number;
    y: number;
    widthMm: number;
    enabledDefault?: boolean;
  };
  crossing?: {
    x: number;
    y: number;
    typeDefault?: CrossingType;
  };
  fields: {
    date: FieldPosition;
    payee: FieldPosition; // ชื่อผู้รับเงิน จุดที่ 1
    payee2?: FieldPosition; // ชื่อผู้รับเงิน จุดที่ 2
    amountText: FieldPosition;
    amountNumber: FieldPosition; // จำนวนเงินตัวเลข จุดที่ 1
    amountNumber2?: FieldPosition; // จำนวนเงินตัวเลข จุดที่ 2
    amountNumber3?: FieldPosition; // จำนวนเงินตัวเลข จุดที่ 3
    stubDate?: FieldPosition;
    stubPayee?: FieldPosition;
    stubDika?: FieldPosition;
    stubAmount?: FieldPosition;
  };
}

export interface ChequeFontOption {
  key: string;
  name: string;
  label: string;
  desc: string;
}

export const CHEQUE_FONT_OPTIONS: ChequeFontOption[] = [
  {
    key: "'Sarabun', 'TH Sarabun New', 'Cordia New', sans-serif",
    name: 'TH Sarabun New / Sarabun',
    label: 'TH Sarabun New / สารบรรณ (มาตรฐานราชการ & ธนาคาร)',
    desc: 'ฟอนต์ทางการมาตรฐานสำหรับเอกสารราชการไทยและเช็คธนาคารทุกแห่ง',
  },
  {
    key: "'Prompt', 'Noto Sans Thai', sans-serif",
    name: 'Prompt',
    label: 'Prompt (โมเดิร์น ไร้หัว ทันสมัย)',
    desc: 'ฟอนต์ไม่มีหัว ตัวอักษรโค้งมน ทันสมัย อ่านง่าย ชัดเจน',
  },
  {
    key: "'Noto Sans Thai', sans-serif",
    name: 'Noto Sans Thai',
    label: 'Noto Sans Thai (คมชัด มาตรฐานสากล)',
    desc: 'ฟอนต์สากลระดับพรีเมียม เส้นสายเรียบร้อยและคมชัดสูง',
  },
  {
    key: "'IBM Plex Sans Thai', sans-serif",
    name: 'IBM Plex Sans Thai',
    label: 'IBM Plex Sans Thai (ชัดเจน เป็นทางการ)',
    desc: 'ฟอนต์ทางการทรงพลัง ชัดเจนทุกระยะการมอง',
  },
  {
    key: "'Cordia New', 'Angsana New', 'Sarabun', sans-serif",
    name: 'Cordia New / Angsana New',
    label: 'Cordia New / Angsana New (Windows Classic)',
    desc: 'ฟอนต์คลาสสิกของระบบปฏิบัติการ Windows สำหรับเครื่องพิมพ์ดอตเมทริกซ์',
  },
];
