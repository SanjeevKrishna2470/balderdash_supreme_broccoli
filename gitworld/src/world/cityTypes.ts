import type { RepositoryModel } from '../types';
import type { LanguageStyle } from './languageStyles';

/**
 * The shared `types.ts` contract describes a tile-grid world (terrain
 * arrays, a gatekeeper NPC). That shape was designed for the earlier
 * pixel-art prototype. GitWorld's brief calls for a non-tile, organic
 * editorial city, so this frontend keeps `RepositoryModel` (the real,
 * reusable normalized data) but generates its own free-form spatial
 * model from it. This is the "world-generation layer" from the brief:
 * pure, deterministic, and independent of rendering.
 */

export type ActivityState = 'active' | 'quiet' | 'dormant';
export type SizeTierName = 'shed' | 'house' | 'block' | 'tower' | 'landmark';

export interface District {
  id: string;
  name: string;
  isPersonal: boolean;
  center: { x: number; y: number };
  radius: number;
  tint: string;
  entrance?: { x: number; y: number };
}

export interface SatelliteBuilding {
  x: number;
  y: number;
  r: number;
}

export interface ContributorAvatar {
  id: string;
  buildingId: string;
  homeX: number;
  homeY: number;
  phase: number;
  hue: string;
}

import type { BuildingVisualProfile } from './visualProfile';

export type ViewMode = '3d' | '2d';
export type QualityPreset = 'high' | 'balanced' | 'performance';
export type CameraMode = 'orbit' | 'walk';

export interface CityBuilding {
  id: string;
  repo: RepositoryModel;
  districtId: string;
  x: number;
  y: number;
  footprint: number;
  heightTier: SizeTierName;
  heightPx: number;
  activity: ActivityState;
  style: LanguageStyle;
  issuesShown: number;
  hasConstruction: boolean;
  satellites: SatelliteBuilding[];
  contributorCount: number;
  plotEntrance?: { x: number; y: number };
  importanceScore?: number;
  visualProfile?: BuildingVisualProfile;
}

export interface Road {
  id: string;
  fromId: string;
  toId: string;
  tier?: 'main' | 'district' | 'path';
  waypoints?: Array<{ x: number; y: number }>;
}

export interface EnvironmentProp {
  id: string;
  type:
    | 'lamp'
    | 'tree'
    | 'bench'
    | 'sign'
    | 'plaza_fountain'
    | 'crane'
    | 'blueprint_desk'
    | 'scaffolding'
    | 'materials'
    | 'gatepost';
  x: number;
  y: number;
  label?: string;
  districtId?: string;
}

export interface NavNode {
  id: string;
  x: number;
  y: number;
  type: 'arrival' | 'district' | 'building' | 'intersection' | 'bridge' | 'boat_dock' | 'construction' | 'public_gate';
  targetId?: string;
}

export interface NavEdge {
  fromId: string;
  toId: string;
  weight: number;
}

export interface RiverFeature {
  y: number;
  width: number;
  bankNorth: number;
  bankSouth: number;
  flowDirection: 'east' | 'west';
}

export interface BridgeFeature {
  id: string;
  x: number;
  y: number;
  width: number;
  length: number;
  bounds: { left: number; right: number; top: number; bottom: number };
}

export interface BoatFeature {
  id: string;
  dockTown: { x: number; y: number };
  dockConstruction: { x: number; y: number };
  x: number;
  y: number;
  state: 'docked_town' | 'docked_construction' | 'crossing';
  targetDock: 'town' | 'construction';
  progress: number;
}

export interface ConstructionDistrict {
  id: string;
  name: string;
  center: { x: number; y: number };
  radius: number;
  blueprintTable: { x: number; y: number; label: string };
  crane: { x: number; y: number };
  foundationPlots: Array<{
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    status: 'empty' | 'breaking_ground' | 'constructed';
    repoName?: string;
  }>;
}

export interface PublicRoadFeature {
  id: string;
  gatePoint: { x: number; y: number };
  label: string;
}

export interface CityWorldModel {
  seed: string;
  user: {
    username: string;
    displayName: string;
    avatarUrl: string;
    htmlUrl: string;
    profileColorSeed?: number;
  };
  districts: District[];
  buildings: CityBuilding[];
  roads: Road[];
  avatars: ContributorAvatar[];
  environmentProps?: EnvironmentProp[];
  navGraph?: {
    nodes: NavNode[];
    edges: NavEdge[];
  };
  bounds: { width: number; height: number };
  spawnPoint: { x: number; y: number };
  sparse: boolean;
  river?: RiverFeature;
  bridge?: BridgeFeature;
  boat?: BoatFeature;
  constructionDistrict?: ConstructionDistrict;
  publicRoad?: PublicRoadFeature;
  safeShorePoint?: { x: number; y: number };
}
