' สคริปต์สำหรับรัน Cash Cheque Backend ในพื้นหลังแบบซ่อนหน้าต่าง CMD (Hidden Background)
' เมื่อกดเปิด จะมีกล่องข้อความแจ้งเตือนให้ทราบว่าระบบเริ่มทำงานแล้ว
Dim fso, currentDir, WshShell
Set fso = CreateObject("Scripting.FileSystemObject")
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)
Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = currentDir

' รัน start-backend.bat ในโหมดซ่อนหน้าต่าง (0 = Hidden)
WshShell.Run "cmd.exe /c " & Chr(34) & currentDir & "\start-backend.bat" & Chr(34), 0, False

' แจ้งเตือนผู้ใช้ให้ทราบว่าโปรแกรมรันขึ้นมาแล้วในพื้นหลัง
MsgBox "✅ เซิร์ฟเวอร์ Cash Cheque Backend กำลังทำงานในพื้นหลัง (พอร์ต 3002)" & vbCrLf & vbCrLf & _
       "• เข้าใช้งานได้ที่: http://localhost:3002/Cash_Cheque/" & vbCrLf & _
       "• หากต้องการปิด ให้ดับเบิ้ลคลิกไฟล์: stop-backend.bat", _
       64, "Cash Cheque Backend"

Set WshShell = Nothing
Set fso = Nothing
