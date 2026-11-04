@echo off
chcp 65001 >nul
title NetConnect - serveur local
cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
  echo [ERREUR] Node.js n'est pas installe. Telechargez-le sur https://nodejs.org puis relancez ce fichier.
  pause
  exit /b 1
)

if not exist "node_modules" call npm install
if not exist "server\node_modules" call npm --prefix server install
if not exist "client\node_modules" call npm --prefix client install
if not exist "server\.env" copy "server\.env.example" "server\.env" >nul
if not exist "server\prisma\dev.db" call npm run setup

echo.
echo ============================================================
echo   NetConnect demarre...
echo   Le site va s'ouvrir sur http://localhost:5173
echo   Administration : http://localhost:5173/admin
echo   Pour arreter le site : fermez cette fenetre.
echo ============================================================
echo.

start "" cmd /c "timeout /t 6 /nobreak >nul & start http://localhost:5173"
call npm run dev
pause
