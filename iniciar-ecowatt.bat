@echo off
chcp 65001 >nul
title EcoWatt - inicializador
cd /d "%~dp0"

echo.
echo  ===== EcoWatt =====
echo.
echo [1/3] Subindo o Postgres (Docker)...
docker compose up -d
if errorlevel 1 (
  echo.
  echo  ERRO: o Docker nao respondeu. Abra o Docker Desktop, espere ele ficar verde
  echo  e rode este arquivo de novo.
  pause
  exit /b 1
)

echo Aguardando o banco ficar pronto...
timeout /t 5 /nobreak >nul

echo [2/3] Iniciando o backend (FastAPI) em http://localhost:8000 ...
start "EcoWatt - backend" cmd /k "cd /d "%~dp0backend" && call venv\Scripts\activate.bat && alembic upgrade head && uvicorn app.main:app --reload"

echo Aguardando o backend...
timeout /t 6 /nobreak >nul

echo [3/3] Iniciando o frontend (Vite) em http://localhost:5173 ...
start "EcoWatt - frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo  Pronto. Duas janelas abriram (backend e frontend) - deixe elas abertas.
echo  Acesse: http://localhost:5173
echo  Para parar: feche as duas janelas e rode "docker compose down".
echo.
timeout /t 8 >nul
