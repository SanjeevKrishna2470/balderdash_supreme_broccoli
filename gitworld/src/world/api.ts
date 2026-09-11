import type { RepositoryModel } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:5000';

export interface LiveSession {
  username: string;
  displayName: string;
  avatarUrl: string;
  htmlUrl: string;
  repos: RepositoryModel[];
  privateAccess?: boolean;
}

interface MeResponse {
  isAuthenticated: boolean;
  privateAccess?: boolean;
  user: {
    id: number;
    username: string;
    displayName: string;
    avatarUrl: string;
    htmlUrl: string;
    publicRepos: number;
  } | null;
}

/** Checks whether an authenticated GitHub session already exists server-side. */
export async function fetchSession(): Promise<LiveSession | null> {
  const meRes = await fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' });
  if (!meRes.ok) return null;
  const me: MeResponse = await meRes.json();
  if (!me.isAuthenticated || !me.user) return null;

  const reposRes = await fetch(`${API_BASE}/api/repos`, { credentials: 'include' });
  if (reposRes.status === 401) return null; // session expired between the two calls
  if (!reposRes.ok) {
    const body = await reposRes.json().catch(() => null);
    throw new Error(body?.message || `GitHub data request failed (${reposRes.status})`);
  }
  const repos: RepositoryModel[] = await reposRes.json();

  return {
    username: me.user.username,
    displayName: me.user.displayName ?? me.user.username,
    avatarUrl: me.user.avatarUrl,
    htmlUrl: me.user.htmlUrl ?? `https://github.com/${me.user.username}`,
    repos,
    privateAccess: me.privateAccess === true,
  };
}

export function beginGithubLogin() {
  window.location.href = `${API_BASE}/api/auth/github`;
}

export function beginPrivateAccess() {
  window.location.href = `${API_BASE}/api/auth/github/private`;
}

export function beginMockLogin() {
  window.location.href = `${API_BASE}/api/auth/mock-login`;
}

export async function fetchUserByUsername(username: string): Promise<LiveSession> {
  const cleanUser = username.trim().replace(/^@/, '');
  if (!cleanUser) {
    throw new Error('Please enter a valid GitHub username.');
  }

  // First try the backend if available
  try {
    const res = await fetch(`${API_BASE}/api/world/${encodeURIComponent(cleanUser)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.user && Array.isArray(data.buildings)) {
        const repos: RepositoryModel[] = data.buildings.map((b: any) => b.repository);
        return {
          username: data.user.username,
          displayName: data.user.displayName || data.user.username,
          avatarUrl: data.user.avatarUrl,
          htmlUrl: data.user.htmlUrl,
          repos,
        };
      }
    }
  } catch {
    // Fall back to direct GitHub public API
  }

  // Fallback direct fetch to public GitHub API
  const userRes = await fetch(`https://api.github.com/users/${encodeURIComponent(cleanUser)}`);
  if (!userRes.ok) {
    throw new Error(`GitHub user "${cleanUser}" not found (${userRes.status}).`);
  }
  const ghUser = await userRes.json();

  const reposRes = await fetch(
    `https://api.github.com/users/${encodeURIComponent(cleanUser)}/repos?per_page=100&sort=pushed&direction=desc`
  );
  if (!reposRes.ok) {
    throw new Error(`Failed to load repositories for "${cleanUser}" (${reposRes.status}).`);
  }
  const rawRepos = await reposRes.json();
  const repos: RepositoryModel[] = rawRepos.map((r: any) => ({
    id: r.id,
    name: r.name,
    fullName: r.full_name,
    description: r.description || '',
    htmlUrl: r.html_url,
    primaryLanguage: r.language || 'Other',
    stars: r.stargazers_count,
    forks: r.forks_count,
    openIssues: r.open_issues_count,
    sizeKb: r.size,
    sizeTier: r.size > 20000 ? 'large' : r.size > 4000 ? 'medium' : 'small',
    lastPushedAt: r.pushed_at,
    isFork: r.fork,
    topics: r.topics || [],
  }));

  return {
    username: ghUser.login,
    displayName: ghUser.name || ghUser.login,
    avatarUrl: ghUser.avatar_url,
    htmlUrl: ghUser.html_url,
    repos,
  };
}

export async function logout(): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch {
    // Ignore network error on logout
  }
}

export interface CreateRepoPayload {
  name: string;
  description?: string;
  isPrivate?: boolean;
  autoInit?: boolean;
  gitignoreTemplate?: string;
  licenseTemplate?: string;
  projectType?: string;
}

export interface CreateRepoResult {
  success: boolean;
  message: string;
  repo: RepositoryModel;
  mode: 'demo' | 'live';
}

export async function createRepository(payload: CreateRepoPayload): Promise<CreateRepoResult> {
  const res = await fetch(`${API_BASE}/api/repos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || data.error || `Failed to create repository (${res.status})`);
  }

  return res.json();
}

export interface PublicWorldManifest {
  worldId: string;
  repositoryId: string;
  ownerHandle: string;
  repositoryName: string;
  displayName: string;
  visibility: 'landmark' | 'explorable' | 'custom';
  regionId: string;
  regionName?: string;
  cellId: string;
  buildingTier: number;
  projectType?: string;
  primaryLanguage?: string;
  languageMix: Record<string, number>;
  stars: number;
  forks: number;
  contributorCount?: number;
  activityState: 'active' | 'quiet' | 'dormant';
  hasDocumentation: boolean;
  hasTests: boolean;
  codeCategories: string[];
  worldSeed: number;
  updatedAt: string;
  description?: string;
  htmlUrl?: string;
}

export async function fetchPublicWorldManifests(): Promise<PublicWorldManifest[]> {
  try {
    const res = await fetch(`${API_BASE}/api/world/public-manifests`);
    if (res.ok) {
      return res.json();
    }
  } catch {
    // Fallback to local defaults if server offline
  }

  return [
    {
      worldId: 'world-react',
      repositoryId: 'repo-react',
      ownerHandle: 'facebook',
      repositoryName: 'react',
      displayName: 'The React Guild',
      visibility: 'explorable',
      regionId: 'open-source-commons',
      regionName: 'Open Source Commons',
      cellId: 'cell-osc-01',
      buildingTier: 5,
      projectType: 'Frontend Framework',
      primaryLanguage: 'JavaScript',
      languageMix: { JavaScript: 85, TypeScript: 12, HTML: 3 },
      stars: 228000,
      forks: 46000,
      contributorCount: 1650,
      activityState: 'active',
      hasDocumentation: true,
      hasTests: true,
      codeCategories: ['Frontend/UI', 'Build/tooling', 'Tests', 'Documentation'],
      worldSeed: 1042,
      updatedAt: new Date().toISOString(),
      description: 'The library for web and native user interfaces.',
      htmlUrl: 'https://github.com/facebook/react',
    },
    {
      worldId: 'world-ripgrep',
      repositoryId: 'repo-ripgrep',
      ownerHandle: 'BurntSushi',
      repositoryName: 'ripgrep',
      displayName: 'Ripgrep Stronghold',
      visibility: 'explorable',
      regionId: 'rust-systems-quarter',
      regionName: 'Rust Systems Quarter',
      cellId: 'cell-rsq-01',
      buildingTier: 4,
      projectType: 'CLI Tool / Systems',
      primaryLanguage: 'Rust',
      languageMix: { Rust: 98, Shell: 2 },
      stars: 48000,
      forks: 2200,
      contributorCount: 380,
      activityState: 'active',
      hasDocumentation: true,
      hasTests: true,
      codeCategories: ['Backend/API', 'CLI', 'Tests', 'Documentation'],
      worldSeed: 8812,
      updatedAt: new Date().toISOString(),
      description: 'ripgrep combines the usability of The Silver Searcher with the raw speed of grep.',
      htmlUrl: 'https://github.com/BurntSushi/ripgrep',
    },
    {
      worldId: 'world-fastapi',
      repositoryId: 'repo-fastapi',
      ownerHandle: 'tiangolo',
      repositoryName: 'fastapi',
      displayName: 'FastAPI Citadel',
      visibility: 'explorable',
      regionId: 'python-tools-district',
      regionName: 'Python Tools District',
      cellId: 'cell-ptd-01',
      buildingTier: 4,
      projectType: 'Backend / API Service',
      primaryLanguage: 'Python',
      languageMix: { Python: 100 },
      stars: 76000,
      forks: 6400,
      contributorCount: 620,
      activityState: 'active',
      hasDocumentation: true,
      hasTests: true,
      codeCategories: ['Backend/API', 'Documentation', 'Tests', 'Configuration'],
      worldSeed: 3341,
      updatedAt: new Date().toISOString(),
      description: 'FastAPI framework, high performance, easy to learn, fast to code, ready for production.',
      htmlUrl: 'https://github.com/tiangolo/fastapi',
    },
    {
      worldId: 'world-transformers',
      repositoryId: 'repo-transformers',
      ownerHandle: 'huggingface',
      repositoryName: 'transformers',
      displayName: 'HuggingFace AI Campus',
      visibility: 'explorable',
      regionId: 'ai-research-campus',
      regionName: 'AI Research Campus',
      cellId: 'cell-arc-01',
      buildingTier: 5,
      projectType: 'AI / Machine Learning',
      primaryLanguage: 'Python',
      languageMix: { Python: 94, Rust: 4, C: 2 },
      stars: 132000,
      forks: 26000,
      contributorCount: 2400,
      activityState: 'active',
      hasDocumentation: true,
      hasTests: true,
      codeCategories: ['Data/models', 'Backend/API', 'Tests', 'Documentation'],
      worldSeed: 9115,
      updatedAt: new Date().toISOString(),
      description: 'State-of-the-art Machine Learning for Pytorch, TensorFlow, and JAX.',
      htmlUrl: 'https://github.com/huggingface/transformers',
    },
  ];
}
