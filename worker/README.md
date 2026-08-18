# Worker — Serviço de Transcodificação

Serviço independente responsável pelo processamento assíncrono dos vídeos. Consome eventos de upload concluído a partir de uma fila, transcodifica o arquivo original em múltiplas resoluções com FFmpeg, fatia cada resolução em segmentos e gera o manifest de streaming HLS.

> **Status:** planejado. Este módulo será desenvolvido no M5 (Worker). No estado atual, contém apenas esta documentação, para que a estrutura do monorepo nasça completa.

---

## Sumário

- [Visão Geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Tecnologias](#tecnologias)
- [Como Executar](#como-executar)
- [Status do Desenvolvimento](#status-do-desenvolvimento)

---

## Visão Geral

O worker existe para tirar da API todo trabalho pesado e demorado. Transcodificar vídeo é uma operação intensiva em CPU que pode levar minutos ou horas — algo incompatível com o ciclo de vida de uma requisição HTTP. Isolar esse processamento em um serviço próprio, acionado por fila, é o que mantém a API responsiva e permite escalar o processamento de forma independente.

Responsabilidades planejadas:

- **Consumir a fila:** ler mensagens de upload concluído a partir do SQS.
- **Baixar o original:** obter o arquivo de vídeo bruto do object storage.
- **Transcodificar:** gerar múltiplas resoluções (por exemplo, 1080p, 720p, 480p) com FFmpeg.
- **Empacotar para streaming:** fatiar cada resolução em segmentos curtos e gerar o manifest HLS (`.m3u8`).
- **Publicar o resultado:** enviar os segmentos e o manifest de volta ao object storage e atualizar o status do vídeo para `ready` (ou `error`, em caso de falha).

O papel do worker no fluxo geral está descrito no [README do monorepo](../README.md).

## Arquitetura

O worker é um **serviço consumidor**, não um servidor HTTP: ele não expõe rotas nem espera requisições. Seu ciclo de vida é orientado pela fila — fica em execução contínua, aguardando mensagens, e processa cada uma através de um pipeline de etapas bem definidas.

```
SQS (fila)
  → consome mensagem de upload concluído
    → baixa o vídeo original do S3
      → transcodifica em múltiplas resoluções (FFmpeg)
        → fatia cada resolução em segmentos e gera o manifest HLS
          → publica segmentos e manifest no S3
            → atualiza o status do vídeo (ready / error)
```

Cada etapa depende do sucesso da anterior; uma falha em qualquer ponto leva o vídeo ao status `error`, sem interromper o consumo das demais mensagens da fila. Esse isolamento — um serviço dedicado, acionado por eventos, independente da API — é o que permite escalar o processamento separadamente e manter a API livre de trabalho pesado.

O worker roda dentro de um container **Docker**, para garantir que a versão do FFmpeg seja idêntica em desenvolvimento e produção.

A estrutura interna de código será definida e documentada no M5, quando o desenvolvimento começar.

## Tecnologias

| Tecnologia           | Papel                                             |
| -------------------- | ------------------------------------------------- |
| Node.js + TypeScript | Runtime e tipagem do serviço                      |
| FFmpeg               | Transcodificação e empacotamento HLS              |
| Docker               | Ambiente isolado e reproduzível para o FFmpeg     |
| AWS SQS              | Fila de eventos consumida pelo worker             |
| AWS S3               | Origem do vídeo bruto e destino dos segmentos HLS |

## Como Executar

O serviço ainda não foi desenvolvido. As instruções de execução (incluindo build da imagem Docker e variáveis de ambiente) serão adicionadas no M5.

## Status do Desenvolvimento

| Milestone   | Escopo no worker                                          | Status    |
| ----------- | --------------------------------------------------------- | --------- |
| M5 — Worker | Consumo SQS, transcodificação FFmpeg, geração HLS, Docker | Planejado |

Consulte o [README do monorepo](../README.md) para a visão completa do projeto e o roadmap.
