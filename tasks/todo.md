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
- GPU: MX150 (2 GB) → `TAURI_GPU_FEATURE=none` (CPU); 20 GB RAM

## Fase 1 — Validar qualidade em pt-BR (antes de customizar qualquer coisa)
- [ ] Gravar 3 áudios reais (aula, call 1:1, call com ruído), ~10 min cada
- [ ] Comparar Parakeet v3 × Whisper large-v3-turbo × Groq Whisper (BYOK): WER aproximado, velocidade, CPU/GPU
- [ ] Definir o modelo padrão por perfil de máquina (sem GPU / com GPU / Apple Silicon)
- [ ] Testar modelos Ollama para resumo em pt-BR (ex.: Qwen, Gemma, Llama na faixa 4–8B) e anotar qualidade × RAM

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
- [ ] GitHub Releases + auto-update do Tauri
- [ ] Windows: aplicar no SignPath Foundation (assinatura grátis para OSS) — senão o SmartScreen avisa
- [ ] macOS: sem Apple Developer ($99/ano) o app sai sem notarização → tutorial "abrir mesmo assim"; reavaliar depois
- [ ] Onboarding: permissões de mic/áudio do sistema, download do modelo, aviso de consentimento ("avise os participantes que está gravando" — LGPD)
- [ ] Guia de instalação curto para alunos (PT)

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
- [ ] Gravação de teste ponta a ponta (Parakeet baixando do HF + resumo em pt-BR)
