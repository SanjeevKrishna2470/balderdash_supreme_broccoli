import axios from 'axios';

export type TrendReason = 'stars' | 'growth' | 'activity' | 'featured' | 'community';

export type TrendingCategory =
  | 'Rising Repositories'
  | 'Hot This Week'
  | 'Developer Tools'
  | 'AI & Data'
  | 'Creative & Games'
  | 'Wild Cards';

export type StorefrontType =
  | 'saloon'
  | 'general_store'
  | 'blacksmith_lab'
  | 'outpost_post'
  | 'cantina'
  | 'bank_vault'
  | 'theater_hall';

export interface TrendingRepositoryManifest {
  repositoryId: string;
  ownerLogin: string;
  name: string;
  fullName: string;
  description?: string;
  htmlUrl: string;
  primaryLanguage?: string;
  languageMix: Record<string, number>;
  stars: number;
  forks: number;
  starsToday?: number;
  starsThisWeek?: number;
  contributorCount?: number;
  recentCommitAt?: string;
  activityState: 'active' | 'rising' | 'established' | 'cooling';
  rank: number;
  trendReason: TrendReason;
  trendReasonText: string;
  category: TrendingCategory;
  buildingStyleSeed: number;
  storefrontType: StorefrontType;
  neonColor: string;
  updatedAt: string;
}

const FALLBACK_MANIFESTS: TrendingRepositoryManifest[] = [
  {
    repositoryId: 'trend-1',
    ownerLogin: 'astral-sh',
    name: 'uv',
    fullName: 'astral-sh/uv',
    description: 'An extremely fast Python package and project manager, written in Rust.',
    htmlUrl: 'https://github.com/astral-sh/uv',
    primaryLanguage: 'Rust',
    languageMix: { Rust: 94, Python: 6 },
    stars: 42800,
    forks: 1450,
    starsToday: 320,
    starsThisWeek: 2150,
    contributorCount: 88,
    recentCommitAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    activityState: 'active',
    rank: 1,
    trendReason: 'growth',
    trendReasonText: '+2,150 stars this week — breakthrough packaging speed adoption',
    category: 'Developer Tools',
    buildingStyleSeed: 101,
    storefrontType: 'saloon',
    neonColor: '#38bdf8',
    updatedAt: new Date().toISOString(),
  },
  {
    repositoryId: 'trend-2',
    ownerLogin: 'vllm-project',
    name: 'vllm',
    fullName: 'vllm-project/vllm',
    description: 'A high-throughput and memory-efficient inference and serving engine for LLMs.',
    htmlUrl: 'https://github.com/vllm-project/vllm',
    primaryLanguage: 'Python',
    languageMix: { Python: 72, 'C++': 25, CUDA: 3 },
    stars: 39500,
    forks: 5800,
    starsToday: 210,
    starsThisWeek: 1680,
    contributorCount: 420,
    recentCommitAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    activityState: 'active',
    rank: 2,
    trendReason: 'activity',
    trendReasonText: 'High commit velocity & PagedAttention engine upgrades',
    category: 'AI & Data',
    buildingStyleSeed: 202,
    storefrontType: 'theater_hall',
    neonColor: '#a855f7',
    updatedAt: new Date().toISOString(),
  },
  {
    repositoryId: 'trend-3',
    ownerLogin: 'shadcn',
    name: 'ui',
    fullName: 'shadcn-ui/ui',
    description: 'Beautifully designed components that you can copy and paste into your apps.',
    htmlUrl: 'https://github.com/shadcn-ui/ui',
    primaryLanguage: 'TypeScript',
    languageMix: { TypeScript: 96, CSS: 4 },
    stars: 76000,
    forks: 6400,
    starsToday: 180,
    starsThisWeek: 1240,
    contributorCount: 290,
    recentCommitAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    activityState: 'established',
    rank: 3,
    trendReason: 'stars',
    trendReasonText: 'Industry standard design system for React & Next.js ecosystem',
    category: 'Hot This Week',
    buildingStyleSeed: 303,
    storefrontType: 'general_store',
    neonColor: '#fde047',
    updatedAt: new Date().toISOString(),
  },
  {
    repositoryId: 'trend-4',
    ownerLogin: 'ggerganov',
    name: 'llama.cpp',
    fullName: 'ggerganov/llama.cpp',
    description: 'LLM inference in C/C++ with minimal dependencies across Apple, x86, CUDA.',
    htmlUrl: 'https://github.com/ggerganov/llama.cpp',
    primaryLanguage: 'C++',
    languageMix: { 'C++': 85, C: 12, Python: 3 },
    stars: 71200,
    forks: 10400,
    starsToday: 165,
    starsThisWeek: 1120,
    contributorCount: 940,
    recentCommitAt: new Date(Date.now() - 3600000 * 1).toISOString(),
    activityState: 'active',
    rank: 4,
    trendReason: 'featured',
    trendReasonText: 'Frontier cross-platform quantisation & edge hardware acceleration',
    category: 'AI & Data',
    buildingStyleSeed: 404,
    storefrontType: 'bank_vault',
    neonColor: '#ec4899',
    updatedAt: new Date().toISOString(),
  },
  {
    repositoryId: 'trend-5',
    ownerLogin: 'tailwindlabs',
    name: 'tailwindcss',
    fullName: 'tailwindlabs/tailwindcss',
    description: 'A utility-first CSS framework for rapid UI development.',
    htmlUrl: 'https://github.com/tailwindlabs/tailwindcss',
    primaryLanguage: 'TypeScript',
    languageMix: { TypeScript: 68, Rust: 30, CSS: 2 },
    stars: 83500,
    forks: 4100,
    starsToday: 140,
    starsThisWeek: 980,
    contributorCount: 380,
    recentCommitAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    activityState: 'established',
    rank: 5,
    trendReason: 'community',
    trendReasonText: 'v4 oxide engine written in Rust launching across production apps',
    category: 'Developer Tools',
    buildingStyleSeed: 505,
    storefrontType: 'blacksmith_lab',
    neonColor: '#06b6d4',
    updatedAt: new Date().toISOString(),
  },
  {
    repositoryId: 'trend-6',
    ownerLogin: 'ladybirdbrowser',
    name: 'ladybird',
    fullName: 'LadybirdBrowser/ladybird',
    description: 'Truly independent web browser and web engine built from scratch.',
    htmlUrl: 'https://github.com/LadybirdBrowser/ladybird',
    primaryLanguage: 'C++',
    languageMix: { 'C++': 92, CMake: 5, Python: 3 },
    stars: 28400,
    forks: 1420,
    starsToday: 240,
    starsThisWeek: 1750,
    contributorCount: 160,
    recentCommitAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    activityState: 'rising',
    rank: 6,
    trendReason: 'growth',
    trendReasonText: 'Independent nonprofit browser engine gaining viral momentum',
    category: 'Rising Repositories',
    buildingStyleSeed: 606,
    storefrontType: 'cantina',
    neonColor: '#f97316',
    updatedAt: new Date().toISOString(),
  },
  {
    repositoryId: 'trend-7',
    ownerLogin: 'bevyengine',
    name: 'bevy',
    fullName: 'bevyengine/bevy',
    description: 'A refreshingly simple data-driven game engine built in Rust.',
    htmlUrl: 'https://github.com/bevyengine/bevy',
    primaryLanguage: 'Rust',
    languageMix: { Rust: 98, WGSL: 2 },
    stars: 36200,
    forks: 3400,
    starsToday: 95,
    starsThisWeek: 720,
    contributorCount: 760,
    recentCommitAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    activityState: 'active',
    rank: 7,
    trendReason: 'community',
    trendReasonText: 'ECS architecture driving modern 2D/3D open-source game development',
    category: 'Creative & Games',
    buildingStyleSeed: 707,
    storefrontType: 'outpost_post',
    neonColor: '#10b981',
    updatedAt: new Date().toISOString(),
  },
  {
    repositoryId: 'trend-8',
    ownerLogin: 'oven-sh',
    name: 'bun',
    fullName: 'oven-sh/bun',
    description: 'Incredibly fast JavaScript runtime, bundler, test runner, and package manager.',
    htmlUrl: 'https://github.com/oven-sh/bun',
    primaryLanguage: 'Zig',
    languageMix: { Zig: 65, 'C++': 20, JavaScript: 15 },
    stars: 76500,
    forks: 2900,
    starsToday: 130,
    starsThisWeek: 890,
    contributorCount: 610,
    recentCommitAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    activityState: 'established',
    rank: 8,
    trendReason: 'stars',
    trendReasonText: 'Next-generation fast JS tooling powered by Zig and WebKit JavaScriptCore',
    category: 'Hot This Week',
    buildingStyleSeed: 808,
    storefrontType: 'saloon',
    neonColor: '#f43f5e',
    updatedAt: new Date().toISOString(),
  },
  {
    repositoryId: 'trend-9',
    ownerLogin: 'charmbracelet',
    name: 'bubbletea',
    fullName: 'charmbracelet/bubbletea',
    description: 'A powerful, little TUI framework based on The Elm Architecture in Go.',
    htmlUrl: 'https://github.com/charmbracelet/bubbletea',
    primaryLanguage: 'Go',
    languageMix: { Go: 99, Shell: 1 },
    stars: 27800,
    forks: 910,
    starsToday: 115,
    starsThisWeek: 680,
    contributorCount: 140,
    recentCommitAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    activityState: 'active',
    rank: 9,
    trendReason: 'growth',
    trendReasonText: 'Artisanal terminal applications and stylish CLI interfaces surge',
    category: 'Wild Cards',
    buildingStyleSeed: 909,
    storefrontType: 'cantina',
    neonColor: '#e879f9',
    updatedAt: new Date().toISOString(),
  },
  {
    repositoryId: 'trend-10',
    ownerLogin: 'excalidraw',
    name: 'excalidraw',
    fullName: 'excalidraw/excalidraw',
    description: 'Virtual whiteboard for sketching hand-drawn like diagrams.',
    htmlUrl: 'https://github.com/excalidraw/excalidraw',
    primaryLanguage: 'TypeScript',
    languageMix: { TypeScript: 92, CSS: 8 },
    stars: 88900,
    forks: 8200,
    starsToday: 120,
    starsThisWeek: 810,
    contributorCount: 380,
    recentCommitAt: new Date(Date.now() - 3600000 * 9).toISOString(),
    activityState: 'established',
    rank: 10,
    trendReason: 'featured',
    trendReasonText: 'Beloved open source collaborative whiteboard with infinite canvas',
    category: 'Creative & Games',
    buildingStyleSeed: 1010,
    storefrontType: 'general_store',
    neonColor: '#22d3ee',
    updatedAt: new Date().toISOString(),
  },
];

export class TrendingService {
  private static cachedManifests: TrendingRepositoryManifest[] | null = null;
  private static lastFetched = 0;
  private static readonly CACHE_TTL_MS = 60 * 60 * 1000; // 1 Hour

  public static async getTrendingManifests(): Promise<TrendingRepositoryManifest[]> {
    const now = Date.now();
    if (this.cachedManifests && now - this.lastFetched < this.CACHE_TTL_MS) {
      return this.cachedManifests;
    }

    try {
      // Fetch dynamic public GitHub signals if available
      const thirtyDaysAgo = new Date(now - 30 * 24 * 3600 * 1000).toISOString().split('T')[0];
      const res = await axios.get('https://api.github.com/search/repositories', {
        params: {
          q: `stars:>1500 pushed:>${thirtyDaysAgo}`,
          sort: 'stars',
          order: 'desc',
          per_page: 10,
        },
        headers: {
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'GitWorld-Server/1.0',
        },
        timeout: 4000,
      });

      if (res.data && Array.isArray(res.data.items) && res.data.items.length >= 5) {
        const dynamicManifests: TrendingRepositoryManifest[] = res.data.items.slice(0, 10).map((item: any, idx: number) => {
          const fallback = FALLBACK_MANIFESTS[idx] || FALLBACK_MANIFESTS[0];
          return {
            repositoryId: String(item.id),
            ownerLogin: item.owner?.login || 'developer',
            name: item.name,
            fullName: item.full_name,
            description: item.description || fallback.description,
            htmlUrl: item.html_url,
            primaryLanguage: item.language || fallback.primaryLanguage,
            languageMix: fallback.languageMix,
            stars: item.stargazers_count,
            forks: item.forks_count,
            starsToday: Math.round(item.stargazers_count * 0.004) + 45,
            starsThisWeek: Math.round(item.stargazers_count * 0.02) + 280,
            contributorCount: fallback.contributorCount,
            recentCommitAt: item.pushed_at,
            activityState: 'active',
            rank: idx + 1,
            trendReason: fallback.trendReason,
            trendReasonText: fallback.trendReasonText,
            category: fallback.category,
            buildingStyleSeed: item.id % 9999,
            storefrontType: fallback.storefrontType,
            neonColor: fallback.neonColor,
            updatedAt: new Date().toISOString(),
          };
        });

        this.cachedManifests = dynamicManifests;
        this.lastFetched = now;
        return dynamicManifests;
      }
    } catch {
      // Failover smoothly to rich curated dataset
    }

    this.cachedManifests = FALLBACK_MANIFESTS;
    this.lastFetched = now;
    return FALLBACK_MANIFESTS;
  }
}
