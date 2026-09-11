import axios from 'axios';

export interface RawGitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  size: number; // in KB
  fork: boolean;
  pushed_at: string;
  topics?: string[];
  owner: {
    login: string;
    avatar_url: string;
  };
}

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

// In-memory cache for GitHub API responses to protect rate limits
const cache = new Map<string, CacheEntry<any>>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export class GitHubService {
  private static getCached<T>(key: string): T | null {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      cache.delete(key);
      return null;
    }
    return entry.data;
  }

  private static setCache<T>(key: string, data: T, ttlMs = CACHE_TTL_MS): void {
    cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs
    });
  }

  /**
   * Fetches the authenticated user's repositories from GitHub API
   * Handles caching, pagination up to 100 repos, and rate limit errors
   */
  public static async fetchUserRepos(accessToken: string): Promise<RawGitHubRepo[]> {
    const cacheKey = `repos_${accessToken.slice(-10)}`;
    const cached = this.getCached<RawGitHubRepo[]>(cacheKey);
    if (cached) {
      console.log('⚡ Serving repos from in-memory cache');
      return cached;
    }

    try {
      const response = await axios.get<RawGitHubRepo[]>('https://api.github.com/user/repos', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'User-Agent': 'GitWorld-MVP-Backend',
          Accept: 'application/vnd.github.v3+json'
        },
        params: {
          per_page: 100,
          sort: 'pushed',
          direction: 'desc',
          affiliation: 'owner,collaborator'
        }
      });

      const repos = response.data;
      this.setCache(cacheKey, repos);
      return repos;
    } catch (error: any) {
      const status = error?.response?.status;
      const rateLimitRemaining = error?.response?.headers?.['x-ratelimit-remaining'];

      if (status === 403 && rateLimitRemaining === '0') {
        throw new Error('GitHub API rate limit exceeded. Please try again later.');
      }

      console.error('Failed to fetch user repos from GitHub:', error?.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Fetches public user details by username
   */
  public static async fetchPublicUser(username: string): Promise<any> {
    const cacheKey = `user_${username.toLowerCase()}`;
    const cached = this.getCached<any>(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(`https://api.github.com/users/${username}`, {
        headers: { 'User-Agent': 'GitWorld-MVP-Backend', Accept: 'application/vnd.github.v3+json' }
      });
      this.setCache(cacheKey, response.data);
      return response.data;
    } catch (error: any) {
      console.error(`Failed to fetch user ${username}:`, error?.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Fetches public repositories for any GitHub username
   */
  public static async fetchPublicUserRepos(username: string): Promise<RawGitHubRepo[]> {
    const cacheKey = `public_repos_${username.toLowerCase()}`;
    const cached = this.getCached<RawGitHubRepo[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get<RawGitHubRepo[]>(`https://api.github.com/users/${username}/repos`, {
        headers: { 'User-Agent': 'GitWorld-MVP-Backend', Accept: 'application/vnd.github.v3+json' },
        params: { per_page: 60, sort: 'pushed', direction: 'desc' }
      });
      this.setCache(cacheKey, response.data);
      return response.data;
    } catch (error: any) {
      console.error(`Failed to fetch repos for ${username}:`, error?.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Fetches directory contents (file tree) of a repository
   */
  public static async fetchRepoContents(
    accessToken: string,
    owner: string,
    repo: string,
    dirPath = ''
  ): Promise<any[]> {
    const cleanPath = dirPath.replace(/^\//, '');
    const cacheKey = `tree_${owner}_${repo}_${cleanPath}`;
    const cached = this.getCached<any[]>(cacheKey);
    if (cached) return cached;

    try {
      const headers: Record<string, string> = {
        'User-Agent': 'GitWorld-MVP-Backend',
        Accept: 'application/vnd.github.v3+json'
      };
      if (accessToken && accessToken !== 'mock_dev_token') {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const response = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/contents/${cleanPath}`,
        { headers }
      );

      const items = Array.isArray(response.data) ? response.data : [response.data];
      const result = items.map((item: any) => ({
        name: item.name,
        path: item.path,
        type: item.type === 'dir' ? 'dir' : 'file',
        size: item.size || 0,
        downloadUrl: item.download_url
      }));

      this.setCache(cacheKey, result);
      return result;
    } catch (error: any) {
      console.error(`Failed to fetch repo contents for ${owner}/${repo}/${cleanPath}:`, error?.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Bounded Git Tree API inspection (recursive up to 3000 files)
   */
  public static async fetchRepoGitTree(
    accessToken: string,
    owner: string,
    repo: string
  ): Promise<{ tree: any[]; truncated: boolean }> {
    const cacheKey = `gittree_${owner}_${repo}`;
    const cached = this.getCached<{ tree: any[]; truncated: boolean }>(cacheKey);
    if (cached) return cached;

    const headers: Record<string, string> = {
      'User-Agent': 'GitWorld-MVP-Backend',
      Accept: 'application/vnd.github.v3+json'
    };
    if (accessToken && accessToken !== 'mock_dev_token') {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    try {
      // 1. Try recursive Git Trees API on default branch
      const treeRes = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`,
        { headers, timeout: 8000 }
      );

      if (treeRes.data && Array.isArray(treeRes.data.tree)) {
        const result = {
          tree: treeRes.data.tree.slice(0, 3000),
          truncated: treeRes.data.truncated || treeRes.data.tree.length > 3000
        };
        this.setCache(cacheKey, result);
        return result;
      }
    } catch (err: any) {
      console.warn(`Git Tree HEAD lookup failed for ${owner}/${repo}, falling back to root contents:`, err.message);
    }

    // 2. Fallback to Contents API
    try {
      const contents = await this.fetchRepoContents(accessToken, owner, repo, '');
      const tree = contents.map((c) => ({
        path: c.path,
        type: c.type === 'dir' ? 'tree' : 'blob',
        size: c.size || 0
      }));
      const result = { tree, truncated: false };
      this.setCache(cacheKey, result);
      return result;
    } catch {
      return { tree: [], truncated: false };
    }
  }

  /**
   * Fetches language distribution for a repository
   */
  public static async fetchRepoLanguages(
    accessToken: string,
    owner: string,
    repo: string
  ): Promise<Record<string, number>> {
    const cacheKey = `langs_${owner}_${repo}`;
    const cached = this.getCached<Record<string, number>>(cacheKey);
    if (cached) return cached;

    try {
      const headers: Record<string, string> = {
        'User-Agent': 'GitWorld-MVP-Backend',
        Accept: 'application/vnd.github.v3+json'
      };
      if (accessToken && accessToken !== 'mock_dev_token') {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const res = await axios.get(`https://api.github.com/repos/${owner}/${repo}/languages`, {
        headers,
        timeout: 5000
      });
      const data = res.data || {};
      this.setCache(cacheKey, data);
      return data;
    } catch {
      return {};
    }
  }

  /**
   * Reads raw file content from a repository and decodes Base64 to text
   */
  public static async fetchRepoFile(
    accessToken: string,
    owner: string,
    repo: string,
    filePath: string
  ): Promise<any> {
    const cleanPath = filePath.replace(/^\//, '');
    const cacheKey = `file_${owner}_${repo}_${cleanPath}`;
    const cached = this.getCached<any>(cacheKey);
    if (cached) return cached;

    // Check if demo owner
    const isDemo = ['rowan-fell', 'brightloop', 'lantern-collective'].includes(owner.toLowerCase());
    if (isDemo) {
      const filename = cleanPath.split('/').pop() || cleanPath;
      const ext = filename.split('.').pop() || 'ts';
      const sample = `/**\n * ${cleanPath}\n * Part of ${owner}/${repo}\n */\n\nexport function initialize() {\n  console.log('Running ${filename} within ${owner}/${repo}');\n}\n`;
      const result = {
        name: filename,
        path: cleanPath,
        size: sample.length,
        content: sample,
        isBinary: false,
        language: ext,
      };
      this.setCache(cacheKey, result);
      return result;
    }

    try {
      const headers: Record<string, string> = {
        'User-Agent': 'GitWorld-MVP-Backend',
        Accept: 'application/vnd.github.v3+json'
      };
      if (accessToken && accessToken !== 'mock_dev_token') {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const response = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/contents/${cleanPath}`,
        { headers }
      );

      const data = response.data;
      if (data.type !== 'file') {
        throw new Error('Target path is a directory, not a file');
      }

      // Decode base64 file content to utf8 string
      const decodedContent = Buffer.from(data.content || '', 'base64').toString('utf8');

      const result = {
        name: data.name,
        path: data.path,
        size: data.size,
        content: decodedContent,
        isBinary: false,
        language: data.name.split('.').pop() || 'text'
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error: any) {
      // Try raw.githubusercontent.com fallback for public repos
      try {
        const rawRes = await axios.get(
          `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${cleanPath}`,
          { headers: { 'User-Agent': 'GitWorld-MVP-Backend' }, responseType: 'text' }
        );
        if (rawRes.status === 200 && typeof rawRes.data === 'string') {
          const filename = cleanPath.split('/').pop() || cleanPath;
          const result = {
            name: filename,
            path: cleanPath,
            size: rawRes.data.length,
            content: rawRes.data,
            isBinary: false,
            language: filename.split('.').pop() || 'text'
          };
          this.setCache(cacheKey, result);
          return result;
        }
      } catch {
        // Raw fallback also failed
      }

      console.error(`Failed to fetch file ${cleanPath}:`, error?.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Fetches recent commits for a repository
   */
  public static async fetchRepoCommits(
    accessToken: string,
    owner: string,
    repo: string
  ): Promise<any[]> {
    const cacheKey = `commits_${owner}_${repo}`;
    const cached = this.getCached<any[]>(cacheKey);
    if (cached) return cached;

    try {
      const headers: Record<string, string> = {
        'User-Agent': 'GitWorld-MVP-Backend',
        Accept: 'application/vnd.github.v3+json'
      };
      if (accessToken && accessToken !== 'mock_dev_token') {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const response = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/commits`,
        { headers, params: { per_page: 10 } }
      );

      const commits = response.data.map((item: any) => ({
        sha: item.sha.substring(0, 7),
        message: item.commit.message,
        author: item.commit.author?.name || item.author?.login || 'Unknown Adventurer',
        date: item.commit.author?.date || '',
        htmlUrl: item.html_url
      }));

      this.setCache(cacheKey, commits);
      return commits;
    } catch (error: any) {
      console.error(`Failed to fetch commits for ${owner}/${repo}:`, error?.response?.data || error.message);
      return [];
    }
  }

  /**
   * Creates a new repository on GitHub on behalf of the user
   */
  public static async createRepo(
    accessToken: string,
    params: {
      name: string;
      description?: string;
      private?: boolean;
      auto_init?: boolean;
      gitignore_template?: string;
      license_template?: string;
    }
  ): Promise<RawGitHubRepo> {
    const payload: any = {
      name: params.name,
      description: params.description || '',
      private: !!params.private,
      auto_init: params.auto_init ?? true,
    };
    if (params.gitignore_template && params.gitignore_template !== 'None') {
      payload.gitignore_template = params.gitignore_template;
    }
    if (params.license_template && params.license_template !== 'None') {
      payload.license_template = params.license_template;
    }

    const response = await axios.post<RawGitHubRepo>(
      'https://api.github.com/user/repos',
      payload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'User-Agent': 'GitWorld-MVP-Backend',
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );
    return response.data;
  }

  /**
   * Returns curated public world manifests grouped into interest-based districts
   * as specified in AGENT.md Section 7
   */
  public static getPublicManifests(): any[] {
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
      {
        worldId: 'world-vite',
        repositoryId: 'repo-vite',
        ownerHandle: 'vitejs',
        repositoryName: 'vite',
        displayName: 'Vite Speed Foundry',
        visibility: 'explorable',
        regionId: 'devtools-boulevard',
        regionName: 'Developer Tools Boulevard',
        cellId: 'cell-dtb-01',
        buildingTier: 4,
        projectType: 'Build Tool / DevTools',
        primaryLanguage: 'TypeScript',
        languageMix: { TypeScript: 88, JavaScript: 12 },
        stars: 72000,
        forks: 6100,
        contributorCount: 950,
        activityState: 'active',
        hasDocumentation: true,
        hasTests: true,
        codeCategories: ['Build/tooling', 'Infrastructure', 'Tests', 'Documentation'],
        worldSeed: 5044,
        updatedAt: new Date().toISOString(),
        description: 'Next generation frontend tooling. It\'s fast!',
        htmlUrl: 'https://github.com/vitejs/vite',
      },
      {
        worldId: 'world-godot',
        repositoryId: 'repo-godot',
        ownerHandle: 'godotengine',
        repositoryName: 'godot',
        displayName: 'Godot Engine Realm',
        visibility: 'explorable',
        regionId: 'indie-game-alley',
        regionName: 'Indie Game Alley',
        cellId: 'cell-iga-01',
        buildingTier: 5,
        projectType: 'Game Engine',
        primaryLanguage: 'C++',
        languageMix: { 'C++': 88, C: 6, Python: 4, GLSL: 2 },
        stars: 91000,
        forks: 21000,
        contributorCount: 2200,
        activityState: 'active',
        hasDocumentation: true,
        hasTests: true,
        codeCategories: ['Application code', 'Assets/media', 'Build/tooling', 'Documentation'],
        worldSeed: 7720,
        updatedAt: new Date().toISOString(),
        description: 'Godot Engine – Multi-platform 2D and 3D game engine.',
        htmlUrl: 'https://github.com/godotengine/godot',
      },
    ];
  }
}
