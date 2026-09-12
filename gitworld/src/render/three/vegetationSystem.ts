import * as THREE from 'three';
import type { CityBuilding } from '../../world/cityTypes';
import { seededRandom, randRange } from '../../world/rng';

const SCALE = 0.22;

export interface VegetationSystem {
  group: THREE.Group;
  dispose: () => void;
}

export function createVegetationSystem(
  buildings: CityBuilding[],
  quality: 'high' | 'balanced' | 'performance'
): VegetationSystem {
  const group = new THREE.Group();
  group.name = 'vegetation-system';

  // Count items across all buildings based on overgrowthLevel
  let totalGrass = 0;
  let totalShrubs = 0;
  let totalTrees = 0;
  let totalVines = 0;

  const buildingEcoData = buildings.map((b) => {
    const profile = b.visualProfile;
    const ecoLevel = profile?.overgrowthLevel || 0;
    const footprint = (b.footprint || 50) * SCALE;

    let grassCount = 0;
    let shrubCount = 0;
    let treeCount = 0;
    let vineCount = 0;

    if (ecoLevel >= 0.2) {
      grassCount = Math.floor(ecoLevel * (quality === 'performance' ? 8 : quality === 'balanced' ? 16 : 28));
    }
    if (ecoLevel >= 0.4) {
      shrubCount = Math.floor(ecoLevel * (quality === 'performance' ? 3 : quality === 'balanced' ? 6 : 10));
      vineCount = Math.floor(ecoLevel * (quality === 'performance' ? 2 : quality === 'balanced' ? 4 : 8));
    }
    if (ecoLevel >= 0.7) {
      treeCount = Math.floor(ecoLevel * (quality === 'performance' ? 1 : quality === 'balanced' ? 2 : 4));
    }

    totalGrass += grassCount;
    totalShrubs += shrubCount;
    totalTrees += treeCount;
    totalVines += vineCount;

    return {
      b,
      ecoLevel,
      footprint,
      grassCount,
      shrubCount,
      treeCount,
      vineCount,
      rng: seededRandom(`veg:${b.id}:${profile?.stableSeed || 'seed'}`),
    };
  });

  const dummy = new THREE.Object3D();

  // 1. Instanced Grass
  if (totalGrass > 0) {
    const grassGeo = new THREE.ConeGeometry(0.2, 0.65, 3);
    grassGeo.translate(0, 0.32, 0);
    const grassMat = new THREE.MeshStandardMaterial({
      color: '#466d3f',
      roughness: 0.9,
    });
    const grassMesh = new THREE.InstancedMesh(grassGeo, grassMat, totalGrass);
    grassMesh.castShadow = quality === 'high';
    grassMesh.receiveShadow = quality !== 'performance';

    let grassIdx = 0;
    for (const item of buildingEcoData) {
      const { b, footprint, grassCount, rng } = item;
      const bX = b.x * SCALE;
      const bZ = b.y * SCALE;
      const radius = footprint * 0.62;

      for (let g = 0; g < grassCount; g++) {
        // Place around plot perimeter / corners, avoiding the front entrance (+Z direction)
        const angle = randRange(rng, -Math.PI * 0.8, Math.PI * 0.8);
        const dist = randRange(rng, radius * 0.7, radius * 1.15);
        const px = bX + Math.cos(angle) * dist;
        const pz = bZ + Math.sin(angle) * dist;
        const s = randRange(rng, 0.7, 1.4);

        dummy.position.set(px, 0.25, pz);
        dummy.scale.set(s, s, s);
        dummy.rotation.set(randRange(rng, -0.1, 0.1), randRange(rng, 0, Math.PI * 2), randRange(rng, -0.1, 0.1));
        dummy.updateMatrix();
        grassMesh.setMatrixAt(grassIdx++, dummy.matrix);
      }
    }
    grassMesh.instanceMatrix.needsUpdate = true;
    group.add(grassMesh);
  }

  // 2. Instanced Shrubs
  if (totalShrubs > 0) {
    const shrubGeo = new THREE.DodecahedronGeometry(0.5, 0);
    shrubGeo.translate(0, 0.45, 0);
    const shrubMat = new THREE.MeshStandardMaterial({
      color: '#345e3b',
      roughness: 0.85,
    });
    const shrubMesh = new THREE.InstancedMesh(shrubGeo, shrubMat, totalShrubs);
    shrubMesh.castShadow = quality !== 'performance';
    shrubMesh.receiveShadow = quality !== 'performance';

    let shrubIdx = 0;
    for (const item of buildingEcoData) {
      const { b, footprint, shrubCount, rng } = item;
      const bX = b.x * SCALE;
      const bZ = b.y * SCALE;
      const radius = footprint * 0.58;

      for (let s = 0; s < shrubCount; s++) {
        // Along foundations, behind walls
        const angle = randRange(rng, -Math.PI * 0.85, Math.PI * 0.85);
        const dist = randRange(rng, radius * 0.65, radius * 0.95);
        const px = bX + Math.cos(angle) * dist;
        const pz = bZ + Math.sin(angle) * dist;
        const sc = randRange(rng, 0.7, 1.3);

        dummy.position.set(px, 0.3, pz);
        dummy.scale.set(sc, sc * randRange(rng, 0.8, 1.2), sc);
        dummy.rotation.y = randRange(rng, 0, Math.PI * 2);
        dummy.updateMatrix();
        shrubMesh.setMatrixAt(shrubIdx++, dummy.matrix);
      }
    }
    shrubMesh.instanceMatrix.needsUpdate = true;
    group.add(shrubMesh);
  }

  // 3. Instanced Trees
  if (totalTrees > 0) {
    // Stylized low-poly tree: trunk + canopy
    const trunkGeo = new THREE.CylinderGeometry(0.18, 0.24, 1.4, 6);
    trunkGeo.translate(0, 0.7, 0);
    const trunkMat = new THREE.MeshStandardMaterial({ color: '#543d2b', roughness: 0.9 });
    const trunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, totalTrees);
    trunkMesh.castShadow = quality !== 'performance';

    const canopyGeo = new THREE.ConeGeometry(1.2, 2.4, 6);
    canopyGeo.translate(0, 1.4 + 1.2, 0);
    const canopyMat = new THREE.MeshStandardMaterial({ color: '#2d5a37', roughness: 0.8 });
    const canopyMesh = new THREE.InstancedMesh(canopyGeo, canopyMat, totalTrees);
    canopyMesh.castShadow = quality !== 'performance';
    canopyMesh.receiveShadow = quality !== 'performance';

    let treeIdx = 0;
    for (const item of buildingEcoData) {
      const { b, footprint, treeCount, rng } = item;
      const bX = b.x * SCALE;
      const bZ = b.y * SCALE;
      const radius = footprint * 0.82;

      for (let t = 0; t < treeCount; t++) {
        // Far corners of the plot, definitely away from the front entrance
        const angle = randRange(rng, -Math.PI * 0.75, Math.PI * 0.75);
        const dist = randRange(rng, radius * 0.85, radius * 1.25);
        const px = bX + Math.cos(angle) * dist;
        const pz = bZ + Math.sin(angle) * dist;
        const sc = randRange(rng, 0.8, 1.4);

        dummy.position.set(px, 0.2, pz);
        dummy.scale.set(sc, sc, sc);
        dummy.rotation.y = randRange(rng, 0, Math.PI * 2);
        dummy.updateMatrix();

        trunkMesh.setMatrixAt(treeIdx, dummy.matrix);
        canopyMesh.setMatrixAt(treeIdx, dummy.matrix);
        treeIdx++;
      }
    }
    trunkMesh.instanceMatrix.needsUpdate = true;
    canopyMesh.instanceMatrix.needsUpdate = true;
    group.add(trunkMesh);
    group.add(canopyMesh);
  }

  // 4. Instanced Wall Vines
  if (totalVines > 0) {
    const vineGeo = new THREE.BoxGeometry(0.35, 0.75, 0.08);
    const vineMat = new THREE.MeshStandardMaterial({ color: '#2a5433', roughness: 0.8 });
    const vineMesh = new THREE.InstancedMesh(vineGeo, vineMat, totalVines);

    let vineIdx = 0;
    for (const item of buildingEcoData) {
      const { b, footprint, vineCount, rng } = item;
      const bX = b.x * SCALE;
      const bZ = b.y * SCALE;
      const wallOffset = (footprint * 0.78) / 2 + 0.05;

      for (let v = 0; v < vineCount; v++) {
        // Cling to sides or back of building
        const side = v % 3; // 0 = left (-X), 1 = back (-Z), 2 = right (+X)
        let vx = bX;
        let vz = bZ;
        let ry = 0;

        if (side === 0) {
          vx = bX - wallOffset;
          vz = bZ + randRange(rng, -wallOffset * 0.7, wallOffset * 0.7);
          ry = Math.PI * 0.5;
        } else if (side === 1) {
          vx = bX + randRange(rng, -wallOffset * 0.7, wallOffset * 0.7);
          vz = bZ - wallOffset;
          ry = 0;
        } else {
          vx = bX + wallOffset;
          vz = bZ + randRange(rng, -wallOffset * 0.7, wallOffset * 0.7);
          ry = -Math.PI * 0.5;
        }

        const vy = randRange(rng, 0.8, 2.8);
        dummy.position.set(vx, vy, vz);
        dummy.scale.set(randRange(rng, 0.8, 1.3), randRange(rng, 0.8, 1.4), 1);
        dummy.rotation.set(0, ry, 0);
        dummy.updateMatrix();
        vineMesh.setMatrixAt(vineIdx++, dummy.matrix);
      }
    }
    vineMesh.instanceMatrix.needsUpdate = true;
    group.add(vineMesh);
  }

  const dispose = () => {
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.InstancedMesh) {
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
    dispose,
  };
}
