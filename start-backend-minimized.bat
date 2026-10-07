@echo off
chcp 65001 >nul
title Cash Cheque Backend Launcher (Minimized)
cd /d "%~dp0"

:: เปิดเซิร์ฟเวอร์แบบย่อหน้าต่างลง Taskbar อัตโนมัติ (ไม่เกะกะสายตา แต่ยังดูสถานะได้)
start /min "" "%~dp0start-backend.bat"
