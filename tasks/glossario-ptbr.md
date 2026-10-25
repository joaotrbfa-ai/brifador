# Glossário pt-BR da interface

Use sempre estes termos. Tom: direto, segunda pessoa implícita ("Inicie a gravação", não "Por favor, inicie").
Capitalização de frase em botões e títulos ("Iniciar gravação", não "Iniciar Gravação").

| Inglês | pt-BR |
|---|---|
| meeting | reunião |
| meeting notes | notas da reunião |
| note | nota |
| transcript | transcrição |
| transcribe / transcription | transcrever / transcrição |
| retranscribe | transcrever novamente |
| summary / summarize | resumo / resumir |
| generate summary | gerar resumo |
| regenerate | gerar novamente |
| recording / record | gravação / gravar |
| start recording / stop recording | iniciar gravação / parar gravação |
| pause / resume | pausar / retomar |
| microphone / mic | microfone |
| system audio | áudio do sistema |
| device | dispositivo |
| settings | configurações |
| preferences | preferências |
| model (AI) | modelo |
| template (summary template) | template |
| download / downloading | baixar / baixando |
| import / export | importar / exportar |
| speaker | participante |
| language | idioma |
| permission | permissão |
| storage / folder | armazenamento / pasta |
| beta feature | recurso beta |
| update / update available | atualização / atualização disponível |
| copy / copied | copiar / copiado |
| delete / are you sure? | excluir / tem certeza? |
| cancel / save / confirm / close | cancelar / salvar / confirmar / fechar |
| loading... | carregando... |
| error / failed to X | erro / não foi possível X |
| API key | chave de API |
| provider | provedor |
| onboarding / get started | primeiros passos / começar |
| auto (idioma/detecção) | automático |
| new meeting (título padrão) | Nova reunião |

## Marca
- Texto visível "Meetily" → "Brifador". Exceção: créditos (tela Sobre) continuam dizendo que o Brifador é baseado no Meetily.
- NÃO mudar identificadores, nomes de arquivo, chaves de store, nomes de evento, URLs, `productName`/`identifier` do Tauri.

## Não traduzir
- Nomes próprios: Whisper, Parakeet, Ollama, Groq, OpenAI, Claude, OpenRouter, CUDA, Vulkan, Metal, Hugging Face.
- Strings que não aparecem para o usuário: `console.log`, `log::*`, nomes de evento, chaves de objeto, valores comparados em código (`=== 'error'`), classes CSS.
- Prompts enviados ao LLM e templates de resumo (ficam para a Fase 2).
