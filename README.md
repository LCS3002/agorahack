# ALETHEIA

**EU votes, money, and influence — in plain language.**

Aletheia is a political transparency intelligence platform for the European Union. Ask a question in natural language; the system classifies your intent, pulls structured data across three intelligence modules, and returns a cited analysis — surfacing who voted how, who spent what lobbying them, and how the media framed it.

The name comes from the Greek concept of unconcealment — truth not as assertion, but as revelation.

---

## The Problem

EU legislative processes generate enormous amounts of public data — roll-call votes, transparency register filings, committee records — but it is scattered, technical, and practically inaccessible to most citizens and journalists. Lobbying influence is declared but never contextualised. Conflicts of interest exist in the open, but require hours of cross-referencing to surface.

Aletheia collapses that gap.

---

## What It Does

Type any question about EU politics. The system does the rest.

**Examples:**
- *Who lobbied against the Nature Restoration Law?*
- *How did MEPs vote on the AI Act?*
- *Is there a conflict of interest around von der Leyen and pharma?*
- *Show me everything on farm subsidies*

The AI classifies the query, activates the relevant intelligence modules, and streams a plain-language analysis with inline citations. The dashboard surfaces the underlying data simultaneously.

---

## Intelligence Modules

### Voting & Parliament
Roll-call records, party breakdowns, and MEP positions — visualised as an interactive EU Parliament hemicycle.

**Drill-down navigation:**
- Click any party in the breakdown table → party view with vote stats and all key MEPs
- Click any MEP with a profile → full profile view
  - Biography, committees, voting record across legislation
  - Lobby connection network graph — radial SVG showing which organisations met with that MEP, meeting counts (node size), declared spend, and sector

### Lobbying & Money
Declared spend from the EU Transparency Register, ranked by organisation. Sector filter chips, spend bars, and a meeting-intensity score (meetings per €1M declared — high values flag potential undeclared spend or disproportionate access).

Conflict flags cross-reference lobbying access with voting record: which MEPs held documented meetings with top-spending organisations before voting for or against the relevant legislation.

### News & Sentiment
30-day sentiment trend (AreaChart), overall sentiment score, and framing divergence — how left, centre, and right-leaning outlets covered the same topic, quoted directly. Filter headlines by political lean. Polarisation Index: the absolute gap between average left and right outlet sentiment.

---

## AI Agent

**Classification** — `claude-haiku-4-5` classifies each query into modules (VOTING, LOBBYING, NEWS). Legislation and person queries always activate all three. Fast, cheap, structured JSON output.

**Summarisation** — `claude-sonnet-4-6` streams a 3–4 sentence plain-language analysis. Writes like The Economist: names names, cites figures, flags conflicts of interest without hedging. Inline `[n]` citation markers reference specific data points.

**Citations** — Each summary ends with a numbered sources list: EP roll-call vote records (date + reference number), EU Transparency Register entries (organisation, declared spend, period), and news headlines (outlet + date). Rendered as formatted footnotes in the chat panel.

---

## Interface

**Landing page** — Minimal. Logo, tagline, and a single input box. No clutter.

**Dashboard** — Three-panel bento grid. Voting spans the full left column; Lobbying and News split the right. Each panel has a live status indicator and an expand button.

**Expanded views** — Clicking expand fills the entire dashboard area with the full interactive version of that module. No modal overlay — the expanded view replaces the dashboard in-place with a smooth slide transition. Collapse returns to the bento grid.

**Breadcrumb navigation** — Drill-down views track position: `Voting & Parliament › EPP › Herbert Dorfmann`. Back button walks up one level.

---

## Design

Warm, typographic, and deliberately calm. EU politics is already loud enough.

| Token | Value |
|---|---|
| Background | `#F0EDE8` (cream) |
| Ink | `#1A1A18` |
| Conflict / negative | `#C9A89A` (rose) |
| Neutral | `#8A8882` (warm grey) |
| Sand | `#D4C4A8` |

All layout in CSS Grid. All styling inline — no Tailwind in production components. Framer Motion for page and panel transitions. Recharts for sentiment trend. Pure SVG for the hemicycle and network graph.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript (strict) |
| AI | Anthropic SDK — Haiku (classify) + Sonnet (summarise) |
| Animation | Framer Motion |
| Charts | Recharts |
| Graphs | Pure SVG (hemicycle, network) |
| Styling | Inline styles + CSS custom properties |

---

## Running Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

To enable the AI agent, set your Anthropic API key:

```bash
# .env.local
ANTHROPIC_API_KEY=sk-ant-...
```

Without a key, the system falls back to pre-written summaries and simulated streaming. All dashboard data is mock data modelled on real EU legislative records.

---

## Data Sources (modelled)

- **EP roll-call votes** — European Parliament voting records (europarl.europa.eu)
- **EU Transparency Register** — Declared lobbying spend and parliamentary access meetings (ec.europa.eu/transparencyregister)
- **Media sentiment** — Politico EU, EURACTIV, Financial Times, The Guardian, Der Spiegel, Le Monde, and others

Current mock datasets cover: Nature Restoration Law (2023), EU AI Act (2024), CSRD (2022), CAP Reform (2021), and EU pharmaceutical lobbying.

---

## Project Structure

```
src/
  app/
    page.tsx                  # Landing page + dashboard shell
    api/
      classify/route.ts       # Haiku classification endpoint
      summarize/route.ts      # Sonnet streaming summary endpoint
  components/
    Header.tsx
    ChatPanel.tsx             # Streaming summary + citation renderer
    DashboardPanel.tsx        # Bento grid with expand controls
    StatusBar.tsx
    cards/
      VotingCard.tsx          # Compact hemicycle card
      LobbyingCard.tsx        # Compact spend/conflict card
      NewsCard.tsx            # Compact sentiment card
    expanded/
      VotingExpanded.tsx      # Full hemicycle + party/MEP drill-down + network graph
      LobbyingExpanded.tsx    # Full org list + conflict analysis
      NewsExpanded.tsx        # Full sentiment chart + lean filter + polarisation index
  lib/
    types.ts                  # All shared TypeScript interfaces
    mockData.ts               # Voting, lobbying, news datasets + MEP profiles
    mockDataSelector.ts       # Query-to-dataset routing logic
```

---

*Built for AgoraHacks · April 2026*
