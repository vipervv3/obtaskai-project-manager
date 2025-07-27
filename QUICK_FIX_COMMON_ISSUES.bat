@echo off
echo 🚀 Quick Fix for Common Android Build Issues
echo ===========================================
echo.

cd /d "C:\Users\viper\OneDrive\Desktop\Claude\obtaskai\client\android"

echo Step 1: Setting Android environment variables...
set ANDROID_HOME=%USERPROFILE%\AppData\Local\Android\Sdk
set PATH=%PATH%;%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\tools

echo.
echo Step 2: Accepting licenses (if needed)...
echo y | "%ANDROID_HOME%\cmdline-tools\latest\bin\sdkmanager.bat" --licenses 2>nul
if not exist "%ANDROID_HOME%\cmdline-tools\latest\bin\sdkmanager.bat" (
    echo SDK manager not found in latest, trying other locations...
    for /d %%i in ("%ANDROID_HOME%\cmdline-tools\*") do (
        if exist "%%i\bin\sdkmanager.bat" (
            echo y | "%%i\bin\sdkmanager.bat" --licenses 2>nul
        )
    )
)

echo.
echo Step 3: Cleaning Gradle cache...
call gradlew.bat clean

echo.
echo Step 4: Checking for missing SDK components...
echo.

echo Current ANDROID_HOME: %ANDROID_HOME%
echo Current JAVA_HOME: %JAVA_HOME%

echo.
echo Step 5: Building with offline mode to see dependencies...
call gradlew.bat assembleDebug --offline --stacktrace

echo.
echo If build still fails, the error above should be more specific.
echo.
pause