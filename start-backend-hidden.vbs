' สคริปต์สำหรับรัน Cash Cheque Backend ในพื้นหลังแบบซ่อนหน้าต่าง CMD (Hidden Background)
' ดับเบิ้ลคลิกไฟล์นี้เพื่อเริ่มรัน Backend โดยไม่มีหน้าต่างดำกวนใจ
Dim fso, currentDir, WshShell
Set fso = CreateObject("Scripting.FileSystemObject")
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)
Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = currentDir
WshShell.Run chr(34) & currentDir & "\start-backend.bat" & chr(34), 0, False
Set WshShell = Nothing
Set fso = Nothing
