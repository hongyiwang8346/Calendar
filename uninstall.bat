@echo off
taskkill /f /im electron.exe >nul 2>&1
timeout /t 2 /nobreak >nul
del "%USERPROFILE%\Desktop\LuluTimeTracker.lnk" 2>nul
if exist "%~dp0backups" rmdir /s /q "%~dp0backups" 2>nul
cd /d "%USERPROFILE%"
rmdir /s /q "%~dp0" 2>nul
