import type { RepositoryModel } from '../types';
import type { SizeTierName } from './cityTypes';

export interface ImportanceResult {
  score: number;        // 0..1 normalized
  tier: SizeTierName;   // shed | house | block | tower | landmark
  footprint: number;    // width/depth in world units
  heightPx: number;     // building height in pixels
  plotRadius: number;   // breathing room buffer for layout
}

/**
 * Multi-signal weighted calculation of repository prominence:
 * Stars (30%), Forks (15%), Size (20%), Activity (15%), Issues/PRs (10%), Topic/maturity (10%)
 */
export function computeImportance(
  repo: RepositoryModel,
  maxStars = 1000,
  maxSizeKb = 60000
): ImportanceResult {
  // 1. Stars component (logarithmic)
  const starScore = Math.min(1, Math.log10((repo.stars || 0) + 1) / Math.max(1, Math.log10(maxStars + 1)));

  // 2. Forks component (capped logarithmic)
  const forkScore = Math.min(1, Math.log10((repo.forks || 0) + 1) / 3);

  // 3. Size component (logarithmic)
  const sizeScore = Math.min(1, Math.log10((repo.sizeKb || 100) + 1) / Math.max(1, Math.log10(maxSizeKb + 1)));

  // 4. Activity factor based on last pushed date
  const daysSincePush = Math.max(0, (Date.now() - new Date(repo.lastPushedAt || Date.now()).getTime()) / 86_400_000);
  let activityScore = 0.2;
  if (daysSincePush <= 14) activityScore = 1.0;
  else if (daysSincePush <= 45) activityScore = 0.8;
  else if (daysSincePush <= 120) activityScore = 0.55;
  else if (daysSincePush <= 365) activityScore = 0.35;

  // 5. Community & collaboration cue (issues + PRs)
  const totalItems = (repo.openIssues || 0) + (repo.openPullRequests || 0);
  const issuesScore = Math.min(1, Math.log10(totalItems + 1) / 2);

  // 6. Topic density / metadata maturity
  const topicScore = Math.min(1, (repo.topics?.length || 0) / 5 + (repo.description ? 0.3 : 0));

  // Weighted composition
  const total =
    starScore * 0.30 +
    forkScore * 0.15 +
    sizeScore * 0.20 +
    activityScore * 0.15 +
    issuesScore * 0.10 +
    topicScore * 0.10;

  const score = Math.max(0.05, Math.min(1.0, total));

  // Determine tier based on composite score & star prestige
  let tier: SizeTierName = 'shed';
  let heightPx = 58;
  let footprint = 42;
  let plotRadius = 60;

  if (score >= 0.72 || (repo.stars || 0) >= 500) {
    tier = 'landmark';
    heightPx = 210;
    footprint = 98;
    plotRadius = 135;
  } else if (score >= 0.50 || (repo.stars || 0) >= 100) {
    tier = 'tower';
    heightPx = 154;
    footprint = 78;
    plotRadius = 105;
  } else if (score >= 0.32 || (repo.stars || 0) >= 15) {
    tier = 'block';
    heightPx = 112;
    footprint = 62;
    plotRadius = 80;
  } else if (score >= 0.18 || (repo.stars || 0) >= 3) {
    tier = 'house';
    heightPx = 80;
    footprint = 50;
    plotRadius = 65;
  }

  return {
    score: Number(score.toFixed(3)),
    tier,
    footprint,
    heightPx,
    plotRadius
  };
}
