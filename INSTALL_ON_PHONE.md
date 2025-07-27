# 📱 Install ObtaskAI on Your Phone

## APK Location
The APK is ready at:
```
C:\Users\viper\OneDrive\Desktop\Claude\obtaskai\client\android\app\release\app-release.apk
```

## Installation Methods

### Method 1: Direct Transfer (Easiest)
1. Connect your phone to your PC via USB
2. Copy `app-release.apk` to your phone's Downloads folder
3. On your phone:
   - Open Files/File Manager app
   - Navigate to Downloads
   - Tap on `app-release.apk`
   - Enable "Install from unknown sources" if prompted
   - Install the app

### Method 2: Google Drive/Email
1. Upload `app-release.apk` to Google Drive or email it to yourself
2. Open it on your phone
3. Download and install

### Method 3: ADB Install (Developer Method)
```bash
# Enable Developer Options and USB Debugging on your phone
# Connect phone via USB
adb install "C:\Users\viper\OneDrive\Desktop\Claude\obtaskai\client\android\app\release\app-release.apk"
```

## Before Installing
⚠️ **Enable Unknown Sources**:
- Go to Settings → Security
- Enable "Unknown sources" or "Install unknown apps"
- For Android 8.0+: You'll be prompted when installing

## App Info
- **Name**: ObtaskAI
- **Version**: 1.0.0
- **Size**: ~35-40 MB
- **Min Android**: 5.0 (API 21)

## After Installation
1. Open the app
2. Sign up or log in
3. The app will connect to your backend server
4. Start managing your projects with AI assistance!

## Troubleshooting
- **"App not installed"**: Enable unknown sources
- **"Package conflicts"**: Uninstall any previous version first
- **Connection issues**: Make sure your backend server is running