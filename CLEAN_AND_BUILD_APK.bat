@echo off
echo 🧹 Cleaning Gradle and Building APK
echo ===================================
echo.

echo Setting JAVA_HOME to Java 17...
set JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.0.15.6-hotspot
set PATH=%JAVA_HOME%\bin;%PATH%

echo Current Java version:
java -version
echo.

echo [1/5] Building React app...
cd "C:\Users\viper\OneDrive\Desktop\Claude\obtaskai\client"
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: React build failed
    pause
    exit /b 1
)

echo.
echo [2/5] Syncing to Android...
call npx cap sync android
if %errorlevel% neq 0 (
    echo ERROR: Capacitor sync failed
    pause
    exit /b 1
)

echo.
echo [3/5] Stopping Gradle daemons...
cd android
call gradlew --stop

echo.
echo [4/5] Cleaning and building APK...
call gradlew clean
call gradlew assembleRelease --no-daemon
if %errorlevel% neq 0 (
    echo ERROR: APK build failed
    pause
    exit /b 1
)

echo.
echo [5/5] Copying APK to Desktop...
copy "app\release\app-release.apk" "%USERPROFILE%\Desktop\ObtaskAI-Working.apk"

echo.
echo ====================================
echo ✅ SUCCESS! 
echo ====================================
echo.
echo APK Location: %USERPROFILE%\Desktop\ObtaskAI-Working.apk
echo Server IP: 192.168.1.185:5000
echo.
echo Make sure your server is running:
echo cd server && npm start
echo.
echo Then install the APK on your phone!
echo.
pause