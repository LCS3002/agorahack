import type { ClassificationResult, ModuleData } from './types';
import { votingData, lobbyingData, newsData } from './mockData';

type DataKey =
  | 'natureRestoration'
  | 'aiAct'
  | 'csrd'
  | 'farmSubsidies'
  | 'pharma'
  | 'digitalServicesAct'
  | 'digitalMarketsAct';

function detectKey(query: string, entities: string[]): DataKey {
  const q = (query + ' ' + entities.join(' ')).toLowerCase();

  if (
    q.match(/digital services act|\bdsa\b|single market for digital|2020\/0361|2020-0361|com\(2020\)0825/)
  ) {
    return 'digitalServicesAct';
  }
  if (q.match(/digital markets act|\bdma\b|2020\/0374|2020-0374/)) {
    return 'digitalMarketsAct';
  }

  if (q.match(/ai act|artificial intelligence|benifei|tudorache|biometric/)) {
    return 'aiAct';
  }
  if (q.match(/nature restoration|nrl|luena|dorfmann|rewilding|ecosystem/)) {
    return 'natureRestoration';
  }
  if (q.match(/csrd|sustainability reporting|corporate sustainability/)) {
    return 'csrd';
  }
  if (q.match(/farm|subsid|cap |cop-a|copa|cogeca|agri|farmer|rural/)) {
    return 'farmSubsidies';
  }
  if (q.match(/pharma|pfizer|vaccine|leyen|biontech|sanofi|novartis|text|message/)) {
    return 'pharma';
  }
  if (q.match(/lobby|influenc|money|donor|spend|register/)) {
    return 'farmSubsidies'; // default lobbying topic
  }
  if (q.match(/green deal|climate|emission|carbon/)) {
    return 'natureRestoration';
  }

  // Default fallback
  return 'aiAct';
}

export function selectMockData(
  classification: ClassificationResult,
  query: string
): ModuleData {
  const key = detectKey(query, classification.entities);

  const data: ModuleData = {};

  if (classification.modules.includes('VOTING')) {
    data.voting = votingData[key] ?? votingData.aiAct;
  }
  if (classification.modules.includes('LOBBYING')) {
    const lobbyKey = key === 'csrd' ? 'natureRestoration' : key;
    data.lobbying = lobbyingData[lobbyKey] ?? lobbyingData.aiAct;
  }
  if (classification.modules.includes('NEWS')) {
    const newsKey = key === 'csrd' ? 'natureRestoration' : key;
    data.news = newsData[newsKey] ?? newsData.aiAct;
  }

  return data;
}
