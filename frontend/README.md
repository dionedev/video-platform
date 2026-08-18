# Frontend — Aplicação Web da Plataforma de Vídeo

Aplicação web da plataforma de streaming. Será responsável pela interface de upload (fatiamento do arquivo em chunks e envio direto ao object storage) e pelo player de vídeo com streaming adaptativo. Construída com Next.js e TypeScript.

> **Status:** template inicial. Este módulo foi estruturado no M1 para que o repositório nasça completo, mas seu desenvolvimento está planejado para o M6 (Streaming). No estado atual, contém apenas o template padrão gerado pelo `create-next-app`.

---

## Sumário

- [Visão Geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Tecnologias](#tecnologias)
- [Como Clonar e Executar](#como-clonar-e-executar)
- [Status do Desenvolvimento](#status-do-desenvolvimento)

---

## Visão Geral

Este módulo será a camada de interação do usuário com a plataforma. Suas responsabilidades planejadas:

- **Upload de vídeo:** receber o arquivo do usuário, fatiá-lo em chunks (5–10 MB) no próprio navegador e enviá-los diretamente ao object storage através das presigned URLs fornecidas pela API. Os bytes do vídeo nunca passam pelo servidor de API.
- **Autenticação:** telas de registro e login, consumindo os endpoints de autenticação do backend.
- **Player com streaming adaptativo:** reprodução via HLS, consumindo o manifest gerado pelo worker e alternando dinamicamente entre resoluções conforme a banda disponível (ABR).

O papel do frontend no fluxo geral (upload direto ao storage, processamento assíncrono, entrega via CDN) está descrito no [README do monorepo](../README.md).

## Arquitetura

O frontend será desenvolvido a partir do M6. A estrutura de pastas, o gerenciamento de estado e os padrões de componentização serão definidos e documentados no momento do desenvolvimento, quando os requisitos concretos de tela existirem — seguindo o princípio de adicionar estrutura quando o problema aparece, não antes.

No estado atual, o módulo segue a estrutura padrão do App Router do Next.js gerada pelo `create-next-app`.

## Tecnologias

| Tecnologia | Papel                                               |
| ---------- | --------------------------------------------------- |
| Next.js    | Framework React (App Router)                        |
| TypeScript | Tipagem estática                                    |
| hls.js     | Player de streaming adaptativo HLS (a partir do M6) |

## Como Clonar e Executar

### Pré-requisitos

- **Node.js 22.21+** — verifique com `node -v`
- **npm** (acompanha o Node)
- **Git**

### Passo a passo

```bash
# 1. A partir da raiz do monorepo, entre no módulo
cd frontend

# 2. Instale as dependências
npm install

# 3. Suba o servidor de desenvolvimento
npm run dev
```

A aplicação sobe em `http://localhost:3000`. No estado atual, exibe a página padrão do Next.js.

## Status do Desenvolvimento

| Milestone      | Escopo no frontend                                     | Status    |
| -------------- | ------------------------------------------------------ | --------- |
| M1 — Fundação  | Template inicial (repositório completo)                | Concluído |
| M6 — Streaming | Interface de upload, autenticação e player HLS com ABR | Planejado |

Consulte o [README do monorepo](../README.md) para a visão completa do projeto e o roadmap.
