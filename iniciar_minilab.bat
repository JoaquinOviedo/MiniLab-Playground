@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "APP_DIR=%~dp0"
cd /d "%APP_DIR%"
if not exist "logs" mkdir "logs"
set "LOG_FILE=%APP_DIR%logs\launcher.log"
set "BRANCH=main"
set "NEEDS_INSTALL=0"

call :log "Inicio del launcher"

rem Comprueba el remoto y solo hace pull si la rama local esta atrasada.
set "BEFORE="
for /f "delims=" %%H in ('git rev-parse HEAD 2^>nul') do set "BEFORE=%%H"
if defined BEFORE (
  git fetch --quiet origin >> "%LOG_FILE%" 2>&1
  set "AHEAD=0"
  set "BEHIND=0"
  for /f "tokens=1,2" %%A in ('git rev-list --left-right --count HEAD...origin/%BRANCH% 2^>nul') do (
    set "AHEAD=%%A"
    set "BEHIND=%%B"
  )
  if "!AHEAD!"=="0" if not "!BEHIND!"=="0" (
    call :log "Actualizaciones encontradas; descargando cambios"
    git pull --ff-only origin %BRANCH% >> "%LOG_FILE%" 2>&1
    if errorlevel 1 (
      call :log "No se pudo actualizar con fast-forward; se conserva la version local"
    ) else (
      set "AFTER="
      for /f "delims=" %%H in ('git rev-parse HEAD 2^>nul') do set "AFTER=%%H"
      for /f "delims=" %%F in ('git diff --name-only !BEFORE! !AFTER! 2^>nul') do (
        if /i "%%F"=="package.json" set "NEEDS_INSTALL=1"
        if /i "%%F"=="package-lock.json" set "NEEDS_INSTALL=1"
      )
    )
  ) else if "!AHEAD!"=="0" (
    call :log "Sin actualizaciones nuevas"
  ) else (
    call :log "La rama local tiene cambios propios; no se hace pull"
  )
)

if not exist "node_modules" set "NEEDS_INSTALL=1"
if "!NEEDS_INSTALL!"=="1" (
  call :log "Instalando dependencias"
  call npm ci >> "%LOG_FILE%" 2>&1
  if errorlevel 1 (
    call :log "Error instalando dependencias"
    exit /b 1
  )
)

rem Evita iniciar una segunda instancia si Vite ya esta escuchando.
powershell -NoProfile -ExecutionPolicy Bypass -Command "$c=Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue; if($c){exit 0}else{exit 1}" >nul 2>&1
if errorlevel 1 (
  call :log "Iniciando servidor Vite"
  start "" /b cmd /d /c "npm run dev -- --host 127.0.0.1 > logs\server.log 2>&1"
) else (
  call :log "El servidor ya estaba iniciado"
)

rem PowerShell solo espera la respuesta; Windows abre el navegador fuera del proceso oculto.
powershell -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -Command "$ready=$false; 1..20 | %% { try { $r=Invoke-WebRequest -UseBasicParsing http://127.0.0.1:5173/ -TimeoutSec 1; if($r.StatusCode -eq 200){$ready=$true; break} } catch {}; Start-Sleep -Milliseconds 250 }; if($ready){exit 0}else{exit 1}" >nul 2>&1
if not errorlevel 1 (
  start "" "http://127.0.0.1:5173/"
  call :log "Servidor verificado; navegador abierto"
) else (
  call :log "El servidor no respondio a tiempo; no se abrio el navegador"
)
call :log "Launcher listo"
exit /b 0

:log
for /f "delims=" %%T in ('powershell -NoProfile -Command "Get-Date -Format s"') do echo [%%T] %~1>> "%LOG_FILE%"
exit /b 0
