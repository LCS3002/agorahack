<div align="center">

<img src="./public/logo_a.png" alt="LOGO" width="700" /> 

```text
 ███   █    █████  █████  █   █  █████  █████   ███ 
█   █  █    █        █    █   █  █        █    █   █
█████  █    ████     █    █████  ████     █    █████
█   █  █    █        █    █   █  █        █    █   █
█   █  ███  █████    █    █   █  █████  █████  █   █
```

</div>

<div align="center">

# ALETHEIA · EU Political Intelligence

### *"Truth, unconcealed."* — from the Greek ἀλήθεια

<br>

![Next.js](https://img.shields.io/badge/Next.js_15-000000?style=for-the-badge&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Anthropic](https://img.shields.io/badge/Claude_Sonnet-D97757?style=for-the-badge&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=three.js&logoColor=white)
![Framer](https://img.shields.io/badge/Framer_Motion-0055FF?style=for-the-badge&logo=framer&logoColor=white)

<br>

**EU votes, money, and influence — surfaced by AI, in plain language.**

<br>

<table>
<tr>
<td align="center"><b>705</b><br><sub>MEPs tracked</sub></td>
<td align="center"><b>€1.9B+</b><br><sub>declared lobbying spend</sub></td>
<td align="center"><b>17,081</b><br><sub>registered organisations</sub></td>
<td align="center"><b>27</b><br><sub>member states</sub></td>
<td align="center"><b>48h</b><br><sub>hackathon build</sub></td>
</tr>
</table>

</div>

<br>

---

## What it does

EU legislative processes generate enormous amounts of public data — roll-call votes, transparency register filings, committee records — but it is scattered, technical, and practically inaccessible to most citizens and journalists. Lobbying influence is declared but never contextualised. Conflicts of interest exist in the open, but require hours of cross-referencing to surface.

**ALETHEIA collapses that gap.** Ask a question in natural language. Get a cited, structured intelligence brief — instantly.

---

## Try it

<div align="center">

<kbd>Who lobbied against the Nature Restoration Law?</kbd>

<kbd>How did MEPs vote on the AI Act?</kbd>

<kbd>Is there a conflict of interest around von der Leyen and pharma?</kbd>

<kbd>Tell me about MEP Axel Voss</kbd>

<kbd>Show me everything on farm subsidies</kbd>

</div>

<br>

The AI classifies each query, activates only the relevant intelligence modules, and streams a plain-language analysis with inline citations. The dashboard surfaces underlying data simultaneously — with full restoration of any previous query from the conversation history.

---

## Three Intelligence Modules

<table>
<tr>
<td width="33%" align="center" valign="top">

### Voting & Parliament

**Interactive EU hemicycle · Roll-call drill-down**

Full party breakdown with vote distribution. Key MEP positions with roles and notable positions. Drill-down from party to individual MEP profiles. Each profile includes biography, committees, past votes, and a **lobby connection network graph** — radial SVG with meeting counts, declared spend, and sector.

</td>
<td width="33%" align="center" valign="top">

### Lobbying & Money

**€1.9B+ · 17,081 orgs · Conflict signals**

Declared spend from the EU Transparency Register ranked by organisation. Heuristic conflict detection: commercial actor + policy overlap, high spend band, multiple aligned registrants. Period and financial year attribution. Direct link to the EU Transparency Register.

</td>
<td width="33%" align="center" valign="top">

### News & Sentiment

**GDELT · 30-day live · Polarisation Index**

Real-time media sentiment across 30 days. Headlines filtered by political lean — LEFT · CENTRE · RIGHT. Framing divergence analysis: how left and right-leaning outlets covered the same story. Polarisation Index: absolute gap between average outlet sentiment scores.

</td>
</tr>
</table>

---

## AI Agent Architecture

```
                         User query
                              │
                              ▼
              ┌───────────────────────────────┐
              │         /api/classify          │
              │  Haiku · regex JSON routing    │
              │  → timeframe                   │
              │  → query_type                  │
              │  → moduleContext               │
              └───────────────┬───────────────┘
                              │  ClassificationResult
                              ▼
              ┌───────────────────────────────┐
              │         /api/summarize         │
              │  Sonnet · agentic tool loop    │
              │                               │
              │  fetch_voting_data            │──▶ EP Open Data API
              │  fetch_news_data              │──▶ Valyu / GDELT
              │  get_entity_background        │──▶ Wikipedia
              │                               │
              │  + EU Transparency Register   │──▶ 17k orgs (cached)
              └───────────────┬───────────────┘
                              │  ModuleData + streamed text
                              ▼
              ┌───────────────────────────────┐
              │       mergeModuleData()        │
              │  Live results + fixture data   │
              │  Hybrid provenance per slice   │
              └───────────────┬───────────────┘
                              │
                              ▼
                   Dashboard + streamed summary
```

<br>

<table>
<tr>
<td width="33%" valign="top">

**Classification**

Routes each query to relevant modules. Policy queries activate all three. Person queries activate Voting + News only, with a contextual hint in the Lobbying panel. Structured JSON output.

</td>
<td width="33%" valign="top">

**Summarisation**

Prefetch + tool-use loop then streams a cited brief. Inline `[n]` citation markers reference numbered sources built from tool outputs.

</td>
<td width="33%" valign="top">

**Fallback**

No LLM key? The system still fetches real EP Open Data and GDELT news, merges them with fixture data, and generates a templated summary. Every layer degrades gracefully.

</td>
</tr>
</table>

### Provider Order

| Priority | Condition | Models used |
|---|---|---|
| **1** | `OPENAI_API_KEY` set | classify: `OPENAI_MODEL_CLASSIFY` · agent: `OPENAI_MODEL_AGENT` |
| **2** | `ANTHROPIC_API_KEY` set | classify: `claude-haiku-4-5-20251001` · agent: `claude-sonnet-4-6` |
| **3** | No key | Template summaries + live EP/GDELT data |

TNG defaults to `tngtech/R1T2-Chimera-Speed`. Official OpenAI defaults to `gpt-4o-mini` / `gpt-4o`.

---

## Conversation Intelligence

<table>
<tr>
<td width="25%" align="center"><b>CHAT tab</b><br><sub>Active summary + prior queries in reverse order</sub></td>
<td width="25%" align="center"><b>HISTORY tab</b><br><sub>Full timeline grouped by Today / Yesterday / date</sub></td>
<td width="25%" align="center"><b>One-click restore</b><br><sub>Restore any past dashboard state — no new API call</sub></td>
<td width="25%" align="center"><b>localStorage</b><br><sub>Survives page refreshes · capped at 50 entries</sub></td>
</tr>
</table>

---

## Interface

<table>
<tr>
<td width="25%" valign="top">

**Landing page**

Three.js animated blob. Stats ticker. Feature overview. Hero search bar.

</td>
<td width="25%" valign="top">

**Cream input**

Minimal Claude-style query box. Wordmark, tagline, single input. Nothing else.

</td>
<td width="25%" valign="top">

**Dashboard**

Three-panel bento grid. Voting spans the full left column; Lobbying and News split the right vertically. Live status dots. Expand button per panel.

</td>
<td width="25%" valign="top">

**Expanded views**

Fills the entire viewport with the full interactive module. No modal — replaces the grid in-place with a slide transition. Collapse returns to the grid.

</td>
</tr>
</table>

---

## Design System

> Warm, typographic, deliberately calm. EU politics is already loud enough.

The interface takes no position. Cream surfaces and ink-opacity hierarchies keep the visual temperature low so the data speaks. The accent — **rose** — marks conflict, opposition, and citations: wherever ALETHEIA surfaces tension, the colour signals it without editorialising.

### Colour Tokens

<table>
<tr>
<td align="center" width="16%"><img src="https://via.placeholder.com/60x40/F0EDE8/F0EDE8?text=+" /><br><b>Cream</b><br><code>#F0EDE8</code><br><sub>All surfaces</sub></td>
<td align="center" width="16%"><img src="https://via.placeholder.com/60x40/1A1A18/1A1A18?text=+" /><br><b>Ink</b><br><code>#1A1A18</code><br><sub>Primary text</sub></td>
<td align="center" width="16%"><img src="https://via.placeholder.com/60x40/C9A89A/C9A89A?text=+" /><br><b>Rose</b><br><code>#C9A89A</code><br><sub>Conflict · citations</sub></td>
<td align="center" width="16%"><img src="https://via.placeholder.com/60x40/D4C4A8/D4C4A8?text=+" /><br><b>Sand</b><br><code>#D4C4A8</code><br><sub>Skeletons · accent</sub></td>
<td align="center" width="16%"><img src="https://via.placeholder.com/60x40/8A8882/8A8882?text=+" /><br><b>Warmgrey</b><br><code>#8A8882</code><br><sub>News · secondary</sub></td>
<td align="center" width="16%"><img src="https://via.placeholder.com/60x40/4A4A48/4A4A48?text=+" /><br><b>Charcoal</b><br><code>#4A4A48</code><br><sub>Tertiary labels</sub></td>
</tr>
</table>

Opacity on Ink creates the full tonal scale — from `1.0` (primary text) down to `0.05` (hairline backgrounds) — without introducing extra hues.

### Ink Opacity Scale

| Opacity | Value | Use |
|---|---|---|
| 82% | `rgba(26,26,24,0.82)` | FOR votes |
| 65% | `rgba(26,26,24,0.65)` | Body text · LEFT lean |
| 45% | `rgba(26,26,24,0.45)` | Secondary labels |
| 25% | `rgba(26,26,24,0.25)` | Borders |
| 12% | `rgba(26,26,24,0.12)` | Card borders |
| 08% | `rgba(26,26,24,0.08)` | Dividers · skeleton track |

### Typography

| Family | Weights | Role |
|---|---|---|
| **DM Sans** | 200 · 300 · 400 · 500 | Everything — display to caption |
| **Instrument Serif** | 400 · italic | Hero tagline only |

| Size | Weight | Use |
|---|---|---|
| `clamp(56px, 11vw, 140px)` | 400 | Hero wordmark |
| 15px | 300 | Card titles · input |
| 13px | 300 | Summary text · chat |
| 10px | 500 | Labels (uppercase) |
| 9px | 500 | Micro labels · status tags |
| 8px | 500–600 | Pill badges · section headers |

### Layout

3-column bento at `1.15fr / 0.85fr` with 1px grid gaps as dividers. Voting spans the full left; Lobbying and News split the right vertically. No border-radius anywhere — sharp corners throughout. No Tailwind — inline styles only, with CSS custom properties for global tokens. All transitions: 0.15–0.35s ease-out.

---

## Stack

<table>
<tr>
<td align="center"><b>Framework</b><br>Next.js 15<br><sub>App Router · Turbopack</sub></td>
<td align="center"><b>Language</b><br>TypeScript<br><sub>strict mode</sub></td>
<td align="center"><b>AI</b><br>Anthropic SDK<br><sub>Haiku + Sonnet</sub></td>
<td align="center"><b>Animation</b><br>Framer Motion<br><sub>panel slides</sub></td>
</tr>
<tr>
<td align="center"><b>Charts</b><br>Recharts<br><sub>sentiment trends</sub></td>
<td align="center"><b>3D</b><br>Three.js<br><sub>EffectComposer blob</sub></td>
<td align="center"><b>Graphs</b><br>Pure SVG<br><sub>hemicycle · network</sub></td>
<td align="center"><b>Styling</b><br>Inline + CSS vars<br><sub>no Tailwind</sub></td>
</tr>
</table>

---

## Running Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Configure the AI Agent

```bash
# .env.local

# ── TNG / AgoraHacks ──────────────────────────────────────────
OPENAI_API_KEY=...
OPENAI_BASE_URL=https://external.model.tngtech.com/v1/
TEAM_NAME=your-team-slug
OPENAI_MODEL_CLASSIFY=tngtech/R1T2-Chimera-Speed
OPENAI_MODEL_AGENT=tngtech/R1T2-Chimera-Speed

# Optional separate reasoning field (see booklet):
# OPENAI_SEPARATE_REASONING=header   →  X-Separate-Reasoning: 1
# OPENAI_SEPARATE_REASONING=body     →  JSON body separate_reasoning: true

# ── Official OpenAI ───────────────────────────────────────────
# Omit OPENAI_BASE_URL and TEAM_NAME
# Defaults: gpt-4o-mini (classify) · gpt-4o (agent)

# ── Legacy Anthropic fallback (no OPENAI_API_KEY set) ─────────
# ANTHROPIC_API_KEY=sk-ant-...
```

> Without any key, the system falls back to pre-written summaries and simulated streaming. All dashboard data is still partially live (EP API + GDELT) with fixture fallbacks.

### Rebuild the Transparency Register Snapshot

```bash
npm run data:transparency
```

Optional — performs a full ODP export (17,081 orgs). The bundled sample is used by default.

---

## Data Sources

| Source | Data | Coverage |
|---|---|---|
| [EP Open Data](https://data.europarl.europa.eu) | Plenary documents, roll-call votes | Live |
| [EU Transparency Register](https://ec.europa.eu/transparencyregister) | Declared lobbying spend, 17,081 orgs | Snapshot |
| [GDELT Project](https://gdeltproject.org) | News headlines, sentiment, outlet lean | Live (30-day) |
| [Wikipedia](https://wikipedia.org) | Entity background | Live |
| Scenario fixtures | Nature Restoration Law · AI Act · CSRD · CAP Reform · Pharma | Curated |

---

## Project Structure

```
src/
  app/
    page.tsx                  # Landing page + dashboard shell + state
    api/
      classify/route.ts       # Haiku classification — context-aware module routing
      summarize/route.ts      # Sonnet agentic loop — tool-use + streaming
  components/
    Header.tsx
    ChatPanel.tsx             # CHAT/HISTORY tabs + summary + conversation timeline
    DashboardPanel.tsx        # Bento grid + context-aware empty states
    StatusBar.tsx             # Module indicators + provenance + timing
    cards/
      VotingCard.tsx          # Hemicycle compact card
      LobbyingCard.tsx        # Spend + conflict signals card
      NewsCard.tsx            # Sentiment trend card
    expanded/
      VotingExpanded.tsx      # Full hemicycle + party/MEP drill-down + network graph
      LobbyingExpanded.tsx    # Full org list + conflict analysis
      NewsExpanded.tsx        # Full sentiment chart + lean filter + polarisation index
  lib/
    types.ts                  # All shared TypeScript interfaces
    mockData.ts               # Scenario datasets + MEP profiles
    mockDataSelector.ts       # Query-to-dataset routing
    pipeline/
      mergeModuleData.ts      # Live tool results + fixture merge with provenance
    sources/
      parliament.ts           # EP Open Data API client
      gdelt.ts                # GDELT news API client
      wikipedia.ts            # Wikipedia entity lookup
    transparencyRegister/
      search.ts               # Keyword-scored register search
      loadRegister.ts         # JSON snapshot loader + in-memory cache
      keywords.ts             # Search term extraction
  data/
    transparency-register.json        # Full ODP snapshot (17,081 orgs)
    transparency-register-sample.json # Bundled fallback sample
```

---

## Contributors

<div align="center">

**Built at AgoraHacks 2026 · 48 hours**

<br>

<table>
<tr>
<td align="center" width="33%">
<br>
<b>Yi-Chen Hsu</b><br>
<a href="https://github.com/gunjyo0817"><code>@gunjyo0817</code></a><br>
<sub>Computer Science @ NTHU<br>exchange at TUM</sub><br>
<br>
<a href="https://www.linkedin.com/in/yichenhsu/">
<img src="https://img.shields.io/badge/LinkedIn-0A66C2?style=flat-square&logo=linkedin&logoColor=white" />
</a>
<br>
</td>
<td align="center" width="33%">
<br>
<b>Miloš Preradović</b><br>
<a href="https://github.com/prmilos"><code>@prmilos</code></a><br>
<sub>Economics and Engineering<br>@ TU Vienna</sub><br>
<br>
<a href="https://www.linkedin.com/in/milo%C5%A1-preradovi%C4%87-9a0329387/">
<img src="https://img.shields.io/badge/LinkedIn-0A66C2?style=flat-square&logo=linkedin&logoColor=white" />
</a>
<br>
</td>
<td align="center" width="33%">
<br>
<b>Lorenz Huber</b><br>
<a href="https://github.com/LCS3002"><code>@LCS3002</code></a><br>
<sub>Architecture @ UCL<br>London</sub><br>
<br>
<a href="https://www.linkedin.com/in/huberlorenz">
<img src="https://img.shields.io/badge/LinkedIn-0A66C2?style=flat-square&logo=linkedin&logoColor=white" />
</a>
<br>
</td>
</tr>
</table>

</div>

---

## Why ALETHEIA

EU institutions publish more raw data than almost any other political body in the world. But raw data is not accountability. ALETHEIA is a demonstration that with modern AI tooling, the gap between *data exists* and *citizens can use it* can be closed in a weekend.

The name comes from the Greek ἀλήθεια — truth as unconcealment, the idea that knowledge is not created but revealed by removing what obscures it. That is exactly what we are doing: the votes, the spend, the coverage were always there. We just removed the friction.

---

<div align="center">

*Built for AgoraHacks · April 2026 · Truth, unconcealed.*

</div>
