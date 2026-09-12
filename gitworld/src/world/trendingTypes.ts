/**
 * Trending Street Types & Repository Manifest Specifications
 */

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

export interface TrendingStorefrontBuilding {
  id: string;
  manifest: TrendingRepositoryManifest;
  x: number;
  y: number;
  width: number;
  height: number;
  side: 'west' | 'east' | 'alley' | 'center';
  signText: string;
  hologramColor: string;
  hasPorch: boolean;
  hasBalcony: boolean;
  hasWantedPoster: boolean;
}

export interface TrendingStreetWorld {
  id: string;
  title: string;
  entrancePoint: { x: number; y: number };
  returnPoint: { x: number; y: number };
  bounds: { width: number; height: number };
  storefronts: TrendingStorefrontBuilding[];
  waterTower: { x: number; y: number; tickerText: string };
  landmarkPavilion: { x: number; y: number; featuredManifest: TrendingRepositoryManifest };
  boardwalks: Array<{ x: number; y: number; width: number; height: number }>;
  hitchingPosts: Array<{ x: number; y: number }>;
  neonSigns: Array<{ x: number; y: number; text: string; color: string }>;
  visitorsCount: number;
}
