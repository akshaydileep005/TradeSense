@echo off
echo ========================================================
echo   Starting TradeSense Full-Stack Development Servers
echo ========================================================
echo.

set "PATH=%~dp0tools\node;C:\Program Files\Python314;C:\Program Files\Python314\Scripts;C:\Users\Akshay Dileep\AppData\Roaming\Python\Python314\Scripts;%PATH%"
set "PYTHONIOENCODING=utf-8"

echo [1/2] Starting FastAPI Backend on http://localhost:8000 ...
start "TradeSense Backend (FastAPI)" cmd /k "cd /d %~dp0backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

timeout /t 3 /nobreak >nul

echo [2/2] Starting React + Vite Frontend on http://localhost:5173 ...
start "TradeSense Frontend (Vite)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ========================================================
echo   TradeSense is booting up!
echo   - Frontend: http://localhost:5173
echo   - Backend API: http://localhost:8000
echo   - API Docs: http://localhost:8000/docs
echo ========================================================
pause
