import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { Cloud, Eye, EyeOff } from 'lucide-react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import {
  GROQ_KEYS_URL,
  GROQ_PROVIDER,
  getFinalTranscriptionSettings,
  saveFinalTranscriptionSettings,
} from '@/lib/finalTranscription';

/**
 * "Transcrição final" settings: after each meeting, re-transcribe the recording with
 * Groq (Whisper large-v3) and summarize that instead of the live transcript.
 */
export function FinalTranscriptionSettings() {
  const [enabled, setEnabled] = useState(false);
  const [vocabulary, setVocabulary] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [newApiKey, setNewApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    getFinalTranscriptionSettings()
      .then((settings) => {
        setEnabled(settings.finalProvider === GROQ_PROVIDER);
        setVocabulary(settings.vocabulary ?? '');
        setHasApiKey(settings.hasApiKey);
      })
      .catch((error) => console.error('Failed to load final transcription settings:', error))
      .finally(() => setIsLoaded(true));
  }, []);

  const save = async (nextEnabled: boolean) => {
    const keyToSave = newApiKey.trim();
    if (nextEnabled && !hasApiKey && !keyToSave) {
      toast.error('Cole a chave da Groq para ligar a transcrição final.');
      return;
    }
    setIsSaving(true);
    try {
      await saveFinalTranscriptionSettings({
        finalProvider: nextEnabled ? GROQ_PROVIDER : null,
        vocabulary: vocabulary.trim() || null,
        apiKey: keyToSave || null,
      });
      setEnabled(nextEnabled);
      if (keyToSave) {
        setHasApiKey(true);
        setNewApiKey('');
      }
      toast.success('Transcrição final salva');
    } catch (error) {
      toast.error('Não foi possível salvar', { description: String(error) });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isLoaded) return null;

  return (
    <div className="mt-6 border-t pt-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Cloud className="h-4 w-4" />
            Transcrição final (depois da reunião)
          </h4>
          <p className="mt-1 text-xs text-gray-600">
            Ao terminar, o Brifador refaz a transcrição da gravação na Groq (Whisper large-v3), bem
            mais precisa que a ao vivo, e é ela que vai para o resumo. Sem internet, usa a ao vivo.
          </p>
        </div>
        <Switch
          checked={enabled}
          disabled={isSaving}
          onCheckedChange={(checked) => void save(checked)}
          aria-label="Ligar transcrição final pela Groq"
        />
      </div>

      <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-800">
        O áudio da reunião é enviado para a Groq (EUA) para ser transcrito. Avise os participantes.
      </p>

      <div>
        <Label className="mb-1 block text-sm font-medium text-gray-700">Chave da Groq</Label>
        <div className="relative mx-1">
          <Input
            type={showApiKey ? 'text' : 'password'}
            value={newApiKey}
            onChange={(e) => setNewApiKey(e.target.value)}
            placeholder={hasApiKey ? 'Chave salva (cole outra para trocar)' : 'gsk_...'}
            className="pr-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute inset-y-0 right-0"
            onClick={() => setShowApiKey(!showApiKey)}
          >
            {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
        <button
          type="button"
          className="mx-1 mt-1 text-xs text-blue-600 hover:underline"
          onClick={() => invoke('open_external_url', { url: GROQ_KEYS_URL })}
        >
          Criar uma chave grátis na Groq
        </button>
      </div>

      <div>
        <Label className="mb-1 block text-sm font-medium text-gray-700">
          Vocabulário (opcional)
        </Label>
        <Textarea
          value={vocabulary}
          onChange={(e) => setVocabulary(e.target.value)}
          placeholder="Nomes e termos que aparecem nas reuniões, um por linha ou separados por vírgula"
          rows={3}
          className="mx-1"
        />
      </div>

      <div className="flex justify-end">
        <Button type="button" size="sm" disabled={isSaving} onClick={() => void save(enabled)}>
          Salvar
        </Button>
      </div>
    </div>
  );
}
