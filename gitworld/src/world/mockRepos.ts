import type { RepositoryModel } from '../types';

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

/**
 * A believable GitHub account: a personal cluster plus two organizations,
 * spanning fresh, quiet, and long-dormant repositories, a range of star
 * tiers, and a couple of heavily-forked projects — enough range to show
 * every rule in the mapping table without reading like a fixture.
 */
export function getDemoRepos(): RepositoryModel[] {
  const raw: Array<Partial<RepositoryModel> & { fullName: string }> = [
    { fullName: 'rowan-fell/atlas-engine', description: 'A physics-driven 2D world engine.', primaryLanguage: 'TypeScript', stars: 1840, forks: 210, openIssues: 12, openPullRequests: 3, sizeKb: 48000, lastPushedAt: daysAgo(2), topics: ['engine', 'physics', 'canvas'] },
    { fullName: 'rowan-fell/tempo', description: 'A tiny scheduler for background jobs.', primaryLanguage: 'Go', stars: 62, forks: 9, openIssues: 3, openPullRequests: 1, sizeKb: 3400, lastPushedAt: daysAgo(6), topics: ['jobs', 'cli'] },
    { fullName: 'rowan-fell/parchment', description: 'Markdown notes that render like paper.', primaryLanguage: 'Rust', stars: 305, forks: 44, openIssues: 7, openPullRequests: 2, sizeKb: 9800, lastPushedAt: daysAgo(18), topics: ['notes', 'markdown'] },
    { fullName: 'rowan-fell/color-lark', description: 'Palette extraction from any image.', primaryLanguage: 'Python', stars: 18, forks: 2, openIssues: 1, openPullRequests: 0, sizeKb: 1200, lastPushedAt: daysAgo(95), topics: ['color', 'image'] },
    { fullName: 'rowan-fell/old-portfolio', description: 'My first personal site, kept for nostalgia.', primaryLanguage: 'HTML', stars: 4, forks: 0, openIssues: 0, openPullRequests: 0, sizeKb: 800, lastPushedAt: daysAgo(920), topics: ['portfolio'] },
    { fullName: 'rowan-fell/thesis-sim', description: 'Simulation code from a university thesis.', primaryLanguage: 'C++', stars: 2, forks: 1, openIssues: 0, openPullRequests: 0, sizeKb: 5200, lastPushedAt: daysAgo(1380), topics: ['research'] },
    { fullName: 'rowan-fell/dotfiles', description: 'Shell config and terminal setup.', primaryLanguage: 'Shell', stars: 31, forks: 12, openIssues: 0, openPullRequests: 1, sizeKb: 400, lastPushedAt: daysAgo(11), topics: ['config'] },
    { fullName: 'rowan-fell/weekend-game-jam', description: 'A 48-hour game jam prototype.', primaryLanguage: 'C++', stars: 9, forks: 1, openIssues: 2, openPullRequests: 0, sizeKb: 2100, lastPushedAt: daysAgo(410), topics: ['game-jam'] },

    { fullName: 'brightloop/api-gateway', description: 'Edge gateway for the Brightloop platform.', primaryLanguage: 'Go', stars: 940, forks: 88, openIssues: 21, openPullRequests: 5, sizeKb: 61000, lastPushedAt: daysAgo(1), topics: ['gateway', 'infra'] },
    { fullName: 'brightloop/design-kit', description: 'Shared component library and tokens.', primaryLanguage: 'TypeScript', stars: 260, forks: 34, openIssues: 9, openPullRequests: 4, sizeKb: 22000, lastPushedAt: daysAgo(4), topics: ['design-system'] },
    { fullName: 'brightloop/billing-service', description: 'Subscription billing and invoicing.', primaryLanguage: 'Java', stars: 41, forks: 6, openIssues: 5, openPullRequests: 0, sizeKb: 34000, lastPushedAt: daysAgo(60), topics: ['billing'] },

    { fullName: 'lantern-collective/lantern-cli', description: 'Command line tool for the Lantern data pipeline.', primaryLanguage: 'Python', stars: 128, forks: 15, openIssues: 4, openPullRequests: 2, sizeKb: 8700, lastPushedAt: daysAgo(9), topics: ['pipeline', 'cli'] },
    { fullName: 'lantern-collective/lantern-docs', description: 'Documentation site for Lantern.', primaryLanguage: 'CSS', stars: 15, forks: 3, openIssues: 1, openPullRequests: 0, sizeKb: 1900, lastPushedAt: daysAgo(140), topics: ['docs'] },
    { fullName: 'lantern-collective/legacy-importer', description: 'One-off migration script, rarely touched.', primaryLanguage: 'Ruby', stars: 3, forks: 0, openIssues: 0, openPullRequests: 0, sizeKb: 900, lastPushedAt: daysAgo(760), topics: ['migration'] },
  ];

  return raw.map((r, i) => ({
    id: 900000 + i,
    name: r.fullName.split('/')[1],
    fullName: r.fullName,
    description: r.description ?? '',
    htmlUrl: `https://github.com/${r.fullName}`,
    primaryLanguage: r.primaryLanguage ?? 'Other',
    stars: r.stars ?? 0,
    forks: r.forks ?? 0,
    openIssues: r.openIssues ?? 0,
    openPullRequests: r.openPullRequests ?? 0,
    sizeKb: r.sizeKb ?? 500,
    sizeTier: (r.sizeKb ?? 500) > 20000 ? 'large' : (r.sizeKb ?? 500) > 4000 ? 'medium' : 'small',
    lastPushedAt: r.lastPushedAt ?? daysAgo(30),
    isFork: false,
    topics: r.topics ?? [],
  }));
}

export function getDemoUser() {
  return {
    username: 'rowan-fell',
    displayName: 'Rowan Fell',
    avatarUrl: 'https://avatars.githubusercontent.com/u/9919?v=4',
    htmlUrl: 'https://github.com/rowan-fell',
    totalRepos: getDemoRepos().length,
  };
}

/** A very small account, to exercise the sparse-city state honestly. */
export function getSparseDemoRepos(): RepositoryModel[] {
  return getDemoRepos().slice(0, 3);
}
