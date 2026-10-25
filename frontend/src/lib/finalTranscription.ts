import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

/**
 * Final transcription: after the meeting, the saved recording is re-transcribed in the
 * cloud (Groq, Whisper large-v3) and the result replaces the live transcript before the
 * summary is generated. The API key stays in Rust; the UI only knows whether it exists.
 */
export const GROQ_PROVIDER = 'groq';
export const GROQ_MODEL = 'whisper-large-v3';
export const GROQ_KEYS_URL = 'https://console.groq.com/keys';

export interface FinalTranscriptionSettings {
  finalProvider: string | null;
  vocabulary: string | null;
  hasApiKey: boolean;
}

export async function getFinalTranscriptionSettings(): Promise<FinalTranscriptionSettings> {
  return invoke<FinalTranscriptionSettings>('api_get_final_transcription_settings');
}

export async function saveFinalTranscriptionSettings(args: {
  finalProvider: string | null;
  vocabulary: string | null;
  apiKey?: string | null;
}): Promise<void> {
  await invoke('api_save_final_transcription_settings', {
    finalProvider: args.finalProvider,
    vocabulary: args.vocabulary,
    apiKey: args.apiKey ?? null,
  });
}

interface RetranscriptionProgressEvent {
  meeting_id: string;
  stage: string;
  progress_percentage: number;
  message: string;
}

/** Run the Groq pass once and resolve when the backend reports completion. */
function runOnce(
  meetingId: string,
  meetingFolderPath: string,
  onProgress: (percentage: number, message: string) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const unlisteners: Array<() => void> = [];
    const cleanup = () => unlisteners.forEach((unlisten) => unlisten());

    Promise.all([
      listen<RetranscriptionProgressEvent>('retranscription-progress', (event) => {
        if (event.payload.meeting_id === meetingId) {
          onProgress(event.payload.progress_percentage, event.payload.message);
        }
      }),
      listen<{ meeting_id: string }>('retranscription-complete', (event) => {
        if (event.payload.meeting_id === meetingId) {
          cleanup();
          resolve();
        }
      }),
      listen<{ meeting_id: string; error: string }>('retranscription-error', (event) => {
        if (event.payload.meeting_id === meetingId) {
          cleanup();
          reject(new Error(event.payload.error));
        }
      }),
    ])
      .then((fns) => {
        unlisteners.push(...fns);
        return invoke('start_retranscription_command', {
          meetingId,
          meetingFolderPath,
          language: 'pt',
          model: GROQ_MODEL,
          provider: GROQ_PROVIDER,
        });
      })
      .catch((error) => {
        cleanup();
        reject(error instanceof Error ? error : new Error(String(error)));
      });
  });
}

/**
 * Re-transcribe a finished meeting with Groq, replacing the live transcript.
 * The recording may still be closing right after Stop, so a missing audio file is
 * retried a few times before giving up.
 */
export async function runGroqFinalTranscription(
  meetingId: string,
  meetingFolderPath: string,
  onProgress: (percentage: number, message: string) => void,
): Promise<void> {
  const maxAttempts = 4;
  for (let attempt = 1; ; attempt++) {
    try {
      await runOnce(meetingId, meetingFolderPath, onProgress);
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (attempt >= maxAttempts || !/no audio file found/i.test(message)) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
}

/**
 * Language preselected in the import/retranscribe dialogs. Brifador is for Portuguese
 * speakers, and forcing the language is more accurate than detecting it, so "auto"
 * falls back to Portuguese there.
 */
export function defaultBatchLanguage(selectedLanguage: string | null | undefined): string {
  if (!selectedLanguage || selectedLanguage === 'auto' || selectedLanguage === 'auto-translate') {
    return 'pt';
  }
  return selectedLanguage;
}

/** True when meetings should get the Groq pass automatically. */
export async function isGroqFinalTranscriptionEnabled(): Promise<boolean> {
  try {
    const settings = await getFinalTranscriptionSettings();
    return settings.finalProvider === GROQ_PROVIDER && settings.hasApiKey;
  } catch (error) {
    console.error('Failed to load final transcription settings:', error);
    return false;
  }
}
