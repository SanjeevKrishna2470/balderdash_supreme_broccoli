import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { GitHubService } from '../services/github';
import { RepositoryNormalizer } from '../services/normalizer';
import { WorldGenerator } from '../services/worldGenerator';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const worldRouter = Router();

/**
 * Deliverable: GET /api/world
 * Returns the deterministic WorldModel JSON for the authenticated user
 */
worldRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  const user = req.session!.user!;
  const accessToken = req.session!.accessToken!;

  try {
    // If running in dev/mock login mode, serve the static mock_world.json if present
    if (accessToken === 'mock_dev_token') {
      const mockPath = path.resolve(__dirname, '../../../mock_world.json');
      if (fs.existsSync(mockPath)) {
        const mockData = JSON.parse(fs.readFileSync(mockPath, 'utf8'));
        return res.json(mockData);
      }
      const rawRepos = await GitHubService.fetchPublicUserRepos('octocat');
      const normalizedRepos = RepositoryNormalizer.normalizeAll(rawRepos);
      const worldModel = WorldGenerator.generate(user, normalizedRepos);
      return res.json(worldModel);
    }

    // 1. Fetch raw repositories from GitHub API (cached & rate-limit handled)
    const rawRepos = await GitHubService.fetchUserRepos(accessToken);

    // 2. Normalize raw API responses into clean RepositoryModel objects
    const normalizedRepos = RepositoryNormalizer.normalizeAll(rawRepos);

    // 3. Generate deterministic WorldModel seeded by user identity & repo data
    const worldModel = WorldGenerator.generate(user, normalizedRepos);

    return res.json(worldModel);
  } catch (error: any) {
    console.error('Failed to generate world for user:', error?.message || error);
    return res.status(500).json({
      error: 'Failed to generate world from GitHub data',
      message: error?.message || 'Internal Server Error'
    });
  }
});

/**
 * GET /api/world/public-manifests
 * Returns sanitized public world manifests for community exploration (AGENT.md Section 7)
 */
worldRouter.get('/public-manifests', async (_req: Request, res: Response) => {
  try {
    const manifests = GitHubService.getPublicManifests();
    return res.json(manifests);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch public manifests', message: error.message });
  }
});

/**
 * Public Realm Endpoint: GET /api/world/:username
 * Allows visiting ANY public developer's generated world without logging in!
 */
worldRouter.get('/:username', async (req: Request, res: Response) => {
  const { username } = req.params;

  try {
    const ghUser = await GitHubService.fetchPublicUser(username);
    const rawRepos = await GitHubService.fetchPublicUserRepos(username);
    const normalizedRepos = RepositoryNormalizer.normalizeAll(rawRepos);

    const userObj = {
      id: ghUser.id,
      username: ghUser.login,
      displayName: ghUser.name || ghUser.login,
      avatarUrl: ghUser.avatar_url,
      htmlUrl: ghUser.html_url,
      publicRepos: ghUser.public_repos
    };

    const worldModel = WorldGenerator.generate(userObj, normalizedRepos);
    return res.json(worldModel);
  } catch (error: any) {
    console.error(`Failed to generate public realm for ${username}:`, error?.message || error);
    return res.status(404).json({
      error: `Could not forge realm for user '${username}'`,
      message: error?.message || 'User not found'
    });
  }
});
