import { RawGitHubRepo } from './github';
import { RepositoryModel, BiomeType } from '../types';

export class RepositoryNormalizer {
  public static determineBiome(language: string | null): BiomeType {
    if (!language) return 'meadow';
    const lang = language.toLowerCase();
    if (['rust', 'c', 'c++', 'assembly'].includes(lang)) return 'iron_forge';
    if (['python', 'ruby', 'elixir', 'clojure'].includes(lang)) return 'mystic_forest';
    if (['typescript', 'javascript', 'go', 'java', 'c#'].includes(lang)) return 'stone_city';
    return 'meadow';
  }

  public static determineSizeTier(sizeKb: number): 'small' | 'medium' | 'large' {
    if (sizeKb > 20000) return 'large';
    if (sizeKb > 4000) return 'medium';
    return 'small';
  }

  public static normalize(raw: RawGitHubRepo): RepositoryModel {
    return {
      id: raw.id,
      name: raw.name,
      fullName: raw.full_name,
      description: raw.description || '',
      htmlUrl: raw.html_url,
      primaryLanguage: raw.language || 'Other',
      stars: raw.stargazers_count,
      forks: raw.forks_count,
      openIssues: raw.open_issues_count,
      sizeKb: raw.size,
      sizeTier: this.determineSizeTier(raw.size),
      lastPushedAt: raw.pushed_at,
      isFork: raw.fork,
      topics: raw.topics || []
    };
  }

  public static normalizeAll(rawRepos: RawGitHubRepo[]): RepositoryModel[] {
    return rawRepos.map((r) => this.normalize(r));
  }
}
