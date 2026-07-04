import React, { useEffect } from 'react';
import { Platform } from 'react-native';

interface DevToolsBlockerProps {
  onBlocked: (reason: 'devtools') => void;
}

export default function DevToolsBlocker({ onBlocked }: DevToolsBlockerProps) {
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    // Bypass DevTools blocker on localhost/local network developer modes so it doesn't lock you out
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.')) {
        return;
      }
    }

    let isBlocked = false;

    const block = () => {
      if (!isBlocked) {
        isBlocked = true;
        onBlocked('devtools');
      }
    };

    // 1. Block Keyboard Shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12
      if (e.key === 'F12') {
        e.preventDefault();
        block();
        return false;
      }
      // Ctrl+Shift+I or Cmd+Option+I
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i')) {
        e.preventDefault();
        block();
        return false;
      }
      // Ctrl+Shift+J or Cmd+Option+J
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'J' || e.key === 'j')) {
        e.preventDefault();
        block();
        return false;
      }
      // Ctrl+Shift+C or Cmd+Option+C
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'C' || e.key === 'c')) {
        e.preventDefault();
        block();
        return false;
      }
      // Ctrl+U (View Source)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'U' || e.key === 'u')) {
        e.preventDefault();
        block();
        return false;
      }
    };

    // 2. Detect DevTools via Window Size Discrepancies
    // Modern browsers open DevTools docked, reducing inner width/height compared to outer
    const checkThreshold = 160;
    const checkSize = () => {
      // Only perform check on desktop browsers
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (isMobile) return;

      const widthThreshold = window.outerWidth - window.innerWidth > checkThreshold;
      const heightThreshold = window.outerHeight - window.innerHeight > checkThreshold;

      if (widthThreshold || heightThreshold) {
        block();
      }
    };

    // 3. Detect DevTools via Console Profiling / Printing
    // When DevTools is open, certain elements or console evaluations run automatically.
    // We can define an object with a custom toString/get getter and log it.
    const devtoolsDetectorObj = {
      get foo() {
        block();
        return 'bar';
      }
    };

    const runConsoleCheck = () => {
      try {
        // This log check will evaluate the getter only if the console is open/inspecting
        console.log(devtoolsDetectorObj);
        console.clear();
      } catch (e) {}
    };

    // Attach listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', checkSize);
    
    // Set interval for console checks and size checks
    const sizeInterval = setInterval(checkSize, 1000);
    const consoleInterval = setInterval(runConsoleCheck, 1500);

    // Initial check
    checkSize();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', checkSize);
      clearInterval(sizeInterval);
      clearInterval(consoleInterval);
    };
  }, [onBlocked]);

  return null; // Invisible component that operates in the background
}
