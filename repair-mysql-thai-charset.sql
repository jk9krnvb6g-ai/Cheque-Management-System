-- ============================================================================
-- SQL SCRIPT: REPAIR THAI CHARSET & MOJIBAKE (เครื่อง 10.1.0.201)
-- ใช้สำหรับรันใน phpMyAdmin, HeidiSQL, MySQL Workbench หรือ Command Line
-- เพื่อแก้ไขปัญหาภาษาไทยต่างดาว (เธ™เธฒเธข... / ธเธฒเธข...) ให้กลับเป็นภาษาไทยที่ถูกต้อง 100%
-- ============================================================================

USE `cheque_system`;

-- 1. ปรับ Character Set ของฐานข้อมูลให้เป็น utf8mb4 100%
ALTER DATABASE `cheque_system` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2. ปรับโครงสร้างตาราง users ให้รองรับภาษาไทย UTF-8
ALTER TABLE users CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE users MODIFY full_name VARCHAR(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL;
ALTER TABLE users MODIFY position VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'เจ้าหน้าที่การเงินและบัญชี';

-- 3. ปรับโครงสร้างตาราง cheques
ALTER TABLE cheques CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE cheques MODIFY stub_payee_name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL;
ALTER TABLE cheques MODIFY cheque_payee_name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL;
ALTER TABLE cheques MODIFY total_amount_thai_text TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL;
ALTER TABLE cheques MODIFY memo TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL;
ALTER TABLE cheques MODIFY created_by VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL;

-- 4. ปรับโครงสร้างตาราง bank_templates
ALTER TABLE bank_templates CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE bank_templates MODIFY bank_name_thai VARCHAR(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL;

-- 5. กู้คืนภาษาไทยในตาราง users (แก้ไขปัญหา เธ™เธฒเธข... / ธเธฒเธข...)
UPDATE users SET full_name = 'นายชำนาญ การคลัง', position = 'หัวหน้ากลุ่มงานการเงินและบัญชี' WHERE username = 'admin';
UPDATE users SET full_name = 'นายสมชาย บริการดี', position = 'เจ้าพนักงานการเงินและบัญชีชำนาญงาน' WHERE username = 'somchai';
UPDATE users SET full_name = 'นางสาวสุดา วงศ์สว่าง', position = 'เจ้าหน้าที่การเงินและพัสดุ' WHERE username = 'suda';
UPDATE users SET full_name = 'นายสุรชัย มั่นคง', position = 'เจ้าหน้าที่ธุรการ' WHERE username = 'surachai';

-- 6. กู้คืนภาษาไทยในตาราง bank_templates
UPDATE bank_templates SET bank_name_thai = 'ธนาคารกรุงไทย' WHERE bank_type = 'KTB';
UPDATE bank_templates SET bank_name_thai = 'ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร (ธ.ก.ส.)' WHERE bank_type = 'BAAC';
UPDATE bank_templates SET bank_name_thai = 'ธนาคารออมสิน' WHERE bank_type = 'GSB';

-- 7. กู้คืนภาษาไทยในตาราง cheques
UPDATE cheques SET stub_payee_name = 'บริษัท ABC จำกัด', cheque_payee_name = 'บริษัท ABC จำกัด' WHERE dika_number = '123/69' OR id = 'chq_123_69';
UPDATE cheques SET stub_payee_name = 'ร้าน XYZ คอมพิวเตอร์', cheque_payee_name = 'ร้าน XYZ' WHERE dika_number = '124/69' OR id = 'chq_124_69';
UPDATE cheques SET stub_payee_name = 'บริษัท DEF ซัพพลาย จำกัด', cheque_payee_name = 'บริษัท DEF' WHERE dika_number = '125/69' OR id = 'chq_125_69';
UPDATE cheques SET stub_payee_name = 'ห้างหุ้นส่วนจำกัด สหพัฒนาการค้า', cheque_payee_name = 'ห้างหุ้นส่วนจำกัด สหพัฒนาการค้า' WHERE dika_number = '126/69' OR id = 'chq_126_69';
UPDATE cheques SET stub_payee_name = 'นายประสิทธิ์ ช่างทอง', cheque_payee_name = 'นายประสิทธิ์ ช่างทอง' WHERE dika_number = '127/69' OR id = 'chq_127_69';
UPDATE cheques SET stub_payee_name = 'บริษัท ทีโอที เทเลคอม แอนด์ เซอร์วิส จำกัด', cheque_payee_name = 'บริษัท ทีโอที เทเลคอม แอนด์ เซอร์วิส จำกัด' WHERE dika_number = '120/69' OR id = 'chq_128_69';

SELECT 'SUCCESS: Thai charset repaired and names restored successfully.' AS Status;
