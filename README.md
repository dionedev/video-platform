# Video Platform

Plataforma de streaming de vídeo inspirada na arquitetura do YouTube, construída do zero como projeto de estudo aprofundado de system design, AWS e boas práticas de engenharia. O sistema cobre o ciclo completo de um vídeo: upload direto ao object storage, transcodificação assíncrona em múltiplas resoluções, empacotamento HLS e entrega adaptativa via CDN.

---

## Sumário

- [Visão Geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Tecnologias](#tecnologias)
- [Estrutura do Repositório](#estrutura-do-repositório)
- [Como Clonar e Executar](#como-clonar-e-executar)
- [Roadmap](#roadmap)
- [Referência](#referência)

---

## Visão Geral

### Motivação

Este projeto reproduz, em escala de MVP, os princípios arquiteturais de uma plataforma de vídeo de grande porte. O objetivo não é clonar o YouTube — é dominar, na prática, os problemas que uma plataforma dessas resolve e as decisões de engenharia por trás de cada solução: por que arquivos grandes não podem passar pela API, por que metadados e binários vivem em lugares diferentes, por que a transcodificação é assíncrona e como o streaming adaptativo funciona de ponta a ponta.

### O problema central

Uma API tradicional que recebe arquivos de vídeo no corpo da requisição colapsa rapidamente: erros 413 (payload muito grande), timeouts 504/408, consumo massivo de memória e conexões HTTP abertas por horas. A arquitetura deste projeto elimina esses problemas na raiz com um princípio inegociável:

> **Os bytes do vídeo nunca passam pelo servidor de API.** O cliente envia os arquivos diretamente ao object storage, em partes, através de URLs pré-assinadas. A API orquestra; não transporta.

### Princípios arquiteturais

1. **Separação total entre metadados e binários** — informações textuais (título, dono, status) vivem em banco relacional; os arquivos de vídeo vivem em object storage. Nunca se misturam.
2. **Upload direto ao storage** — a API inicia o upload multipart e gera presigned URLs; o navegador fatia o arquivo em chunks e os envia diretamente ao S3, que os reagrupa em um único objeto.
3. **Processamento assíncrono orientado a eventos** — o upload concluído publica um evento em fila; um worker independente consome, transcodifica para múltiplas resoluções, fatia em segmentos curtos e gera o manifest de streaming.
4. **Ciclo de vida explícito** — cada vídeo transita por estados controlados (`pending` → `processing` → `ready` / `error`); transições inválidas são bloqueadas por regra de domínio.
5. **Entrega pela borda** — manifest e segmentos são servidos por CDN na frente do storage, aproximando o conteúdo do usuário final.

## Arquitetura

### Fluxo completo: do upload à reprodução

#### Fase 1 — Upload

1. O usuário autentica na plataforma e seleciona um arquivo de vídeo na sua máquina.
2. O frontend envia à API apenas os **metadados** do vídeo (título, descrição, nome e tamanho do arquivo) via `POST /videos` — o arquivo em si ainda não sai da máquina do usuário.
3. A API registra o vídeo no banco de dados com status **`pending`**.
4. A API solicita ao S3 o início de um **upload multipart** e gera uma lista de **presigned URLs** — a quantidade de URLs é proporcional ao tamanho do arquivo declarado.
5. A API responde ao frontend com as presigned URLs.
6. O frontend fatia o arquivo em **chunks de 5–10 MB** no próprio navegador e envia cada chunk **diretamente ao S3**, usando as presigned URLs — os bytes do vídeo nunca passam pelo servidor da API.
7. Com todos os chunks enviados, o frontend notifica a API de que o upload terminou.
8. A API confirma a conclusão ao S3, que **reagrupa os chunks em um único arquivo**.

#### Fase 2 — Processamento

9. A API publica uma mensagem na fila (SQS) informando que há um novo vídeo a processar e atualiza o status para **`processing`**.
10. O worker consome a mensagem da fila e baixa o arquivo original do S3.
11. O worker transcodifica o vídeo em **múltiplas resoluções** (por exemplo, 1080p, 720p, 480p) usando FFmpeg.
12. Cada resolução é fatiada em **segmentos curtos** (2–6 segundos) e o worker gera o **manifest HLS** (`.m3u8`) — o índice que descreve todas as resoluções e segmentos disponíveis.
13. O worker publica os segmentos e o manifest no S3 e atualiza o status do vídeo para **`ready`** (ou **`error`**, se alguma etapa falhar).

#### Fase 3 — Streaming

14. Qualquer usuário abre o vídeo na plataforma; o player solicita o **manifest** via CDN (CloudFront), que serve o conteúdo a partir da localidade de borda mais próxima.
15. O player lê o manifest, mede continuamente a **banda disponível** e baixa os segmentos na resolução mais adequada ao momento.
16. Se a conexão piora ou melhora durante a reprodução, o player **troca de resolução dinamicamente** entre um segmento e outro — priorizando reprodução fluida, sem congelamentos (streaming adaptativo, ABR).

> Em resumo: a API orquestra, mas nunca transporta vídeo; o S3 guarda os arquivos; a fila desacopla o processamento; o worker prepara o vídeo para streaming; e a CDN entrega ao mundo.

### Escala de referência vs. escala do projeto

O projeto preserva os princípios de uma arquitetura de escala massiva, substituindo os componentes de alto custo por alternativas equivalentes em conceito:

| Componente         | Escala YouTube                | Este projeto                    | Princípio preservado                 |
| ------------------ | ----------------------------- | ------------------------------- | ------------------------------------ |
| Banco de metadados | Cassandra                     | PostgreSQL (Neon)               | Metadados separados dos binários     |
| Transcodificação   | Frota dedicada / MediaConvert | Worker próprio com FFmpeg       | Processamento assíncrono por eventos |
| Entrega            | Multi-CDN global              | CloudFront (distribuição única) | Cache na borda                       |
| API                | Escala horizontal             | Instância única Fastify         | Stateless, pronta para escalar       |

## Tecnologias

| Camada                | Tecnologia                                   |
| --------------------- | -------------------------------------------- |
| API                   | Fastify + TypeScript (strict)                |
| Banco de dados        | Neon (PostgreSQL serverless) + Prisma ORM    |
| Object storage        | AWS S3                                       |
| Fila de eventos       | AWS SQS                                      |
| Transcodificação      | FFmpeg (worker dedicado)                     |
| Streaming             | HLS (.m3u8) + hls.js                         |
| CDN                   | AWS CloudFront                               |
| Frontend              | Next.js                                      |
| Contratos e validação | Zod (fonte única de verdade em toda a stack) |

## Estrutura do Repositório

Monorepo com quatro módulos, cada um com documentação própria:

```
video-platform/
├── backend/    # API REST: metadados, autenticação, orquestração do upload
├── frontend/   # Aplicação web: upload e player de vídeo (Next.js)
├── worker/     # Transcodificação: consumo da fila, FFmpeg, geração HLS
└── shared/     # Contratos compartilhados entre backend e worker
```

| Módulo   | Documentação                               |
| -------- | ------------------------------------------ |
| Backend  | [backend/README.md](./backend/README.md)   |
| Frontend | [frontend/README.md](./frontend/README.md) |
| Worker   | [worker/README.md](./worker/README.md)     |
| Shared   | [shared/README.md](./shared/README.md)     |

## Como Clonar e Executar

### Pré-requisitos

- **Node.js 22.21+** — verifique com `node -v`
- **npm** (acompanha o Node)
- **Git**

Para os milestones futuros (não necessários para rodar o estado atual):

- Conta **AWS** (S3, SQS, CloudFront)
- Conta **Neon** (PostgreSQL serverless, free tier)
- **FFmpeg** / **Docker** (worker de transcodificação)

### Passo a passo

```bash
# 1. Clone o repositório
git clone https://github.com/dionedev/video-platform.git
cd video-platform

# 2. Suba a API (módulo funcional no estado atual)
cd backend
npm install
cp .env.example .env
npm run dev
```

Valide a API:

```bash
curl http://localhost:3333/health
# → { "status": "ok" }
```

As instruções detalhadas de cada módulo (variáveis de ambiente, scripts, migrations) estão nos respectivos READMEs.

## Roadmap

| Milestone           | Entrega                                                                             | Status    |
| ------------------- | ----------------------------------------------------------------------------------- | --------- |
| M1 — Fundação       | Monorepo, TypeScript strict, Fastify, validação de ambiente fail-fast, documentação | Concluído |
| M2 — Banco de dados | Neon + Prisma, schemas de usuários e vídeos com ciclo de vida de status             | Planejado |
| M3 — Autenticação   | Registro/login, JWT com refresh token rotativo, camadas de domínio                  | Planejado |
| M4 — Upload         | Multipart direto ao S3 com presigned URLs, confirmação e enfileiramento             | Planejado |
| M5 — Worker         | Consumo SQS, transcodificação FFmpeg, geração HLS, Docker                           | Planejado |
| M6 — Streaming      | CloudFront + player com streaming adaptativo (hls.js)                               | Planejado |
| M7 — Polimento      | Observabilidade, revisão de segurança, documentação final                           | Planejado |

## Referência

Arquitetura baseada no estudo de system design apresentado em [ARQUITETANDO O YOUTUBE NA PRÁTICA | SYSTEM DESIGN](https://www.youtube.com/watch?v=JBivKeZVex0), de Renato Augusto — adaptado para escala de MVP com serviços de custo zero ou próximo de zero, preservando os princípios arquiteturais originais.
