Add-Type -AssemblyName System.Windows.Forms,System.Drawing

$form = New-Object System.Windows.Forms.Form
$form.Text = "Lulu Time Tracker v1.0.2 Setup"
$form.Size = New-Object System.Drawing.Size(480, 260)
$form.StartPosition = "CenterScreen"
$form.FormBorderStyle = "FixedDialog"
$form.MaximizeBox = $false

# --- Path row ---
$lbl = New-Object System.Windows.Forms.Label
$lbl.Text = "Install Path:"
$lbl.Location = New-Object System.Drawing.Point(20, 24)
$lbl.AutoSize = $true

$txt = New-Object System.Windows.Forms.TextBox
$txt.Text = "$env:LOCALAPPDATA\LuluTimeTracker"
$txt.Location = New-Object System.Drawing.Point(20, 46)
$txt.Size = New-Object System.Drawing.Size(360, 23)

$btnBrowse = New-Object System.Windows.Forms.Button
$btnBrowse.Text = "..."
$btnBrowse.Location = New-Object System.Drawing.Point(388, 45)
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

# --- Progress bar ---
$bar = New-Object System.Windows.Forms.ProgressBar
$bar.Location = New-Object System.Drawing.Point(20, 112)
$bar.Size = New-Object System.Drawing.Size(428, 18)
$bar.Style = "Marquee"
$bar.Visible = $false

$lblStatus = New-Object System.Windows.Forms.Label
$lblStatus.Text = ""
$lblStatus.Location = New-Object System.Drawing.Point(20, 138)
$lblStatus.AutoSize = $true
$lblStatus.ForeColor = [System.Drawing.Color]::Gray

# --- Buttons ---
$btnInstall = New-Object System.Windows.Forms.Button
$btnInstall.Text = "Install"
$btnInstall.Location = New-Object System.Drawing.Point(250, 170)
$btnInstall.Size = New-Object System.Drawing.Size(90, 32)

$btnCancel = New-Object System.Windows.Forms.Button
$btnCancel.Text = "Cancel"
$btnCancel.Location = New-Object System.Drawing.Point(350, 170)
$btnCancel.Size = New-Object System.Drawing.Size(90, 32)
$btnCancel.Add_Click({ $form.Close() })

$btnInstall.Add_Click({
  $installDir = $txt.Text
  try {
    $btnInstall.Enabled = $false
    $bar.Visible = $true
    $lblStatus.Text = "Copying files..."
    $form.Refresh()

    $srcDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    if (Test-Path $installDir) { Remove-Item -LiteralPath $installDir -Recurse -Force -ErrorAction SilentlyContinue }
    New-Item -ItemType Directory -Path $installDir -Force | Out-Null
    Copy-Item -LiteralPath "$srcDir\*" -Destination $installDir -Recurse -Force

    $lblStatus.Text = "Creating uninstaller..."
    $form.Refresh()
    $uninst = @'
@echo off
taskkill /f /im LuluTimeTracker.exe >nul 2>&1
taskkill /f /im electron.exe >nul 2>&1
timeout /t 2 /nobreak >nul
del "%USERPROFILE%\Desktop\LuluTimeTracker.lnk" 2>nul
rmdir /s /q "%APPDATA%\LuluTimeTracker" 2>nul
rmdir /s /q "%~dp0" 2>nul
del "%~f0" 2>nul
'@
    Set-Content -LiteralPath (Join-Path $installDir "uninstall.bat") -Value $uninst -Encoding ASCII

    $lblStatus.Text = "Init data directory..."
    $form.Refresh()
    $dataDir = "$env:APPDATA\LuluTimeTracker"
    if (-not (Test-Path $dataDir)) { New-Item -ItemType Directory -Path $dataDir -Force | Out-Null }
    $initData = '{ "logs":[],"schedules":{},"ideas":[],"memos":[],"reflections":{},"timerState":"idle","timerStartTime":null,"timerSessionStart":null,"timerElapsedMs":0,"timerCategory":null,"timerDescription":"","zoomLevel":1.0 }'
    if (-not (Test-Path (Join-Path $dataDir "data.json"))) {
      Set-Content -LiteralPath (Join-Path $dataDir "data.json") -Value $initData -Encoding UTF8
    }

    if ($chk.Checked) {
      $lblStatus.Text = "Creating shortcut..."
      $form.Refresh()
      $WshShell = New-Object -ComObject WScript.Shell
      $lnkPath = [Environment]::GetFolderPath("Desktop") + "\LuluTimeTracker.lnk"
      $lnk = $WshShell.CreateShortcut($lnkPath)
      $lnk.TargetPath = Join-Path $installDir "LuluTimeTracker.exe"
      $lnk.WorkingDirectory = $installDir
      $lnk.Description = "Lulu Time Tracker"
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
  }
})

$form.Controls.AddRange(@($lbl, $txt, $btnBrowse, $chk, $bar, $lblStatus, $btnInstall, $btnCancel))
$form.ShowDialog() | Out-Null
