-- ====================================================================================================
-- สคริปต์แก้ไขภาษาไทยต่างดาว (Mojibake Fixer) สำหรับตารางทั้งหมดในฐานข้อมูล cheque_system
-- รันสคริปต์นี้ในแท็บ SQL Editor ของโปรแกรมจัดการฐานข้อมูล (เช่น DBeaver / Navicat / phpMyAdmin)
-- ====================================================================================================

USE `cheque_system`;

-- 1. บังคับการส่งข้อมูลด้วย UTF-8 ภาษาไทยสมบูรณ์แบบ
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;
SET character_set_client = utf8mb4;
SET character_set_connection = utf8mb4;
SET character_set_results = utf8mb4;

-- 2. แปลงโครงสร้างฐานข้อมูลและทุกตารางเป็น UTF8MB4
ALTER DATABASE `cheque_system` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `users` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `cheques` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `cheque_items` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `bank_templates` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `cheque_print_logs` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `audit_logs` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 3. แก้ไขข้อมูลในตาราง users ให้กลับมาเป็นภาษาไทยที่ถูกต้อง 100%
UPDATE `users` 
SET `full_name` = 'นายชำนาญ การคลัง', `position` = 'หัวหน้ากลุ่มงานการเงินและบัญชี' 
WHERE `username` = 'admin';

UPDATE `users` 
SET `full_name` = 'นายสมชาย บริการดี', `position` = 'เจ้าพนักงานการเงินและบัญชีชำนาญงาน' 
WHERE `username` = 'somchai';

-- 4. แก้ไขข้อมูลในตาราง bank_templates ให้เป็นภาษาไทยที่ถูกต้อง 100%
UPDATE `bank_templates` 
SET `bank_name_thai` = 'ธนาคารกรุงไทย' 
WHERE `bank_type` = 'KTB';

UPDATE `bank_templates` 
SET `bank_name_thai` = 'ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร (ธ.ก.ส.)' 
WHERE `bank_type` = 'BAAC';

UPDATE `bank_templates` 
SET `bank_name_thai` = 'ธนาคารออมสิน' 
WHERE `bank_type` = 'GSB';

-- ตรวจสอบผลลัพธ์
SELECT `id`, `username`, `full_name`, `position`, `role`, `status` FROM `users`;
