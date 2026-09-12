import type { RepositoryModel } from '../types';
import type { ActivityState, SizeTierName } from './cityTypes';
import { type LanguageStyle } from './languageStyles';
import { type ImportanceResult } from './importance';
import { seededRandom } from './rng';

export type EcologicalState = 'active' | 'quiet' | 'aging' | 'overgrown' | 'old';
export type ProjectType = 'frontend' | 'backend' | 'library' | 'cli' | 'data' | 'documentation' | 'fullstack' | 'general';
export type MassingGrammar = 'central_tower' | 'stepped_setback' | 'l_shaped' | 'terraced_pavilion' | 'modular_compound';

export interface BuildingVisualProfile {
  repoId: number;
  stableSeed: string;
  tier: SizeTierName;
  tierReason: string;
  footprint: number;
  heightPx: number;
  importanceScore: number;
  dominantLanguage: string;
  style: LanguageStyle;
  projectType: ProjectType;
  projectTypeReason: string;
  activityState: ActivityState;
  daysSincePush: number;
  lastPushedAt: string;
  ecologicalState: EcologicalState;
  ecologicalAgeDescription: string;
  overgrowthLevel: number;    // 0.0 (pristine) .. 1.0 (deeply overgrown)
  weatheringFactor: number;   // 0.0 (fresh) .. 1.0 (aged/weathered)
  stars: number;
  forks: number;
  contributorCount: number;
  openIssues: number;
  openPullRequests: number;
  hasConstruction: boolean;
  issuesShown: number;
  architecturalMotif: LanguageStyle['motif'];
  massingGrammar: MassingGrammar;
  signalsSummary: string[];
}

function detectProjectType(repo: RepositoryModel): { type: ProjectType; reason: string } {
  const text = `${repo.name} ${repo.description || ''} ${(repo.topics || []).join(' ')}`.toLowerCase();
  const lang = (repo.primaryLanguage || '').toLowerCase();

  if (text.includes('doc') || text.includes('guide') || text.includes('book') || text.includes('awesome-')) {
    return { type: 'documentation', reason: 'Contains documentation, guides, or informational repositories' };
  }
  if (text.includes('cli') || text.includes('tool') || text.includes('command-line') || text.includes('script') || lang === 'shell') {
    return { type: 'cli', reason: 'CLI utility / developer tool profile detected' };
  }
  if (text.includes('ui') || text.includes('frontend') || text.includes('react') || text.includes('vue') || text.includes('web') || lang === 'html' || lang === 'css') {
    return { type: 'frontend', reason: 'Frontend user-interface application with presentation facades' };
  }
  if (text.includes('api') || text.includes('server') || text.includes('backend') || text.includes('microservice') || text.includes('database')) {
    return { type: 'backend', reason: 'Backend service infrastructure with robust core volumes' };
  }
  if (text.includes('data') || text.includes('ml') || text.includes('ai') || text.includes('dataset') || text.includes('analytics')) {
    return { type: 'data', reason: 'Data-intensive project with archival/storage massing' };
  }
  if (text.includes('fullstack') || text.includes('app') || text.includes('platform')) {
    return { type: 'fullstack', reason: 'Fullstack application featuring combined public and service wings' };
  }
  if (text.includes('lib') || text.includes('sdk') || text.includes('package') || text.includes('module')) {
    return { type: 'library', reason: 'Reusable library / SDK with structured modular pavilions' };
  }
  return { type: 'general', reason: 'Standard software repository with balanced civic architecture' };
}

function calculateEcologicalAging(daysSincePush: number): {
  state: EcologicalState;
  desc: string;
  overgrowthLevel: number;
  weatheringFactor: number;
} {
  if (daysSincePush <= 30) {
    return {
      state: 'active',
      desc: 'Active — maintained grounds, clean stone plazas, lit windows',
      overgrowthLevel: 0.0,
      weatheringFactor: 0.05,
    };
  }
  if (daysSincePush <= 180) {
    return {
      state: 'quiet',
      desc: 'Quiet — calm maintained grounds, slight lawn softening',
      overgrowthLevel: 0.15,
      weatheringFactor: 0.2,
    };
  }
  if (daysSincePush <= 365) {
    return {
      state: 'aging',
      desc: 'Aging — small grass patches, early climbing vines, cooling facade tones',
      overgrowthLevel: 0.45,
      weatheringFactor: 0.45,
    };
  }
  if (daysSincePush <= 1095) { // 1 to 3 years
    return {
      state: 'overgrown',
      desc: 'Overgrown (1–3 years) — noticeable grass tufts, shrubs, young trees, creeping ivy',
      overgrowthLevel: 0.75,
      weatheringFactor: 0.7,
    };
  }
  return {
    state: 'old',
    desc: 'Old building (3+ years) — mature trees, dense grass, weathered facade, rich mossy patina',
    overgrowthLevel: 1.0,
    weatheringFactor: 0.95,
  };
}

export function generateBuildingVisualProfile(
  repo: RepositoryModel,
  importance: ImportanceResult,
  activityState: ActivityState,
  style: LanguageStyle,
  issuesShown: number,
  hasConstruction: boolean,
  contributorCount: number
): BuildingVisualProfile {
  const stableSeed = `${repo.id}:${repo.name}`;
  const rng = seededRandom(stableSeed);

  const daysSincePush = Math.max(0, Math.floor((Date.now() - new Date(repo.lastPushedAt || Date.now()).getTime()) / 86_400_000));
  const eco = calculateEcologicalAging(daysSincePush);
  const projectTypeInfo = detectProjectType(repo);

  const grammars: MassingGrammar[] = ['central_tower', 'stepped_setback', 'l_shaped', 'terraced_pavilion', 'modular_compound'];
  const grammarIdx = Math.floor(rng() * grammars.length);
  const massingGrammar = importance.tier === 'landmark' ? 'central_tower' : grammars[grammarIdx];

  let tierReason = '';
  if (importance.tier === 'landmark') {
    tierReason = `Landmark tier (${repo.stars} stars, prominence score ${importance.score}) commands a signature civic scale.`;
  } else if (importance.tier === 'tower') {
    tierReason = `Tower tier (${repo.stars} stars, score ${importance.score}) gives prominent vertical elevation.`;
  } else if (importance.tier === 'block') {
    tierReason = `Block tier (${repo.stars} stars) reflects an active neighborhood-scale hub.`;
  } else if (importance.tier === 'house') {
    tierReason = `House tier (${repo.stars} stars) forms a personal studio workshop.`;
  } else {
    tierReason = `Shed tier represents a compact, focused repository.`;
  }

  const signalsSummary: string[] = [
    `Scale: ${tierReason}`,
    `Language Motif: ${repo.primaryLanguage || 'General'} influences the ${style.motif} roof silhouette and ${style.primary} palette.`,
    `Project Nature: ${projectTypeInfo.reason}.`,
    `Ecological Age: ${eco.desc} (${daysSincePush} days since last push).`,
  ];

  if (hasConstruction) {
    signalsSummary.push(`Active Construction: Open pull requests trigger scaffolding and crane arms.`);
  }
  if (issuesShown > 0) {
    signalsSummary.push(`Maintenance Alerts: ${issuesShown} open issues place visible warning beacons on the structure.`);
  }
  if (repo.forks >= 10) {
    signalsSummary.push(`Satellites: High fork count (${repo.forks}) deploys satellite outposts on the plot.`);
  }
  if (contributorCount > 0) {
    signalsSummary.push(`Occupancy: ${contributorCount} contributor agents active nearby.`);
  }

  return {
    repoId: repo.id,
    stableSeed,
    tier: importance.tier,
    tierReason,
    footprint: importance.footprint,
    heightPx: importance.heightPx,
    importanceScore: importance.score,
    dominantLanguage: repo.primaryLanguage || 'Unknown',
    style,
    projectType: projectTypeInfo.type,
    projectTypeReason: projectTypeInfo.reason,
    activityState,
    daysSincePush,
    lastPushedAt: repo.lastPushedAt,
    ecologicalState: eco.state,
    ecologicalAgeDescription: eco.desc,
    overgrowthLevel: eco.overgrowthLevel,
    weatheringFactor: eco.weatheringFactor,
    stars: repo.stars || 0,
    forks: repo.forks || 0,
    contributorCount,
    openIssues: repo.openIssues || 0,
    openPullRequests: repo.openPullRequests || 0,
    hasConstruction,
    issuesShown,
    architecturalMotif: style.motif,
    massingGrammar,
    signalsSummary,
  };
}
