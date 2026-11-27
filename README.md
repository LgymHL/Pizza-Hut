# Gestão à Vista · Pizza Hut (Atualização 1)

Painel de gestão das duas lojas franqueadas Pizza Hut em São Luís/MA, **Holandeses** e **Renascença**.
Foi feito como MVP para o **Desafio Pizza Hut** da equipe V4 (Oxygeni Hub / TechX).

> ⚠️ **Versão de demonstração.** Todos os números são **fictícios**, gerados no próprio navegador.
> Não há login nem backend: os dados reais do cliente não fazem parte deste repositório.

## O problema

Os números das lojas estão espalhados em três fontes:

- os PDFs da franquia ("Vendas por dia de negócio");
- um Power BI de fechamento;
- um relatório de desperdício em HTML.

Com isso fica difícil acompanhar faturamento, cancelamentos, desperdício e, principalmente, o **Selo Super do iFood**, que é a prioridade nº 1 do cliente. O risco pesa mais na Renascença, onde o iFood responde por cerca de 66% das vendas.

## O que o painel faz

| Tela | O que mostra |
|---|---|
| **Visão Geral** | Faturamento, tickets, ticket médio, faturamento por dia por loja, comparativo entre lojas e **alertas de indicadores fora da meta** |
| **Vendas** | Fechamento mensal, formas de pagamento, canais (Delivery, Balcão, Salão) e cancelamentos |
| **Selo Super (iFood)** | Avaliação, taxa de acordos e cancelamento de cada loja, com farol contra os critérios do selo |
| **Entrega e Produção** | Tempo do motoboy, de produção e total, e entregas atrasadas, com gráfico diário e linha da meta |
| **Desperdícios** | Perdas por loja, motivo, produto, turno e tipo, com evolução diária e lista de ocorrências |
| **Performance de Produtos** | Ranking dos produtos mais vendidos |
| **Operação e Planejamento** | Calendário de produção (feriados, fins de semana e eventos), vendas diárias e análise de demanda por dia da semana |
| **Metas** *(Gerente Geral)* | Metas configuráveis de faturamento, critérios do Selo Super, tempo do motoboy e desperdício |
| **Importação e Histórico** | Envio de relatórios e acompanhamento do processamento |
| **Gestão de Usuários** *(Gerente Geral)* | Usuários, perfis e convites |

### Entrar (demonstração)

O site sempre abre pela tela de login. Contas de demonstração:

- `gerente.geral@demo.local` (Gerente Geral)
- `gerente.holandeses@demo.local`
- `gerente.renascenca@demo.local`

Senha de demonstração: `pizzahut`. A senha não aparece na tela de propósito.

A tela de login só mostra como atalho as contas que já entraram naquele aparelho. Trocar de conta sempre pede a senha da outra conta. "Solicitar acesso" é uma demonstração: nada é enviado. Não há servidor de login, e a sessão vale até fechar a aba.

### Perfis de acesso

No canto superior direito, o campo **"Acessar como"** troca o perfil sem precisar de login:

- **Gerente Geral:** vê as duas lojas e todas as telas.
- **Gerente · Holandeses:** vê só a própria loja e não acessa Metas, Importação nem Usuários.
- **Gerente · Renascença:** vê só a própria loja e não acessa Metas, Importação nem Usuários.

## Metas iniciais

| Indicador | Meta |
|---|---|
| Faturamento mensal Holandeses | R$ 550.000 |
| Faturamento mensal Renascença | R$ 230.000 |
| Avaliação iFood | mínimo 4,7 |
| Cancelamento | máximo 1% |
| Acordos | máximo 2,5% |
| Tempo do motoboy | máximo 15 min |
| Desperdício semanal | sem regra definida |

## Tecnologias

React 19, TypeScript, Vite, Tailwind CSS 4, React Router, Recharts e lucide-react.

A identidade visual é a do protótipo aprovado pelo cliente no Lovable ("Midnight System Glow"):
- mesmos tokens de cor oklch;
- fontes IBM Plex Sans e IBM Plex Mono;
- menu lateral, barra de filtros, cartões, faróis de meta, gráficos de rosca e de barras.

Os componentes visuais ficam em `src/components/painel/ui.tsx` e os tokens em `src/styles/index.css`.

## Como rodar

```bash
npm install
npm run dev
```

Abra http://localhost:5173.

### Publicar no GitHub Pages

```bash
# troque <repo> pelo nome do repositório
BASE_PATH=/<repo>/ npm run build
```

Publique a pasta `dist/` e copie `dist/index.html` para `dist/404.html`, para que as rotas funcionem ao recarregar a página.

## Como a demonstração funciona

- `src/demo/data.ts` gera os dados fictícios: vendas diárias, desperdício, Selo Super, entregas e metas.
- `src/demo/mockApi.ts` intercepta as chamadas à API e responde no **mesmo formato que o backend real**.
- `src/demo/profiles.ts` define os três perfis.

Para ligar no backend de verdade:

1. Remova `installMockApi()` de `src/main.tsx`.
2. Restaure o login.
3. Defina `VITE_API_URL`.

Na demonstração, as alterações (vendas manuais, eventos, convites) duram só até recarregar a página. As metas ficam salvas no navegador.

## Logo

Coloque o arquivo oficial em `public/pizza-hut-logo.png`. Sem ele, aparece um selo vermelho com ícone de pizza.

## Pendências conhecidas

- Fonte real para avaliação, acordos e tempos de entrega do iFood (definir com os supervisores).
- Confirmar que o código de loja 50033265 é a Renascença.
- Regra de desperdício.
- Backend e login para uso com dados reais.

## Equipe

Desafio Pizza Hut · V4 (Oxygeni Hub / TechX).
