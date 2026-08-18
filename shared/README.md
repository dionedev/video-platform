# Shared — Contratos Compartilhados

Módulo destinado ao código compartilhado entre o backend e o worker — em especial, os contratos das mensagens que trafegam pela fila de eventos e os schemas comuns a mais de um serviço.

> **Status:** planejado. Esta pasta está reservada no M1 para manter a estrutura do monorepo completa, mas ainda não contém código. Seu conteúdo real surge no M5 (Worker), quando o primeiro contrato compartilhado entre backend e worker se tornar necessário.

---

## Sumário

- [Visão Geral](#visão-geral)
- [Por Que Este Módulo Existe](#por-que-este-módulo-existe)
- [Status do Desenvolvimento](#status-do-desenvolvimento)

---

## Visão Geral

Quando o backend publica uma mensagem na fila e o worker a consome, ambos precisam concordar sobre o formato exato dessa mensagem. Se cada serviço definir esse formato por conta própria, uma mudança em um lado quebra o outro silenciosamente. Este módulo centraliza esses contratos em um único lugar, garantindo que backend e worker compartilhem a mesma fonte de verdade.

O conteúdo planejado inclui os schemas Zod e tipos TypeScript das mensagens de fila e quaisquer outras estruturas comuns aos dois serviços.

## Por Que Este Módulo Existe

A justificativa completa para separar esses contratos em um módulo próprio será desenvolvida no M5, no momento em que o primeiro contrato duplicado entre backend e worker aparecer — seguindo o princípio de introduzir estrutura quando o problema concreto surge.

## Status do Desenvolvimento

| Milestone   | Escopo no shared                                                    | Status    |
| ----------- | ------------------------------------------------------------------- | --------- |
| M5 — Worker | Contratos de mensagem de fila compartilhados entre backend e worker | Planejado |

Consulte o [README do monorepo](../README.md) para a visão completa do projeto e o roadmap.
