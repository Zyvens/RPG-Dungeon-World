@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ============================================
echo   Kael Frostborn - Ficha do Guerreiro
echo ============================================
echo.
echo Enderecos para abrir no navegador do TABLET
echo (o tablet precisa estar no MESMO Wi-Fi deste PC):
echo.
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
  set ip=%%a
  set ip=!ip: =!
  echo    http://!ip!:4173
)
echo.
echo Neste computador: http://localhost:4173
echo.
echo Deixe esta janela aberta enquanto estiver usando o app.
echo Para encerrar o servidor, feche esta janela ou pressione CTRL+C.
echo.

python -m http.server 4173

pause
