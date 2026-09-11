export type BiomeType = 'iron_forge' | 'mystic_forest' | 'stone_city' | 'meadow' | 'desert' | 'volcano';
export type SpriteBuildingType = 'forge_medium' | 'hall_large' | 'tower_medium' | 'castle_large' | 'cottage_small';

export interface TileDefinition {
  name: string;
  collidable: boolean;
}

export interface BuildingModel {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  spriteType: SpriteBuildingType;
  biome: BiomeType;
  interactionPoint: {
    x: number;
    y: number;
  };
  repository: RepositoryModel;
}

export interface RepositoryModel {
  id: number;
  name: string;
  fullName: string;
  description: string;
  htmlUrl: string;
  primaryLanguage: string;
  languageColor?: string;
  stars: number;
  forks: number;
  openIssues: number;
  openPullRequests?: number;
  sizeKb: number;
  sizeTier: 'small' | 'medium' | 'large';
  lastPushedAt: string;
  isFork: boolean;
  topics: string[];
}

export interface WorldModel {
  version: string;
  seed: string;
  user: {
    username: string;
    displayName: string;
    avatarUrl: string;
    htmlUrl: string;
    totalRepos: number;
  };
  dimensions: {
    width: number;
    height: number;
    tileSize: number;
  };
  spawnPoint: {
    x: number;
    y: number;
  };
  gatekeeper: {
    name: string;
    status: 'welcome' | 'denied';
    position: {
      x: number;
      y: number;
    };
    interactionRange: number;
    dialogue: {
      greeting: string;
      success: string;
      failure: string;
    };
  };
  tileLegend: Record<number, TileDefinition>;
  terrain: {
    ground: number[][];
    collision: number[][];
  };
  buildings: BuildingModel[];
}

export interface UserSettings {
  audio: {
    bgmVolume: number;
    sfxVolume: number;
    muted: boolean;
  };
  graphics: {
    retroFilter: boolean;
    showGrid: boolean;
    showMinimap: boolean;
    tileSize: number;
  };
  gameplay: {
    controls: 'WASD' | 'Arrows' | string;
    movementSpeed: 'slow' | 'normal' | 'fast';
  };
  theme: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
}

export interface UserProfile {
  user: {
    id: number;
    username: string;
    displayName: string;
    avatarUrl: string;
    htmlUrl: string;
    publicRepos: number;
  };
  rpg: {
    title: string;
    level: number;
    primaryElement: string;
    realmPower: number;
  };
  stats: {
    totalStars: number;
    totalForks: number;
    totalOpenIssues: number;
    languageBreakdown: Array<{
      language: string;
      percentage: number;
      color: string;
    }>;
  };
  achievements: Achievement[];
}
