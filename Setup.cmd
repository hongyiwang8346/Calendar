@echo off
title Lulu Time Tracker Setup
echo Launching installer...
powershell -ExecutionPolicy Bypass -NoProfile -File "%~dp0installer.ps1"
