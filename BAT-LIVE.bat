@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist "node_modules\.bin\tsx.cmd" (
  echo Lan dau chay: dang cai thu vien, doi 1-2 phut...
  call npm ci
  if errorlevel 1 (
    echo Cai thu vien that bai. Kiem tra ket noi npm va chay lai BAT-LIVE.bat.
    pause
    exit /b 1
  )
)
rem Giong MC "Adam bua" (VieNeu): bat trong cua so rieng neu chua chay. Khong co VieNeu thi game tu doc giong Edge.
powershell -NoProfile -Command "try { ([Net.Sockets.TcpClient]::new('127.0.0.1', 8000)).Dispose(); exit 0 } catch { exit 1 }"
if errorlevel 1 if exist "E:\02_AI\VieNeu-TTS\.venv\Scripts\python.exe" (
  echo Dang bat giong VieNeu o cua so rieng - dung tat cua so do khi dang live...
  setlocal
  set "HF_HOME=E:\02_AI\VieNeu-TTS\.cache\huggingface"
  set "HF_HUB_CACHE=E:\02_AI\VieNeu-TTS\.cache\huggingface\hub"
  set "HF_HUB_DOWNLOAD_TIMEOUT=60"
  set "VIENEU_BACKEND=onnx"
  set "VIENEU_DEVICE=cpu"
  set "HOST=127.0.0.1"
  set "PORT=8000"
  set "PYTHONUTF8=1"
  start "VieNeu giong MC - dung tat khi live" /D "E:\02_AI\VieNeu-TTS" cmd /k ".venv\Scripts\python.exe -m apps.openai_speech"
  endlocal
)
echo Dang bat game... Dong cua so nay la tat game.
echo Link cho TikTok LIVE Studio hien ben duoi khi server chay xong (cong 3000, ban thi cong ke tiep).
rem Che do live: trang stage khong tu tai lai khi sua code
set LIVE_MODE=1
rem Server tu mo trang dieu khien dung cong vua chon
set OPEN_DASHBOARD=1
npm run dev
pause

