
import { useState, useCallback, useEffect, useRef } from 'react';

interface TTSHook {
  speak: (text: string, languageCode: string) => void;
  cancel: () => void;
  isSpeaking: boolean;
  isSynthesizing: boolean; // Represents the phase before speech starts or an error for UI feedback
  ttsError: string | null;
  isSupported: boolean;
}

export const useTTS = (): TTSHook => {
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);
  const [ttsError, setTtsError] = useState<string | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isSupported, setIsSupported] = useState<boolean>(true);
  
  // Using a ref for the utterance to manage it across re-renders and in event handlers
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (!('speechSynthesis' in window)) {
      setTtsError("Web Speech API (Text-to-Speech) is not supported by this browser.");
      setIsSupported(false);
      return;
    }
    setIsSupported(true);

    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices.length > 0) {
        setVoices(availableVoices);
      }
    };

    loadVoices(); // Initial attempt
    // Voices list might load asynchronously
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);

    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel(); // Cancel any speech on unmount
      }
    };
  }, []);

  const speak = useCallback((text: string, languageCode: string) => {
    if (!isSupported || !window.speechSynthesis) {
      setTtsError("Text-to-Speech is not supported or initialized.");
      return;
    }

    // Cancel any ongoing speech first
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      window.speechSynthesis.cancel();
    }
    // Ensure states are reset from previous run if cancel() wasn't explicitly called by user
    setIsSpeaking(false); 


    setIsSynthesizing(true);
    setTtsError(null);

    const utterance = new SpeechSynthesisUtterance(text);
    currentUtteranceRef.current = utterance; // Store reference

    // Voice selection logic
    let selectedVoice = null;
    // Try exact match (e.g., "en-US")
    const exactLangMatchVoices = voices.filter(voice => voice.lang === languageCode);
    if (exactLangMatchVoices.length > 0) {
      selectedVoice = exactLangMatchVoices.find(v => v.default) || exactLangMatchVoices[0];
    }

    // Try base language match (e.g., "en" for "en-US")
    if (!selectedVoice) {
      const baseLanguage = languageCode.split('-')[0];
      const baseLangMatchVoices = voices.filter(voice => voice.lang.startsWith(baseLanguage));
      if (baseLangMatchVoices.length > 0) {
        selectedVoice = baseLangMatchVoices.find(v => v.default) || baseLangMatchVoices[0];
      }
    }
    
    // Fallback to any default voice if still no specific match, or first available
    if (!selectedVoice && voices.length > 0) {
        selectedVoice = voices.find(v => v.default) || voices[0];
        console.warn(`No specific voice for ${languageCode}. Using fallback: ${selectedVoice?.name} (${selectedVoice?.lang})`);
    }
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang; // Use the voice's actual lang
    } else {
      // If no voices are loaded at all, utterance.lang can be set to the desired languageCode,
      // and the browser will attempt to use a default for that language if available.
      utterance.lang = languageCode;
      if (voices.length === 0) {
          console.warn("No voices loaded. Relying on browser default for language code: " + languageCode);
      } else {
          console.warn("Could not find a suitable voice for " + languageCode + ". Using browser default.");
      }
    }
    
    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsSynthesizing(false);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsSynthesizing(false);
      if (currentUtteranceRef.current === utterance) { // Check if it's the current utterance
          currentUtteranceRef.current = null;
      }
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event.error, event);
      setTtsError(`Speech error: ${event.error}`);
      setIsSpeaking(false);
      setIsSynthesizing(false);
      if (currentUtteranceRef.current === utterance) {
          currentUtteranceRef.current = null;
      }
    };
    
    // Handle pause and resume if needed, for now, focus on start/end/error
    utterance.onpause = () => {
        // The 'pause' event indicates speech is paused.
        // Properties like currentTime and duration are not available on SpeechSynthesisUtterance.
        setIsSpeaking(false);
        // setIsSynthesizing(false); // Should already be false if speaking started
    };
    utterance.onresume = () => {
        setIsSpeaking(true);
    };

    window.speechSynthesis.speak(utterance);

  }, [voices, isSupported]);

  const cancel = useCallback(() => {
    if (!isSupported || !window.speechSynthesis) return;
    
    window.speechSynthesis.cancel();
    // The 'onend' or 'onerror' of the utterance should handle state changes.
    // However, ensure states are reset immediately for responsiveness.
    setIsSpeaking(false);
    setIsSynthesizing(false);
    if (currentUtteranceRef.current) {
        // Manually nullify listeners to prevent them firing after explicit cancel if issues arise
        // currentUtteranceRef.current.onstart = null;
        // currentUtteranceRef.current.onend = null;
        // currentUtteranceRef.current.onerror = null;
        currentUtteranceRef.current = null;
    }

  }, [isSupported]);

  return { speak, cancel, isSpeaking, isSynthesizing, ttsError, isSupported };
};
