@echo off
chcp 65001 >nul
cd /d "%~dp0"

:: ขอสิทธิ์ Administrator อัตโนมัติสำหรับจัดการ IIS และ Port 3002
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [INFO] กำลังขอสิทธิ์ Administrator ผ่าน UAC...
    powershell -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

title Auto Update & Restart Cash Cheque System
cls
echo ======================================================================
echo    ระบบอัปเดตและรีสตาร์ทอัตโนมัติ (CASH CHEQUE SYSTEM v2.20.45)
echo    ปลายทาง: C:\inetpub\wwwroot\Cash_Cheque
echo ======================================================================
echo.

:: [1] ตรวจสอบและปิด Backend พอร์ต 3002 ก่อน เพื่อปลดล็อคไฟล์
echo [ขั้นตอนที่ 1/3] ตรวจสอบและปิดการทำงาน Backend พอร์ต 3002...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3002 ^| findstr LISTENING') do (
    echo ปิดโปรเซส PID: %%a...
    taskkill /F /PID %%a >nul 2>&1
)
echo [✓] ปิด Backend เรียบร้อยแล้ว
echo.

:: [2] รัน build-iis.bat เพื่อหยุด IIS, คอมไพล์ dist, และเริ่ม IIS ใหม่
echo [ขั้นตอนที่ 2/3] คอมไพล์โปรเจกต์สำหรับ IIS (Vite Build)...
if exist "build-iis.bat" (
    call build-iis.bat
) else (
    echo กำลังคอมไพล์โค้ด Vite...
    call npm run build
    if exist "web.config" copy /Y "web.config" "dist\web.config" >nul
)
echo [✓] คอมไพล์และตั้งค่า IIS เรียบร้อยแล้ว
echo.

:: [3] สตาร์ท Backend พอร์ต 3002 กลับคืนมา
echo [ขั้นตอนที่ 3/3] สตาร์ทเซิร์ฟเวอร์ Backend (พอร์ต 3002)...
start "Cash Cheque Backend (Port 3002)" cmd /k "start-backend.bat"

echo.
echo ======================================================================
echo [สำเร็จ] ดำเนินการอัปเดตและรีสตาร์ทระบบครบทุกขั้นตอนเรียบร้อยแล้ว!
echo เข้าใช้งานได้ที่: http://10.2.0.13:3002/Cash_Cheque/ หรือ http://localhost:3002/Cash_Cheque/
echo ======================================================================
echo.
timeout /t 5
