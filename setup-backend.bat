@echo off
setlocal

REM Wrapper: setup backend using manage.ps1 commands
set "PS_SCRIPT=%~dp0manage.ps1"

if not exist "%PS_SCRIPT%" (
  echo manage.ps1 not found next to this script.
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%PS_SCRIPT%" build
powershell -NoProfile -ExecutionPolicy Bypass -File "%PS_SCRIPT%" db seed

echo.
echo ✅ Backend setup complete via manage.ps1
exit /b %ERRORLEVEL%
