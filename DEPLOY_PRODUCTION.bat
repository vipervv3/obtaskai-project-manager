@echo off
echo ====================================
echo AI Project Manager Production Build
echo ====================================
echo.

REM Check if all dependencies are installed
echo [1/5] Installing dependencies...
call npm run install:all
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

REM Build server
echo.
echo [2/5] Building server...
cd server
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Server build failed
    cd ..
    pause
    exit /b 1
)
cd ..

REM Build client
echo.
echo [3/5] Building client...
cd client
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Client build failed
    cd ..
    pause
    exit /b 1
)
cd ..

REM Create deployment directory
echo.
echo [4/5] Creating deployment package...
if exist deployment rmdir /s /q deployment
mkdir deployment
mkdir deployment\server
mkdir deployment\client

REM Copy server files
xcopy /E /I server\dist deployment\server\dist
xcopy /E /I server\node_modules deployment\server\node_modules
copy server\package.json deployment\server\
copy server\package-lock.json deployment\server\

REM Copy client build
xcopy /E /I client\build deployment\client\build

REM Create production start scripts
echo.
echo [5/5] Creating production scripts...

REM Server start script
echo const path = require('path'); > deployment\server\start.js
echo const { exec } = require('child_process'); >> deployment\server\start.js
echo process.env.NODE_ENV = 'production'; >> deployment\server\start.js
echo require('./dist/index.js'); >> deployment\server\start.js

REM Production info file
echo AI Project Manager - Production Build > deployment\README.txt
echo ==================================== >> deployment\README.txt
echo. >> deployment\README.txt
echo Build Date: %date% %time% >> deployment\README.txt
echo. >> deployment\README.txt
echo Server: >> deployment\README.txt
echo - Location: ./server >> deployment\README.txt
echo - Start: node start.js >> deployment\README.txt
echo - Port: Set PORT environment variable (default: 5000) >> deployment\README.txt
echo. >> deployment\README.txt
echo Client: >> deployment\README.txt
echo - Location: ./client/build >> deployment\README.txt
echo - Serve with any static file server >> deployment\README.txt
echo. >> deployment\README.txt
echo Environment Variables Required: >> deployment\README.txt
echo - SUPABASE_URL >> deployment\README.txt
echo - SUPABASE_ANON_KEY >> deployment\README.txt
echo - SUPABASE_SERVICE_KEY >> deployment\README.txt
echo - JWT_SECRET >> deployment\README.txt
echo - NODE_ENV=production >> deployment\README.txt

echo.
echo ====================================
echo Production build completed!
echo ====================================
echo.
echo Deployment package created in: deployment\
echo.
echo Next steps:
echo 1. Copy .env.production.example to deployment\server\.env
echo 2. Fill in your production environment variables
echo 3. Deploy server to your hosting provider (Render, Railway, etc)
echo 4. Deploy client\build to your static hosting (Vercel, Netlify, etc)
echo.
pause