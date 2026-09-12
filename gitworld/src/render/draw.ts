import type { CameraState } from './camera';
import { worldToScreen } from './camera';
import type {
  CityBuilding,
  District,
  ContributorAvatar,
  Road,
  EnvironmentProp,
  RiverFeature,
  BridgeFeature,
  BoatFeature,
  ConstructionDistrict,
  PublicRoadFeature,
} from '../world/cityTypes';

export function drawBackground(ctx: CanvasRenderingContext2D, vw: number, vh: number) {
  const g = ctx.createRadialGradient(vw / 2, vh * 0.35, 40, vw / 2, vh * 0.5, Math.max(vw, vh) * 0.8);
  g.addColorStop(0, '#1c1a37');
  g.addColorStop(0.55, '#141228');
  g.addColorStop(1, '#0b0a16');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, vw, vh);
}

export function drawGround(
  ctx: CanvasRenderingContext2D,
  cam: CameraState,
  vw: number,
  vh: number,
  bounds: { width: number; height: number }
) {
  const topLeft = worldToScreen(cam, vw, vh, -bounds.width / 2, -bounds.height / 2);
  const w = bounds.width * cam.zoom;
  const h = bounds.height * cam.zoom;
  const r = Math.min(w, h) * 0.5;
  const cx = topLeft.x + w / 2;
  const cy = topLeft.y + h / 2;

  // Rich twilight ground
  const g = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
  g.addColorStop(0, '#26204c');
  g.addColorStop(0.45, '#1d193a');
  g.addColorStop(0.8, '#141228');
  g.addColorStop(1, 'rgba(20,18,40,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(cx, cy, r * 1.15, r * 0.95, 0, 0, Math.PI * 2);
  ctx.fill();

  // Gentle cobblestone texture rings in center
  if (cam.zoom > 0.6) {
    ctx.save();
    ctx.strokeStyle = 'rgba(167,163,196,0.06)';
    ctx.lineWidth = 1;
    for (let rad = 60; rad < r * 0.8; rad += 90) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, rad * cam.zoom, rad * 0.65 * cam.zoom, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}

export function drawDistrict(
  ctx: CanvasRenderingContext2D,
  cam: CameraState,
  vw: number,
  vh: number,
  d: District
) {
  const p = worldToScreen(cam, vw, vh, d.center.x, d.center.y);
  const r = d.radius * cam.zoom;
  ctx.save();

  // District ground aura
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, r, r * 0.65, 0, 0, Math.PI * 2);
  ctx.fillStyle = d.tint;
  ctx.globalAlpha = 0.62;
  ctx.fill();

  // Subtle border outline
  ctx.strokeStyle = 'rgba(167, 163, 196, 0.16)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.restore();

  // District Name Badge
  if (cam.zoom > 0.45) {
    ctx.save();
    ctx.font = '600 13px Inter, sans-serif';
    ctx.fillStyle = 'rgba(241,234,217,0.72)';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '0.04em';
    ctx.fillText(d.name.toUpperCase(), p.x, p.y - r * 0.65 - 12);
    ctx.restore();
  }
}

export function drawRoad(
  ctx: CanvasRenderingContext2D,
  cam: CameraState,
  vw: number,
  vh: number,
  roadOrFrom: Road | { x: number; y: number },
  maybeTo?: { x: number; y: number }
) {
  ctx.save();

  // Support both (road) and (from, to) signatures
  let waypoints: Array<{ x: number; y: number }> = [];
  let tier: 'main' | 'district' | 'path' = 'district';

  if ('waypoints' in roadOrFrom && roadOrFrom.waypoints && roadOrFrom.waypoints.length >= 2) {
    waypoints = roadOrFrom.waypoints;
    tier = roadOrFrom.tier || 'district';
  } else if (maybeTo && 'x' in roadOrFrom) {
    const from = roadOrFrom;
    const to = maybeTo;
    waypoints = [from, { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 - 20 }, to];
  } else {
    ctx.restore();
    return;
  }

  const screenPoints = waypoints.map((pt) => worldToScreen(cam, vw, vh, pt.x, pt.y));

  if (tier === 'main') {
    // Wide main stone road with curb
    ctx.strokeStyle = 'rgba(120, 115, 155, 0.35)';
    ctx.lineWidth = Math.max(3, 8 * cam.zoom);
    ctx.beginPath();
    ctx.moveTo(screenPoints[0].x, screenPoints[0].y);
    for (let i = 1; i < screenPoints.length; i++) {
      ctx.lineTo(screenPoints[i].x, screenPoints[i].y);
    }
    ctx.stroke();

    // Central paving dash
    ctx.strokeStyle = 'rgba(241, 234, 217, 0.45)';
    ctx.lineWidth = Math.max(1.2, 2 * cam.zoom);
    ctx.setLineDash([8 * cam.zoom, 8 * cam.zoom]);
    ctx.beginPath();
    ctx.moveTo(screenPoints[0].x, screenPoints[0].y);
    for (let i = 1; i < screenPoints.length; i++) {
      ctx.lineTo(screenPoints[i].x, screenPoints[i].y);
    }
    ctx.stroke();
  } else if (tier === 'district') {
    // District cobblestone street
    ctx.strokeStyle = 'rgba(167, 163, 196, 0.3)';
    ctx.lineWidth = Math.max(2, 4.5 * cam.zoom);
    ctx.beginPath();
    ctx.moveTo(screenPoints[0].x, screenPoints[0].y);
    for (let i = 1; i < screenPoints.length; i++) {
      ctx.lineTo(screenPoints[i].x, screenPoints[i].y);
    }
    ctx.stroke();
  } else {
    // Subtle footpath
    ctx.strokeStyle = 'rgba(167, 163, 196, 0.22)';
    ctx.lineWidth = Math.max(1, 2.2 * cam.zoom);
    ctx.setLineDash([4 * cam.zoom, 5 * cam.zoom]);
    ctx.beginPath();
    ctx.moveTo(screenPoints[0].x, screenPoints[0].y);
    for (let i = 1; i < screenPoints.length; i++) {
      ctx.lineTo(screenPoints[i].x, screenPoints[i].y);
    }
    ctx.stroke();
  }

  ctx.restore();
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawEnvironmentProp(
  ctx: CanvasRenderingContext2D,
  cam: CameraState,
  vw: number,
  vh: number,
  prop: EnvironmentProp,
  t: number
) {
  const p = worldToScreen(cam, vw, vh, prop.x, prop.y);
  ctx.save();

  switch (prop.type) {
    case 'plaza_fountain': {
      const fr = 26 * cam.zoom;
      // Stone rim
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, fr, fr * 0.6, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#3a375a';
      ctx.fill();
      ctx.strokeStyle = '#59ada2';
      ctx.lineWidth = 2 * cam.zoom;
      ctx.stroke();

      // Water pool
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, fr * 0.82, fr * 0.48, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#3d7d76';
      ctx.fill();

      // Spray sparkle
      const ripple = Math.sin(t * 0.003) * 3 * cam.zoom;
      ctx.beginPath();
      ctx.arc(p.x, p.y - 6 * cam.zoom, (4 + ripple) * cam.zoom, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(241, 234, 217, 0.85)';
      ctx.fill();
      break;
    }
    case 'lamp': {
      const h = 22 * cam.zoom;
      // Post
      ctx.strokeStyle = '#323048';
      ctx.lineWidth = Math.max(1.5, 2.5 * cam.zoom);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x, p.y - h);
      ctx.stroke();

      // Lantern glow
      const pulse = Math.sin(t * 0.002 + prop.x) * 2;
      const glowR = (8 + pulse) * cam.zoom;
      const g = ctx.createRadialGradient(p.x, p.y - h, 1, p.x, p.y - h, glowR * 2.5);
      g.addColorStop(0, 'rgba(231, 181, 105, 0.85)');
      g.addColorStop(0.4, 'rgba(231, 181, 105, 0.25)');
      g.addColorStop(1, 'rgba(231, 181, 105, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y - h, glowR * 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Lantern fixture
      ctx.fillStyle = '#f0d78a';
      ctx.fillRect(p.x - 3 * cam.zoom, p.y - h - 4 * cam.zoom, 6 * cam.zoom, 6 * cam.zoom);
      break;
    }
    case 'tree': {
      const tr = 14 * cam.zoom;
      // Shadow
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + 2, tr * 1.1, tr * 0.45, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.fill();

      // Trunk
      ctx.fillStyle = '#4a3728';
      ctx.fillRect(p.x - 2 * cam.zoom, p.y - 12 * cam.zoom, 4 * cam.zoom, 14 * cam.zoom);

      // Canopy
      ctx.beginPath();
      ctx.arc(p.x, p.y - 18 * cam.zoom, tr, 0, Math.PI * 2);
      ctx.fillStyle = '#3b6e4e';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(p.x - 4 * cam.zoom, p.y - 21 * cam.zoom, tr * 0.72, 0, Math.PI * 2);
      ctx.fillStyle = '#4f8c66';
      ctx.fill();
      break;
    }
    case 'bench': {
      const bw = 16 * cam.zoom;
      const bh = 6 * cam.zoom;
      ctx.fillStyle = '#5a4635';
      roundRectPath(ctx, p.x - bw / 2, p.y - bh, bw, bh, 2 * cam.zoom);
      ctx.fill();
      ctx.fillStyle = '#222033';
      ctx.fillRect(p.x - bw / 2 + 1, p.y, 2 * cam.zoom, 4 * cam.zoom);
      ctx.fillRect(p.x + bw / 2 - 3 * cam.zoom, p.y, 2 * cam.zoom, 4 * cam.zoom);
      break;
    }
    case 'sign': {
      if (cam.zoom > 0.5 && prop.label) {
        ctx.font = '500 11px Inter, sans-serif';
        const txtW = ctx.measureText(prop.label).width;
        const pad = 6;
        roundRectPath(ctx, p.x - txtW / 2 - pad, p.y - 20 * cam.zoom, txtW + pad * 2, 18, 4);
        ctx.fillStyle = 'rgba(23, 22, 43, 0.88)';
        ctx.fill();
        ctx.strokeStyle = '#59ada2';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#f1ead9';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(prop.label, p.x, p.y - 20 * cam.zoom + 9);
      }
      break;
    }
  }

  ctx.restore();
}

export function drawBuilding(
  ctx: CanvasRenderingContext2D,
  cam: CameraState,
  vw: number,
  vh: number,
  b: CityBuilding,
  opts: { hovered: boolean; selected: boolean; t: number }
) {
  const p = worldToScreen(cam, vw, vh, b.x, b.y);
  const fw = b.footprint * cam.zoom;
  const fh = b.heightPx * cam.zoom;
  const dim = b.activity === 'dormant';
  const quiet = b.activity === 'quiet';

  ctx.save();

  // Satellites (forks)
  for (const s of b.satellites) {
    const sp = worldToScreen(cam, vw, vh, s.x, s.y);
    ctx.beginPath();
    ctx.ellipse(sp.x, sp.y + s.r * cam.zoom * 0.4, s.r * cam.zoom, s.r * cam.zoom * 0.7, 0, 0, Math.PI * 2);
    ctx.fillStyle = dim ? 'rgba(90,87,124,0.5)' : b.style.secondary;
    ctx.globalAlpha = 0.85;
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Ground shadow
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + fh * 0.08, fw * 0.65, fw * 0.24, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.38)';
  ctx.fill();

  const baseX = p.x - fw / 2;
  const baseY = p.y - fh;

  // Selection / hover halo
  if (opts.selected || opts.hovered) {
    roundRectPath(ctx, baseX - 8, baseY - 8, fw + 16, fh + 16, 14);
    ctx.strokeStyle = opts.selected ? 'rgba(89,173,162,0.95)' : 'rgba(241,234,217,0.65)';
    ctx.lineWidth = opts.selected ? 2.8 : 1.8;
    ctx.stroke();
  }

  const bodyColor = dim ? '#3d3b5c' : quiet ? mix(b.style.primary, '#3d3b5c', 0.35) : b.style.primary;
  const roofColor = dim ? '#333150' : quiet ? mix(b.style.secondary, '#302e4d', 0.3) : b.style.secondary;

  // Building Body
  roundRectPath(ctx, baseX, baseY, fw, fh, Math.max(4, 8 * cam.zoom));
  ctx.fillStyle = bodyColor;
  ctx.fill();

  // Roof / cap
  ctx.beginPath();
  const capH = fh * 0.22;
  switch (b.style.motif) {
    case 'peak':
      ctx.moveTo(baseX - 2, baseY + 2);
      ctx.lineTo(p.x, baseY - capH);
      ctx.lineTo(baseX + fw + 2, baseY + 2);
      break;
    case 'spire':
      ctx.moveTo(p.x - fw * 0.18, baseY);
      ctx.lineTo(p.x, baseY - capH * 1.6);
      ctx.lineTo(p.x + fw * 0.18, baseY);
      break;
    case 'dome':
      ctx.ellipse(p.x, baseY + 2, fw * 0.42, capH, 0, Math.PI, 0, true);
      break;
    default:
      roundRectPath(ctx, baseX, baseY - capH * 0.5, fw, capH * 0.5, 4 * cam.zoom);
  }
  ctx.closePath();
  ctx.fillStyle = roofColor;
  ctx.fill();

  // Windows
  const rows = Math.max(1, Math.floor(fh / (16 * cam.zoom)));
  const cols = Math.max(1, Math.floor(fw / (14 * cam.zoom)));
  const winW = Math.max(2, fw / cols - 4 * cam.zoom);
  const winH = Math.max(2, (fh * 0.55) / rows - 4 * cam.zoom);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const wx = baseX + (c + 0.5) * (fw / cols) - winW / 2;
      const wy = baseY + fh * 0.26 + (r + 0.5) * ((fh * 0.54) / rows) - winH / 2;
      const flicker = dim ? 0 : Math.sin(opts.t * 0.001 + r * 3 + c * 7 + b.x) * 0.5 + 0.5;
      const lit = !dim && (quiet ? flicker > 0.75 : flicker > 0.25);
      ctx.fillStyle = lit ? b.style.glow : dim ? 'rgba(15,14,26,0.55)' : 'rgba(15,14,26,0.4)';
      if (lit) {
        ctx.shadowColor = b.style.glow;
        ctx.shadowBlur = 6 * cam.zoom;
      } else {
        ctx.shadowBlur = 0;
      }
      ctx.fillRect(wx, wy, winW, winH);
      ctx.shadowBlur = 0;
    }
  }

  // Welcoming Doorway Entrance Arch at building bottom
  const doorW = Math.max(8, fw * 0.24);
  const doorH = Math.max(12, fh * 0.2);
  const doorX = p.x - doorW / 2;
  const doorY = p.y - doorH;

  roundRectPath(ctx, doorX, doorY, doorW, doorH, doorW * 0.45);
  ctx.fillStyle = '#100f1c';
  ctx.fill();
  ctx.strokeStyle = b.style.secondary;
  ctx.lineWidth = 1.5 * cam.zoom;
  ctx.stroke();

  // Warm entrance lantern above door
  if (!dim) {
    ctx.fillStyle = '#f0d78a';
    ctx.beginPath();
    ctx.arc(p.x, doorY - 3 * cam.zoom, 2.5 * cam.zoom, 0, Math.PI * 2);
    ctx.fill();
  }

  // Construction banner if active PRs
  if (b.hasConstruction) {
    ctx.save();
    ctx.strokeStyle = 'rgba(231,181,105,0.85)';
    ctx.lineWidth = 1.6;
    ctx.setLineDash([4 * cam.zoom, 4 * cam.zoom]);
    roundRectPath(ctx, baseX - 4, baseY - 6, fw + 8, fh + 10, 6);
    ctx.stroke();
    ctx.restore();
  }

  // Issue markers (flags)
  for (let i = 0; i < b.issuesShown; i++) {
    const ix = baseX + fw + 4 - i * 9 * cam.zoom;
    const iy = baseY - 6;
    ctx.beginPath();
    ctx.moveTo(ix, iy - 5 * cam.zoom);
    ctx.lineTo(ix + 4 * cam.zoom, iy + 4 * cam.zoom);
    ctx.lineTo(ix - 4 * cam.zoom, iy + 4 * cam.zoom);
    ctx.closePath();
    ctx.fillStyle = '#d9805f';
    ctx.fill();
  }

  ctx.restore();
}

export function drawInteractionPrompt(
  ctx: CanvasRenderingContext2D,
  cam: CameraState,
  vw: number,
  vh: number,
  b: CityBuilding,
  actionText = 'Enter repository'
) {
  const p = worldToScreen(cam, vw, vh, b.x, b.y);
  const y = p.y + 16 * cam.zoom;

  ctx.save();
  ctx.font = '600 12px Inter, sans-serif';

  const label = `[E] ${actionText}`;
  const padX = 12;
  const w = ctx.measureText(label).width + padX * 2;
  const h = 26;

  roundRectPath(ctx, p.x - w / 2, y, w, h, h / 2);
  ctx.fillStyle = 'rgba(14, 13, 24, 0.94)';
  ctx.fill();
  ctx.strokeStyle = '#59ada2';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  ctx.fillStyle = '#59ada2';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, p.x, y + h / 2 + 1);

  ctx.restore();
}

export function drawFloatingPrompt(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  key: string,
  actionText: string
) {
  ctx.save();
  ctx.font = '600 12px Inter, sans-serif';

  const label = `[${key}] ${actionText}`;
  const padX = 12;
  const w = ctx.measureText(label).width + padX * 2;
  const h = 26;

  roundRectPath(ctx, screenX - w / 2, screenY, w, h, h / 2);
  ctx.fillStyle = 'rgba(14, 13, 24, 0.94)';
  ctx.fill();
  ctx.strokeStyle = '#59ada2';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  ctx.fillStyle = '#59ada2';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, screenX, screenY + h / 2 + 1);

  ctx.restore();
}

export function drawBuildingLabel(
  ctx: CanvasRenderingContext2D,
  cam: CameraState,
  vw: number,
  vh: number,
  b: CityBuilding,
  opts: { emphasized: boolean }
) {
  const p = worldToScreen(cam, vw, vh, b.x, b.y);
  const fh = b.heightPx * cam.zoom;
  const y = p.y - fh - 18;
  const text = b.repo.name;

  ctx.save();
  ctx.font = opts.emphasized ? '600 13px Inter, sans-serif' : '500 12px Inter, sans-serif';
  const padX = 10;
  const w = ctx.measureText(text).width + padX * 2;
  const h = 24;
  roundRectPath(ctx, p.x - w / 2, y - h, w, h, h / 2);
  ctx.fillStyle = opts.emphasized ? 'rgba(23,22,43,0.94)' : 'rgba(23,22,43,0.8)';
  ctx.fill();
  if (opts.emphasized) {
    ctx.strokeStyle = 'rgba(89,173,162,0.7)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  ctx.fillStyle = '#f1ead9';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, p.x, y - h / 2 + 1);
  ctx.restore();
}

export function drawAvatar(
  ctx: CanvasRenderingContext2D,
  cam: CameraState,
  vw: number,
  vh: number,
  a: ContributorAvatar,
  t: number
) {
  const bob = Math.sin(t * 0.0015 + a.phase) * 3;
  const p = worldToScreen(cam, vw, vh, a.homeX, a.homeY + bob);
  const s = 5 * cam.zoom;
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + s, s * 1.1, s * 0.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(p.x, p.y, s, 0, Math.PI * 2);
  ctx.fillStyle = a.hue;
  ctx.fill();
}

/**
 * Dedicated Player Avatar System
 * Draws a recognizable player character for the authenticated GitHub user.
 * Features:
 * - Layered character silhouette with body, cloak/tunic, head, shadow
 * - GitHub avatar portrait badge or stylized crest
 * - Walking leg stride & bobbing animation when moving
 * - Breathing idle state
 * - Direction facing eyes/gaze indicator
 * - Focus/selection aura ring
 */
export function drawPlayerAvatar(
  ctx: CanvasRenderingContext2D,
  vw: number,
  vh: number,
  facing: { x: number; y: number },
  zoom: number,
  avatarImg: HTMLImageElement | null,
  walkPhase = 0,
  isWalking = false,
  colorSeed = 42
) {
  const p = { x: vw / 2, y: vh / 2 };
  const s = 14 * zoom; // scale factor
  const bob = isWalking ? Math.sin(walkPhase * 8) * 2.5 * zoom : Math.sin(walkPhase * 1.8) * 0.8 * zoom;

  ctx.save();

  // 1. Ground Shadow
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + s * 0.9, s * 0.95, s * 0.38, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
  ctx.fill();

  // 2. Selection Ring / Realm Aura
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + s * 0.9, s * 1.15, s * 0.45, 0, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(89, 173, 162, 0.55)';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Derive clothing hue from user's seed
  const cloakColors = ['#59ada2', '#4d7fb3', '#948bd0', '#c1694a', '#d9805f', '#5fb0c9'];
  const cloakColor = cloakColors[Math.abs(colorSeed) % cloakColors.length];

  // 3. Legs / Stride (animated when walking)
  const legSwing = isWalking ? Math.sin(walkPhase * 8) * 5 * zoom : 0;
  ctx.fillStyle = '#1c1a2e';
  // Left foot
  ctx.beginPath();
  ctx.ellipse(p.x - 3.5 * zoom, p.y + s * 0.8 + legSwing, 2.8 * zoom, 4.2 * zoom, 0, 0, Math.PI * 2);
  ctx.fill();
  // Right foot
  ctx.beginPath();
  ctx.ellipse(p.x + 3.5 * zoom, p.y + s * 0.8 - legSwing, 2.8 * zoom, 4.2 * zoom, 0, 0, Math.PI * 2);
  ctx.fill();

  // 4. Character Cloak / Torso
  const torsoY = p.y - s * 0.15 + bob;
  ctx.beginPath();
  ctx.moveTo(p.x - 7 * zoom, torsoY + 9 * zoom);
  ctx.lineTo(p.x - 5.5 * zoom, torsoY);
  ctx.lineTo(p.x + 5.5 * zoom, torsoY);
  ctx.lineTo(p.x + 7 * zoom, torsoY + 9 * zoom);
  ctx.closePath();
  ctx.fillStyle = cloakColor;
  ctx.fill();
  ctx.strokeStyle = '#232140';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Belt / Clasp
  ctx.fillStyle = '#e7b569';
  ctx.fillRect(p.x - 2.5 * zoom, torsoY + 7 * zoom, 5 * zoom, 2.2 * zoom);

  // 5. Head / Face (circular badge with avatar image if loaded, or stylized adventurer crest)
  const headY = torsoY - 8.5 * zoom;
  const headR = 7.5 * zoom;

  ctx.save();
  ctx.beginPath();
  ctx.arc(p.x, headY, headR, 0, Math.PI * 2);
  ctx.fillStyle = '#f1ead9';
  ctx.fill();
  ctx.strokeStyle = '#232140';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  if (avatarImg && avatarImg.complete && avatarImg.naturalWidth > 0) {
    ctx.clip();
    ctx.drawImage(avatarImg, p.x - headR, headY - headR, headR * 2, headR * 2);
  } else {
    // Stylized Adventurer Eyes/Visor facing direction
    ctx.fillStyle = '#232140';
    const eyeOffsetX = facing.x * 2.8 * zoom;
    const eyeOffsetY = facing.y * 1.5 * zoom;
    ctx.beginPath();
    ctx.arc(p.x + eyeOffsetX - 2 * zoom, headY + eyeOffsetY, 1.4 * zoom, 0, Math.PI * 2);
    ctx.arc(p.x + eyeOffsetX + 2 * zoom, headY + eyeOffsetY, 1.4 * zoom, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 6. Feather / Crest on cap
  ctx.fillStyle = '#e7b569';
  ctx.beginPath();
  ctx.moveTo(p.x + 3 * zoom, headY - headR);
  ctx.lineTo(p.x + 7 * zoom, headY - headR - 5 * zoom);
  ctx.lineTo(p.x + 4 * zoom, headY - headR + 2 * zoom);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/** Fallback for existing call sites */
export function drawPlayer(ctx: CanvasRenderingContext2D, vw: number, vh: number, facing: { x: number; y: number }, zoom: number) {
  drawPlayerAvatar(ctx, vw, vh, facing, zoom, null, 0, false, 42);
}

/**
 * Draws a Remote Player Avatar with distance-aware Level of Detail (LOD),
 * interpolated walking motion, identity color, username badge, and active emotes.
 */
export function drawRemotePlayerAvatar(
  ctx: CanvasRenderingContext2D,
  cam: CameraState,
  vw: number,
  vh: number,
  player: {
    id: string;
    username: string;
    displayName?: string;
    profileColorSeed: number;
    position: { x: number; y: number };
    facing: { x: number; y: number };
    isWalking: boolean;
    walkPhase: number;
  },
  emote?: { emoteId: string; startedAt: number } | null,
  chat?: { text: string; sentAt: number } | null,
  isHovered = false
) {
  const p = worldToScreen(cam, vw, vh, player.position.x, player.position.y);

  // Viewport Culling
  const margin = 60;
  if (p.x < -margin || p.x > vw + margin || p.y < -margin || p.y > vh + margin) {
    return;
  }

  // Calculate distance from screen center (focal point) for LOD
  const distFromCenter = Math.hypot(p.x - vw / 2, p.y - vh / 2);
  const isNear = distFromCenter < 360 || isHovered;
  const isFar = distFromCenter > 750;

  const cloakColors = ['#59ada2', '#4d7fb3', '#948bd0', '#c1694a', '#d9805f', '#5fb0c9', '#ec4899', '#10b981'];
  const cloakColor = cloakColors[Math.abs(player.profileColorSeed) % cloakColors.length];

  ctx.save();

  // LOD 3: Far representation (subtle identity pulse marker)
  if (isFar && !isHovered) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5 * cam.zoom, 0, Math.PI * 2);
    ctx.fillStyle = cloakColor;
    ctx.fill();
    ctx.restore();
    return;
  }

  const s = 13 * cam.zoom;
  const bob = player.isWalking ? Math.sin(player.walkPhase * 8) * 2.2 * cam.zoom : 0;

  // 1. Ground Shadow
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + s * 0.88, s * 0.9, s * 0.35, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fill();

  // LOD 2: Mid-range representation (simplified silhouette)
  if (!isNear && !isHovered) {
    ctx.beginPath();
    ctx.arc(p.x, p.y - s * 0.5, s * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = cloakColor;
    ctx.fill();
    ctx.strokeStyle = '#18162b';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
    return;
  }

  // LOD 1: Near representation (Full character avatar)
  // Legs / Stride
  const legSwing = player.isWalking ? Math.sin(player.walkPhase * 8) * 4.5 * cam.zoom : 0;
  ctx.fillStyle = '#1c1a2e';
  // Left foot
  ctx.beginPath();
  ctx.ellipse(p.x - 3 * cam.zoom, p.y + s * 0.78 + legSwing, 2.6 * cam.zoom, 3.8 * cam.zoom, 0, 0, Math.PI * 2);
  ctx.fill();
  // Right foot
  ctx.beginPath();
  ctx.ellipse(p.x + 3 * cam.zoom, p.y + s * 0.78 - legSwing, 2.6 * cam.zoom, 3.8 * cam.zoom, 0, 0, Math.PI * 2);
  ctx.fill();

  // Torso / Cloak
  const torsoY = p.y - s * 0.12 + bob;
  ctx.beginPath();
  ctx.moveTo(p.x - 6.5 * cam.zoom, torsoY + 8.5 * cam.zoom);
  ctx.lineTo(p.x - 5 * cam.zoom, torsoY);
  ctx.lineTo(p.x + 5 * cam.zoom, torsoY);
  ctx.lineTo(p.x + 6.5 * cam.zoom, torsoY + 8.5 * cam.zoom);
  ctx.closePath();
  ctx.fillStyle = cloakColor;
  ctx.fill();
  ctx.strokeStyle = '#232140';
  ctx.lineWidth = 1.3;
  ctx.stroke();

  // Head
  const headY = torsoY - 8 * cam.zoom;
  const headR = 7 * cam.zoom;
  ctx.beginPath();
  ctx.arc(p.x, headY, headR, 0, Math.PI * 2);
  ctx.fillStyle = '#f1ead9';
  ctx.fill();
  ctx.strokeStyle = '#232140';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Facing Gaze Eyes
  const eyeOffsetX = player.facing.x * 2.5 * cam.zoom;
  const eyeOffsetY = player.facing.y * 1.3 * cam.zoom;
  ctx.fillStyle = '#232140';
  ctx.beginPath();
  ctx.arc(p.x + eyeOffsetX - 1.8 * cam.zoom, headY + eyeOffsetY, 1.2 * cam.zoom, 0, Math.PI * 2);
  ctx.arc(p.x + eyeOffsetX + 1.8 * cam.zoom, headY + eyeOffsetY, 1.2 * cam.zoom, 0, Math.PI * 2);
  ctx.fill();

  // Username Pill (shown on hover or proximity)
  const nameY = headY - 14 * cam.zoom;
  const username = player.displayName || player.username;
  ctx.font = `600 ${Math.max(9, Math.round(9.5 * cam.zoom))}px Inter, sans-serif`;
  const nameW = ctx.measureText(username).width;

  ctx.fillStyle = 'rgba(23, 22, 43, 0.88)';
  ctx.beginPath();
  ctx.roundRect(p.x - nameW / 2 - 6, nameY - 7, nameW + 12, 14, 4);
  ctx.fill();
  ctx.strokeStyle = cloakColor;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#f1ead9';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(username, p.x, nameY);

  // Active Floating Emote
  if (emote) {
    const emoteIcons: Record<string, string> = {
      wave: '👋',
      point: '👉',
      follow: '🏃',
      celebrate: '🎉',
      curious: '🔍',
      thanks: '🙏',
    };
    const icon = emoteIcons[emote.emoteId] || '👋';
    const elapsed = Date.now() - emote.startedAt;
    const rise = Math.min(18, elapsed * 0.008);
    const emoteY = nameY - 16 * cam.zoom - rise;

    ctx.font = `${Math.max(14, Math.round(16 * cam.zoom))}px sans-serif`;
    ctx.fillText(icon, p.x, emoteY);
  }

  // Active Proximity Chat Bubble
  if (chat) {
    const chatY = nameY - 26 * cam.zoom;
    ctx.font = `500 ${Math.max(9, Math.round(9 * cam.zoom))}px Inter, sans-serif`;
    const chatW = ctx.measureText(chat.text).width;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
    ctx.beginPath();
    ctx.roundRect(p.x - chatW / 2 - 8, chatY - 8, chatW + 16, 16, 6);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.fillText(chat.text, p.x, chatY);
  }

  ctx.restore();
}

function mix(a: string, b: string, t: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const r = Math.round(ca.r + (cb.r - ca.r) * t);
  const g = Math.round(ca.g + (cb.g - ca.g) * t);
  const bch = Math.round(ca.b + (cb.b - ca.b) * t);
  return `rgb(${r},${g},${bch})`;
}

function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

/**
 * Draws the River separating town from the Construction District (AGENT.md Section 8)
 */
export function drawRiver(
  ctx: CanvasRenderingContext2D,
  cam: CameraState,
  vw: number,
  vh: number,
  river: RiverFeature,
  bounds: { width: number; height: number },
  timeMs: number
) {
  const pNorth = worldToScreen(cam, vw, vh, 0, river.bankNorth);
  const pSouth = worldToScreen(cam, vw, vh, 0, river.bankSouth);
  const riverH = (river.bankSouth - river.bankNorth) * cam.zoom;

  // Viewport culling
  if (pSouth.y < -50 || pNorth.y > vh + 50) return;

  const leftX = worldToScreen(cam, vw, vh, -bounds.width / 2, 0).x;
  const rightX = worldToScreen(cam, vw, vh, bounds.width / 2, 0).x;
  const riverW = Math.max(vw, rightX - leftX);
  const startX = Math.min(0, leftX);

  ctx.save();

  // 1. Water surface gradient (dark fantasy twilight waters)
  const waterGrad = ctx.createLinearGradient(0, pNorth.y, 0, pSouth.y);
  waterGrad.addColorStop(0, '#0d1f2d');
  waterGrad.addColorStop(0.2, '#143144');
  waterGrad.addColorStop(0.5, '#1b3f57');
  waterGrad.addColorStop(0.8, '#143144');
  waterGrad.addColorStop(1, '#0d1f2d');

  ctx.fillStyle = waterGrad;
  ctx.fillRect(startX, pNorth.y, riverW, riverH);

  // 2. Animated water flow currents & wave crests
  ctx.strokeStyle = 'rgba(89, 173, 162, 0.22)';
  ctx.lineWidth = 1.6;
  const flowOffset = (timeMs * 0.04) % 180;

  for (let row = 0; row < 4; row++) {
    const cy = pNorth.y + (riverH * (row + 1)) / 5;
    ctx.beginPath();
    for (let x = startX - 40; x < startX + riverW + 40; x += 40) {
      const wavePhase = (x + flowOffset * (row % 2 === 0 ? 1 : 1.2)) * 0.03;
      const wy = cy + Math.sin(wavePhase) * (3 * cam.zoom);
      if (x === startX - 40) ctx.moveTo(x, wy);
      else ctx.lineTo(x, wy);
    }
    ctx.stroke();
  }

  // 3. Shimmer reflections
  ctx.strokeStyle = 'rgba(241, 234, 217, 0.15)';
  ctx.lineWidth = 1.0;
  for (let i = 0; i < 6; i++) {
    const sx = ((startX + i * 220 + flowOffset * 2) % (riverW + 100)) + startX;
    const sy = pNorth.y + ((i * 37) % Math.max(20, riverH - 20));
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + 24 * cam.zoom, sy);
    ctx.stroke();
  }

  // 4. North Bank Border (Grassy shore with rocks)
  ctx.fillStyle = '#1c2e26';
  ctx.fillRect(startX, pNorth.y - 4 * cam.zoom, riverW, 5 * cam.zoom);
  ctx.strokeStyle = 'rgba(79, 140, 102, 0.6)';
  ctx.lineWidth = 2 * cam.zoom;
  ctx.beginPath();
  ctx.moveTo(startX, pNorth.y);
  ctx.lineTo(startX + riverW, pNorth.y);
  ctx.stroke();

  // 5. South Bank Border (Construction shore with crushed rock/sand)
  ctx.fillStyle = '#2d2722';
  ctx.fillRect(startX, pSouth.y - 1 * cam.zoom, riverW, 6 * cam.zoom);
  ctx.strokeStyle = 'rgba(180, 140, 90, 0.5)';
  ctx.lineWidth = 2 * cam.zoom;
  ctx.beginPath();
  ctx.moveTo(startX, pSouth.y);
  ctx.lineTo(startX + riverW, pSouth.y);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draws the Arched Stone Bridge crossing the river (AGENT.md Section 8)
 */
export function drawBridge(
  ctx: CanvasRenderingContext2D,
  cam: CameraState,
  vw: number,
  vh: number,
  bridge: BridgeFeature
) {
  const p = worldToScreen(cam, vw, vh, bridge.x, bridge.y);
  const bw = bridge.width * cam.zoom;
  const bl = bridge.length * cam.zoom;

  // Viewport culling
  if (p.x + bw < -50 || p.x - bw > vw + 50 || p.y + bl < -50 || p.y - bl > vh + 50) return;

  ctx.save();

  // 1. Water shadow cast by bridge
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(p.x - bw / 2 - 4 * cam.zoom, p.y - bl / 2, bw + 8 * cam.zoom, bl);

  // 2. Stone abutments / foundation arches
  ctx.fillStyle = '#1e1c2e';
  ctx.fillRect(p.x - bw / 2 - 6 * cam.zoom, p.y - bl / 2 - 6 * cam.zoom, bw + 12 * cam.zoom, 12 * cam.zoom);
  ctx.fillRect(p.x - bw / 2 - 6 * cam.zoom, p.y + bl / 2 - 6 * cam.zoom, bw + 12 * cam.zoom, 12 * cam.zoom);

  // 3. Bridge Road Deck (Flagstone pavement)
  const deckGrad = ctx.createLinearGradient(p.x - bw / 2, 0, p.x + bw / 2, 0);
  deckGrad.addColorStop(0, '#312d4a');
  deckGrad.addColorStop(0.5, '#403b60');
  deckGrad.addColorStop(1, '#312d4a');
  ctx.fillStyle = deckGrad;
  ctx.fillRect(p.x - bw / 2, p.y - bl / 2, bw, bl);

  // Deck stone joints
  ctx.strokeStyle = 'rgba(20, 18, 35, 0.45)';
  ctx.lineWidth = 1;
  for (let sy = p.y - bl / 2; sy < p.y + bl / 2; sy += 18 * cam.zoom) {
    ctx.beginPath();
    ctx.moveTo(p.x - bw / 2, sy);
    ctx.lineTo(p.x + bw / 2, sy);
    ctx.stroke();
  }

  // 4. Parapet / Balustrades on Left & Right sides
  ctx.fillStyle = '#514c74';
  // Left railing
  ctx.fillRect(p.x - bw / 2 - 3 * cam.zoom, p.y - bl / 2, 4 * cam.zoom, bl);
  // Right railing
  ctx.fillRect(p.x + bw / 2 - 1 * cam.zoom, p.y - bl / 2, 4 * cam.zoom, bl);

  // 5. Entrance Lanterns at North and South ends
  const lanternOffsets = [
    { x: -bw / 2 - 2 * cam.zoom, y: -bl / 2 },
    { x: bw / 2 + 2 * cam.zoom, y: -bl / 2 },
    { x: -bw / 2 - 2 * cam.zoom, y: bl / 2 },
    { x: bw / 2 + 2 * cam.zoom, y: bl / 2 },
  ];

  for (const lo of lanternOffsets) {
    const lx = p.x + lo.x;
    const ly = p.y + lo.y;
    // Post
    ctx.fillStyle = '#1c1a2e';
    ctx.fillRect(lx - 1.5 * cam.zoom, ly - 8 * cam.zoom, 3 * cam.zoom, 10 * cam.zoom);
    // Lantern glow
    const g = ctx.createRadialGradient(lx, ly - 8 * cam.zoom, 1, lx, ly - 8 * cam.zoom, 14 * cam.zoom);
    g.addColorStop(0, 'rgba(240, 180, 80, 0.85)');
    g.addColorStop(1, 'rgba(240, 180, 80, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(lx, ly - 8 * cam.zoom, 14 * cam.zoom, 0, Math.PI * 2);
    ctx.fill();
    // Glass bulb
    ctx.fillStyle = '#ffdf7a';
    ctx.fillRect(lx - 2 * cam.zoom, ly - 10 * cam.zoom, 4 * cam.zoom, 4 * cam.zoom);
  }

  ctx.restore();
}

/**
 * Draws the Ferry Boat & Crossing Docks (AGENT.md Section 8)
 */
export function drawBoat(
  ctx: CanvasRenderingContext2D,
  cam: CameraState,
  vw: number,
  vh: number,
  boat: BoatFeature,
  nearDock: boolean,
  timeMs: number
) {
  const pTownDock = worldToScreen(cam, vw, vh, boat.dockTown.x, boat.dockTown.y);
  const pConstDock = worldToScreen(cam, vw, vh, boat.dockConstruction.x, boat.dockConstruction.y);
  const pBoat = worldToScreen(cam, vw, vh, boat.x, boat.y);

  ctx.save();

  // 1. Draw Town Jetty Dock
  ctx.fillStyle = '#4a3728';
  ctx.fillRect(pTownDock.x - 14 * cam.zoom, pTownDock.y - 6 * cam.zoom, 28 * cam.zoom, 22 * cam.zoom);
  // Dock posts
  ctx.fillStyle = '#261c14';
  ctx.fillRect(pTownDock.x - 15 * cam.zoom, pTownDock.y + 12 * cam.zoom, 5 * cam.zoom, 6 * cam.zoom);
  ctx.fillRect(pTownDock.x + 10 * cam.zoom, pTownDock.y + 12 * cam.zoom, 5 * cam.zoom, 6 * cam.zoom);

  // 2. Draw Construction Jetty Dock
  ctx.fillStyle = '#4a3728';
  ctx.fillRect(pConstDock.x - 14 * cam.zoom, pConstDock.y - 16 * cam.zoom, 28 * cam.zoom, 22 * cam.zoom);
  ctx.fillStyle = '#261c14';
  ctx.fillRect(pConstDock.x - 15 * cam.zoom, pConstDock.y - 18 * cam.zoom, 5 * cam.zoom, 6 * cam.zoom);
  ctx.fillRect(pConstDock.x + 10 * cam.zoom, pConstDock.y - 18 * cam.zoom, 5 * cam.zoom, 6 * cam.zoom);

  // 3. Draw Ferry Boat
  const bob = Math.sin(timeMs * 0.003) * 2 * cam.zoom;
  const bx = pBoat.x;
  const by = pBoat.y + bob;
  const bw = 24 * cam.zoom;
  const bl = 40 * cam.zoom;

  // Boat water shadow
  ctx.beginPath();
  ctx.ellipse(bx, by + 4 * cam.zoom, bw * 0.65, bl * 0.55, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
  ctx.fill();

  // Boat Hull (Carved Oak)
  ctx.beginPath();
  ctx.ellipse(bx, by, bw * 0.55, bl * 0.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#5c4028';
  ctx.fill();
  ctx.strokeStyle = '#2d1f14';
  ctx.lineWidth = 1.8 * cam.zoom;
  ctx.stroke();

  // Interior deck & benches
  ctx.beginPath();
  ctx.ellipse(bx, by, bw * 0.4, bl * 0.38, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#7a5a3a';
  ctx.fill();

  // Thwart (center seat)
  ctx.fillStyle = '#432f1e';
  ctx.fillRect(bx - bw * 0.35, by - 3 * cam.zoom, bw * 0.7, 6 * cam.zoom);

  // Bow lantern (amber beacon)
  const lY = by - bl * 0.45;
  const lg = ctx.createRadialGradient(bx, lY, 1, bx, lY, 12 * cam.zoom);
  lg.addColorStop(0, 'rgba(231, 181, 105, 0.9)');
  lg.addColorStop(1, 'rgba(231, 181, 105, 0)');
  ctx.fillStyle = lg;
  ctx.beginPath();
  ctx.arc(bx, lY, 12 * cam.zoom, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e7b569';
  ctx.fillRect(bx - 2 * cam.zoom, lY - 2 * cam.zoom, 4 * cam.zoom, 4 * cam.zoom);

  // Prompt if in range
  if (nearDock) {
    drawFloatingPrompt(ctx, bx, by - bl * 0.5 - 16 * cam.zoom, 'E', 'Board Ferry');
  }

  ctx.restore();
}

/**
 * Draws the Construction District: Blueprint Table, Foundation plots, Crane & Scaffolding (AGENT.md Section 9)
 */
export function drawConstructionDistrict(
  ctx: CanvasRenderingContext2D,
  cam: CameraState,
  vw: number,
  vh: number,
  district: ConstructionDistrict,
  nearBlueprintDesk: boolean,
  timeMs: number
) {
  const pCenter = worldToScreen(cam, vw, vh, district.center.x, district.center.y);
  const pDesk = worldToScreen(cam, vw, vh, district.blueprintTable.x, district.blueprintTable.y);
  const pCrane = worldToScreen(cam, vw, vh, district.crane.x, district.crane.y);

  ctx.save();

  // 1. Crushed stone gravel district base
  ctx.beginPath();
  ctx.ellipse(
    pCenter.x,
    pCenter.y,
    district.radius * cam.zoom,
    district.radius * 0.75 * cam.zoom,
    0,
    0,
    Math.PI * 2
  );
  ctx.fillStyle = 'rgba(40, 36, 48, 0.55)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(217, 128, 95, 0.28)';
  ctx.lineWidth = 1.8;
  ctx.setLineDash([8, 8]);
  ctx.stroke();
  ctx.setLineDash([]);

  // 2. Foundation Plots
  for (const plot of district.foundationPlots) {
    const sp = worldToScreen(cam, vw, vh, plot.x, plot.y);
    const pw = plot.width * cam.zoom;
    const ph = plot.height * cam.zoom;

    // Excavation shadow & gravel bed
    ctx.fillStyle = '#181726';
    ctx.fillRect(sp.x - pw / 2, sp.y - ph / 2, pw, ph);

    // Foundation perimeter chalk line
    ctx.strokeStyle = plot.status === 'breaking_ground' ? 'rgba(89, 173, 162, 0.8)' : 'rgba(217, 128, 95, 0.7)';
    ctx.lineWidth = 2 * cam.zoom;
    ctx.strokeRect(sp.x - pw / 2, sp.y - ph / 2, pw, ph);

    // Corner survey stakes
    ctx.fillStyle = '#e7b569';
    const corners = [
      { x: sp.x - pw / 2, y: sp.y - ph / 2 },
      { x: sp.x + pw / 2, y: sp.y - ph / 2 },
      { x: sp.x - pw / 2, y: sp.y + ph / 2 },
      { x: sp.x + pw / 2, y: sp.y + ph / 2 },
    ];
    for (const c of corners) {
      ctx.fillRect(c.x - 2 * cam.zoom, c.y - 6 * cam.zoom, 4 * cam.zoom, 8 * cam.zoom);
    }

    // Foundation Label
    if (cam.zoom > 0.6) {
      ctx.font = '500 11px Inter, sans-serif';
      ctx.fillStyle = '#a7a3c4';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(plot.repoName || 'Foundation Plot', sp.x, sp.y);
    }
  }

  // 3. Gantry Tower Crane
  const craneH = 65 * cam.zoom;
  ctx.fillStyle = '#1e1c2b';
  ctx.fillRect(pCrane.x - 8 * cam.zoom, pCrane.y - 4 * cam.zoom, 16 * cam.zoom, 8 * cam.zoom);
  // Mast lattice
  ctx.strokeStyle = '#d9805f';
  ctx.lineWidth = 3 * cam.zoom;
  ctx.beginPath();
  ctx.moveTo(pCrane.x, pCrane.y);
  ctx.lineTo(pCrane.x, pCrane.y - craneH);
  ctx.stroke();

  // Boom Jib arm extending horizontally
  ctx.lineWidth = 2.5 * cam.zoom;
  ctx.beginPath();
  ctx.moveTo(pCrane.x - 18 * cam.zoom, pCrane.y - craneH);
  ctx.lineTo(pCrane.x + 48 * cam.zoom, pCrane.y - craneH);
  ctx.stroke();

  // Counterweight
  ctx.fillStyle = '#3a3447';
  ctx.fillRect(pCrane.x - 22 * cam.zoom, pCrane.y - craneH - 4 * cam.zoom, 8 * cam.zoom, 8 * cam.zoom);

  // Suspended hoist cable & hook with slight swing
  const cableSwing = Math.sin(timeMs * 0.002) * 5 * cam.zoom;
  ctx.strokeStyle = '#a7a3c4';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pCrane.x + 30 * cam.zoom, pCrane.y - craneH);
  ctx.lineTo(pCrane.x + 30 * cam.zoom + cableSwing, pCrane.y - craneH + 34 * cam.zoom);
  ctx.stroke();
  // Hook
  ctx.fillStyle = '#e7b569';
  ctx.fillRect(pCrane.x + 28 * cam.zoom + cableSwing, pCrane.y - craneH + 34 * cam.zoom, 5 * cam.zoom, 5 * cam.zoom);

  // 4. Blueprint Drafting Table (Interactive Centerpiece)
  const tw = 36 * cam.zoom;
  const th = 22 * cam.zoom;

  // Shadow
  ctx.beginPath();
  ctx.ellipse(pDesk.x, pDesk.y + 4 * cam.zoom, tw * 0.7, th * 0.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fill();

  // Wooden table frame
  ctx.fillStyle = '#453023';
  roundRectPath(ctx, pDesk.x - tw / 2, pDesk.y - th / 2, tw, th, 3 * cam.zoom);
  ctx.fill();
  ctx.strokeStyle = '#281c15';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Blueprint roll spread on table (blueprint blue with grid)
  ctx.fillStyle = '#1c3e60';
  ctx.fillRect(pDesk.x - tw * 0.4, pDesk.y - th * 0.38, tw * 0.8, th * 0.76);
  ctx.strokeStyle = 'rgba(89, 173, 162, 0.75)';
  ctx.lineWidth = 0.8;
  ctx.strokeRect(pDesk.x - tw * 0.4, pDesk.y - th * 0.38, tw * 0.8, th * 0.76);

  // Blueprint compass / architectural ruler
  ctx.strokeStyle = '#e7b569';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(pDesk.x - 4 * cam.zoom, pDesk.y - 4 * cam.zoom);
  ctx.lineTo(pDesk.x + 4 * cam.zoom, pDesk.y + 4 * cam.zoom);
  ctx.stroke();

  // Architect's Table Lamp
  const lampX = pDesk.x + tw * 0.35;
  const lampY = pDesk.y - th * 0.35;
  const lampG = ctx.createRadialGradient(lampX, lampY, 1, lampX, lampY, 16 * cam.zoom);
  lampG.addColorStop(0, 'rgba(231, 181, 105, 0.9)');
  lampG.addColorStop(1, 'rgba(231, 181, 105, 0)');
  ctx.fillStyle = lampG;
  ctx.beginPath();
  ctx.arc(lampX, lampY, 16 * cam.zoom, 0, Math.PI * 2);
  ctx.fill();

  // Signpost next to table
  ctx.font = '600 11px Inter, sans-serif';
  const label = 'Foundry Blueprint Table';
  const txtW = ctx.measureText(label).width;
  ctx.fillStyle = 'rgba(23, 22, 43, 0.92)';
  roundRectPath(ctx, pDesk.x - txtW / 2 - 8, pDesk.y - th / 2 - 20 * cam.zoom, txtW + 16, 20, 4);
  ctx.fill();
  ctx.strokeStyle = '#d9805f';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = '#f1ead9';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, pDesk.x, pDesk.y - th / 2 - 20 * cam.zoom + 10);

  // Prompt when player is near the blueprint desk
  if (nearBlueprintDesk) {
    drawFloatingPrompt(ctx, pDesk.x, pDesk.y - th / 2 - 38 * cam.zoom, 'E', 'Break Ground (Create Repo)');
  }

  ctx.restore();
}

/**
 * Draws the Public World Gateway / Open Source Road Milestone (AGENT.md Section 7)
 */
export function drawPublicWorldGate(
  ctx: CanvasRenderingContext2D,
  cam: CameraState,
  vw: number,
  vh: number,
  gate: PublicRoadFeature,
  nearGate: boolean
) {
  const p = worldToScreen(cam, vw, vh, gate.gatePoint.x, gate.gatePoint.y);

  ctx.save();

  // Stone obelisk / archway milestone
  const gw = 28 * cam.zoom;
  const gh = 42 * cam.zoom;

  // Shadow
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 3 * cam.zoom, gw * 0.9, gh * 0.3, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fill();

  // Carved Pillars
  ctx.fillStyle = '#2c2744';
  ctx.fillRect(p.x - gw / 2, p.y - gh, 7 * cam.zoom, gh);
  ctx.fillRect(p.x + gw / 2 - 7 * cam.zoom, p.y - gh, 7 * cam.zoom, gh);

  // Lintel crossbeam
  ctx.fillStyle = '#3d365e';
  ctx.fillRect(p.x - gw / 2 - 2 * cam.zoom, p.y - gh, gw + 4 * cam.zoom, 9 * cam.zoom);

  // Glowing portal arch rune
  const runeG = ctx.createRadialGradient(p.x, p.y - gh / 2, 2, p.x, p.y - gh / 2, 18 * cam.zoom);
  runeG.addColorStop(0, 'rgba(89, 173, 162, 0.85)');
  runeG.addColorStop(1, 'rgba(89, 173, 162, 0)');
  ctx.fillStyle = runeG;
  ctx.beginPath();
  ctx.arc(p.x, p.y - gh / 2, 18 * cam.zoom, 0, Math.PI * 2);
  ctx.fill();

  // Signpost
  ctx.font = '600 11px Inter, sans-serif';
  const txtW = ctx.measureText(gate.label).width;
  ctx.fillStyle = 'rgba(23, 22, 43, 0.92)';
  roundRectPath(ctx, p.x - txtW / 2 - 8, p.y - gh - 22 * cam.zoom, txtW + 16, 20, 4);
  ctx.fill();
  ctx.strokeStyle = '#59ada2';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = '#f1ead9';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(gate.label, p.x, p.y - gh - 22 * cam.zoom + 10);

  if (nearGate) {
    drawFloatingPrompt(ctx, p.x, p.y - gh - 40 * cam.zoom, 'E', 'Explore Public Realms');
  }

  ctx.restore();
}

/**
 * Draws animated water splash for River Exit mechanic (AGENT.md Section 8)
 */
export function drawWaterSplash(
  ctx: CanvasRenderingContext2D,
  cam: CameraState,
  vw: number,
  vh: number,
  splash: { x: number; y: number; progress: number }
) {
  const p = worldToScreen(cam, vw, vh, splash.x, splash.y);
  const prog = Math.min(1, Math.max(0, splash.progress));
  const r = (18 + prog * 42) * cam.zoom;
  const alpha = 1 - prog;

  ctx.save();

  // Concentric ripple rings
  ctx.strokeStyle = `rgba(89, 173, 162, ${alpha * 0.9})`;
  ctx.lineWidth = 2.5 * cam.zoom;
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, r, r * 0.5, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = `rgba(241, 234, 217, ${alpha * 0.6})`;
  ctx.lineWidth = 1.5 * cam.zoom;
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, r * 0.65, r * 0.32, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Water droplets splashing upward
  ctx.fillStyle = `rgba(241, 234, 217, ${alpha * 0.85})`;
  for (let d = 0; d < 6; d++) {
    const angle = (d / 6) * Math.PI * 2;
    const dropDist = (10 + prog * 28) * cam.zoom;
    const dropY = p.y - Math.sin(prog * Math.PI) * (18 * cam.zoom) + Math.sin(angle) * (dropDist * 0.4);
    const dropX = p.x + Math.cos(angle) * dropDist;
    ctx.beginPath();
    ctx.arc(dropX, dropY, (2 + (1 - prog) * 1.5) * cam.zoom, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
