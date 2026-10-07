@echo off
chcp 65001 >nul
cd /d "%~dp0"

:: 1. AUTO-REQUEST ADMIN PRIVILEGES (ขอสิทธิ์ Administrator อัตโนมัติเพื่อจัดการโฟลเดอร์ C:\inetpub)
net session >nul 2>&1
if %errorLevel% == 0 (
    goto :gotAdmin
) else (
    echo [PERMISSION DENIED] อยู่ในไดเรกทอรี C:\inetpub จำเป็นต้องใช้สิทธิ์ Administrator
    echo กำลังขอสิทธิ์ Administrator ผ่าน UAC...
    powershell -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

:gotAdmin
title Build Cash Cheque System (IIS Admin Mode)
cls

echo ======================================================================
echo    ระบบจัดทำและพิมพ์เช็ค (Cash Cheque System) - SAFE BUILD FOR IIS
echo    URL ปลายทาง: https://10.2.0.13:3001/Cash_Cheque/
echo ======================================================================
echo.
echo [NOTE] ขอสิทธิ์ Administrator เรียบร้อยแล้ว
echo.

:: 2. STOP IIS (ปลดล็อคไฟล์เพื่อป้องกัน Error EPERM จาก IIS)
echo [1/5] กำลังหยุดการทำงานของ IIS เพื่อปลดล็อคไฟล์...
iisreset /stop

:: 3. ติดตั้ง Dependencies
echo.
echo [2/5] กำลังตรวจสอบและติดตั้ง Dependencies...
call npm install --no-audit --legacy-peer-deps

:: 4. Build Project
echo.
echo [3/4] กำลังคอมไพล์โปรเจกต์สำหรับ Production (Vite Build)...
call npm run build

:: 5. คัดลอก web.config เข้าโฟลเดอร์ dist เพื่อให้ IIS ใช้งานได้ทันที
echo.
echo [4/4] กำลังตั้งค่า web.config สำหรับ IIS...
if exist "web.config" (
    copy /Y "web.config" "dist\web.config" >nul
)

:: 6. สตาร์ท IIS กลับคืนมา
echo.
echo กำลังรีสตาร์ท IIS ให้พร้อมใช้งาน...
iisreset /start

echo.
echo ======================================================================
echo [SUCCESS] คอมไพล์และติดตั้งระบบจัดทำและพิมพ์เช็คสำเร็จเรียบร้อยแล้ว!
echo ======================================================================
echo.
echo [ข้อแนะนำสำคัญ] เพื่อให้ระบบเชื่อมต่อฐานข้อมูล MySQL 10.1.0.201 ได้:
echo 1. ดับเบิ้ลคลิกไฟล์ start-backend.bat หรือ start-backend-hidden.vbs
echo    เพื่อเปิดเซิร์ฟเวอร์ Backend API (พอร์ต 3002)
echo.
echo 2. เข้าใช้งานระบบได้ที่:
echo    👉 ผ่าน IIS:      http://10.2.0.13/Cash_Cheque/ หรือ https://10.2.0.13:3001/Cash_Cheque/
echo    👉 ผ่าน Node.js:  http://10.2.0.13:3002/Cash_Cheque/ (แนะนำ เสถียร 100%)
echo.
pause
