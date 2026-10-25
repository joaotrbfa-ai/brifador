# Como instalar o Brifador

O Brifador é grátis e roda no seu computador. O áudio das reuniões não sai da sua máquina.

Baixe o instalador na página de [Releases](https://github.com/joaotrbfa-ai/brifador/releases/latest).

## Windows

1. Baixe o arquivo que termina em **`_x64-setup.exe`**.
2. Abra o arquivo. O Windows vai mostrar **"O Windows protegeu o computador"**.
   Isso acontece porque o app ainda não tem assinatura digital paga; não é vírus.
3. Clique em **Mais informações** e depois em **Executar assim mesmo**.
4. Siga o instalador.

## Mac (Apple Silicon: M1, M2, M3, M4)

1. Baixe o arquivo **`.dmg`** e arraste o Brifador para a pasta **Aplicativos**.
2. Abra o **Terminal** e rode este comando uma única vez:

   ```bash
   xattr -cr /Applications/Brifador.app
   ```

   Sem isso, o Mac diz que o app "está danificado", porque ele não foi
   notarizado pela Apple.
3. Abra o Brifador normalmente.
4. Quando o Mac pedir, permita o acesso ao **Microfone** e à **Gravação de tela**
   (é assim que o Mac libera a captura do áudio do sistema).

## Primeiro uso

- Na primeira abertura, o app baixa o modelo de transcrição (~650 MB) e o de
  resumo (1 a 3 GB, conforme a memória do seu computador). Use uma internet boa.
- Avise os participantes antes de gravar uma reunião.

## Dica: reuniões pelo celular

O Brifador grava o áudio que passa pelo computador. Se você participa pelo
celular, entre na mesma reunião pelo computador com outra conta, deixe o
microfone e a câmera do computador **desligados** e o som da reunião
**ligado**. O Brifador grava tudo o que for falado, inclusive você pelo celular.

## Atualizações

O app avisa quando houver uma versão nova e se atualiza sozinho.
