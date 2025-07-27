@echo off
echo 🔍 Building APK and Logging Errors
echo ==================================
echo.

cd /d "C:\Users\viper\OneDrive\Desktop\Claude\obtaskai\client\android"

echo Cleaning previous logs...
if exist "build_error.log" del "build_error.log"

echo.
echo Building and saving output to build_error.log...
echo Please wait...
echo.

call gradlew.bat assembleDebug --stacktrace > build_error.log 2>&1

echo.
echo Build complete! Opening error log...
echo.

notepad build_error.log

echo.
echo The error details are now open in Notepad.
echo Look for "FAILURE:" or "Error:" to find the issue.
echo.
pause