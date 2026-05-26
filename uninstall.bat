@echo off
taskkill /f /im LuluTimeTracker.exe >nul 2>&1
taskkill /f /im electron.exe >nul 2>&1
timeout /t 2 /nobreak >nul
del "%USERPROFILE%\Desktop\LuluTimeTracker.lnk" 2>nul
rmdir /s /q "%APPDATA%\LuluTimeTracker" 2>nul
rmdir /s /q "%~dp0" 2>nul
del "%~f0" 2>nul
