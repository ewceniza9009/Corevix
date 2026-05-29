@echo off
title Corevix Banking Stack Runner
echo ===================================================
echo   Corevix Banking Stack - One-Click Launcher
echo ===================================================
echo.

echo [1/5] Starting Docker Containers (PostgreSQL, MongoDB, Redis)...
docker-compose up -d
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to start Docker containers. Make sure Docker Desktop is running!
    pause
    exit /b %ERRORLEVEL%
)
echo.

echo [2/5] Starting .NET Core API Server (Ports: 31700 / 31701)...
start "Corevix API Server" cmd /k "dotnet watch run --project Api --launch-profile https"

echo [3/5] Starting Corporate Portal (Port: 31710)...
start "Corevix Corporate Portal" cmd /k "cd WebApps\CorevixCorporatePortal && npx ng serve"

echo [4/5] Starting Client Portal (Port: 31711)...
start "Corevix Client Portal" cmd /k "cd WebApps\CorevixClientPortal && npx ng serve"

echo [5/5] Starting Mobile Banking Portal (Port: 31712)...
start "Corevix Mobile Banking" cmd /k "cd MobileApps\CorevixMobileBanking && npx ng serve"

echo.
echo ===================================================
echo   All applications have been launched in separate 
echo   terminal windows! Press any key to close this.
echo ===================================================
pause
