/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useI18n } from '../../i18n/translations.tsx';
import { Button } from '../common/Button.tsx';

interface VoiceSpeechAssistantProps {
  onApplyTranscript: (transcript: string) => void;
  textToReadAloud?: string;
  defaultLang?: 'en-IN' | 'ta-IN';
  className?: string;
}

export const VoiceSpeechAssistant: React.FC<VoiceSpeechAssistantProps> = ({
  onApplyTranscript,
  textToReadAloud,
  defaultLang = 'en-IN',
  className = '',
}) => {
  const { t, language } = useI18n();

  // Speech recognition state
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [permissionDenied, setPermissionDenied] = useState<boolean>(false);
  const [selectedVoiceLang, setSelectedVoiceLang] = useState<'en-IN' | 'ta-IN'>(
    language === 'ta' ? 'ta-IN' : defaultLang
  );
  const [transcript, setTranscript] = useState<string>('');
  const [showVoiceBox, setShowVoiceBox] = useState<boolean>(false);

  // Speech synthesis (read aloud) state
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check SpeechRecognition support
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
    }
  }, []);

  // Update selected voice language when UI language toggles
  useEffect(() => {
    setSelectedVoiceLang(language === 'ta' ? 'ta-IN' : 'en-IN');
  }, [language]);

  const startListening = () => {
    setPermissionDenied(false);
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = selectedVoiceLang;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        const text = (final || interim).trim();
        if (text) {
          setTranscript((prev) => (prev ? `${prev} ${text}` : text));
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          setPermissionDenied(true);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
      setShowVoiceBox(true);
    } catch (err) {
      setIsListening(false);
      setPermissionDenied(true);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const handleApply = () => {
    if (transcript.trim()) {
      onApplyTranscript(transcript.trim());
      setShowVoiceBox(false);
      setTranscript('');
    }
  };

  // Text-to-Speech (Read Aloud) with honest voice checking
  const handleReadAloud = () => {
    if (!textToReadAloud) return;

    if (!('speechSynthesis' in window)) {
      setVoiceNotice('Device speech synthesizer is not supported in this browser.');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    setVoiceNotice(null);
    const voices = window.speechSynthesis.getVoices();
    const isTamilTarget = language === 'ta' || selectedVoiceLang === 'ta-IN';

    // Find language voice
    let matchingVoice: SpeechSynthesisVoice | undefined;

    if (isTamilTarget) {
      matchingVoice = voices.find(
        (v) =>
          v.lang.toLowerCase().startsWith('ta') ||
          v.name.toLowerCase().includes('tamil')
      );
      // Strict rule: NEVER substitute an English voice while claiming Tamil support!
      if (!matchingVoice) {
        setVoiceNotice(
          'Tamil voice (ta-IN) is not installed on this device. Available system voices do not include Tamil. English voice will not be substituted for Tamil text.'
        );
        return;
      }
    } else {
      matchingVoice =
        voices.find((v) => v.lang.toLowerCase().startsWith('en-in')) ||
        voices.find((v) => v.lang.toLowerCase().startsWith('en'));
    }

    const utterance = new SpeechSynthesisUtterance(textToReadAloud);
    if (matchingVoice) {
      utterance.voice = matchingVoice;
      utterance.lang = matchingVoice.lang;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {/* Toggle Voice Input Box */}
        <button
          type="button"
          onClick={() => {
            if (isListening) {
              stopListening();
            } else {
              startListening();
            }
          }}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 border rounded-xs font-semibold cursor-pointer transition-none ${
            isListening
              ? 'bg-[#A63D24] text-[#FAF8F5] border-[#A63D24]'
              : 'bg-[#F7F4EC] text-[#1D2926] border-[#D3CEBE] hover:bg-[#EAE6DC]'
          }`}
          title={isListening ? t('voiceStop') : t('voiceStart')}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isListening ? 'bg-white animate-pulse' : 'bg-[#00796B]'
            }`}
          />
          <span>{isListening ? t('voiceStop') : t('voiceStart')}</span>
        </button>

        {/* Language selector for voice recognition */}
        <div className="flex items-center gap-1">
          <label htmlFor="voice-lang-select" className="text-[11px] text-[#525950] font-medium">
            {t('voiceLanguageSelect')}:
          </label>
          <select
            id="voice-lang-select"
            value={selectedVoiceLang}
            onChange={(e) => setSelectedVoiceLang(e.target.value as 'en-IN' | 'ta-IN')}
            className="bg-[#FAF8F5] border border-[#D3CEBE] text-xs px-2 py-1 rounded-xs font-medium text-[#1D2926]"
          >
            <option value="en-IN">English (India) - en-IN</option>
            <option value="ta-IN">தமிழ் (India) - ta-IN</option>
          </select>
        </div>

        {/* Read Aloud Button if text is provided */}
        {textToReadAloud && (
          <button
            type="button"
            onClick={handleReadAloud}
            className={`px-2.5 py-1.5 border rounded-xs font-semibold cursor-pointer text-xs ${
              isSpeaking
                ? 'bg-[#2457C5] text-[#FAF8F5] border-[#2457C5]'
                : 'bg-[#FAF8F5] text-[#1D2926] border-[#D3CEBE] hover:bg-[#EAE6DC]'
            }`}
          >
            {isSpeaking ? `⏹ ${t('stopReading')}` : `🔊 ${t('readAloud')}`}
          </button>
        )}
      </div>

      {/* Honest Voice Error/Notice */}
      {voiceNotice && (
        <div className="p-2 border border-[#F4CF57] bg-[#FFFBF0] text-xs text-[#5C4500] rounded-xs flex items-start justify-between gap-2">
          <span>{voiceNotice}</span>
          <button
            type="button"
            onClick={() => setVoiceNotice(null)}
            className="text-xs font-bold text-[#5C4500] cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* Permission Denied Notice */}
      {permissionDenied && (
        <div className="p-2.5 border border-[#A63D24] bg-[#FDF3F1] text-xs text-[#A63D24] rounded-xs">
          <strong>{t('voiceDenied')}</strong>
          <p className="mt-1 text-[11px] text-[#525950]">
            Microphone permissions can be allowed in your browser address bar settings or site permissions.
            Text input remains fully available.
          </p>
        </div>
      )}

      {/* Unsupported Browser Notice */}
      {!isSupported && (
        <div className="p-2 border border-[#D3CEBE] bg-[#EAE6DC] text-xs text-[#525950] rounded-xs">
          {t('voiceUnsupported')}
        </div>
      )}

      {/* Active Voice Box & Editable Transcript */}
      {showVoiceBox && (
        <div className="p-3 border border-[#00796B] bg-[#FAF8F5] rounded-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#00796B]">
              {isListening ? `🎙️ ${t('voiceListening')}` : t('voiceEditableTranscript')}
            </span>
            <button
              type="button"
              onClick={() => setShowVoiceBox(false)}
              className="text-xs text-[#525950] hover:text-[#1D2926] cursor-pointer"
            >
              × {t('cancel')}
            </button>
          </div>

          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            rows={3}
            placeholder="Voice transcript will appear here. You can edit or append manually before using..."
            className="w-full text-xs p-2 border border-[#D3CEBE] rounded-xs bg-[#FFFFFF] text-[#1D2926] focus-visible:outline-2 focus-visible:outline-[#00796B]"
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] text-[#727A6F]">
              {t('voiceCloudNotice')}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTranscript('')}
                disabled={!transcript}
              >
                Clear
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleApply}
                disabled={!transcript.trim()}
              >
                {t('voiceApplyTranscript')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
