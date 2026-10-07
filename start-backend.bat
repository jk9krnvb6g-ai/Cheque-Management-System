@echo off
chcp 65001 >nul
title Cash Cheque Backend (For IIS)
cd /d "%~dp0"
cls

echo ========================================================
echo       CASH CHEQUE BACKEND SERVER (For IIS)
echo ========================================================
echo.
echo [INFO] สคริปต์นี้สำหรับรันเฉพาะ Backend API ของระบบพิมพ์เช็ค
echo        ใช้สำหรับเชื่อมต่อฐานข้อมูลกลาง (10.1.0.201) และทำงานคู่กับ IIS
echo.
echo        - IIS Web:  https://10.2.0.13:3001/Cash_Cheque/
echo        - API Port: 3003 (ไม่ชนกับพอร์ต 3002 ของ Procurement)
echo.

if not exist "node_modules" (
    echo [INFO] กำลังตรวจสอบและติดตั้ง Backend dependencies...
    call npm install --no-audit --legacy-peer-deps
)

echo [INFO] กำลังเปิดเซิร์ฟเวอร์ Backend พอร์ต 3003...
set PORT=3003
set NODE_ENV=production

:: ใช้ cmd /k เพื่อไม่ให้หน้าต่างปิดเองถ้ามี Error
cmd /k "npm start"
