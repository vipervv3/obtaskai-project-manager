import { useEffect, useState } from 'react';
import { isMobileApp } from '../utils/mobileUtils';

export const useMobileKeyboard = () => {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    if (!isMobileApp()) return;

    let initialHeight = window.innerHeight;
    
    const handleResize = () => {
      const currentHeight = window.innerHeight;
      const heightDiff = initialHeight - currentHeight;
      
      if (heightDiff > 50) {
        // Keyboard is likely shown
        setKeyboardHeight(heightDiff);
        setIsKeyboardVisible(true);
        
        // Add class to body for CSS adjustments
        document.body.classList.add('keyboard-visible');
        
        // Scroll active input into view
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
          setTimeout(() => {
            activeElement.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center' 
            });
          }, 300);
        }
      } else {
        // Keyboard is hidden
        setKeyboardHeight(0);
        setIsKeyboardVisible(false);
        document.body.classList.remove('keyboard-visible');
      }
    };

    // Visual viewport API (better for mobile)
    if ('visualViewport' in window && window.visualViewport) {
      const viewport = window.visualViewport;
      viewport.addEventListener('resize', handleResize);
      viewport.addEventListener('scroll', handleResize);
      
      return () => {
        viewport.removeEventListener('resize', handleResize);
        viewport.removeEventListener('scroll', handleResize);
      };
    } else {
      // Fallback for older browsers
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  return { keyboardHeight, isKeyboardVisible };
};