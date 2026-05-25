@echo off
setlocal

cd /d "%~dp0"

echo Starting SQL ERP Engineer Course...
echo.

if not exist "node_modules" (
  echo Dependencies are not installed. Running npm install first...
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo npm install failed.
    pause
    exit /b 1
  )
)

echo Open this address in your browser:
echo http://127.0.0.1:5173
echo.
echo Close this window to stop the course server.
echo.

start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process 'http://127.0.0.1:5173'"
call npm run dev -- --host 127.0.0.1 --port 5173

echo.
echo Server stopped.
pause
