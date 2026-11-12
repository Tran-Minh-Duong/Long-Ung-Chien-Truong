@echo off
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Can Node.js de mo ban demo. Cai Node.js roi mo lai tep nay.
  pause
  exit /b 1
)
node tools\demo-server.cjs --open
if errorlevel 1 pause
