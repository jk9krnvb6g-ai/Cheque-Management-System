' สคริปต์สำหรับรัน Cash Cheque Backend ในพื้นหลังแบบซ่อนหน้าต่าง CMD (Hidden Background)
Set WshShell = CreateObject("WScript.Shell")
WshShell.Run chr(34) & "C:\inetpub\wwwroot\Cash_Cheque\start-backend.bat" & Chr(34), 0
Set WshShell = Nothing
