import * as THREE from 'three';
import type { CityWorldModel, Road } from '../../world/cityTypes';

const SCALE = 0.22;

export interface RoadNetwork3D {
  group: THREE.Group;
  updateSelection: (selectedBuildingId: string | null, hoveredBuildingId: string | null) => void;
  update: (time: number) => void;
  dispose: () => void;
}

interface RoadMeshEntry {
  road: Road;
  mesh: THREE.Mesh;
  material: THREE.MeshStandardMaterial;
  baseColor: THREE.Color;
  highlightColor: THREE.Color;
  isDependency: boolean;
}

export function createRoadNetwork3D(
  world: CityWorldModel,
  quality: 'high' | 'balanced' | 'performance'
): RoadNetwork3D {
  const group = new THREE.Group();
  group.name = 'road-network';

  const roadEntries: RoadMeshEntry[] = [];
  const buildingMap = new Map(world.buildings.map((b) => [b.id, b]));

  // 1. District Plazas
  for (const district of world.districts) {
    const dX = district.center.x * SCALE;
    const dZ = district.center.y * SCALE;
    const dR = (district.radius || 180) * SCALE * 0.95;

    const plazaGeo = new THREE.CylinderGeometry(dR, dR, 0.15, 32);
    const plazaMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(district.tint || '#232144'),
      roughness: 0.85,
    });
    const plazaMesh = new THREE.Mesh(plazaGeo, plazaMat);
    plazaMesh.position.set(dX, 0.05, dZ);
    plazaMesh.receiveShadow = quality !== 'performance';
    group.add(plazaMesh);

    // District border ring
    const ringGeo = new THREE.RingGeometry(dR * 0.96, dR * 1.0, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(district.isPersonal ? '#60a5fa' : '#a78bfa'),
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.set(dX, 0.14, dZ);
    group.add(ringMesh);
  }

  // 2. Roads and Dependency Paths
  for (const road of world.roads) {
    const fromB = buildingMap.get(road.fromId);
    const toB = buildingMap.get(road.toId);

    if (!fromB || !toB) continue;

    const p1 = new THREE.Vector3(fromB.x * SCALE, 0.22, fromB.y * SCALE);
    const p2 = new THREE.Vector3(toB.x * SCALE, 0.22, toB.y * SCALE);

    const length = p1.distanceTo(p2);
    if (length < 1) continue;

    const isMain = road.tier === 'main';
    const width = isMain ? 1.8 : 1.1;

    const roadGeo = new THREE.PlaneGeometry(width, length);
    roadGeo.rotateX(-Math.PI / 2);

    const baseColor = new THREE.Color(isMain ? '#3a445e' : '#282e42');
    const highlightColor = new THREE.Color('#38bdf8');

    const roadMat = new THREE.MeshStandardMaterial({
      color: baseColor.clone(),
      roughness: 0.7,
      transparent: true,
      opacity: 0.85,
      emissive: new THREE.Color('#000000'),
      emissiveIntensity: 0,
    });

    const roadMesh = new THREE.Mesh(roadGeo, roadMat);

    // Position midway and rotate toward target
    const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
    roadMesh.position.copy(mid);
    roadMesh.lookAt(p2);
    roadMesh.rotateY(Math.PI / 2); // align plane orientation

    group.add(roadMesh);

    roadEntries.push({
      road,
      mesh: roadMesh,
      material: roadMat,
      baseColor,
      highlightColor,
      isDependency: true,
    });
  }

  // 3. Ground Plane
  const bounds = world.bounds || { width: 3000, height: 2600 };
  const groundGeo = new THREE.PlaneGeometry(bounds.width * SCALE, bounds.height * SCALE);
  groundGeo.rotateX(-Math.PI / 2);
  const groundMat = new THREE.MeshStandardMaterial({
    color: '#141424',
    roughness: 0.95,
  });
  const groundMesh = new THREE.Mesh(groundGeo, groundMat);
  groundMesh.position.set(0, 0, 0);
  groundMesh.receiveShadow = quality !== 'performance';
  group.add(groundMesh);

  // Subtle grid on ground
  const gridHelper = new THREE.GridHelper(bounds.width * SCALE * 0.8, 40, '#2d334d', '#1f2337');
  gridHelper.position.y = 0.02;
  group.add(gridHelper);

  let activeSelectedId: string | null = null;
  let activeHoveredId: string | null = null;

  const updateSelection = (selectedBuildingId: string | null, hoveredBuildingId: string | null) => {
    activeSelectedId = selectedBuildingId;
    activeHoveredId = hoveredBuildingId;

    const targetId = selectedBuildingId || hoveredBuildingId;

    for (const entry of roadEntries) {
      const isConnected = targetId && (entry.road.fromId === targetId || entry.road.toId === targetId);

      if (isConnected) {
        entry.material.color.copy(entry.highlightColor);
        entry.material.emissive.copy(entry.highlightColor);
        entry.material.emissiveIntensity = 0.8;
        entry.material.opacity = 1.0;
      } else if (targetId) {
        // Dim unrelated roads when a building is selected
        entry.material.color.copy(entry.baseColor);
        entry.material.emissive.setHex(0x000000);
        entry.material.emissiveIntensity = 0;
        entry.material.opacity = 0.35;
      } else {
        // Default state
        entry.material.color.copy(entry.baseColor);
        entry.material.emissive.setHex(0x000000);
        entry.material.emissiveIntensity = 0;
        entry.material.opacity = 0.85;
      }
    }
  };

  const update = (time: number) => {
    if (activeSelectedId || activeHoveredId) {
      const targetId = activeSelectedId || activeHoveredId;
      const pulse = Math.sin(time * 4) * 0.3 + 0.7;

      for (const entry of roadEntries) {
        if (targetId && (entry.road.fromId === targetId || entry.road.toId === targetId)) {
          entry.material.emissiveIntensity = 0.6 * pulse;
        }
      }
    }
  };

  const dispose = () => {
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
  };

  return {
    group,
    updateSelection,
    update,
    dispose,
  };
}
