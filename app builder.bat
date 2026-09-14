@echo off
setlocal enabledelayedexpansion
title Hextech Riot Settings - Build

REM Sempre roda a partir da pasta onde este .bat esta salvo
cd /d "%~dp0"

echo ============================================
echo   Hextech Riot Settings - Build do .exe
echo ============================================
echo Pasta do projeto: %cd%
echo.

REM ---------- 1. Checar Node.js ----------
where node >nul 2>nul
if errorlevel 1 (
    echo [ERRO] Node.js nao encontrado no PATH.
    echo Instale em: https://nodejs.org/ ^(versao LTS^) e rode este script de novo.
    pause
    exit /b 1
)
for /f "delims=" %%v in ('node -v') do set NODE_VERSION=%%v
echo [OK] Node.js encontrado: %NODE_VERSION%

REM ---------- 2. Checar Rust / Cargo ----------
where cargo >nul 2>nul
if errorlevel 1 (
    echo [ERRO] Rust/Cargo nao encontrado no PATH.
    echo Instale em: https://www.rust-lang.org/tools/install e rode este script de novo.
    echo ^(Depois de instalar, feche e abra o terminal de novo antes de rodar o .bat^)
    pause
    exit /b 1
)
for /f "delims=" %%v in ('cargo --version') do set CARGO_VERSION=%%v
echo [OK] Cargo encontrado: %CARGO_VERSION%
echo.

REM ---------- 3. Instalar dependencias node se necessario ----------
if not exist "node_modules\" (
    echo [1/3] node_modules nao existe. Rodando npm install...
    call npm install
    if errorlevel 1 (
        echo [ERRO] npm install falhou. Veja o erro acima.
        pause
        exit /b 1
    )
) else (
    echo [1/3] node_modules ja existe, pulando npm install.
    echo        ^(Se voce mudou dependencias no package.json, apague a pasta
    echo         node_modules e rode este script de novo.^)
)
echo.

REM ---------- 4. Build do Tauri ----------
echo [2/3] Compilando o app com Tauri ^(isso pode demorar alguns minutos na
echo        primeira vez, o Rust precisa compilar tudo^)...
echo.

call npm run tauri build
if errorlevel 1 (
    echo.
    echo [AVISO] "npm run tauri build" falhou ou nao existe esse script.
    echo Tentando alternativa: npx tauri build ...
    call npx tauri build
    if errorlevel 1 (
        echo.
        echo [ERRO] O build falhou. Role para cima e veja a mensagem de erro
        echo do Cargo/Rust ou do Tauri para saber o que corrigir.
        pause
        exit /b 1
    )
)

echo.
echo [3/3] Build concluido! Procurando o .exe gerado...
echo.

REM ---------- 5. Localizar o .exe gerado e abrir a pasta ----------
set FOUND_EXE=
for /f "delims=" %%f in ('dir /s /b /o-d "src-tauri\*.exe" 2^>nul ^| findstr /i "release\\" ^| findstr /v /i "\\deps\\" ') do (
    if not defined FOUND_EXE set FOUND_EXE=%%f
)

if defined FOUND_EXE (
    echo ============================================
    echo   SUCESSO!
    echo   Executavel: !FOUND_EXE!
    echo ============================================
    for %%p in ("!FOUND_EXE!") do explorer /select,"%%~fp"
) else (
    echo O build terminou mas nao encontrei o .exe automaticamente.
    echo Procure manualmente dentro de src-tauri\target\release\
    echo ou src-tauri\target-codex-build\release\ ^(ou pasta similar,
    echo dependendo da sua config do Cargo^).
)

echo.
pause