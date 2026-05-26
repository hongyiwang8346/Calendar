$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Generate ICO from Lulu image
Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile((Join-Path $ScriptDir "lulu\桌面图.jpg"))
$bitmap = New-Object System.Drawing.Bitmap($img, (New-Object System.Drawing.Size(64,64)))
$ptr = $bitmap.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($ptr)
$icoPath = Join-Path $ScriptDir "app.ico"
$stream = [System.IO.File]::Create($icoPath)
$icon.Save($stream)
$stream.Close()
$img.Dispose()
$bitmap.Dispose()
$icon.Dispose()

# Create VBS silent launcher
$vbsContent = @"
Set objShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
scriptPath = fso.GetParentFolderName(WScript.ScriptFullName)
objShell.CurrentDirectory = scriptPath
objShell.Run """" & scriptPath & "\node_modules\electron\dist\electron.exe"" .", 0, False
"@
Set-Content -LiteralPath (Join-Path $ScriptDir "launcher.vbs") -Value $vbsContent -Encoding ASCII

# Create desktop shortcut
$WshShell = New-Object -ComObject WScript.Shell
$ShortcutPath = [Environment]::GetFolderPath("Desktop") + "\桌面时间追踪挂件.lnk"
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = Join-Path $ScriptDir "launcher.vbs"
$Shortcut.WorkingDirectory = $ScriptDir
$Shortcut.IconLocation = "$icoPath,0"
$Shortcut.Description = "Start Desktop Time Tracker"
$Shortcut.Save()
Write-Output "Shortcut created on Desktop!"
