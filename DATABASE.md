# โครงสร้างฐานข้อมูลและโมเดลข้อมูล (Database Schema & Data Models)

เอกสารนี้อธิบายโครงสร้างข้อมูล ตาราง ฟิลด์ ชนิดข้อมูล (Data Types) และความสัมพันธ์ของ **ระบบจัดทำและพิมพ์เช็ค (Cheque Management & Printing System)** ทั้งหมด

---

## 🗄️ แผนภาพความสัมพันธ์ของเอนทิตี (Entity Relationship Diagram - ERD)

```
[ users ] 1 ───< [ cheques ] 1 ───< [ cheque_items ]
   │                 │
   │                 └───< [ cheque_print_logs ] (Append-Only)
   │
   └───< [ audit_logs ] (Append-Only)

[ bank_templates ] (อิสระตามรหัสธนาคาร KTB, BAAC, GSB)
```

---

## 📋 รายละเอียดตารางและฟิลด์ข้อมูล (Table Schemas)

### 1. ตาราง `cheques` (ข้อมูลรายการเช็คและการสั่งจ่าย)

เก็บข้อมูลหลักของเช็คแต่ละฉบับ รองรับการเชื่อมโยงปีงบประมาณและเลขที่ฎีกาคลังรับ

| ชื่อฟิลด์ | ชนิดข้อมูล | บังคับ (Null?) | คำอธิบาย |
|---|---|---|---|
| `id` | VARCHAR(64) | NOT NULL (PK) | รหัสประจำรายการเช็ค เช่น `chq_123_69` หรือ `chq_1728000000000` |
| `chequeNumber` | VARCHAR(20) | NULL | เลขที่เช็คจริง (7-8 หลัก) ที่พิมพ์ลงบนเช็ค เช่น `1029301` |
| `stubDate` | DATE / VARCHAR(10) | NOT NULL | วันที่บันทึกต้นขั้วเช็ค (รูปแบบ YYYY-MM-DD) |
| `chequeDate` | DATE / VARCHAR(10) | NULL | วันที่ที่ระบุบนหน้าเช็ค (ถ้าไม่ระบุให้ถือตาม stubDate) |
| `fiscalYear` | INTEGER | NOT NULL | **ปีงบประมาณ พ.ศ.** เช่น `2568`, `2569`, `2570` (คำนวณตาม 1 ต.ค. - 30 ก.ย.) |
| `stubPayeeName` | VARCHAR(255) | NOT NULL | ชื่อผู้รับเงินบนต้นขั้วเช็ค |
| `chequePayeeName` | VARCHAR(255) | NOT NULL | ชื่อผู้รับเงินบนตัวเช็คจริง (Payee Name) |
| `dikaNumber` | VARCHAR(50) | NULL | เลขที่ฎีกาคลังรับ เช่น `123/69`, `145/70` |
| `bankAccountNo` | VARCHAR(50) | NULL | เลขที่บัญชีเงินฝากธนาคารสั่งจ่าย |
| `totalAmount` | DECIMAL(14,2) | NOT NULL | ยอดรวมก่อนหักภาษี (ผลรวมของรายการฎีกา) |
| `totalAmountThaiText`| TEXT | NOT NULL | จำนวนเงินตัวอักษรภาษาไทย เช่น "สองหมื่นห้าพันเจ็ดร้อยห้าสิบบาทถ้วน" |
| `withholdingTaxPercent` | DECIMAL(4,2) | NULL | อัตราภาษีหัก ณ ที่จ่าย (%) เช่น 0, 1, 2, 3, 5 |
| `withholdingTaxAmount` | DECIMAL(14,2) | NULL | จำนวนเงินภาษีที่หัก ณ ที่จ่าย (บาท) |
| `netPaidAmount` | DECIMAL(14,2) | NOT NULL | ยอดสั่งจ่ายสุทธิบนหน้าเช็ค (`totalAmount - withholdingTaxAmount`) |
| `memo` | TEXT | NULL | บันทึกช่วยจำ / หมายเหตุเพิ่มเติม |
| `status` | VARCHAR(20) | NOT NULL | สถานะของเช็ค: `PENDING` (รอพิมพ์), `ISSUED` (พิมพ์แล้ว), `VOID` (ยกเลิก) |
| `voidReason` | VARCHAR(255) | NULL | เหตุผลในการยกเลิกเช็ค (กรณี status = VOID) |
| `voidAt` | TIMESTAMP | NULL | วันและเวลาที่ทำการยกเลิกเช็ค |
| `voidBy` | VARCHAR(100) | NULL | ชื่อผู้ใช้งานที่ทำการยกเลิกเช็ค |
| `createdBy` | VARCHAR(100) | NOT NULL | ชื่อ-นามสกุลผู้จัดทำรายการ |
| `createdByUsername` | VARCHAR(50) | NOT NULL | Username ของผู้จัดทำรายการ |
| `createdAt` | TIMESTAMP | NOT NULL | วันเวลาที่สร้างรายการ |
| `updatedBy` | VARCHAR(100) | NULL | ชื่อ-นามสกุลผู้แก้ไขข้อมูลล่าสุด |
| `updatedAt` | TIMESTAMP | NULL | วันเวลาที่แก้ไขข้อมูลล่าสุด |
| `printCount` | INTEGER | NOT NULL (DEFAULT 0) | จำนวนครั้งที่สั่งพิมพ์เช็คฉบับนี้ |
| `lastPrintedAt` | TIMESTAMP | NULL | วันเวลาที่สั่งพิมพ์ล่าสุด |
| `lastPrintedBy` | VARCHAR(100) | NULL | ชื่อผู้สั่งพิมพ์ครั้งล่าสุด |
| `lastBankType` | VARCHAR(20) | NULL | ธนาคารที่ใช้สั่งพิมพ์ล่าสุด (`KTB`, `BAAC`, `GSB`) |

---

### 2. ตาราง `cheque_items` (รายการฎีกาและค่าใช้จ่ายย่อย)

รองรับ 1 เช็คมีได้หลายรายการฎีกา/ค่าใช้จ่าย

| ชื่อฟิลด์ | ชนิดข้อมูล | บังคับ (Null?) | คำอธิบาย |
|---|---|---|---|
| `id` | VARCHAR(64) | NOT NULL (PK) | รหัสรายการย่อย |
| `chequeId` | VARCHAR(64) | NOT NULL (FK) | อ้างอิงไปยัง `cheques.id` |
| `description` | VARCHAR(255) | NOT NULL | คำอธิบายรายการ เช่น "ค่าวัสดุการแพทย์", "ค่าจ้างเหมาบริการ" |
| `amount` | DECIMAL(14,2) | NOT NULL | จำนวนเงินของรายการนี้ |

---

### 3. ตาราง `cheque_print_logs` (บันทึกประวัติการพิมพ์ — Strictly Append-Only)

**หลักการความปลอดภัย**: ตารางนี้ใช้สำหรับ Audit Trail ห้ามแก้ไข (UPDATE) หรือลบ (DELETE) เด็ดขาด มีเฉพาะการเพิ่มบันทึกใหม่ (INSERT ONLY)

| ชื่อฟิลด์ | ชนิดข้อมูล | บังคับ (Null?) | คำอธิบาย |
|---|---|---|---|
| `id` | VARCHAR(64) | NOT NULL (PK) | รหัสประวัติการพิมพ์ เช่น `prt_1728000000` |
| `chequeId` | VARCHAR(64) | NOT NULL (FK) | อ้างอิงไปยัง `cheques.id` |
| `chequeNumber` | VARCHAR(20) | NULL | เลขที่เช็คที่ใช้พิมพ์ในครั้งนั้น |
| `dikaNumber` | VARCHAR(50) | NOT NULL | เลขที่ฎีกา |
| `chequePayeeName` | VARCHAR(255) | NOT NULL | ชื่อผู้รับเงิน |
| `totalAmount` | DECIMAL(14,2) | NOT NULL | ยอดเงินสั่งจ่าย |
| `bankType` | VARCHAR(20) | NOT NULL | ธนาคารที่พิมพ์ (`KTB`, `BAAC`, `GSB`) |
| `printNo` | INTEGER | NOT NULL | ลำดับครั้งที่พิมพ์ (1 = พิมพ์ครั้งแรก, 2+ = พิมพ์ซ้ำ) |
| `printedBy` | VARCHAR(100) | NOT NULL | ชื่อ-นามสกุลผู้สั่งพิมพ์ |
| `printedByUsername` | VARCHAR(50) | NOT NULL | Username ของผู้สั่งพิมพ์ |
| `printedAt` | TIMESTAMP | NOT NULL | วันเวลาที่สั่งพิมพ์ |
| `reprintReason` | VARCHAR(255) | NULL | เหตุผลในการพิมพ์ซ้ำ เช่น "พิมพ์ผิด", "กระดาษติด" |
| `reprintNote` | TEXT | NULL | หมายเหตุเพิ่มเติมกรณีพิมพ์ซ้ำ |

---

### 4. ตาราง `users` (ผู้ใช้งานระบบและการกำหนดสิทธิ์)

| ชื่อฟิลด์ | ชนิดข้อมูล | บังคับ (Null?) | คำอธิบาย |
|---|---|---|---|
| `id` | VARCHAR(64) | NOT NULL (PK) | รหัสผู้ใช้ เช่น `user_admin` |
| `username` | VARCHAR(50) | NOT NULL (UNIQUE) | ชื่อผู้ใช้สำหรับล็อกอิน |
| `passwordHash` | VARCHAR(255) | NOT NULL | รหัสผ่านที่เข้ารหัสแล้ว (SHA-256 / bcrypt) |
| `fullName` | VARCHAR(150) | NOT NULL | ชื่อ-นามสกุลจริง |
| `position` | VARCHAR(100) | NULL | ตำแหน่งหน้าที่ |
| `role` | VARCHAR(20) | NOT NULL | สิทธิ์การใช้งาน: `ADMIN` (ผู้ดูแลระบบ) หรือ `USER` (เจ้าหน้าที่การเงิน) |
| `status` | VARCHAR(20) | NOT NULL | สถานะบัญชี: `ACTIVE` (เปิดใช้งาน) หรือ `INACTIVE` (ระงับ) |
| `createdAt` | TIMESTAMP | NOT NULL | วันเวลาที่สร้างบัญชี |

---

### 5. ตาราง `audit_logs` (บันทึกกิจกรรมการใช้งานระบบ)

| ชื่อฟิลด์ | ชนิดข้อมูล | บังคับ (Null?) | คำอธิบาย |
|---|---|---|---|
| `id` | VARCHAR(64) | NOT NULL (PK) | รหัสบันทึกกิจกรรม |
| `timestamp` | TIMESTAMP | NOT NULL | วันเวลาที่เกิดกิจกรรม |
| `username` | VARCHAR(50) | NOT NULL | ชื่อผู้ใช้ที่กระทำ |
| `userFullName` | VARCHAR(150) | NOT NULL | ชื่อ-นามสกุลของผู้กระทำ |
| `action` | VARCHAR(30) | NOT NULL | ชนิดการกระทำ: `CREATE`, `UPDATE`, `DELETE`, `PRINT`, `REPRINT`, `LOGIN` |
| `target` | VARCHAR(255) | NOT NULL | เป้าหมาย เช่น "ฎีกา 123/69" |
| `details` | TEXT | NOT NULL | รายละเอียดของกิจกรรม |

---

### 6. ตาราง `bank_templates` (พิกัดตำแหน่งพิมพ์เช็คแต่ละธนาคาร)

| ชื่อฟิลด์ | ชนิดข้อมูล | คำอธิบาย |
|---|---|---|
| `bankType` | VARCHAR(20) (PK) | รหัสธนาคาร (`KTB`, `BAAC`, `GSB`) |
| `name` | VARCHAR(100) | ชื่อธนาคาร |
| `widthMm` | DECIMAL(6,2) | ความกว้างของเช็ค (มม.) |
| `heightMm` | DECIMAL(6,2) | ความสูงของเช็ค (มม.) |
| `fields` | JSON / TEXT | พิกัดจุดพิมพ์ x, y (มม.), ขนาดฟอนต์ (pt), คำนำหน้า/ต่อท้าย ของแต่ละฟิลด์ |

---

## 🔍 การจัดทำดัชนี (Recommended Database Indexes)

สำหรับระบบฐานข้อมูลเชิงสัมพันธ์ (PostgreSQL / MySQL) แนะนำให้สร้าง Index ดังนี้:

```sql
-- ดัชนีสำหรับการค้นหาและกรองตามปีงบประมาณและสถานะเช็ค
CREATE INDEX idx_cheques_fiscal_year ON cheques(fiscalYear);
CREATE INDEX idx_cheques_status ON cheques(status);
CREATE INDEX idx_cheques_dika_number ON cheques(dikaNumber);
CREATE INDEX idx_cheques_cheque_number ON cheques(chequeNumber);
CREATE INDEX idx_cheques_created_at ON cheques(createdAt DESC);

-- ดัชนีสำหรับการค้นหาประวัติการพิมพ์ตามรหัสเช็ค
CREATE INDEX idx_print_logs_cheque_id ON cheque_print_logs(chequeId);
CREATE INDEX idx_print_logs_printed_at ON cheque_print_logs(printedAt DESC);

-- ดัชนีสำหรับผู้ใช้งาน
CREATE UNIQUE INDEX idx_users_username ON users(username);
```

---

## 🏛️ กฎเกณฑ์การคำนวณปีงบประมาณไทย (Thai Fiscal Year Rule)

ตามระเบียบการเงินการคลังภาครัฐของประเทศไทย:
- วันที่ **1 ตุลาคม (ปีก่อนหน้า)** ถึง **30 กันยายน (ปีปัจจุบัน)** จะนับเป็น **ปีงบประมาณของปีปัจจุบัน**
- สูตรคำนวณ:
  ```ts
  const month = date.getMonth(); // 0 = ม.ค., 9 = ต.ค.
  const fiscalYearAD = month >= 9 ? date.getFullYear() + 1 : date.getFullYear();
  const fiscalYearBE = fiscalYearAD + 543;
  ```
- ระบบของเรารองรับการระบุปีงบประมาณแบบกำหนดเองได้ เพื่อรองรับ **เงินกันไว้เบิกเหลื่อมปี** และการสั่งจ่ายข้ามปีงบประมาณ
