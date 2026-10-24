# Brifador

Transcritor de reuniões gratuito, local e sem bot na chamada.

O Brifador grava o seu microfone e o áudio do computador, transcreve na própria máquina
e gera notas da reunião com IA. Funciona com qualquer app de chamada (Meet, Zoom, Teams,
WhatsApp) porque captura o áudio do sistema, sem entrar na reunião como participante.

- **Grátis**: transcrição e resumo rodam localmente (Whisper/Parakeet + Ollama), sem custo por minuto.
- **Privado**: o áudio não sai do seu computador e o app não envia telemetria.
- **Opcional**: quem tiver um PC mais fraco pode usar a própria chave de API (ex.: Groq).
- **Plataformas**: Windows e macOS.

> Avise os participantes antes de gravar uma reunião.

## Status

Em desenvolvimento. Veja o plano em [`tasks/todo.md`](tasks/todo.md).

## Créditos

O Brifador é um fork do **[Meetily](https://github.com/Zackriya-Solutions/meetily)**,
da [Zackriya Solutions](https://www.zackriya.com/), distribuído sob a licença MIT.
A captura de áudio, os motores de transcrição e a base do app vêm do trabalho deles.
Obrigado ao time e aos contribuidores do Meetily.

O README original do Meetily está em [`docs/README.meetily.md`](docs/README.meetily.md).

Outros projetos dos quais o Brifador depende:

- [whisper.cpp](https://github.com/ggerganov/whisper.cpp)
- [Parakeet TDT 0.6b v3](https://huggingface.co/nvidia/parakeet-tdt-0.6b-v3), da NVIDIA, com conversão ONNX de [istupakov](https://huggingface.co/istupakov/parakeet-tdt-0.6b-v3-onnx)
- [Tauri](https://tauri.app/) e [Ollama](https://ollama.com/)

## Licença

MIT. O aviso de copyright original da Zackriya Solutions está mantido em [`LICENSE.md`](LICENSE.md).
