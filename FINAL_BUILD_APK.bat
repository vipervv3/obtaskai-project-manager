@echo off
echo 📱 Final APK Build - Java 17 Consistent
echo =======================================
echo.

echo Setting JAVA_HOME to Java 17...
set JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.0.15.6-hotspot
set PATH=%JAVA_HOME%\bin;%PATH%
set JAVA_VERSION=17

echo Current Java version:
java -version
echo.

echo [1/6] Building React app...
cd "C:\Users\viper\OneDrive\Desktop\Claude\obtaskai\client"
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: React build failed
    pause
    exit /b 1
)

echo.
echo [2/6] Syncing to Android...
call npx cap sync android
if %errorlevel% neq 0 (
    echo ERROR: Capacitor sync failed
    pause
    exit /b 1
)

echo.
echo [3/6] Stopping all Gradle daemons...
cd android
call gradlew --stop

echo.
echo [4/6] Cleaning previous builds...
call gradlew clean --no-daemon

echo.
echo [5/6] Building APK with Java 17...
call gradlew assembleRelease --no-daemon --stacktrace
if %errorlevel% neq 0 (
    echo ERROR: APK build failed
    pause
    exit /b 1
)

echo.
echo [6/6] Copying APK to Desktop...
copy "app\release\app-release.apk" "%USERPROFILE%\Desktop\ObtaskAI-Final.apk"

echo.
echo ====================================
echo ✅ SUCCESS! 
echo ====================================
echo.
echo APK Location: %USERPROFILE%\Desktop\ObtaskAI-Final.apk
echo Server IP: 192.168.1.185:5000
echo Java Version: 17
echo.
echo To use:
echo 1. Make sure server is running: cd server && npm start
echo 2. Install ObtaskAI-Final.apk on your phone
echo 3. Both devices must be on same WiFi network
echo.
pause