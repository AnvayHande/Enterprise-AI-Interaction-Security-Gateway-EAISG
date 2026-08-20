@echo off
echo ===================================================
echo Starting EAISG Development Servers
echo ===================================================

echo.
echo [1/2] Starting FastAPI Backend...
start "EAISG Backend" cmd /k "call venv\Scripts\activate.bat && (IF NOT EXIST venv\Lib\site-packages\fastapi\ (echo Missing backend packages. Installing... && pip install -r requirements.txt)) && python scripts\start_api_dev.py"

echo.
echo [2/2] Starting React/Vite Frontend...
start "EAISG Frontend" cmd /k "cd frontend && (IF NOT EXIST node_modules\ (echo Missing frontend packages. Installing... && npm install)) && npm run dev"

echo.
echo Both servers are starting up in separate windows!
echo - Backend will be available at: http://127.0.0.1:8000
echo - Frontend will be available at: http://localhost:5173 (usually)
echo.
echo You can close this window now. The servers will keep running in the newly opened windows.
pause
