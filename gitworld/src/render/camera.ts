export interface CameraState {
  x: number; // world coords the camera is centered on
  y: number;
  zoom: number;
  targetX: number;
  targetY: number;
  targetZoom: number;
  flying: boolean;
}

export function createCamera(x = 0, y = 0, zoom = 1): CameraState {
  return { x, y, zoom, targetX: x, targetY: y, targetZoom: zoom, flying: false };
}

const easeOutExpo = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

export function flyTo(cam: CameraState, x: number, y: number, zoom?: number) {
  cam.targetX = x;
  cam.targetY = y;
  if (zoom !== undefined) cam.targetZoom = zoom;
  cam.flying = true;
}

/** Advance the camera toward its target. Returns true while still moving. */
export function stepCamera(cam: CameraState, dt: number): boolean {
  const k = 1 - Math.pow(0.0025, dt);
  cam.x += (cam.targetX - cam.x) * k;
  cam.y += (cam.targetY - cam.y) * k;
  cam.zoom += (cam.targetZoom - cam.zoom) * k;
  const dist = Math.hypot(cam.targetX - cam.x, cam.targetY - cam.y) + Math.abs(cam.targetZoom - cam.zoom) * 200;
  if (dist < 0.6) {
    cam.x = cam.targetX;
    cam.y = cam.targetY;
    cam.zoom = cam.targetZoom;
    cam.flying = false;
    return false;
  }
  return true;
}

export function worldToScreen(cam: CameraState, vw: number, vh: number, wx: number, wy: number) {
  return {
    x: (wx - cam.x) * cam.zoom + vw / 2,
    y: (wy - cam.y) * cam.zoom + vh / 2,
  };
}

export function screenToWorld(cam: CameraState, vw: number, vh: number, sx: number, sy: number) {
  return {
    x: (sx - vw / 2) / cam.zoom + cam.x,
    y: (sy - vh / 2) / cam.zoom + cam.y,
  };
}

export function clampZoom(z: number) {
  return Math.min(2.2, Math.max(0.35, z));
}

export { easeOutExpo };
