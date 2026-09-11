/**
 * GitWorld Core Data Contracts (Person A & Person B Shared Types)
 * Conforms to GitWorld MVP Implementation Plan (Sections 21-22, 32)
 */

export type SizeTier = 'small' | 'medium' | 'large';

export type BiomeType =
  | 'stone_city'
  | 'mystic_forest'
  | 'iron_forge'
  | 'meadow'
  | 'plains'
  | 'desert'
  | 'tundra';

export type SpriteBuildingType =
  | 'cottage_small'
  | 'tower_medium'
  | 'forge_medium'
  | 'castle_large'
  | 'hall_large';

/**
 * Module 3: Normalized Repository Model
 */
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
  sizeKb: number;
  sizeTier: SizeTier;
  lastPushedAt: string;
  isFork: boolean;
  topics: string[];
}

/**
 * Interactive Building Entity on the Tilemap
 */
export interface BuildingModel {
  id: string;
  name: string;
  x: number;               // Tile column
  y: number;               // Tile row
  width: number;           // Width in tiles
  height: number;          // Height in tiles
  spriteType: SpriteBuildingType;
  biome: BiomeType;
  interactionPoint: {      // Coordinate where player stands to interact [E]
    x: number;
    y: number;
  };
  repository: RepositoryModel;
}

/**
 * Gate & Gatekeeper Narrative NPC State
 */
export interface GatekeeperModel {
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
}

/**
 * Tile Definition for Ground and Collision
 */
export interface TileDefinition {
  name: string;
  collidable: boolean;
}

/**
 * Module 4 Deliverable: Complete WorldModel JSON Payload (GET /api/world)
 */
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
    width: number;         // Grid width in tiles
    height: number;        // Grid height in tiles
    tileSize: number;      // Pixel size per tile (e.g. 32)
  };
  spawnPoint: {
    x: number;
    y: number;
  };
  gatekeeper: GatekeeperModel;
  tileLegend: Record<number, TileDefinition>;
  terrain: {
    ground: number[][];    // 2D grid of tile IDs
    collision: number[][]; // 2D grid: 1 = blocked, 0 = walkable
  };
  buildings: BuildingModel[];
}
