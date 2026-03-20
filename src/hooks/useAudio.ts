/**
 * RestEasy — useAudio Hook
 * Manages audio playback state for guided exercises.
 */
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { playAudio, stopAudio, pauseAudio, resumeAudio, getAudioKey, AudioKey } from '../lib/audio';

type AudioState = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

interface UseAudioReturn {
  state: AudioState;
  play: (type: string) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  stop: () => Promise<void>;
  isPlaying: boolean;
  isLoading: boolean;
}

export function useAudio(): UseAudioReturn {
  const { i18n } = useTranslation();
  const [state, setState] = useState<AudioState>('idle');

  useEffect(() => {
    return () => {
      stopAudio().catch(() => {});
    };
  }, []);

  const play = useCallback(async (type: string) => {
    setState('loading');
    try {
      const key: AudioKey = getAudioKey(type, i18n.language);
      await playAudio(key);
      setState('playing');
    } catch {
      setState('error');
    }
  }, [i18n.language]);

  const pause = useCallback(async () => {
    await pauseAudio();
    setState('paused');
  }, []);

  const resume = useCallback(async () => {
    await resumeAudio();
    setState('playing');
  }, []);

  const stop = useCallback(async () => {
    await stopAudio();
    setState('idle');
  }, []);

  return {
    state,
    play,
    pause,
    resume,
    stop,
    isPlaying: state === 'playing',
    isLoading: state === 'loading',
  };
}
