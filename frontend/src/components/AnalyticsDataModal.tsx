'use client';

import React from 'react';
import { X, Info, Shield } from 'lucide-react';

interface AnalyticsDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmDisable: () => void;
}

export default function AnalyticsDataModal({ isOpen, onClose, onConfirmDisable }: AnalyticsDataModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">O que a análise de uso coleta</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Privacy Notice */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-green-800">
                <p className="font-semibold mb-1">Sua privacidade está protegida</p>
                <p>A análise de uso vem desativada por padrão. Se você ativá-la, coletamos <strong>apenas dados anônimos de uso</strong>. Nenhum conteúdo de reunião, nome, caminho de arquivo ou informação pessoal é coletado.</p>
              </div>
            </div>
          </div>

          {/* Data Categories */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Dados coletados quando ativada:</h3>

            {/* Model Preferences */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">1. Preferências de modelo</h4>
              <ul className="text-sm text-gray-700 space-y-1 ml-4">
                <li>• Modelo de transcrição (ex.: "Whisper large-v3", "Parakeet")</li>
                <li>• Modelo de resumo (ex.: "Llama 3.2", "Claude Sonnet")</li>
                <li>• Provedor do modelo (ex.: "Local", "Ollama", "OpenRouter")</li>
              </ul>
              <p className="text-xs text-gray-500 mt-2 italic">Ajuda a entender quais modelos os usuários preferem</p>
            </div>

            {/* Meeting Metrics */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">2. Métricas anônimas de reuniões</h4>
              <ul className="text-sm text-gray-700 space-y-1 ml-4">
                <li>• Duração da gravação (ex.: "125 segundos")</li>
                <li>• Duração das pausas (ex.: "5 segundos")</li>
                <li>• Número de segmentos da transcrição</li>
                <li>• Número de trechos de áudio processados</li>
              </ul>
              <p className="text-xs text-gray-500 mt-2 italic">Ajuda a otimizar o desempenho e entender padrões de uso</p>
            </div>

            {/* Device Types */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">3. Tipos de dispositivo (não os nomes)</h4>
              <ul className="text-sm text-gray-700 space-y-1 ml-4">
                <li>• Tipo de microfone: "Bluetooth", "com fio" ou "desconhecido"</li>
                <li>• Tipo de áudio do sistema: "Bluetooth", "com fio" ou "desconhecido"</li>
              </ul>
              <p className="text-xs text-gray-500 mt-2 italic">Ajuda a melhorar a compatibilidade; NÃO coletamos os nomes reais dos dispositivos</p>
            </div>

            {/* Usage Patterns */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">4. Padrões de uso do app</h4>
              <ul className="text-sm text-gray-700 space-y-1 ml-4">
                <li>• Eventos de abertura/fechamento do app</li>
                <li>• Duração da sessão</li>
                <li>• Uso de recursos (ex.: "configurações alteradas")</li>
                <li>• Ocorrências de erros (ajuda a corrigir bugs)</li>
              </ul>
              <p className="text-xs text-gray-500 mt-2 italic">Ajuda a melhorar a experiência do usuário</p>
            </div>

            {/* Platform Info */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">5. Informações da plataforma</h4>
              <ul className="text-sm text-gray-700 space-y-1 ml-4">
                <li>• Sistema operacional (ex.: "macOS", "Windows")</li>
                <li>• Versão do app (incluída automaticamente em todos os eventos)</li>
                <li>• Arquitetura (ex.: "x86_64", "aarch64")</li>
              </ul>
              <p className="text-xs text-gray-500 mt-2 italic">Ajuda a priorizar o suporte às plataformas</p>
            </div>
          </div>

          {/* What We DON'T Collect */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-semibold text-red-900 mb-2">O que NÃO coletamos:</h4>
            <ul className="text-sm text-red-800 space-y-1 ml-4">
              <li>• ❌ Nomes ou títulos de reuniões</li>
              <li>• ❌ Nomes de arquivos, caminhos de arquivos ou pastas de reuniões</li>
              <li>• ❌ Transcrições ou conteúdo de reuniões</li>
              <li>• ❌ Gravações de áudio</li>
              <li>• ❌ Nomes de dispositivos (apenas tipos: Bluetooth/com fio)</li>
              <li>• ❌ Informações pessoais</li>
              <li>• ❌ Qualquer dado identificável</li>
            </ul>
          </div>

          {/* Example Event */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Exemplo de evento:</h4>
            <pre className="text-xs text-gray-700 overflow-x-auto">
              {`{
  "event": "meeting_ended",
  "app_version": "0.4.1",
  "transcription_provider": "parakeet",
  "transcription_model": "parakeet-tdt-0.6b-v3-int8",
  "summary_provider": "ollama",
  "summary_model": "llama3.2:latest",
  "total_duration_seconds": "125.5",
  "microphone_device_type": "Wired",
  "system_audio_device_type": "Bluetooth",
  "chunks_processed": "150",
  "had_fatal_error": "false"
}`}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-4 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Manter análise de uso ativada
          </button>
          <button
            onClick={onConfirmDisable}
            className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
          >
            Confirmar: desativar análise de uso
          </button>
        </div>
      </div>
    </div>
  );
}
