import React, { useState, useEffect } from 'react';
import { Globe } from 'lucide-react';
import Analytics from '@/lib/analytics';
import { toast } from 'sonner';
import { useConfig } from '@/contexts/ConfigContext';

export interface Language {
  code: string;
  name: string;
}

// ISO 639-1 language codes supported by Whisper
const LANGUAGES: Language[] = [
  { code: 'auto', name: 'Detectar automaticamente (idioma original)' },
  { code: 'auto-translate', name: 'Detectar automaticamente (traduzir para inglês)' },
  { code: 'en', name: 'Inglês' },
  { code: 'zh', name: 'Chinês' },
  { code: 'de', name: 'Alemão' },
  { code: 'es', name: 'Espanhol' },
  { code: 'ru', name: 'Russo' },
  { code: 'ko', name: 'Coreano' },
  { code: 'fr', name: 'Francês' },
  { code: 'ja', name: 'Japonês' },
  { code: 'pt', name: 'Português' },
  { code: 'tr', name: 'Turco' },
  { code: 'pl', name: 'Polonês' },
  { code: 'ca', name: 'Catalão' },
  { code: 'nl', name: 'Holandês' },
  { code: 'ar', name: 'Árabe' },
  { code: 'sv', name: 'Sueco' },
  { code: 'it', name: 'Italiano' },
  { code: 'id', name: 'Indonésio' },
  { code: 'hi', name: 'Hindi' },
  { code: 'fi', name: 'Finlandês' },
  { code: 'vi', name: 'Vietnamita' },
  { code: 'he', name: 'Hebraico' },
  { code: 'uk', name: 'Ucraniano' },
  { code: 'el', name: 'Grego' },
  { code: 'ms', name: 'Malaio' },
  { code: 'cs', name: 'Tcheco' },
  { code: 'ro', name: 'Romeno' },
  { code: 'da', name: 'Dinamarquês' },
  { code: 'hu', name: 'Húngaro' },
  { code: 'ta', name: 'Tâmil' },
  { code: 'no', name: 'Norueguês' },
  { code: 'th', name: 'Tailandês' },
  { code: 'ur', name: 'Urdu' },
  { code: 'hr', name: 'Croata' },
  { code: 'bg', name: 'Búlgaro' },
  { code: 'lt', name: 'Lituano' },
  { code: 'la', name: 'Latim' },
  { code: 'mi', name: 'Maori' },
  { code: 'ml', name: 'Malaiala' },
  { code: 'cy', name: 'Galês' },
  { code: 'sk', name: 'Eslovaco' },
  { code: 'te', name: 'Telugo' },
  { code: 'fa', name: 'Persa' },
  { code: 'lv', name: 'Letão' },
  { code: 'bn', name: 'Bengali' },
  { code: 'sr', name: 'Sérvio' },
  { code: 'az', name: 'Azeri' },
  { code: 'sl', name: 'Esloveno' },
  { code: 'kn', name: 'Canarês' },
  { code: 'et', name: 'Estoniano' },
  { code: 'mk', name: 'Macedônio' },
  { code: 'br', name: 'Bretão' },
  { code: 'eu', name: 'Basco' },
  { code: 'is', name: 'Islandês' },
  { code: 'hy', name: 'Armênio' },
  { code: 'ne', name: 'Nepalês' },
  { code: 'mn', name: 'Mongol' },
  { code: 'bs', name: 'Bósnio' },
  { code: 'kk', name: 'Cazaque' },
  { code: 'sq', name: 'Albanês' },
  { code: 'sw', name: 'Suaíli' },
  { code: 'gl', name: 'Galego' },
  { code: 'mr', name: 'Marata' },
  { code: 'pa', name: 'Punjabi' },
  { code: 'si', name: 'Cingalês' },
  { code: 'km', name: 'Khmer' },
  { code: 'sn', name: 'Shona' },
  { code: 'yo', name: 'Iorubá' },
  { code: 'so', name: 'Somali' },
  { code: 'af', name: 'Africâner' },
  { code: 'oc', name: 'Occitano' },
  { code: 'ka', name: 'Georgiano' },
  { code: 'be', name: 'Bielorrusso' },
  { code: 'tg', name: 'Tadjique' },
  { code: 'sd', name: 'Sindi' },
  { code: 'gu', name: 'Guzerate' },
  { code: 'am', name: 'Amárico' },
  { code: 'yi', name: 'Iídiche' },
  { code: 'lo', name: 'Laosiano' },
  { code: 'uz', name: 'Uzbeque' },
  { code: 'fo', name: 'Feroês' },
  { code: 'ht', name: 'Crioulo haitiano' },
  { code: 'ps', name: 'Pachto' },
  { code: 'tk', name: 'Turcomeno' },
  { code: 'nn', name: 'Nynorsk norueguês' },
  { code: 'mt', name: 'Maltês' },
  { code: 'sa', name: 'Sânscrito' },
  { code: 'lb', name: 'Luxemburguês' },
  { code: 'my', name: 'Birmanês' },
  { code: 'bo', name: 'Tibetano' },
  { code: 'tl', name: 'Tagalo' },
  { code: 'mg', name: 'Malgaxe' },
  { code: 'as', name: 'Assamês' },
  { code: 'tt', name: 'Tártaro' },
  { code: 'haw', name: 'Havaiano' },
  { code: 'ln', name: 'Lingala' },
  { code: 'ha', name: 'Hauçá' },
  { code: 'ba', name: 'Basquir' },
  { code: 'jw', name: 'Javanês' },
  { code: 'su', name: 'Sundanês' },
];

interface LanguageSelectionProps {
  selectedLanguage: string;
  onLanguageChange: (language: string) => void;
  disabled?: boolean;
  provider?: 'localWhisper' | 'parakeet' | 'deepgram' | 'elevenLabs' | 'groq' | 'openai';
}

export function LanguageSelection({
  selectedLanguage,
  onLanguageChange,
  disabled = false,
  provider = 'localWhisper'
}: LanguageSelectionProps) {
  const [saving, setSaving] = useState(false);
  const { setSelectedLanguage } = useConfig();

  // Parakeet only supports auto-detection (doesn't support manual language selection)
  const isParakeet = provider === 'parakeet';
  const availableLanguages = isParakeet
    ? LANGUAGES.filter(lang => lang.code === 'auto' || lang.code === 'auto-translate')
    : LANGUAGES;

  const handleLanguageChange = async (languageCode: string) => {
    setSaving(true);
    try {
      // Save language preference to localStorage and sync to backend
      setSelectedLanguage(languageCode);
      onLanguageChange(languageCode);
      console.log('Language preference saved:', languageCode);

      // Track language selection analytics
      const selectedLang = LANGUAGES.find(lang => lang.code === languageCode);
      await Analytics.track('language_selected', {
        language_code: languageCode,
        language_name: selectedLang?.name || 'Desconhecido',
        is_auto_detect: (languageCode === 'auto').toString(),
        is_auto_translate: (languageCode === 'auto-translate').toString()
      });

      // Show success toast
      const languageName = selectedLang?.name || languageCode;
      toast.success("Preferência de idioma salva", {
        description: `Idioma da transcrição definido como ${languageName}`
      });
    } catch (error) {
      console.error('Failed to save language preference:', error);
      toast.error("Não foi possível salvar a preferência de idioma", {
        description: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setSaving(false);
    }
  };

  // Find the selected language name for display
  const selectedLanguageName = LANGUAGES.find(
    lang => lang.code === selectedLanguage
  )?.name || 'Detectar automaticamente (idioma original)';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-gray-600" />
          <h4 className="text-sm font-medium text-gray-900">Idioma da transcrição</h4>
        </div>
      </div>

      <div className="space-y-2">
        <select
          value={selectedLanguage}
          onChange={(e) => handleLanguageChange(e.target.value)}
          disabled={disabled || saving}
          className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
        >
          {availableLanguages.map((language) => (
            <option key={language.code} value={language.code}>
              {language.name}
              {language.code !== 'auto' && language.code !== 'auto-translate' && ` (${language.code})`}
            </option>
          ))}
        </select>

        {/* Parakeet language limitation warning */}
        {isParakeet && (
          <div className="p-2 bg-amber-50 border border-amber-200 rounded text-amber-800">
            <p className="font-medium">ℹ️ Suporte a idiomas do Parakeet</p>
            <p className="mt-1 text-xs">No momento, o Parakeet só oferece detecção automática de idioma. A seleção manual não está disponível. Use o Whisper se precisar definir um idioma específico.</p>
          </div>
        )}

        {/* Info text */}
        <div className="text-xs space-y-2 pt-2">
          <p className="text-gray-600">
            <strong>Atual:</strong> {selectedLanguageName}
          </p>
          {selectedLanguage === 'auto' && (
            <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800">
              <p className="font-medium">⚠️ A detecção automática pode gerar resultados incorretos</p>
              <p className="mt-1">Para maior precisão, selecione o seu idioma (ex.: português, inglês, espanhol etc.)</p>
            </div>
          )}
          {selectedLanguage === 'auto-translate' && (
            <div className="p-2 bg-blue-50 border border-blue-200 rounded text-blue-800">
              <p className="font-medium">🌐 Modo de tradução ativo</p>
              <p className="mt-1">Todo o áudio será traduzido automaticamente para o inglês. Ideal para reuniões multilíngues em que você precisa do resultado em inglês.</p>
            </div>
          )}
          {selectedLanguage !== 'auto' && selectedLanguage !== 'auto-translate' && (
            <p className="text-gray-600">
              A transcrição será otimizada para <strong>{selectedLanguageName}</strong>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
