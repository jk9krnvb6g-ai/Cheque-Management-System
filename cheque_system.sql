-- ====================================================================================================
-- ระบบฐานข้อมูล: ระบบจัดทำและพิมพ์เช็ค (Cheque Management & Printing System)
-- สำหรับติดตั้งที่เครื่องแม่ข่าย: 10.1.0.201 (รองรับ MySQL 5.7+ / MySQL 8.0+ / MariaDB ใน XAMPP phpMyAdmin)
-- รหัสชุดอักขระ: UTF-8 Unicode (utf8mb4_unicode_ci) รองรับภาษาไทย 100%
-- ====================================================================================================

CREATE DATABASE IF NOT EXISTS `cheque_system` 
DEFAULT CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `cheque_system`;

-- บังคับการส่งข้อมูลด้วย UTF-8 ภาษาไทยสมบูรณ์แบบ 100%
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET character_set_client = utf8mb4;
SET character_set_connection = utf8mb4;
SET character_set_results = utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ====================================================================================================
-- ตารางที่ 1: `users`
-- คำอธิบาย: ตารางเก็บข้อมูลบัญชีสมาชิกผู้ใช้งานระบบ การกำหนดสิทธิ์ และสถานะการเข้าใช้งาน
-- ====================================================================================================
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(64) NOT NULL COMMENT 'รหัสประจำตัวผู้ใช้ (Primary Key) เช่น user_admin, user_somchai',
  `username` VARCHAR(50) NOT NULL UNIQUE COMMENT 'ชื่อผู้ใช้สำหรับเข้าสู่ระบบ (ห้ามซ้ำกัน) เช่น admin, somchai',
  `password_hash` VARCHAR(255) NOT NULL COMMENT 'รหัสผ่านที่ผ่านการเข้ารหัสความปลอดภัย (Hash Password)',
  `full_name` VARCHAR(150) NOT NULL COMMENT 'ชื่อ-นามสกุลจริงของผู้ใช้งาน เช่น นายชำนาญ การคลัง',
  `position` VARCHAR(100) DEFAULT 'เจ้าหน้าที่การเงินและบัญชี' COMMENT 'ตำแหน่งหน้าที่การทำงาน เช่น หัวหน้ากลุ่มงานการเงินและบัญชี',
  `role` ENUM('ADMIN', 'USER') NOT NULL DEFAULT 'USER' COMMENT 'สิทธิ์การใช้งานระบบ: ADMIN (ผู้ดูแลระบบสูงสุด) หรือ USER (เจ้าหน้าที่การเงินทั่วไป)',
  `status` ENUM('ACTIVE', 'PENDING', 'INACTIVE') NOT NULL DEFAULT 'PENDING' COMMENT 'สถานะบัญชี: ACTIVE (เปิดใช้งาน), PENDING (รอผู้ดูแลระบบอนุมัติสิทธิ์), INACTIVE (ระงับการใช้งาน)',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่ลงทะเบียนเข้าสู่ระบบ',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='ตารางที่ 1: ข้อมูลสมาชิกและผู้ใช้งานระบบพิมพ์เช็ค';


-- ====================================================================================================
-- ตารางที่ 2: `cheques`
-- คำอธิบาย: ตารางหลักสำหรับจัดเก็บข้อมูลเช็ค เลขที่ฎีกาคลังรับ ยอดเงินสั่งจ่าย และประวัติการจัดทำ
-- ====================================================================================================
CREATE TABLE IF NOT EXISTS `cheques` (
  `id` VARCHAR(64) NOT NULL COMMENT 'รหัสประจำรายการเช็ค (Primary Key) เช่น chq_123_69',
  `cheque_number` VARCHAR(20) DEFAULT NULL COMMENT 'เลขที่เช็คจริง 7-8 หลักที่พิมพ์ลงบนกระดาษเช็ค เช่น 1029301',
  `stub_date` DATE NOT NULL COMMENT 'วันที่บันทึกบนต้นขั้วเช็ค (รูปแบบ ค.ศ. YYYY-MM-DD)',
  `cheque_date` DATE DEFAULT NULL COMMENT 'วันที่ที่ระบุบนหน้าเช็คจริง (รูปแบบ ค.ศ. YYYY-MM-DD)',
  `fiscal_year` INT NOT NULL COMMENT 'ปีงบประมาณ พ.ศ. ของรายการนี้ เช่น 2568, 2569, 2570',
  `stub_payee_name` VARCHAR(255) NOT NULL COMMENT 'ชื่อผู้รับเงินที่บันทึกบนต้นขั้วเช็ค',
  `cheque_payee_name` VARCHAR(255) NOT NULL COMMENT 'ชื่อผู้รับเงินที่พิมพ์บนหน้าเช็คจริง (Payee Name)',
  `dika_number` VARCHAR(50) DEFAULT NULL COMMENT 'เลขที่ฎีกาคลังรับ เช่น 123/69 หรือ 145/70',
  `bank_account_no` VARCHAR(50) DEFAULT NULL COMMENT 'เลขที่บัญชีเงินฝากธนาคารของหน่วยงานที่ใช้สั่งจ่ายเช็ค',
  `total_amount` DECIMAL(14,2) NOT NULL DEFAULT 0.00 COMMENT 'ยอดรวมเงินสั่งจ่ายก่อนหักภาษี (ผลรวมของรายการฎีกาทั้งหมด)',
  `total_amount_thai_text` TEXT NOT NULL COMMENT 'จำนวนเงินสั่งจ่ายแปลงเป็นตัวอักษรภาษาไทย เช่น สองหมื่นห้าพันเจ็ดร้อยห้าสิบบาทถ้วน',
  `withholding_tax_percent` DECIMAL(5,2) DEFAULT 0.00 COMMENT 'อัตราภาษีหัก ณ ที่จ่าย (%) เช่น 0, 1, 2, 3, 5',
  `withholding_tax_amount` DECIMAL(14,2) DEFAULT 0.00 COMMENT 'จำนวนเงินภาษีหัก ณ ที่จ่าย (บาท)',
  `net_paid_amount` DECIMAL(14,2) NOT NULL DEFAULT 0.00 COMMENT 'ยอดเงินสั่งจ่ายสุทธิที่พิมพ์บนหน้าเช็ค (ยอดรวม ลบ ภาษีหัก ณ ที่จ่าย)',
  `memo` TEXT DEFAULT NULL COMMENT 'บันทึกช่วยจำ หรือหมายเหตุเพิ่มเติมประกอบการสั่งจ่าย',
  `status` ENUM('PENDING', 'ISSUED', 'VOID') NOT NULL DEFAULT 'PENDING' COMMENT 'สถานะของเช็ค: PENDING (รอสั่งพิมพ์), ISSUED (พิมพ์เช็คแล้ว), VOID (ยกเลิกเช็ค)',
  `void_reason` VARCHAR(255) DEFAULT NULL COMMENT 'เหตุผลในการขอยกเลิกเช็ค (บันทึกเมื่อสถานะเป็น VOID)',
  `void_at` TIMESTAMP NULL DEFAULT NULL COMMENT 'วันและเวลาที่ทำการยกเลิกเช็ค',
  `void_by` VARCHAR(100) DEFAULT NULL COMMENT 'ชื่อ-นามสกุลของผู้ใช้งานที่กดยกเลิกเช็ค',
  `created_by` VARCHAR(100) NOT NULL COMMENT 'ชื่อ-นามสกุลของผู้จัดทำรายการเช็คฉบับนี้',
  `created_by_username` VARCHAR(50) NOT NULL COMMENT 'Username ของผู้จัดทำรายการเช็ค',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่สร้างรายการเช็คฉบับนี้',
  `updated_by` VARCHAR(100) DEFAULT NULL COMMENT 'ชื่อ-นามสกุลของผู้แก้ไขข้อมูลรายการเช็คล่าสุด',
  `updated_at` TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่แก้ไขข้อมูลล่าสุด',
  `print_count` INT NOT NULL DEFAULT 0 COMMENT 'จำนวนครั้งที่สั่งพิมพ์เช็คฉบับนี้ (0 = ยังไม่เคยพิมพ์, 1 = พิมพ์แล้ว, 2+ = พิมพ์ซ้ำ)',
  `last_printed_at` TIMESTAMP NULL DEFAULT NULL COMMENT 'วันและเวลาที่สั่งพิมพ์เช็คครั้งล่าสุด',
  `last_printed_by` VARCHAR(100) DEFAULT NULL COMMENT 'ชื่อ-นามสกุลของผู้สั่งพิมพ์เช็คครั้งล่าสุด',
  `last_bank_type` VARCHAR(20) DEFAULT 'KTB' COMMENT 'รหัสธนาคารที่ใช้สั่งพิมพ์เช็คล่าสุด เช่น KTB, BAAC, GSB',
  PRIMARY KEY (`id`),
  INDEX `idx_cheques_fiscal` (`fiscal_year`),
  INDEX `idx_cheques_status` (`status`),
  INDEX `idx_cheques_dika` (`dika_number`),
  INDEX `idx_cheques_number` (`cheque_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='ตารางที่ 2: ข้อมูลเช็คและการสั่งจ่ายเงินตามฎีกา';


-- ====================================================================================================
-- ตารางที่ 3: `cheque_items`
-- คำอธิบาย: ตารางเก็บรายการฎีกาย่อยหรือรายการค่าใช้จ่าย (1 เช็คสามารถมีได้หลายรายการย่อย)
-- ====================================================================================================
CREATE TABLE IF NOT EXISTS `cheque_items` (
  `id` VARCHAR(64) NOT NULL COMMENT 'รหัสรายการย่อย (Primary Key) เช่น it_1, it_2',
  `cheque_id` VARCHAR(64) NOT NULL COMMENT 'รหัสเช็คที่รายการนี้สังกัดอยู่ (Foreign Key เชื่อมกับตาราง cheques.id)',
  `description` VARCHAR(255) NOT NULL COMMENT 'รายละเอียดรายการค่าใช้จ่าย เช่น ค่าวัสดุสำนักงาน, ค่าจ้างเหมาบริการ, ค่าเวชภัณฑ์ยา',
  `amount` DECIMAL(14,2) NOT NULL DEFAULT 0.00 COMMENT 'จำนวนเงินของรายการย่อยนี้ (บาท)',
  PRIMARY KEY (`id`),
  INDEX `idx_items_cheque_id` (`cheque_id`),
  CONSTRAINT `fk_items_cheque` FOREIGN KEY (`cheque_id`) REFERENCES `cheques` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='ตารางที่ 3: รายการฎีกาย่อยและค่าใช้จ่ายของเช็ค';


-- ====================================================================================================
-- ตารางที่ 4: `cheque_print_logs`
-- คำอธิบาย: ตารางบันทึกประวัติการสั่งพิมพ์เช็คทุกครั้ง (Append-Only ห้ามแก้ไขหรือลบ เพื่อความโปร่งใสและตรวจสอบได้)
-- ====================================================================================================
CREATE TABLE IF NOT EXISTS `cheque_print_logs` (
  `id` VARCHAR(64) NOT NULL COMMENT 'รหัสบันทึกประวัติการพิมพ์ (Primary Key) เช่น prt_1728000000',
  `cheque_id` VARCHAR(64) NOT NULL COMMENT 'รหัสเช็คที่สั่งพิมพ์ (Foreign Key เชื่อมกับตาราง cheques.id)',
  `cheque_number` VARCHAR(20) DEFAULT NULL COMMENT 'เลขที่เช็คที่ใช้พิมพ์ในครั้งนั้น',
  `dika_number` VARCHAR(50) DEFAULT NULL COMMENT 'เลขที่ฎีกาที่สั่งพิมพ์ในครั้งนั้น',
  `cheque_payee_name` VARCHAR(255) NOT NULL COMMENT 'ชื่อผู้รับเงินในรอบที่สั่งพิมพ์',
  `total_amount` DECIMAL(14,2) NOT NULL DEFAULT 0.00 COMMENT 'ยอดเงินสั่งจ่ายในรอบที่สั่งพิมพ์',
  `bank_type` VARCHAR(20) NOT NULL COMMENT 'รหัสธนาคารที่พิมพ์ เช่น KTB, BAAC, GSB',
  `print_no` INT NOT NULL DEFAULT 1 COMMENT 'ลำดับครั้งที่พิมพ์ (1 = พิมพ์ครั้งแรก, 2+ = พิมพ์ซ้ำ)',
  `printed_by` VARCHAR(100) NOT NULL COMMENT 'ชื่อ-นามสกุลของผู้กดสั่งพิมพ์เช็ค',
  `printed_by_username` VARCHAR(50) NOT NULL COMMENT 'Username ของผู้กดสั่งพิมพ์เช็ค',
  `printed_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่กดสั่งพิมพ์เช็คจริง',
  `reprint_reason` VARCHAR(255) DEFAULT NULL COMMENT 'เหตุผลในการขอพิมพ์ซ้ำ (กรณี print_no >= 2) เช่น กระดาษติด, เครื่องพิมพ์กินกระดาษ, พิมพ์ผิด',
  `reprint_note` TEXT DEFAULT NULL COMMENT 'หมายเหตุเพิ่มเติมกรณีขอพิมพ์ซ้ำ',
  PRIMARY KEY (`id`),
  INDEX `idx_print_cheque` (`cheque_id`),
  INDEX `idx_print_date` (`printed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='ตารางที่ 4: บันทึกประวัติการสั่งพิมพ์เช็ค (Audit Trail)';


-- ====================================================================================================
-- ตารางที่ 5: `audit_logs`
-- คำอธิบาย: ตารางบันทึกกิจกรรมการใช้งานระบบ (Audit Trail) สำหรับตรวจสอบย้อนหลังว่าใครทำอะไรในระบบ
-- ====================================================================================================
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` VARCHAR(64) NOT NULL COMMENT 'รหัสบันทึกประวัติกิจกรรม (Primary Key) เช่น log_1728000000',
  `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่เกิดกิจกรรมขึ้นในระบบ',
  `username` VARCHAR(50) NOT NULL COMMENT 'Username ของผู้กระทำกิจกรรม',
  `user_full_name` VARCHAR(150) NOT NULL COMMENT 'ชื่อ-นามสกุลจริงของผู้กระทำกิจกรรม',
  `action` VARCHAR(30) NOT NULL COMMENT 'ประเภทของกิจกรรม เช่น LOGIN (เข้าสู่ระบบ), CREATE (สร้างเช็ค), UPDATE (แก้ไข), DELETE (ลบ), VOID (ยกเลิก)',
  `target` VARCHAR(255) NOT NULL COMMENT 'เป้าหมายของกิจกรรม เช่น ฎีกาเลขที่ 123/69 หรือ บัญชีผู้ใช้ somchai',
  `details` TEXT NOT NULL COMMENT 'รายละเอียดของกิจกรรมที่เกิดขึ้น เช่น สร้างเช็คสั่งจ่ายบริษัท ABC จำนวน 25,000 บาท',
  PRIMARY KEY (`id`),
  INDEX `idx_audit_time` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='ตารางที่ 5: บันทึกกิจกรรมการใช้งานระบบย้อนหลัง';


-- ====================================================================================================
-- ตารางที่ 6: `bank_templates`
-- คำอธิบาย: ตารางเก็บแม่แบบพิกัดตำแหน่งพิมพ์เช็ค ขนาดกระดาษ และฟอนต์ของแต่ละธนาคาร
-- ====================================================================================================
CREATE TABLE IF NOT EXISTS `bank_templates` (
  `bank_type` VARCHAR(20) NOT NULL COMMENT 'รหัสตัวย่อธนาคาร (Primary Key) เช่น KTB, BAAC, GSB',
  `bank_name_thai` VARCHAR(100) NOT NULL COMMENT 'ชื่อธนาคารภาษาไทย เช่น ธนาคารกรุงไทย, ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร',
  `bank_name_eng` VARCHAR(100) NOT NULL COMMENT 'ชื่อธนาคารภาษาอังกฤษ เช่น Krungthai Bank (KTB)',
  `bank_color` VARCHAR(20) NOT NULL DEFAULT '#00a5e5' COMMENT 'โค้ดสีประจำธนาคาร เช่น #00a5e5 (ฟ้า), #228b22 (เขียว), #e91e63 (ชมพู)',
  `width_mm` DECIMAL(6,2) NOT NULL DEFAULT 241.00 COMMENT 'ความกว้างของตัวเช็คจริง (มิลลิเมตร) มาตรฐาน 241 มม.',
  `height_mm` DECIMAL(6,2) NOT NULL DEFAULT 90.00 COMMENT 'ความสูงของตัวเช็คจริง (มิลลิเมตร) มาตรฐาน 90 มม.',
  `config_json` LONGTEXT NOT NULL COMMENT 'พิกัดแกน X, Y (มม.), ขนาดตัวอักษร Font Size (pt) และการขีดฆ่า หรือผู้ถือ ในรูปแบบ JSON',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่บันทึกหรือปรับพิกัดล่าสุด',
  PRIMARY KEY (`bank_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='ตารางที่ 6: แม่แบบพิกัดการพิมพ์เช็คของแต่ละธนาคาร';


-- ====================================================================================================
-- ข้อมูลเริ่มต้นของระบบ (Initial Seeded Data)
-- ====================================================================================================

-- 1. เพิ่มผู้ใช้งานเริ่มต้น (Admin และ เจ้าหน้าที่การเงิน)
INSERT INTO `users` (`id`, `username`, `password_hash`, `full_name`, `position`, `role`, `status`)
VALUES 
('user_admin', 'admin', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', 'นายชำนาญ การคลัง', 'หัวหน้ากลุ่มงานการเงินและบัญชี', 'ADMIN', 'ACTIVE'),
('user_somchai', 'somchai', '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', 'นายสมชาย บริการดี', 'นักวิชาการเงินและบัญชีชำนาญการ', 'USER', 'ACTIVE')
ON DUPLICATE KEY UPDATE `full_name` = VALUES(`full_name`);

-- 2. เพิ่มแม่แบบพิกัดพิมพ์เช็คเริ่มต้น 3 ธนาคารหลัก
INSERT INTO `bank_templates` (`bank_type`, `bank_name_thai`, `bank_name_eng`, `bank_color`, `width_mm`, `height_mm`, `config_json`)
VALUES
('KTB', 'ธนาคารกรุงไทย', 'Krungthai Bank (KTB)', '#00a5e5', 241.00, 90.00, '{"bankType":"KTB","bankNameThai":"ธนาคารกรุงไทย","widthMm":241,"heightMm":90,"fields":{"date":{"x":187.5,"y":4.5,"fontSizePt":12.5},"payee":{"x":87,"y":24,"fontSizePt":12.5},"amountText":{"x":99.5,"y":33,"fontSizePt":12},"amountNumber":{"x":185.5,"y":38,"fontSizePt":11}}}'),
('BAAC', 'ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร (ธ.ก.ส.)', 'BAAC Bank', '#2e7d32', 241.00, 90.00, '{"bankType":"BAAC","bankNameThai":"ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร (ธ.ก.ส.)","widthMm":241,"heightMm":90,"fields":{"date":{"x":186,"y":5,"fontSizePt":12.5},"payee":{"x":85,"y":23.5,"fontSizePt":12.5},"amountText":{"x":98,"y":32.5,"fontSizePt":12},"amountNumber":{"x":184,"y":37.5,"fontSizePt":11}}}'),
('GSB', 'ธนาคารออมสิน', 'Government Savings Bank (GSB)', '#e91e63', 241.00, 90.00, '{"bankType":"GSB","bankNameThai":"ธนาคารออมสิน","widthMm":241,"heightMm":90,"fields":{"date":{"x":188,"y":5.5,"fontSizePt":12.5},"payee":{"x":86,"y":24,"fontSizePt":12.5},"amountText":{"x":99,"y":33,"fontSizePt":12},"amountNumber":{"x":185,"y":38,"fontSizePt":11}}}')
ON DUPLICATE KEY UPDATE `bank_name_thai` = VALUES(`bank_name_thai`);

-- ----------------------------------------------------------------------------------------------------
-- สคริปต์ปรับปรุงและซ่อมแซมตารางให้เป็น UTF-8 (utf8mb4) สมบูรณ์แบบ และลบสมาชิกทดสอบที่ตกค้าง
-- ----------------------------------------------------------------------------------------------------
ALTER DATABASE `cheque_system` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `users` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `cheques` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `cheque_items` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `bank_templates` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `cheque_print_logs` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `audit_logs` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ล้างข้อมูลสมาชิกทดสอบที่ถูกลบออกจากระบบ (เช่น 11111, 22222)
DELETE FROM `users` WHERE `username` IN ('11111', '22222', '112222') OR `id` IN ('11111', '22222');

SET FOREIGN_KEY_CHECKS = 1;

