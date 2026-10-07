@echo off
chcp 65001 >nul
title Stop Cash Cheque Backend (Port 3002)
cls
echo ========================================================
echo        STOP CASH CHEQUE BACKEND (PORT 3002)
echo ========================================================
echo.
echo กำลังตรวจสอบและปิดเซิร์ฟเวอร์ที่รันอยู่บนพอร์ต 3002...

for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3002 ^| findstr LISTENING') do (
    echo กำลังปิดโปรเซส PID: %%a...
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo [สำเร็จ] ปิดการทำงาน Backend พอร์ต 3002 เรียบร้อยแล้ว
timeout /t 3 >nul
