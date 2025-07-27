@echo off
echo 🔨 Building ObtaskAI Android APK (Debug Mode)
echo ============================================
echo.
echo Press any key to start...
pause

echo.
echo Step 1: Checking current directory...
echo Current directory: %CD%
echo.

echo Step 2: Navigating to Android project...
cd /d "C:\Users\viper\OneDrive\Desktop\Claude\obtaskai\client\android"
echo New directory: %CD%
echo.

echo Step 3: Checking if gradlew.bat exists...
if exist "gradlew.bat" (
    echo ✅ gradlew.bat found!
) else (
    echo ❌ ERROR: gradlew.bat not found!
    echo Please make sure you're in the correct directory.
    pause
    exit
)
echo.

echo Step 4: Checking Java installation...
java -version
if errorlevel 1 (
    echo ❌ ERROR: Java not found or not in PATH!
    echo Please install Java JDK 11 or higher.
    pause
    exit
)
echo.

echo Step 5: Setting JAVA_HOME (if needed)...
if not defined JAVA_HOME (
    echo JAVA_HOME not set, attempting to find Java...
    for /f "tokens=2*" %%i in ('reg query "HKEY_LOCAL_MACHINE\SOFTWARE\JavaSoft\Java Development Kit" /s /v JavaHome 2^>nul') do set JAVA_HOME=%%j
)
echo JAVA_HOME: %JAVA_HOME%
echo.

echo Step 6: Starting Gradle build...
echo This may take 5-15 minutes on first build...
echo.
echo Running: gradlew.bat assembleDebug
echo =====================================

call gradlew.bat assembleDebug

echo.
echo Build process completed with exit code: %errorlevel%
echo.

if exist "app\build\outputs\apk\debug\app-debug.apk" (
    echo ✅ SUCCESS! APK built successfully!
    echo.
    echo APK Location: %CD%\app\build\outputs\apk\debug\app-debug.apk
    echo.
    echo File details:
    dir "app\build\outputs\apk\debug\app-debug.apk"
    echo.
    echo You can now install this APK on your Android phone!
) else (
    echo ❌ Build failed or APK not found.
    echo.
    echo Common issues:
    echo 1. Missing Android SDK - Install via Android Studio
    echo 2. Network issues - Gradle needs to download dependencies
    echo 3. Java version - Needs Java 11 or higher
    echo.
    echo Check the error messages above for details.
)

echo.
echo Press any key to close this window...
pause >nul