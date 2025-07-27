// Mobile app detection and utilities

export const isMobileApp = (): boolean => {
  // Check if running in Capacitor
  return !!(window as any).Capacitor;
};

export const isAndroid = (): boolean => {
  return (window as any).Capacitor?.getPlatform?.() === 'android';
};

export const isiOS = (): boolean => {
  return (window as any).Capacitor?.getPlatform?.() === 'ios';
};

export const getDeviceInfo = () => {
  const capacitor = (window as any).Capacitor;
  return {
    isNative: !!capacitor,
    platform: capacitor?.getPlatform?.() || 'web',
    isAndroid: isAndroid(),
    isiOS: isiOS(),
    isMobile: isMobileApp(),
  };
};

// Mobile-specific optimizations
export const mobileOptimizations = {
  // Prevent zoom on input focus
  preventZoom: () => {
    const viewport = document.querySelector('meta[name=viewport]');
    if (viewport) {
      viewport.setAttribute('content', 
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
      );
    }
  },

  // Add safe area padding for notched devices
  addSafeArea: () => {
    document.documentElement.style.setProperty('--safe-area-inset-top', 'env(safe-area-inset-top)');
    document.documentElement.style.setProperty('--safe-area-inset-bottom', 'env(safe-area-inset-bottom)');
  },

  // Optimize for mobile performance
  enablePerformanceMode: () => {
    // Reduce animations on mobile
    if (isMobileApp()) {
      document.body.classList.add('mobile-app');
    }
  },

  // Keep screen awake during recording
  requestWakeLock: async (): Promise<any> => {
    try {
      if ('wakeLock' in navigator) {
        return await (navigator as any).wakeLock.request('screen');
      }
    } catch (err) {
      console.log('Wake lock not supported:', err);
    }
    return null;
  },

  // Check microphone permissions
  checkMicrophonePermission: async (): Promise<boolean> => {
    try {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      return result.state === 'granted';
    } catch (err) {
      console.log('Permission check not supported:', err);
      return true; // Assume granted if we can't check
    }
  },

  // Vibrate for feedback (mobile only)
  vibrate: (pattern: number | number[] = 50) => {
    if (isMobileApp() && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  },

  // Show mobile-specific toast
  showMobileToast: (message: string, duration: number = 3000) => {
    // Could integrate with Capacitor Toast plugin
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-20 left-4 right-4 bg-gray-800 text-white p-3 rounded-lg z-50 text-center';
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, duration);
  }
};

// Initialize mobile optimizations
export const initMobileApp = () => {
  if (isMobileApp()) {
    console.log('🚀 Mobile app detected, applying optimizations...');
    mobileOptimizations.preventZoom();
    mobileOptimizations.addSafeArea();
    mobileOptimizations.enablePerformanceMode();
  }
};