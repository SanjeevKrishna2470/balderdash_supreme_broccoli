import * as THREE from 'three';
import type { PlayerState } from '../../world/playerController';

const SCALE = 0.22;

export interface PlayerAvatar3D {
  group: THREE.Group;
  destinationMarker: THREE.Group;
  update: (playerState: PlayerState, time: number) => void;
  dispose: () => void;
}

export function createPlayerAvatar3D(
  profileColorSeed: number = 42,
  quality: 'high' | 'balanced' | 'performance'
): PlayerAvatar3D {
  const group = new THREE.Group();
  group.name = 'player-avatar';

  // Deterministic color palette for player
  const hue = ((profileColorSeed % 360) + 360) % 360;
  const jacketColor = new THREE.Color(`hsl(${hue}, 65%, 52%)`);
  const trimColor = new THREE.Color(`hsl(${(hue + 40) % 360}, 75%, 65%)`);
  const skinColor = new THREE.Color('#f5d0b5');
  const pantsColor = new THREE.Color('#222538');

  const jacketMat = new THREE.MeshStandardMaterial({
    color: jacketColor,
    roughness: 0.6,
    metalness: 0.1,
  });

  const trimMat = new THREE.MeshStandardMaterial({
    color: trimColor,
    roughness: 0.4,
    emissive: trimColor.clone().multiplyScalar(0.25),
  });

  const skinMat = new THREE.MeshStandardMaterial({
    color: skinColor,
    roughness: 0.5,
  });

  const pantsMat = new THREE.MeshStandardMaterial({
    color: pantsColor,
    roughness: 0.8,
  });

  // 1. Ground Contact Shadow
  const shadowGeo = new THREE.CircleGeometry(0.75, 16);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: '#090a12',
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.position.y = 0.04;
  group.add(shadowMesh);

  // 2. Character Body Assembly
  const bodyRoot = new THREE.Group();
  bodyRoot.position.y = 0.05;
  group.add(bodyRoot);

  // Torso / Jacket
  const torsoGeo = new THREE.CylinderGeometry(0.35, 0.4, 0.85, 8);
  torsoGeo.translate(0, 0.95, 0);
  const torsoMesh = new THREE.Mesh(torsoGeo, jacketMat);
  torsoMesh.castShadow = quality !== 'performance';
  bodyRoot.add(torsoMesh);

  // Scarf / Collar
  const collarGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.18, 8);
  collarGeo.translate(0, 1.4, 0);
  const collarMesh = new THREE.Mesh(collarGeo, trimMat);
  bodyRoot.add(collarMesh);

  // Head
  const headGeo = new THREE.SphereGeometry(0.28, 12, 10);
  headGeo.translate(0, 1.68, 0);
  const headMesh = new THREE.Mesh(headGeo, skinMat);
  headMesh.castShadow = quality !== 'performance';
  bodyRoot.add(headMesh);

  // Cap / Beanie
  const capGeo = new THREE.ConeGeometry(0.32, 0.35, 8);
  capGeo.translate(0, 1.9, -0.05);
  const capMesh = new THREE.Mesh(capGeo, trimMat);
  bodyRoot.add(capMesh);

  // Backpack / Satchel (exploring developer vibe)
  const packGeo = new THREE.BoxGeometry(0.42, 0.48, 0.22);
  packGeo.translate(0, 0.95, -0.32);
  const packMesh = new THREE.Mesh(packGeo, trimMat);
  packMesh.castShadow = quality !== 'performance';
  bodyRoot.add(packMesh);

  // Left Leg
  const legGeo = new THREE.BoxGeometry(0.18, 0.55, 0.18);
  legGeo.translate(0, -0.27, 0);

  const leftLegPivot = new THREE.Group();
  leftLegPivot.position.set(-0.16, 0.55, 0);
  const leftLegMesh = new THREE.Mesh(legGeo, pantsMat);
  leftLegMesh.castShadow = quality !== 'performance';
  leftLegPivot.add(leftLegMesh);
  bodyRoot.add(leftLegPivot);

  // Right Leg
  const rightLegPivot = new THREE.Group();
  rightLegPivot.position.set(0.16, 0.55, 0);
  const rightLegMesh = new THREE.Mesh(legGeo, pantsMat);
  rightLegMesh.castShadow = quality !== 'performance';
  rightLegPivot.add(rightLegMesh);
  bodyRoot.add(rightLegPivot);

  // Left Arm
  const armGeo = new THREE.BoxGeometry(0.14, 0.55, 0.14);
  armGeo.translate(0, -0.27, 0);

  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-0.44, 1.35, 0);
  const leftArmMesh = new THREE.Mesh(armGeo, jacketMat);
  leftArmPivot.add(leftArmMesh);
  bodyRoot.add(leftArmPivot);

  // Right Arm
  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(0.44, 1.35, 0);
  const rightArmMesh = new THREE.Mesh(armGeo, jacketMat);
  rightArmPivot.add(rightArmMesh);
  bodyRoot.add(rightArmPivot);

  // 3. Destination Marker (Animated Target Ring for Click-to-Move)
  const destinationMarker = new THREE.Group();
  destinationMarker.name = 'player-destination-marker';
  destinationMarker.visible = false;

  const destOuterRingGeo = new THREE.RingGeometry(0.9, 1.15, 32);
  destOuterRingGeo.rotateX(-Math.PI / 2);
  const destMat = new THREE.MeshBasicMaterial({
    color: '#38bdf8',
    transparent: true,
    opacity: 0.75,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const destOuterMesh = new THREE.Mesh(destOuterRingGeo, destMat);
  destOuterMesh.position.y = 0.05;
  destinationMarker.add(destOuterMesh);

  const destDotGeo = new THREE.CircleGeometry(0.28, 16);
  destDotGeo.rotateX(-Math.PI / 2);
  const destDotMesh = new THREE.Mesh(destDotGeo, destMat);
  destDotMesh.position.y = 0.06;
  destinationMarker.add(destDotMesh);

  let targetAngle = 0;

  const update = (playerState: PlayerState, time: number) => {
    // 1. Position on ground plane
    group.position.set(playerState.position.x * SCALE, 0, playerState.position.y * SCALE);

    // 2. Smooth Facing Direction
    if (Math.hypot(playerState.facing.x, playerState.facing.y) > 0.1) {
      // In Three.js: -Z is forward, +X is right
      targetAngle = Math.atan2(playerState.facing.x, playerState.facing.y);
    }
    // Interpolate rotation
    const diff = targetAngle - bodyRoot.rotation.y;
    // Normalize angular difference between -PI and PI
    const normDiff = Math.atan2(Math.sin(diff), Math.cos(diff));
    bodyRoot.rotation.y += normDiff * 0.24;

    // 3. Animation State
    const isWalking = playerState.movementState === 'walking';
    const phase = playerState.walkPhase;

    if (isWalking) {
      // Walking gait: alternating legs and arms, rhythmic vertical bob
      const legSwing = Math.sin(phase * 4) * 0.65;
      leftLegPivot.rotation.x = legSwing;
      rightLegPivot.rotation.x = -legSwing;

      leftArmPivot.rotation.x = -legSwing * 0.8;
      rightArmPivot.rotation.x = legSwing * 0.8;

      const bob = Math.abs(Math.sin(phase * 4)) * 0.08;
      torsoMesh.position.y = bob;
      collarMesh.position.y = bob;
      headMesh.position.y = bob;
      capMesh.position.y = bob;
      packMesh.position.y = bob;
      shadowMesh.scale.setScalar(1 - bob * 0.4);
    } else {
      // Idle breathing
      const breathe = Math.sin(time * 2.2) * 0.02;
      leftLegPivot.rotation.x = 0;
      rightLegPivot.rotation.x = 0;
      leftArmPivot.rotation.x = Math.sin(time * 2.2) * 0.05;
      rightArmPivot.rotation.x = -Math.sin(time * 2.2) * 0.05;

      torsoMesh.position.y = breathe;
      collarMesh.position.y = breathe;
      headMesh.position.y = breathe;
      capMesh.position.y = breathe;
      packMesh.position.y = breathe;
      shadowMesh.scale.setScalar(1);
    }

    // 4. Update Destination Marker
    if (playerState.destination) {
      destinationMarker.visible = true;
      destinationMarker.position.set(
        playerState.destination.x * SCALE,
        0,
        playerState.destination.y * SCALE
      );
      // Pulsating animation
      const pulse = Math.sin(time * 6) * 0.2 + 0.9;
      destOuterMesh.scale.setScalar(pulse);
      destMat.opacity = Math.sin(time * 6) * 0.2 + 0.6;
    } else {
      destinationMarker.visible = false;
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

    destinationMarker.traverse((obj) => {
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
    destinationMarker,
    update,
    dispose,
  };
}
