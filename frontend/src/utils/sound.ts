import { Platform } from 'react-native';

let clickAudio: any = null;

if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof Audio !== 'undefined') {
  try {
    // Typewriter key click is a short, soft, single-keypress sound that mimics the Apple iOS keyboard click.
    clickAudio = new Audio('https://www.soundjay.com/communication/typewriter-key-1.mp3');
    clickAudio.volume = 0.4;
    clickAudio.load();
  } catch (err) {
    console.warn('Click audio pre-load failed:', err);
  }
}

export const playClickSound = () => {
  if (clickAudio) {
    try {
      // Reset playback position to allow rapid repeated clicks
      clickAudio.currentTime = 0;
      clickAudio.play();
    } catch (err) {
      console.warn('Audio play failed:', err);
    }
  }
};
