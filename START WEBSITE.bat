@echo off
title Goldy Handpoked - dev server
cd /d "%~dp0"

echo.
echo   GOLDY HANDPOKED
echo   ---------------
echo   Starting the website...
echo.

if not exist "node_modules\" (
  echo   First run - installing dependencies, this takes a minute.
  echo.
  call npm install
  echo.
)

set "BRAVE=C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe"
if not exist "%BRAVE%" set "BRAVE=C:\Program Files (x86)\BraveSoftware\Brave-Browser\Application\brave.exe"
if not exist "%BRAVE%" set "BRAVE=%LOCALAPPDATA%\BraveSoftware\Brave-Browser\Application\brave.exe"

rem give Vite a moment to bind the port before the browser opens
if exist "%BRAVE%" (
  start "" /b cmd /c "timeout /t 4 /nobreak >nul & ""%BRAVE%"" ""http://localhost:5190"""
) else (
  echo   Brave not found - opening your default browser instead.
  start "" /b cmd /c "timeout /t 4 /nobreak >nul & start http://localhost:5190"
)

echo   Opening http://localhost:5190 in Brave
echo   Leave this window open while you work.
echo   Close it, or press Ctrl+C, to stop the server.
echo.

call npm run dev

echo.
echo   Server stopped.
pause
