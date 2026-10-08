-- ====================================================================================================
-- สคริปต์ซ่อมแซมภาษาไทยและลบผู้ใช้ทดสอบ (11111) ทันทีใน phpMyAdmin / MySQL
-- วิธีใช้: คัดลอกคำสั่งทั้งหมดนี้ไปวางในแท็บ SQL ของ phpMyAdmin แล้วกด [Go] หรือ [ดำเนินการ]
-- ====================================================================================================

USE `cheque_system`;

-- 1. บังคับชุดอักขระเป็น UTF-8 (utf8mb4) สำหรับภาษาไทย
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET CHARACTER SET utf8mb4;
SET character_set_client = utf8mb4;
SET character_set_connection = utf8mb4;
SET character_set_results = utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 2. แปลงฐานข้อมูลและตารางทั้งหมดให้รองรับ UTF-8 100%
ALTER DATABASE `cheque_system` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `users` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `cheques` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `cheque_items` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `bank_templates` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `cheque_print_logs` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `audit_logs` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 3. บังคับคอลัมน์เก็บข้อความให้เป็น UTF-8 สมบูรณ์แบบ
ALTER TABLE `users` 
  MODIFY `full_name` VARCHAR(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  MODIFY `position` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'เจ้าหน้าที่การเงินและบัญชี';

-- 4. ลบสมาชิกทดสอบที่ถูกลบออกจากระบบ (รวมถึง 11111, 22222)
DELETE FROM `users` WHERE `username` IN ('11111', '22222', '112222') OR `id` IN ('11111', '22222');

-- 5. กู้คืนชื่อและตำแหน่งภาษาไทยที่ถูกต้อง 100%
UPDATE `users` 
SET 
  `full_name` = 'นายชำนาญ การคลัง', 
  `position` = 'หัวหน้ากลุ่มงานการเงินและบัญชี',
  `status` = 'ACTIVE'
WHERE `username` = 'admin';

INSERT INTO `users` (`id`, `username`, `password_hash`, `full_name`, `position`, `role`, `status`)
VALUES 
('user_somchai', 'somchai', '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', 'นายสมชาย บริการดี', 'นักวิชาการเงินและบัญชีชำนาญการ', 'USER', 'ACTIVE')
ON DUPLICATE KEY UPDATE 
  `full_name` = 'นายสมชาย บริการดี', 
  `position` = 'นักวิชาการเงินและบัญชีชำนาญการ';

-- 6. ซ่อมแซมชื่อธนาคารภาษาไทย
UPDATE `bank_templates` SET `bank_name_thai` = 'ธนาคารกรุงไทย' WHERE `bank_type` = 'KTB';
UPDATE `bank_templates` SET `bank_name_thai` = 'ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร (ธ.ก.ส.)' WHERE `bank_type` = 'BAAC';
UPDATE `bank_templates` SET `bank_name_thai` = 'ธนาคารออมสิน' WHERE `bank_type` = 'GSB';

SET FOREIGN_KEY_CHECKS = 1;

-- แสดงผลลัพธ์ข้อมูลล่าสุด
SELECT `id`, `username`, `full_name`, `position`, `role`, `status` FROM `users`;
