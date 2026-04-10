import type { VoteResult, LobbyingResult, NewsResult } from './types';

// ── VOTING MOCK DATA ──────────────────────────────────────────────────────────

export const votingData: Record<string, VoteResult> = {
  natureRestoration: {
    lawName: 'Nature Restoration Law',
    shortName: 'NRL',
    status: 'PASSED',
    votes: { for: 336, against: 300, abstain: 18, total: 654 },
    partyBreakdown: [
      { party: 'EPP',    for: 22,  against: 133, abstain: 8,  color: '#8B7355' },
      { party: 'S&D',    for: 139, against: 0,   abstain: 3,  color: '#6B5B45' },
      { party: 'Renew',  for: 70,  against: 22,  abstain: 4,  color: '#9C8B72' },
      { party: 'Greens', for: 67,  against: 0,   abstain: 0,  color: '#7A8B6B' },
      { party: 'ECR',    for: 2,   against: 64,  abstain: 2,  color: '#B8A89A' },
      { party: 'ID',     for: 0,   against: 59,  abstain: 0,  color: '#C9B8A8' },
    ],
    keyMEPs: [
      { name: 'César Luena',     party: 'S&D',    country: 'ES', vote: 'FOR',     note: 'Rapporteur' },
      { name: 'Herbert Dorfmann',party: 'EPP',    country: 'IT', vote: 'AGAINST', note: 'EPP shadow rapporteur' },
      { name: 'Pascal Durand',   party: 'Renew',  country: 'FR', vote: 'FOR' },
      { name: 'Niclas Herbst',   party: 'EPP',    country: 'DE', vote: 'AGAINST' },
      { name: 'Martin Hojsík',   party: 'Renew',  country: 'SK', vote: 'FOR' },
    ],
    date: '2023-07-11',
    committee: 'ENVI',
    reference: '2022/0195(COD)',
  },

  aiAct: {
    lawName: 'EU Artificial Intelligence Act',
    shortName: 'AI Act',
    status: 'PASSED',
    votes: { for: 523, against: 46, abstain: 49, total: 618 },
    partyBreakdown: [
      { party: 'EPP',    for: 160, against: 3,  abstain: 12, color: '#8B7355' },
      { party: 'S&D',    for: 134, against: 4,  abstain: 5,  color: '#6B5B45' },
      { party: 'Renew',  for: 88,  against: 6,  abstain: 8,  color: '#9C8B72' },
      { party: 'Greens', for: 58,  against: 0,  abstain: 6,  color: '#7A8B6B' },
      { party: 'ECR',    for: 42,  against: 15, abstain: 9,  color: '#B8A89A' },
      { party: 'ID',     for: 12,  against: 14, abstain: 5,  color: '#C9B8A8' },
    ],
    keyMEPs: [
      { name: 'Brando Benifei',   party: 'S&D',   country: 'IT', vote: 'FOR', note: 'Co-rapporteur' },
      { name: 'Dragoș Tudorache', party: 'Renew', country: 'RO', vote: 'FOR', note: 'Co-rapporteur' },
      { name: 'Svenja Hahn',      party: 'Renew', country: 'DE', vote: 'FOR' },
      { name: 'Axel Voss',        party: 'EPP',   country: 'DE', vote: 'FOR' },
      { name: 'Patrick Breyer',   party: 'Greens',country: 'DE', vote: 'AGAINST', note: 'Biometric surveillance concern' },
    ],
    date: '2024-03-13',
    committee: 'IMCO / LIBE',
    reference: '2021/0106(COD)',
  },

  csrd: {
    lawName: 'Corporate Sustainability Reporting Directive',
    shortName: 'CSRD',
    status: 'PASSED',
    votes: { for: 525, against: 60, abstain: 28, total: 613 },
    partyBreakdown: [
      { party: 'EPP',    for: 88,  against: 52, abstain: 18, color: '#8B7355' },
      { party: 'S&D',    for: 143, against: 0,  abstain: 1,  color: '#6B5B45' },
      { party: 'Renew',  for: 91,  against: 5,  abstain: 5,  color: '#9C8B72' },
      { party: 'Greens', for: 68,  against: 0,  abstain: 0,  color: '#7A8B6B' },
      { party: 'ECR',    for: 8,   against: 33, abstain: 3,  color: '#B8A89A' },
      { party: 'ID',     for: 2,   against: 45, abstain: 0,  color: '#C9B8A8' },
    ],
    keyMEPs: [
      { name: 'Pascal Durand',    party: 'Renew', country: 'FR', vote: 'FOR', note: 'Rapporteur' },
      { name: 'Lara Wolters',     party: 'S&D',   country: 'NL', vote: 'FOR' },
      { name: 'Vilhelm Garland',  party: 'EPP',   country: 'SE', vote: 'AGAINST' },
    ],
    date: '2022-11-10',
    committee: 'JURI / ECON',
    reference: '2021/0104(COD)',
  },

  farmSubsidies: {
    lawName: 'CAP Strategic Plans Regulation',
    shortName: 'CAP Reform',
    status: 'PASSED',
    votes: { for: 452, against: 178, abstain: 57, total: 687 },
    partyBreakdown: [
      { party: 'EPP',    for: 158, against: 5,   abstain: 4,  color: '#8B7355' },
      { party: 'S&D',    for: 88,  against: 42,  abstain: 18, color: '#6B5B45' },
      { party: 'Renew',  for: 72,  against: 28,  abstain: 14, color: '#9C8B72' },
      { party: 'Greens', for: 4,   against: 64,  abstain: 6,  color: '#7A8B6B' },
      { party: 'ECR',    for: 58,  against: 4,   abstain: 6,  color: '#B8A89A' },
      { party: 'ID',     for: 45,  against: 8,   abstain: 3,  color: '#C9B8A8' },
    ],
    keyMEPs: [
      { name: 'Peter Jahr',          party: 'EPP',   country: 'DE', vote: 'FOR', note: 'Co-rapporteur' },
      { name: 'Paolo De Castro',     party: 'S&D',   country: 'IT', vote: 'FOR', note: 'Co-rapporteur' },
      { name: 'Norbert Lins',        party: 'EPP',   country: 'DE', vote: 'FOR' },
      { name: 'Martin Häusling',     party: 'Greens',country: 'DE', vote: 'AGAINST', note: 'Insufficient green conditionality' },
    ],
    date: '2021-11-23',
    committee: 'AGRI',
    reference: '2018/0216(COD)',
  },
};

// ── LOBBYING MOCK DATA ────────────────────────────────────────────────────────

export const lobbyingData: Record<string, LobbyingResult> = {
  natureRestoration: {
    topic: 'Nature Restoration Law',
    totalDeclaredSpend: 14.3,
    period: '2022–2023',
    registryUrl: 'https://ec.europa.eu/transparencyregister',
    organizations: [
      { rank: 1, name: 'COPA-COGECA',          spend: 3.2, meetings: 47, sector: 'Agriculture' },
      { rank: 2, name: 'BusinessEurope',        spend: 2.8, meetings: 38, sector: 'Industry' },
      { rank: 3, name: 'European Landowners',   spend: 1.9, meetings: 22, sector: 'Land' },
      { rank: 4, name: 'Eureau',                spend: 1.4, meetings: 16, sector: 'Utilities' },
      { rank: 5, name: 'WWF European Policy',   spend: 0.8, meetings: 31, sector: 'NGO' },
    ],
    conflictFlags: [
      { mepName: 'Herbert Dorfmann', party: 'EPP', meetings: 9, votedFor: false, lobbyist: 'COPA-COGECA', amount: 3.2 },
      { mepName: 'Niclas Herbst',    party: 'EPP', meetings: 6, votedFor: false, lobbyist: 'BusinessEurope', amount: 2.8 },
    ],
  },

  aiAct: {
    topic: 'EU AI Act',
    totalDeclaredSpend: 97.4,
    period: '2021–2024',
    registryUrl: 'https://ec.europa.eu/transparencyregister',
    organizations: [
      { rank: 1, name: 'Google / Alphabet',   spend: 8.25, meetings: 84, sector: 'Big Tech' },
      { rank: 2, name: 'Microsoft',            spend: 7.10, meetings: 72, sector: 'Big Tech' },
      { rank: 3, name: 'Apple',                spend: 5.80, meetings: 41, sector: 'Big Tech' },
      { rank: 4, name: 'Meta Platforms',       spend: 5.50, meetings: 63, sector: 'Big Tech' },
      { rank: 5, name: 'IBM',                  spend: 4.20, meetings: 38, sector: 'Technology' },
      { rank: 6, name: 'Mistral AI',           spend: 0.90, meetings: 22, sector: 'AI Startup' },
    ],
    conflictFlags: [
      { mepName: 'Axel Voss',         party: 'EPP', meetings: 14, votedFor: true, lobbyist: 'Google / Alphabet', amount: 8.25 },
      { mepName: 'Svenja Hahn',       party: 'Renew', meetings: 8, votedFor: true, lobbyist: 'Microsoft', amount: 7.10 },
    ],
  },

  pharma: {
    topic: 'EU Pharmaceutical Legislation / von der Leyen',
    totalDeclaredSpend: 52.8,
    period: '2020–2023',
    registryUrl: 'https://ec.europa.eu/transparencyregister',
    organizations: [
      { rank: 1, name: 'EFPIA (Pharma Assoc.)',  spend: 8.75, meetings: 92, sector: 'Pharma' },
      { rank: 2, name: 'Pfizer',                 spend: 6.30, meetings: 44, sector: 'Pharma' },
      { rank: 3, name: 'Novartis',               spend: 5.10, meetings: 38, sector: 'Pharma' },
      { rank: 4, name: 'Roche',                  spend: 4.80, meetings: 31, sector: 'Pharma' },
      { rank: 5, name: 'AstraZeneca',            spend: 4.20, meetings: 28, sector: 'Pharma' },
      { rank: 6, name: 'Sanofi',                 spend: 3.90, meetings: 26, sector: 'Pharma' },
    ],
    conflictFlags: [
      {
        mepName: 'Ursula von der Leyen',
        party: 'EPP',
        meetings: 6,
        votedFor: true,
        lobbyist: 'Pfizer',
        amount: 6.30,
      },
    ],
  },

  farmSubsidies: {
    topic: 'CAP / Farm Subsidies',
    totalDeclaredSpend: 28.6,
    period: '2020–2022',
    registryUrl: 'https://ec.europa.eu/transparencyregister',
    organizations: [
      { rank: 1, name: 'COPA-COGECA',            spend: 3.20, meetings: 58, sector: 'Agriculture' },
      { rank: 2, name: 'EuropaBio',              spend: 2.70, meetings: 34, sector: 'Agri-biotech' },
      { rank: 3, name: 'CEJA (Young Farmers)',   spend: 1.80, meetings: 22, sector: 'Agriculture' },
      { rank: 4, name: 'Fertilizers Europe',     spend: 1.60, meetings: 18, sector: 'Chemicals' },
      { rank: 5, name: 'WWF European Policy',    spend: 0.95, meetings: 41, sector: 'NGO' },
    ],
    conflictFlags: [
      { mepName: 'Peter Jahr',      party: 'EPP', meetings: 12, votedFor: true, lobbyist: 'COPA-COGECA', amount: 3.20 },
      { mepName: 'Norbert Lins',    party: 'EPP', meetings: 9,  votedFor: true, lobbyist: 'EuropaBio', amount: 2.70 },
    ],
  },
};

// ── NEWS MOCK DATA ────────────────────────────────────────────────────────────

function daysAgo(n: number): string {
  const d = new Date(Date.now() - n * 86400000);
  return d.toISOString().split('T')[0];
}

export const newsData: Record<string, NewsResult> = {
  natureRestoration: {
    topic: 'Nature Restoration Law',
    overallSentiment: -0.18,
    sentimentLabel: 'MIXED',
    sentimentHistory: [
      { date: daysAgo(29), score: -0.42 },
      { date: daysAgo(25), score: -0.35 },
      { date: daysAgo(21), score: -0.50 },
      { date: daysAgo(18), score: -0.28 },
      { date: daysAgo(14), score: -0.10 },
      { date: daysAgo(11), score:  0.08 },
      { date: daysAgo(8),  score:  0.15 },
      { date: daysAgo(5),  score: -0.05 },
      { date: daysAgo(2),  score: -0.18 },
      { date: daysAgo(0),  score: -0.22 },
    ],
    headlines: [
      { source: 'Politico EU', title: 'Parliament passes Nature Restoration Law by narrow margin after months of deadlock', sentiment:  0.12, date: daysAgo(8),  lean: 'CENTRE' },
      { source: 'EURACTIV',    title: 'Farmers\' groups warn restoration targets will devastate rural livelihoods',          sentiment: -0.68, date: daysAgo(11), lean: 'RIGHT' },
      { source: 'The Guardian', title: 'Historic EU nature law passes — but scientists say targets were watered down',       sentiment: -0.20, date: daysAgo(7),  lean: 'LEFT' },
      { source: 'Die Welt',    title: 'Von der Leyen under pressure as EPP fractures on green agenda',                     sentiment: -0.55, date: daysAgo(14), lean: 'RIGHT' },
    ],
    framingDivergence: {
      left:   'Landmark but compromised. Necessary first step, gutted by agricultural lobbying.',
      centre: 'Narrow passage signals polarisation. Implementation will face legal challenges.',
      right:  'Regulatory overreach. Family farms sacrificed for ideological environmentalism.',
    },
  },

  aiAct: {
    topic: 'EU AI Act',
    overallSentiment: 0.24,
    sentimentLabel: 'MIXED',
    sentimentHistory: [
      { date: daysAgo(29), score:  0.45 },
      { date: daysAgo(25), score:  0.38 },
      { date: daysAgo(21), score:  0.52 },
      { date: daysAgo(18), score:  0.28 },
      { date: daysAgo(14), score:  0.20 },
      { date: daysAgo(11), score:  0.15 },
      { date: daysAgo(8),  score:  0.10 },
      { date: daysAgo(5),  score:  0.22 },
      { date: daysAgo(2),  score:  0.30 },
      { date: daysAgo(0),  score:  0.24 },
    ],
    headlines: [
      { source: 'Financial Times',  title: 'EU AI Act becomes law — what it means for developers and companies worldwide',     sentiment:  0.18, date: daysAgo(5),  lean: 'CENTRE' },
      { source: 'Wired',            title: 'Tech giants secured last-minute exemptions in final AI Act text, documents show',  sentiment: -0.42, date: daysAgo(12), lean: 'LEFT' },
      { source: 'EURACTIV',         title: 'AI Act: Europe\'s regulation bid or innovation suicide?',                          sentiment: -0.28, date: daysAgo(18), lean: 'RIGHT' },
      { source: 'Le Monde',         title: 'L\'Europe s\'impose comme référence mondiale sur la régulation de l\'IA',          sentiment:  0.62, date: daysAgo(8),  lean: 'LEFT' },
    ],
    framingDivergence: {
      left:   'Historic rights protection framework, though enforcement mechanisms remain weak.',
      centre: 'World-first regulation sets global benchmark despite corporate lobbying.',
      right:  'Compliance costs will drive AI innovation to US and China. Europe self-harms.',
    },
  },

  pharma: {
    topic: 'Von der Leyen / Pharmaceutical Lobby',
    overallSentiment: -0.52,
    sentimentLabel: 'NEGATIVE',
    sentimentHistory: [
      { date: daysAgo(29), score: -0.30 },
      { date: daysAgo(25), score: -0.38 },
      { date: daysAgo(21), score: -0.55 },
      { date: daysAgo(18), score: -0.62 },
      { date: daysAgo(14), score: -0.70 },
      { date: daysAgo(11), score: -0.65 },
      { date: daysAgo(8),  score: -0.48 },
      { date: daysAgo(5),  score: -0.55 },
      { date: daysAgo(2),  score: -0.50 },
      { date: daysAgo(0),  score: -0.52 },
    ],
    headlines: [
      { source: 'New York Times',  title: 'E.U. court orders Commission to release von der Leyen\'s Pfizer text messages',   sentiment: -0.72, date: daysAgo(4),  lean: 'CENTRE' },
      { source: 'Politico EU',     title: 'The €35 billion question: what happened to the COVID vaccine contract texts?',     sentiment: -0.65, date: daysAgo(9),  lean: 'CENTRE' },
      { source: 'Der Spiegel',     title: 'Vaccine deal under scrutiny: Bourla calls, deleted messages, and accountability gaps', sentiment: -0.78, date: daysAgo(15), lean: 'LEFT' },
      { source: 'The Telegraph',   title: 'EU transparency deficit on show as vaccine text saga drags on',                    sentiment: -0.45, date: daysAgo(20), lean: 'RIGHT' },
    ],
    framingDivergence: {
      left:   'Democratic deficit. Personal diplomacy bypassed EU institutions. Accountability demanded.',
      centre: 'Transparency failure regardless of content. Process violated procurement rules.',
      right:  'Vaccines worked. Opposition is political opportunism masquerading as principle.',
    },
  },

  farmSubsidies: {
    topic: 'EU Farm Subsidies / CAP',
    overallSentiment: -0.15,
    sentimentLabel: 'MIXED',
    sentimentHistory: [
      { date: daysAgo(29), score:  0.05 },
      { date: daysAgo(25), score: -0.08 },
      { date: daysAgo(21), score: -0.20 },
      { date: daysAgo(18), score: -0.35 },
      { date: daysAgo(14), score: -0.28 },
      { date: daysAgo(11), score: -0.18 },
      { date: daysAgo(8),  score: -0.10 },
      { date: daysAgo(5),  score: -0.05 },
      { date: daysAgo(2),  score: -0.12 },
      { date: daysAgo(0),  score: -0.15 },
    ],
    headlines: [
      { source: 'EURACTIV',       title: 'Farmers\' protests force EU to roll back Green Deal agriculture targets',  sentiment: -0.30, date: daysAgo(6),  lean: 'RIGHT' },
      { source: 'The Economist',  title: 'Europe\'s farm subsidies: a €400 billion question nobody wants to answer', sentiment: -0.40, date: daysAgo(14), lean: 'CENTRE' },
      { source: 'Libération',     title: 'CAP: les grandes exploitations captent 80% des aides, les petits paysans sont laissés pour compte', sentiment: -0.55, date: daysAgo(10), lean: 'LEFT' },
      { source: 'Handelsblatt',   title: 'Agrarpolitik: Subventionen ohne Gegenleistung können kein Dauerzustand sein', sentiment: -0.25, date: daysAgo(20), lean: 'RIGHT' },
    ],
    framingDivergence: {
      left:   'Regressive redistribution. Agribusiness captures public money. Reform overdue.',
      centre: 'CAP reform stalled by electoral pressure and lobbying. Green ambitions sacrificed.',
      right:  'Farmers deserve support. Food security is a strategic imperative, not ideology.',
    },
  },
};
