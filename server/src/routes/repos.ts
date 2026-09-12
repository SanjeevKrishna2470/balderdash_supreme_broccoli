import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { GitHubService } from '../services/github';
import { RepositoryNormalizer } from '../services/normalizer';
import { RepoTreeNormalizer } from '../services/repoTreeNormalizer';

export const reposRouter = Router();

/**
 * GET /api/repos
 * Returns list of all normalized repositories for the logged-in user
 */
reposRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const accessToken = req.session!.accessToken!;
    if (accessToken === 'mock_dev_token') {
      const rawRepos = await GitHubService.fetchPublicUserRepos('octocat');
      const normalized = RepositoryNormalizer.normalizeAll(rawRepos);
      return res.json(normalized);
    }
    const rawRepos = req.session?.privateAccess
      ? await GitHubService.fetchUserRepos(accessToken)
      : await GitHubService.fetchPublicUserRepos(req.session!.user!.username);
    const normalized = RepositoryNormalizer.normalizeAll(rawRepos);
    return res.json(normalized);
  } catch (error: any) {
    const githubStatus = error?.response?.status;
    if (githubStatus === 401) {
      // The GitHub OAuth token is revoked, expired, or otherwise invalid.
      // Remove the cookie session so the next frontend attempt cannot keep
      // replaying the same unusable credential.
      if (req.session) req.session = null;
      return res.status(401).json({
        error: 'GitHub authentication expired',
        code: 'GITHUB_AUTH_EXPIRED',
        message: 'Your GitHub authorization is no longer valid. Please sign in with GitHub again.',
      });
    }
    return res.status(500).json({ error: 'Failed to fetch repositories', message: error.message });
  }
});

/**
 * POST /api/repos
 * Creates a new GitHub repository on behalf of the user, or creates a local/mock repo in demo mode.
 * Enforces GitHub naming rules, handles idempotency, and returns normalized RepositoryModel.
 */
reposRouter.post('/', async (req: Request, res: Response) => {
  const { name, description, isPrivate, autoInit, gitignoreTemplate, licenseTemplate, projectType } = req.body;

  // Validate GitHub naming rules: ^[a-zA-Z0-9_.-]+$
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Repository name is required' });
  }

  const trimmedName = name.trim();
  const repoNameRegex = /^[a-zA-Z0-9_.-]+$/;
  if (!repoNameRegex.test(trimmedName)) {
    return res.status(400).json({
      error: 'Invalid repository name. Names can only contain letters, numbers, hyphens, periods, and underscores.',
    });
  }

  if (isPrivate === true && !req.session?.privateAccess) {
    return res.status(400).json({
      error: 'Private repositories are not supported. GitWorld only works with public repositories.',
    });
  }

  const accessToken = req.session?.accessToken;
  const user = req.session?.user;

  try {
    // If not authenticated or in mock dev mode, create a local simulated repository
    if (!accessToken || accessToken === 'mock_dev_token') {
      const username = user?.username || 'octocat';
      const mockCreatedRepo = {
        id: Math.floor(1000000 + Math.random() * 9000000),
        name: trimmedName,
        fullName: `${username}/${trimmedName}`,
        description: description || 'A new realm forged in GitWorld.',
        htmlUrl: `https://github.com/${username}/${trimmedName}`,
        isPrivate: !!isPrivate,
        isFork: false,
        stars: 1,
        forks: 0,
        primaryLanguage: projectType === 'Rust' ? 'Rust' : projectType === 'Python' ? 'Python' : 'TypeScript',
        topics: [projectType?.toLowerCase().replace(/\s+/g, '-') || 'gitworld'],
        sizeKb: 12,
        sizeTier: 'small',
        updatedAt: new Date().toISOString(),
        lastPushedAt: new Date().toISOString(),
        openIssues: 0,
        openPullRequests: 0,
        buildingTier: 1,
        districtId: '__personal__',
      };
      return res.status(201).json({
        success: true,
        message: 'Ground broken! Project initialized successfully.',
        repo: mockCreatedRepo,
        mode: 'demo',
      });
    }

    // Call real GitHub API to create repository
    const rawRepo = await GitHubService.createRepo(accessToken, {
      name: trimmedName,
      description,
      private: isPrivate === true,
      auto_init: autoInit ?? true,
      gitignore_template: gitignoreTemplate,
      license_template: licenseTemplate,
    });

    const normalized = RepositoryNormalizer.normalize(rawRepo);

    return res.status(201).json({
      success: true,
      message: 'Repository created on GitHub!',
      repo: normalized,
      mode: 'live',
    });
  } catch (error: any) {
    console.error('Failed to create repository:', error?.response?.data || error.message);
    const message = error?.response?.data?.message || error.message || 'Could not create repository.';
    return res.status(500).json({ error: 'Failed to create repository on GitHub', message });
  }
});

/**
 * GET /api/repos/:owner/:repo/tree
 * Returns normalized, classified repository tree with architecture & project type
 */
reposRouter.get('/:owner/:repo/tree', async (req: Request, res: Response) => {
  const { owner, repo } = req.params;
  const accessToken = req.session?.accessToken || '';

  try {
    const [treeData, languages] = await Promise.all([
      GitHubService.fetchRepoGitTree(accessToken, owner, repo),
      GitHubService.fetchRepoLanguages(accessToken, owner, repo),
    ]);

    const normalizedTree = RepoTreeNormalizer.normalize(
      `${owner}/${repo}`,
      treeData.tree,
      treeData.truncated,
      languages
    );

    return res.json(normalizedTree);
  } catch (error: any) {
    console.error(`Failed to build repo tree for ${owner}/${repo}:`, error?.message || error);
    return res.status(500).json({
      error: 'Failed to inspect repository tree',
      message: error?.message || 'Internal error',
    });
  }
});

/**
 * GET /api/repos/:owner/:repo/contents
 * Browse directory file tree (e.g. ?path=src/components)
 */
reposRouter.get('/:owner/:repo/contents', async (req: Request, res: Response) => {
  const { owner, repo } = req.params;
  const dirPath = (req.query.path as string) || '';
  const accessToken = req.session?.accessToken || '';

  try {
    const files = await GitHubService.fetchRepoContents(accessToken, owner, repo, dirPath);
    return res.json(files);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch directory contents', message: error.message });
  }
});

/**
 * GET /api/repos/:owner/:repo/file
 * View specific file source code (e.g. ?path=package.json)
 */
reposRouter.get('/:owner/:repo/file', async (req: Request, res: Response) => {
  const { owner, repo } = req.params;
  const filePath = req.query.path as string;
  const accessToken = req.session?.accessToken || '';

  if (!filePath) {
    return res.status(400).json({ error: 'Missing required query parameter: path' });
  }

  try {
    const file = await GitHubService.fetchRepoFile(accessToken, owner, repo, filePath);
    return res.json(file);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch file content', message: error.message });
  }
});

/**
 * GET /api/repos/:owner/:repo/commits
 * View recent commit history
 */
reposRouter.get('/:owner/:repo/commits', async (req: Request, res: Response) => {
  const { owner, repo } = req.params;
  const accessToken = req.session?.accessToken || '';

  try {
    const commits = await GitHubService.fetchRepoCommits(accessToken, owner, repo);
    return res.json(commits);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch commits', message: error.message });
  }
});
