# Backend — API da Plataforma de Vídeo

API REST responsável pelos metadados, autenticação e orquestração do fluxo de upload da plataforma de streaming de vídeo. Construída com Fastify e TypeScript em modo strict, seguindo uma versão simplificada de Clean Architecture.

---

## Sumário

- [Visão Geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Tecnologias](#tecnologias)
- [Como Clonar e Executar](#como-clonar-e-executar)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Scripts Disponíveis](#scripts-disponíveis)
- [Endpoints](#endpoints)
- [Status do Desenvolvimento](#status-do-desenvolvimento)

---

## Visão Geral

Este serviço é a API central da plataforma. Suas responsabilidades:

- **Metadados de vídeo:** título, descrição, dono, status do ciclo de vida (`pending` → `processing` → `ready` / `error`).
- **Autenticação e autorização:** registro, login, JWT de curta duração com refresh token rotativo.
- **Orquestração do upload:** iniciar o upload multipart no S3, gerar presigned URLs e confirmar a conclusão — **os bytes do vídeo nunca passam por esta API**. O cliente envia os chunks diretamente ao S3.
- **Publicação de eventos:** ao concluir um upload, enfileira uma mensagem (SQS) para o worker de transcodificação.

Princípio central herdado do system design de referência: **separação total entre metadados e binários**. Metadados vivem no PostgreSQL; os arquivos de vídeo vivem no S3. Essa separação evita erros clássicos de APIs que recebem arquivos grandes (413 Payload Too Large, timeouts 504/408, consumo massivo de RAM e conexões abertas por horas).

## Arquitetura

O backend aplica uma versão simplificada de Clean Architecture. A regra única que governa tudo é a **Regra da Dependência**: dependências apontam sempre para dentro. O domínio não conhece Fastify, Prisma, S3 nem HTTP — a infraestrutura se adapta ao domínio, nunca o contrário.

```
HTTP (Fastify)
  → Controller            traduz HTTP; valida com Zod → produz DTO de entrada
    → Use-case            orquestra UMA intenção do usuário (um execute() público)
      → Entity            regras de negócio puras; protege invariantes
      → Interface (Port)  contrato definido pela aplicação
        ← Adapter         implementação concreta na infraestrutura (Prisma, S3, SQS)
  → DTO de saída → resposta HTTP
```

Diretrizes que sustentam essa estrutura:

- **Zod-first:** os schemas Zod são a fonte única de verdade dos contratos — variáveis de ambiente, corpos de requisição e respostas.
- **Fail-fast:** o servidor se recusa a subir com variáveis de ambiente inválidas, falhando na inicialização com mensagem clara em vez de falhar em runtime.
- **Separação `app.ts` / `server.ts`:** `buildApp()` monta a instância do Fastify sem escutar porta alguma (o que permite testes via injeção), enquanto `server.ts` cuida do bootstrap com o ambiente já validado.
- **Ports obrigatórios para infraestrutura externa:** banco de dados (repository), storage (S3) e fila (SQS) são acessados exclusivamente por interfaces definidas na camada de aplicação, o que viabiliza a inversão de dependência e testes com implementações falsas.

As camadas de domínio e aplicação (entities, use-cases, ports) serão introduzidas a partir do milestone de autenticação, quando o primeiro problema real de regra de negócio surgir. A estrutura atual reflete a fundação: configuração, ambiente e servidor HTTP.

```
backend/
├── src/
│   ├── config/
│   │   └── env.ts        # schema Zod + validação fail-fast do ambiente
│   ├── app.ts            # buildApp(): instância do Fastify e rotas
│   └── server.ts         # bootstrap: env validado + listen
├── .env.example          # documentação viva das variáveis de ambiente
├── package.json
└── tsconfig.json
```

## Tecnologias

| Tecnologia          | Papel                                                              |
| ------------------- | ------------------------------------------------------------------ |
| Node.js 22+         | Runtime (ESM nativo, carregamento de `.env` via `--env-file`)      |
| TypeScript (strict) | Tipagem estática; `any` proibido                                   |
| Fastify             | Servidor HTTP de alta performance                                  |
| Zod                 | Validação e contratos (env, request, response)                     |
| Prisma ORM          | Acesso ao PostgreSQL com migrations declarativas (a partir do M2)  |
| Neon                | PostgreSQL serverless (a partir do M2)                             |
| AWS S3              | Object storage para os arquivos de vídeo (a partir do M4)          |
| AWS SQS             | Fila de eventos para o worker de transcodificação (a partir do M4) |

## Como Clonar e Executar

### Pré-requisitos

- **Node.js 22.21+** (necessário para o suporte estável à flag `--env-file`) — verifique com `node -v`
- **npm** (acompanha o Node)
- **Git**

### Passo a passo

```bash
# 1. Clone o monorepo
git clone https://github.com/dionedev/video-platform.git
cd video-platform/backend

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env
# edite o .env conforme necessário

# 4. Suba o servidor em modo de desenvolvimento
npm run dev
```

O servidor sobe em `http://localhost:3333` (porta configurável via `PORT`). Valide com:

```bash
curl http://localhost:3333/health
# → { "status": "ok" }
```

## Variáveis de Ambiente

Todas as variáveis são validadas com Zod na inicialização. Ambiente inválido impede o servidor de subir (fail-fast).

| Variável   | Obrigatória | Default       | Descrição                               |
| ---------- | ----------- | ------------- | --------------------------------------- |
| `NODE_ENV` | Não         | `development` | `development` \| `test` \| `production` |
| `PORT`     | Não         | `3333`        | Porta HTTP do servidor                  |

O arquivo `.env.example` é versionado e serve como documentação viva — nunca contém segredos. O `.env` real é ignorado pelo Git.

## Scripts Disponíveis

| Script  | Comando                                   | Descrição                       |
| ------- | ----------------------------------------- | ------------------------------- |
| `dev`   | `tsx watch --env-file=.env src/server.ts` | Desenvolvimento com hot reload  |
| `build` | `tsc`                                     | Compila TypeScript para `dist/` |
| `start` | `node --env-file=.env dist/server.js`     | Executa o build de produção     |

## Endpoints

| Método | Rota      | Descrição               | Autenticação |
| ------ | --------- | ----------------------- | ------------ |
| `GET`  | `/health` | Health check do serviço | Não          |

Esta tabela é atualizada ao final de cada milestone.

## Status do Desenvolvimento

| Milestone         | Escopo no backend                                                     | Status    |
| ----------------- | --------------------------------------------------------------------- | --------- |
| M1 — Fundação     | TypeScript strict, Fastify, env fail-fast, `app.ts`/`server.ts`       | Concluído |
| M2 — Banco        | Neon + Prisma, schemas `users` e `videos` com ciclo de vida de status | Planejado |
| M3 — Autenticação | Register/login, JWT + refresh rotativo, primeiras camadas Clean       | Planejado |
| M4 — Upload       | Multipart S3 com presigned URLs, confirmação, enfileiramento SQS      | Planejado |
| M5 — Worker       | Integração de contratos compartilhados com o worker                   | Planejado |
| M6 — Streaming    | Suporte à entrega via CloudFront                                      | Planejado |
| M7 — Polimento    | Observabilidade e revisão de segurança                                | Planejado |

Consulte o [README do monorepo](../README.md) para a visão completa do projeto.
