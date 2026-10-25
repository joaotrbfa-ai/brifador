# Brifador — Plano

Transcritor de reuniões estilo Granola: sem bot na call, captura mic + áudio do sistema,
você anota por cima e a IA gera a nota final mesclando suas anotações com a transcrição.

## Decisões travadas

| Tema | Decisão | Por quê |
|---|---|---|
| Público | Uso próprio + alunos, grátis | Sem contas, sem backend, sem cobrança |
| Custo | **Zero para mim e para o aluno** | Nada de API paga por padrão; nenhum servidor meu |
| Plataformas | Windows + macOS | — |
| Base | **Fork do Meetily** (MIT, Tauri + Rust + Next.js, ~32k ⭐, v0.4.1 em 2026-09) | Captura WASAPI/ScreenCaptureKit, Whisper/Parakeet e Ollama já prontos |
| STT | Local por padrão (Parakeet v3 / Whisper turbo); BYOK opcional (free tier: Groq) | Grátis e privado; BYOK para PC fraco |
| LLM | Ollama local por padrão; BYOK opcional (Gemini/Groq free tier, Claude/OpenAI pagos se o aluno quiser) | Meetily já suporta OpenAI-compatible |
| Speakers | MVP: "Eu" (canal do mic) vs "Eles" (canal do sistema), igual ao Granola | Grátis e trivial, já que os canais são separados |

## Fase 0 — Fork e reconhecimento
- [x] Fork → https://github.com/joaotrbfa-ai/brifador (remote `upstream` = Meetily); repo em `C:\dev\brifador`
- [x] README próprio em pt-BR com crédito ao Meetily; original em `docs/README.meetily.md`
- [ ] Build local no Windows (modo CPU) e rodar uma reunião de teste
- [ ] Ler `CLAUDE.md` do upstream e mapear `frontend/src-tauri/src/{audio,whisper,summary,...}`
- [ ] Decidir se o `backend/` Python continua ou se fica tudo no Tauri (preferência: só Tauri, um instalador)
- [x] Telemetria removida: `posthog-rs` fora do Cargo, `AnalyticsClient` vira no-op, switch de consentimento removido da UI, `lib_old_complex.rs` (morto) apagado
- [x] Parakeet v3 agora baixa do Hugging Face (`istupakov/...-onnx`, commit `8f23f0c` fixado) — falta testar o download no app

### Ambiente de build (Windows) — pegadinhas
- pnpm: usar `npx pnpm@10.18.0` (o pnpm 12 do winget ignora `pnpm.overrides` e quebra o lockfile v9)
- `LIBCLANG_PATH=C:\Program Files\LLVM\bin` (bindgen do whisper-rs)
- LLVM **18** (não 23): o bindgen 0.69 do whisper-rs-sys gera `whisper_full_params` opaca com LLVM 23. `WHISPER_DONT_GENERATE_BINDINGS=1` NÃO resolve no Windows (bindings do crate foram gerados no Linux, `long` = 8 bytes → falha de layout). Depois de trocar o LLVM: `cargo clean -p whisper-rs-sys`
- `CMAKE_POLICY_VERSION_MINIMUM=3.5` (CMake 4.x vs `cmake_minimum_required` antigo do whisper.cpp)
- Antes do app: `cd llama-helper && cargo build --release` e copiar `target/release/llama-helper.exe` → `frontend/src-tauri/binaries/llama-helper-x86_64-pc-windows-msvc.exe` (sidecar do Tauri)
- Modo dev: a primeira abertura de cada página compila sob demanda (/meeting-details levou 65 s). Navegar antes de terminar quebra o router ("async/await is not yet supported in Client Components"). Espere o "✓ Compiled" no terminal e dê Ctrl+R. Não afeta o instalador.
- GPU: MX150 (2 GB) → `TAURI_GPU_FEATURE=none` (CPU); 20 GB RAM
- PowerShell: `$env:VAR=''` **apaga** a variável (não define vazia). O Tauri então pede senha da chave de assinatura e trava sem `.sig`. No bash use `export VAR=` e redirecione `< /dev/null`

## Fase 1 — Validar qualidade em pt-BR (antes de customizar qualquer coisa)
- [ ] Gravar 3 áudios reais (aula, call 1:1, call com ruído), ~10 min cada
- [ ] Comparar Parakeet v3 × Whisper large-v3-turbo × Groq Whisper (BYOK): WER aproximado, velocidade, CPU/GPU
- [ ] Definir o modelo padrão por perfil de máquina (sem GPU / com GPU / Apple Silicon)
- [ ] Testar modelos Ollama para resumo em pt-BR (ex.: Qwen, Gemma, Llama na faixa 4–8B) e anotar qualidade × RAM

## Fase 1.5 — Qualidade da transcrição + Claude no resumo (2026-10-25)
Diagnóstico: ao vivo, o Parakeet recebe trechos de ~3 s sem contexto (frases picotadas) e o áudio chega
abafado por um reamostrador 48→16 kHz tosco (`audio/vad.rs`). Decisão: **transcrição final sempre pela
Groq** (whisper-large-v3, free tier, chave própria); ao vivo continua local só para acompanhar.
- [ ] Fase 0 (autor): validar a Groq no Playground com o `audio.mp4` de uma chamada real
- [ ] `audio/groq_transcription.rs`: blocos ≤ 10 min cortados em pausas do VAD, WAV 16 kHz, `verbose_json`, filtro de alucinação, retry 429/5xx
- [ ] Provedor `groq` em "Aprimorar" (`retranscription.rs`) e "Importar" (`import.rs`)
- [ ] Configuração: chave (coluna `groqApiKey`), liga/desliga e vocabulário; aviso de que o áudio vai para a Groq
- [ ] Ao parar a gravação: Groq automática → recarrega transcrição → resumo (falhou → resume a ao vivo)
- [ ] Formatos do celular: fallback para ffmpeg (WhatsApp `.ogg` Opus, iPhone sem perdas, `.opus`/`.amr`/`.3gp`/`.caf`)
- [ ] Claude: API `2026-10-21`, `max_tokens` 16000, fallback de recusa, `stop_reason`, retry, modelos `claude-opus-5-5`/`claude-sonnet-5-5`/`claude-haiku-5-5`
- [ ] Prompt do resumo: avisar que a transcrição automática tem erros
- [ ] Ao vivo: reamostrador rubato no VAD; Whisper no Windows com `temperature` 0.0

## Fase 2 — O diferencial Granola: notas do usuário + IA
- [ ] Editor de notas durante a reunião (com timestamp de cada linha)
- [ ] Prompt de "enhance": as notas do usuário guiam o que importa na transcrição
- [ ] Templates em pt-BR (aula, 1:1, reunião de cliente, mentoria)
- [ ] Labels "Eu"/"Eles" a partir dos canais separados
- [x] UI traduzida para pt-BR (4 agentes + glossário em `tasks/glossario-ptbr.md`)
- [x] Prompts e templates de resumo em pt-BR; língua base do resumo = pt-BR (tradução só se o usuário escolher outro idioma)

## Fase 3 — Modo BYOK (opcional)
- [ ] Tela de configurações: provedor + chave, guardada no keychain do SO (não em texto puro)
- [ ] STT via API OpenAI-compatible (Groq) e LLM via Gemini/Groq/OpenAI-compatible
- [ ] Avisar com clareza que o áudio sai da máquina nesse modo

## Fase 4 — Distribuição grátis para alunos
- [x] GitHub Releases + auto-update do Tauri (workflow `release-brifador.yml` criado; build local validado com `.sig`; falta rodar o workflow no GitHub)
- [ ] Windows: aplicar no SignPath Foundation (assinatura grátis para OSS) — senão o SmartScreen avisa
- [ ] macOS: sem Apple Developer ($99/ano) o app sai sem notarização → tutorial "abrir mesmo assim"; reavaliar depois
- [ ] Onboarding: permissões de mic/áudio do sistema, download do modelo, aviso de consentimento ("avise os participantes que está gravando" — LGPD)
- [x] Guia de instalação curto para alunos (PT) — `docs/INSTALACAO.md`

## Depois (backlog)
- [ ] Diarização real local (sherpa-onnx speaker diarization, sem token HF) para separar várias pessoas em "Eles"
- [ ] Integração com calendário (Google) para auto-nomear reuniões
- [ ] Chat com as reuniões (perguntar sobre reuniões passadas)
- [ ] Exportar para Notion/Markdown

## Riscos
- Meetily tem 200+ issues abertas; o fork herda bugs. Manter o upstream como remote e puxar correções.
- Diarização está marcada como "PRO / em breve" no upstream; não conte com ela vindo pronta.
- PCs fracos dos alunos: Whisper/Parakeet + LLM local ao mesmo tempo pode não caber em 8 GB de RAM → resumo só depois da reunião, e BYOK como saída.

## Pendências conhecidas
- [ ] Textos vindos do Rust ainda em inglês (descrições de modelos, progresso/erros da retranscrição)
- [ ] Testes VAD falham localmente: `cargo test` carrega `onnxruntime.dll` 1.17 do Windows em vez da 1.22 do projeto (copiar a DLL para `target/debug/deps` antes dos testes). Não afeta o app.
- [x] Teste ponta a ponta (2026-10-24, notebook MX150 / 20 GB, CPU): Parakeet baixou do HF (639,6 MB, verificado); captura WASAPI mic + loopback OK; transcrição pt-BR boa (erros em palavras raras: ourives, faraós, artesãos); ~3 s por trecho; resumo qwen3.5:4b em 4m12s, caminho direto pt-BR (sem tradução); título gerado em pt-BR
- [x] Microfone: o do PC do autor não funciona (não é bug do app). O autor faz reuniões pelo CELULAR → ver "Reuniões no celular"
- [x] Modo dev documentado (ver "Ambiente de build"): clicar numa página que ainda está compilando quebra o router do Next ("async/await is not yet supported in Client Components"); não afeta build de produção, mas vale avisar no guia de dev
- [x] Todos os downloads de modelo fixados em commit do HF: 4 modelos de resumo (Qwen 2B/4B, Gemma 1B/4B) e 12 do Whisper (`ggerganov/whisper.cpp@5359861`)
- [x] Dicionário BlockNote = `pt` sobre `en` (`src/lib/blocknote-dictionary.ts`), aplicado também ao editor visível (`BlockNoteEditor/Editor.tsx`)

## Reuniões no celular (decisão pendente)
O Brifador capta o áudio do PC (mic + alto-falantes). Reunião feita no celular não passa pelo PC.
Opções:
- A. Entrar na reunião pelo PC (Meet/Zoom/Teams no navegador ou app) com fone → já funciona hoje
- B. Importar o áudio gravado no celular ("Importar áudio e transcrever novamente", recurso beta) → funciona sem código novo; testar
- C. App mobile próprio → projeto novo (Tauri mobile/React Native), escopo grande
