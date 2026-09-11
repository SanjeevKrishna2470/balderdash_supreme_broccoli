/**
 * Shared data contract with the backend's normalization layer
 * (see server/src/services/normalizer.ts). GitWorld's world-generation layer
 * only consumes a subset of what the backend can produce; fields the backend
 * doesn't populate for live GitHub data (like open pull requests) are kept
 * optional so the city can gracefully fall back to a deterministic stand-in.
 */
export interface RepositoryModel {
  id: number;
  name: string;
  fullName: string;
  description: string;
  htmlUrl: string;
  primaryLanguage: string;
  /** Backend-supplied GitHub language color; GitWorld uses its own palette instead. */
  languageColor?: string;
  stars: number;
  forks: number;
  openIssues: number;
  /** Not currently supplied by live data; used opportunistically when present. */
  openPullRequests?: number;
  sizeKb: number;
  sizeTier: 'small' | 'medium' | 'large';
  lastPushedAt: string;
  isFork: boolean;
  topics: string[];
}
