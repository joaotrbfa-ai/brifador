export interface LanguageOption {
  code: string;
  label: string;
}

/**
 * Language options offered in the summary language pickers.
 * Codes must stay in sync with `language_name_from_code` in
 * `frontend/src-tauri/src/summary/processor.rs`.
 */
export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'en', label: 'Inglês' },
  { code: 'zh', label: 'Chinês' },
  { code: 'zh-tw', label: 'Chinês tradicional' },
  { code: 'de', label: 'Alemão' },
  { code: 'es', label: 'Espanhol' },
  { code: 'ru', label: 'Russo' },
  { code: 'ko', label: 'Coreano' },
  { code: 'fr', label: 'Francês' },
  { code: 'ja', label: 'Japonês' },
  { code: 'pt', label: 'Português' },
  { code: 'it', label: 'Italiano' },
  { code: 'nl', label: 'Holandês' },
  { code: 'pl', label: 'Polonês' },
  { code: 'ar', label: 'Árabe' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ta', label: 'Tâmil' },
  { code: 'tr', label: 'Turco' },
  { code: 'vi', label: 'Vietnamita' },
  { code: 'th', label: 'Tailandês' },
  { code: 'id', label: 'Indonésio' },
  { code: 'sv', label: 'Sueco' },
  { code: 'cs', label: 'Tcheco' },
  { code: 'da', label: 'Dinamarquês' },
  { code: 'fi', label: 'Finlandês' },
  { code: 'el', label: 'Grego' },
  { code: 'he', label: 'Hebraico' },
  { code: 'hu', label: 'Húngaro' },
  { code: 'no', label: 'Norueguês' },
  { code: 'ro', label: 'Romeno' },
  { code: 'uk', label: 'Ucraniano' },
];

export const AUTO_VALUE = '__auto__' as const;

const SUPPORTED_CODES: ReadonlySet<string> = new Set(LANGUAGE_OPTIONS.map((o) => o.code));

/**
 * Normalises a raw locale string (from transcription or storage) into a code we
 * can translate into. Handles BCP-47 regional tags: `pt-BR` -> `pt`, `en_GB` -> `en`.
 * Returns null for unsupported languages so callers can fall back to English
 * rather than sending a code Rust will silently drop.
 */
export function normaliseLanguageCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const lower = raw.toLowerCase().replace(/_/g, '-');
  if (SUPPORTED_CODES.has(lower)) return lower;
  const base = lower.split('-')[0];
  if (SUPPORTED_CODES.has(base)) return base;
  return null;
}

export function labelForCode(code: string): string {
  return LANGUAGE_OPTIONS.find((l) => l.code === code)?.label ?? code;
}
