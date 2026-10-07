@echo off
chcp 65001 >nul
title Cash Cheque Backend (Port 3003)
cd /d "%~dp0"
cls

echo ========================================================
echo       CASH CHEQUE BACKEND SERVER & API (PORT 3003)
echo ========================================================
echo.
echo [INFO] เซิร์ฟเวอร์ Backend สำหรับเชื่อมต่อฐานข้อมูล MySQL (10.1.0.201)
echo.
echo        - Full App URL:  http://localhost:3003/Cash_Cheque/
echo        - Local Network: http://10.2.0.13:3003/Cash_Cheque/
echo        - API Health:    http://localhost:3003/api/health
echo        - MySQL Target:  10.1.0.201:3306 (cheque_system)
echo.

if not exist "node_modules" (
    echo [INFO] กำลังตรวจสอบและติดตั้ง Dependencies...
    call npm install --no-audit --legacy-peer-deps
)

echo [INFO] กำลังเปิดเซิร์ฟเวอร์ Backend พอร์ต 3003...
set PORT=3003
set NODE_ENV=production

:: ใช้ cmd /k เพื่อไม่ให้หน้าต่างปิดเองถ้ามี Error
cmd /k "npm start"
