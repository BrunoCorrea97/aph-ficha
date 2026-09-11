# Ficha APH — Calculadora, Anotador e Gerador de Relatório

App separado do `aph-app` (o sistema multi-equipe que publicamos antes).
Este aqui é uma ferramenta pessoal, offline-first, sem login e sem
servidor — tudo roda no navegador/celular, com histórico salvo localmente
(IndexedDB).

## Como funciona

1. **Novo Atendimento** → escolhe **Trauma** ou **Clínico**
2. O fluxograma direciona para as perguntas certas:
   - **Trauma** → cena segura → X.A.B.C.D.E. (com A.V.D.I. e Escala de
     Glasgow completa, com subescores) → classificação C.I.P.E.
   - **Clínico** → escolhe a natureza específica (AVE, Crise Convulsiva,
     Hiper/Hipoglicemia, Hiper/Hipotensão, Anafilaxia, Outro/Mal Súbito)
     → perguntas daquele POP (ex.: Escala de Cincinnati para AVE,
     glicemia capilar para Hiper/Hipoglicemia)
3. **SAMPLE** (avaliação secundária)
4. **Sinais Vitais** (medição inicial)
5. **Procedimentos realizados** (quantos forem necessários)
6. **Reavaliação** — campo opcional e repetível: adicione 0, 1 ou várias
   reavaliações, cada uma com horário automático, sinais vitais novos (se
   aplicável) e alterações observadas. Nunca sobrescreve a anterior.
7. **Relatório final** — tela compilada com tudo, mais o botão **Gerar
   PDF** (gerado no próprio aparelho, sem precisar de internet) e
   **Salvar no histórico**.

## Fontes usadas nas perguntas

Mesma base documental do `aph-app`: POPs do CBMRS (Trauma, AVE, Crise
Convulsiva, Hiperglicemia/Hipoglicemia, Hipertensão/Hipotensão,
Anafilaxia) + ITO 23/CBMMG como complementar para a Escala de Glasgow
(tabela de pontos) — a mesma hierarquia documental combinada no projeto
anterior: POP do CBMRS manda, ITO 23 só preenche o que o POP cita sem
detalhar.

## Stack

React + TypeScript + Vite + Tailwind v4, PWA (`vite-plugin-pwa`),
histórico em IndexedDB via Dexie, PDF gerado no cliente com jsPDF +
jspdf-autotable (tabela de sinais vitais).

## Rodar localmente

```
npm install
npm run dev
```

## Build de produção

```
npm run build
```

Gera `dist/` — um site estático puro, sem backend. Pode subir em
Vercel/Netlify/GitHub Pages exatamente como fizemos com o `aph-app`, só
que aqui nem precisa de Neon nem de Render — é só o frontend.

## Limitações conhecidas desta primeira versão

- A avaliação clínica de "Outro / Mal Súbito" não tem perguntas
  específicas (não existe POP próprio no material fornecido para essa
  categoria genérica) — fica só com o bloco comum (Glasgow/responsividade).
- Sem edição de um atendimento já salvo no histórico (é só leitura +
  gerar PDF de novo). Se precisar editar depois de salvo, dá pra
  adicionar isso numa próxima versão.
- Sem sincronização entre aparelhos — o histórico fica só no navegador
  onde foi preenchido. Se você usar em mais de um celular, cada um tem o
  seu próprio histórico.
