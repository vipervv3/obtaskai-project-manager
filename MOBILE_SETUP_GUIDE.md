# 📱 ObtaskAI Mobile App Setup Guide

## 🛠️ Prerequisites

### 1. Install Android Studio
- Download from: https://developer.android.com/studio
- Install with default settings
- Install Android SDK (API 33 or higher recommended)

### 2. Enable USB Debugging on Your Phone
1. Go to **Settings > About Phone**
2. Tap **Build Number** 7 times to enable Developer Options
3. Go to **Settings > Developer Options**
4. Enable **USB Debugging**
5. Enable **Install via USB**

## 🔧 Building the APK

### Method 1: Android Studio (Recommended)

1. **Open Android Studio**
2. **Open Project**: Select `C:\Users\viper\OneDrive\Desktop\Claude\obtaskai\client\android`
3. **Wait for sync** (first time may take 5-10 minutes)
4. **Build APK**:
   - Menu: `Build > Build Bundle(s)/APK(s) > Build APK(s)`
   - Or click the hammer icon in toolbar
5. **Find APK**: `android/app/build/outputs/apk/debug/app-debug.apk`

### Method 2: Command Line (Windows)

Open Command Prompt (not PowerShell) and run:
```cmd
cd "C:\Users\viper\OneDrive\Desktop\Claude\obtaskai\client\android"
gradlew.bat assembleDebug
```

## 📱 Installing on Your Phone

### Option A: USB Cable
1. Connect phone via USB
2. In Android Studio: `Run > Run 'app'`
3. Select your device

### Option B: APK File
1. Copy `app-debug.apk` to your phone
2. Open file manager on phone
3. Tap the APK file
4. Allow installation from unknown sources
5. Install the app

## 🌐 Network Configuration

**IMPORTANT**: Make sure your phone and computer are on the same WiFi network.

- **Server URL**: `http://192.168.1.185:5000`
- **Your computer IP**: `192.168.1.185`
- **Make sure Windows Firewall allows port 5000**

### Test Network Connection:
1. Open browser on phone
2. Go to: `http://192.168.1.185:5000`
3. Should see server response

## 🎤 App Features on Mobile

✅ **Voice Recording**: Full microphone access for meeting recording  
✅ **Project Management**: Create and manage projects  
✅ **AI Transcription**: Convert speech to text with task assignment  
✅ **Recording Library**: Access all your backed-up recordings  
✅ **Dark/Light Mode**: Mobile-optimized themes  
✅ **Offline Backup**: Recordings saved even if transcription fails  

## 🐛 Troubleshooting

### Build Issues:
- **Gradle sync failed**: Wait and try again (slow internet)
- **SDK not found**: Install Android SDK via SDK Manager
- **Java version**: Make sure Java 11+ is installed

### Network Issues:
- **Can't connect to server**: Check IP address and firewall
- **Transcription fails**: Expected with rate limits, recordings are backed up
- **CORS errors**: Normal in development, app should still work

### App Issues:
- **Microphone not working**: Check permissions in phone settings
- **App crashes**: Check Android Studio logcat for errors

## 🚀 Testing Checklist

- [ ] App installs successfully
- [ ] Login/register works
- [ ] Dashboard loads
- [ ] Voice recording permissions granted
- [ ] Can record audio (test with 1-2 minutes first)
- [ ] Recording library shows recordings
- [ ] Theme switching works
- [ ] Projects can be created and managed

## 📊 Performance Tips

- **First launch**: May be slow (cache building)
- **Large recordings**: Use backup feature for 30+ minute meetings
- **Battery usage**: Voice recording is intensive, keep phone charged
- **Storage**: Recordings are backed up to server, safe to clear app cache

## 🔄 Making Changes

After modifying React code:
1. `npm run build` (in client folder)
2. `npx cap sync android` (in client folder)
3. Rebuild APK in Android Studio

---

**Ready to test your AI-powered meeting recorder! 🎉**