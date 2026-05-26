Set objShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
scriptPath = fso.GetParentFolderName(WScript.ScriptFullName)
objShell.CurrentDirectory = scriptPath
objShell.Run """" & scriptPath & "\node_modules\electron\dist\electron.exe"" .", 0, False
