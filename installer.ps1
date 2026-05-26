Add-Type -AssemblyName System.Windows.Forms,System.Drawing

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $scriptDir) { $scriptDir = Get-Location }

$form = New-Object System.Windows.Forms.Form
$form.Text = "Lulu Time Tracker v1.0.2 Setup"
$form.Size = New-Object System.Drawing.Size(520, 320)
$form.StartPosition = "CenterScreen"
$form.FormBorderStyle = "FixedDialog"
$form.MaximizeBox = $false

# --- Path row ---
$lbl = New-Object System.Windows.Forms.Label
$lbl.Text = "Install Path:"
$lbl.Location = New-Object System.Drawing.Point(20, 24)
$lbl.AutoSize = $true

$defaultPath = Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'LuluTimeTracker'
$txt = New-Object System.Windows.Forms.TextBox
$txt.Text = $defaultPath
$txt.Location = New-Object System.Drawing.Point(20, 46)
$txt.Size = New-Object System.Drawing.Size(400, 23)

$btnBrowse = New-Object System.Windows.Forms.Button
$btnBrowse.Text = "..."
$btnBrowse.Location = New-Object System.Drawing.Point(428, 45)
$btnBrowse.Size = New-Object System.Drawing.Size(60, 24)
$btnBrowse.Add_Click({
  $fb = New-Object System.Windows.Forms.FolderBrowserDialog
  $fb.Description = "Select install folder"
  if ($fb.ShowDialog() -eq "OK") { $txt.Text = $fb.SelectedPath }
})

# --- Shortcut checkbox ---
$chk = New-Object System.Windows.Forms.CheckBox
$chk.Text = "Create desktop shortcut"
$chk.Location = New-Object System.Drawing.Point(20, 82)
$chk.Checked = $true
$chk.AutoSize = $true

# --- Data warning ---
$lblData = New-Object System.Windows.Forms.Label
$lblData.Text = ""
$lblData.Location = New-Object System.Drawing.Point(20, 108)
$lblData.AutoSize = $true
$lblData.ForeColor = [System.Drawing.Color]::DarkOrange
$lblData.MaximumSize = New-Object System.Drawing.Size(470, 0)

# Monitor path change
$txt.Add_TextChanged({
  $existingData = Join-Path $txt.Text "data.json"
  if (Test-Path $existingData) {
    $lblData.Text = "Note: Existing data.json found - will be preserved"
    $lblData.ForeColor = [System.Drawing.Color]::DarkGreen
  } else {
    $lblData.Text = ""
  }
})

# --- Progress bar ---
$bar = New-Object System.Windows.Forms.ProgressBar
$bar.Location = New-Object System.Drawing.Point(20, 145)
$bar.Size = New-Object System.Drawing.Size(468, 18)
$bar.Style = "Marquee"
$bar.Visible = $false

$lblStatus = New-Object System.Windows.Forms.Label
$lblStatus.Text = ""
$lblStatus.Location = New-Object System.Drawing.Point(20, 172)
$lblStatus.AutoSize = $true
$lblStatus.ForeColor = [System.Drawing.Color]::Gray

# --- Buttons ---
$btnInstall = New-Object System.Windows.Forms.Button
$btnInstall.Text = "Install"
$btnInstall.Location = New-Object System.Drawing.Point(280, 215)
$btnInstall.Size = New-Object System.Drawing.Size(100, 36)

$btnCancel = New-Object System.Windows.Forms.Button
$btnCancel.Text = "Cancel"
$btnCancel.Location = New-Object System.Drawing.Point(390, 215)
$btnCancel.Size = New-Object System.Drawing.Size(100, 36)
$btnCancel.Add_Click({ $form.Close() })

$btnInstall.Add_Click({
  $installDir = $txt.Text
  if (-not $installDir) {
    $lblStatus.Text = "Error: install path is empty!"
    $lblStatus.ForeColor = [System.Drawing.Color]::Red
    return
  }
  try {
    $btnInstall.Enabled = $false
    $bar.Visible = $true
    $lblStatus.ForeColor = [System.Drawing.Color]::Gray

    $lblStatus.Text = "Copying files..."
    $form.Refresh()

    # Create target directory
    if (-not (Test-Path $installDir)) { New-Item -ItemType Directory -Path $installDir -Force | Out-Null }

    # Copy source files (exclude build, .git, backups, installer itself, node_modules/.cache)
    $exclude = @('build', '.git', 'backups', 'node_modules\.cache', 'installer.ps1', 'Setup.cmd', 'uninstall.bat')
    $items = Get-ChildItem -LiteralPath $scriptDir -Force
    foreach ($item in $items) {
      $name = $item.Name
      $skip = $false
      foreach ($pat in $exclude) {
        if ($name -like $pat) { $skip = $true; break }
      }
      if ($skip) { continue }
      $dest = Join-Path $installDir $name
      if (Test-Path $dest) { Remove-Item -LiteralPath $dest -Recurse -Force -ErrorAction SilentlyContinue }
      Copy-Item -LiteralPath $item.FullName -Destination $dest -Recurse -Force
    }

    # Preserve existing data.json if present (already copied above, but ensure backups dir)
    $backupsDir = Join-Path $installDir "backups"
    if (-not (Test-Path $backupsDir)) { New-Item -ItemType Directory -Path $backupsDir -Force | Out-Null }

    $lblStatus.Text = "Creating launcher..."
    $form.Refresh()
    $launcherVbs = @'
Set objShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
scriptPath = fso.GetParentFolderName(WScript.ScriptFullName)
objShell.CurrentDirectory = scriptPath
objShell.Run """" & scriptPath & "\node_modules\electron\dist\electron.exe"" .", 0, False
'@
    Set-Content -LiteralPath (Join-Path $installDir "launcher.vbs") -Value $launcherVbs -Encoding ASCII

    $lblStatus.Text = "Creating start script..."
    $form.Refresh()
    $startBat = @"
@echo off
cd /d "%~dp0"
start "" "%~dp0node_modules\electron\dist\electron.exe" .
exit
"@
    Set-Content -LiteralPath (Join-Path $installDir "start.bat") -Value $startBat -Encoding ASCII

    $lblStatus.Text = "Creating uninstaller..."
    $form.Refresh()
    $uninstBat = @"
@echo off
taskkill /f /im electron.exe >nul 2>&1
timeout /t 2 /nobreak >nul
del "%USERPROFILE%\Desktop\LuluTimeTracker.lnk" 2>nul
if exist "%~dp0backups" rmdir /s /q "%~dp0backups" 2>nul
cd /d "%USERPROFILE%"
rmdir /s /q "%~dp0" 2>nul
"@
    Set-Content -LiteralPath (Join-Path $installDir "uninstall.bat") -Value $uninstBat -Encoding ASCII

    if ($chk.Checked) {
      $lblStatus.Text = "Creating shortcut..."
      $form.Refresh()
      $WshShell = New-Object -ComObject WScript.Shell
      $lnkPath = Join-Path ([Environment]::GetFolderPath("Desktop")) "LuluTimeTracker.lnk"
      $lnk = $WshShell.CreateShortcut($lnkPath)
      $lnk.TargetPath = "wscript.exe"
      $lnk.Arguments = """$installDir\launcher.vbs"""
      $lnk.WorkingDirectory = $installDir
      $lnk.Description = "Lulu Time Tracker"
      $icoPath = Join-Path $installDir "lulu.ico"
      if (Test-Path $icoPath) { $lnk.IconLocation = "$icoPath,0" }
      $lnk.Save()
    }

    $bar.Visible = $false
    $lblStatus.Text = "Installation complete!"
    $lblStatus.ForeColor = [System.Drawing.Color]::Green
    $btnInstall.Text = "Done"
    $btnCancel.Text = "Close"

  } catch {
    $lblStatus.Text = "Error: $($_.Exception.Message)"
    $lblStatus.ForeColor = [System.Drawing.Color]::Red
    $btnInstall.Enabled = $true
    $bar.Visible = $false
  }
})

$form.Controls.AddRange(@($lbl, $txt, $btnBrowse, $chk, $lblData, $bar, $lblStatus, $btnInstall, $btnCancel))
$form.ShowDialog() | Out-Null
