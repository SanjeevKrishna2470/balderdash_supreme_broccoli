import type { CameraState } from './camera';
import { worldToScreen } from './camera';
import type { RepoDistrict, RepoBuilding, RepoPath, CodeCategory } from '../world/repoWorldTypes';
import { getLanguageStyle } from '../world/languageStyles';
import { CATEGORY_NAMES } from '../world/repoWorldBuilder';
import { formatBytes } from '../world/format';

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Central plaza representing the repository root. */
export function drawRepoRootPlaza(
  ctx: CanvasRenderingContext2D,
  cam: CameraState,
  vw: number,
  vh: number,
  plaza: { x: number; y: number; label: string },
  _projectType: string,
  t: number
) {
  const p = worldToScreen(cam, vw, vh, plaza.x, plaza.y);
  const r = 42 * cam.zoom;
  ctx.save();

  // Hex-like foundation plate
  const sides = 6;
  ctx.beginPath();
  for (let i = 0; i <= sides; i++) {
    const a = (i / sides) * Math.PI * 2 - Math.PI / 2;
    const px = p.x + Math.cos(a) * r;
    const py = p.y + Math.sin(a) * r * 0.62;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = '#26234a';
  ctx.fill();
  ctx.strokeStyle = '#59ada2';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Slow pulsing core ring
  const pulse = (Math.sin(t * 0.0012) + 1) / 2;
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, r * (0.4 + pulse * 0.08), r * 0.28, 0, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(89, 173, 162, ${0.35 + pulse * 0.25})`;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.restore();
}

/** A directory neighborhood, tinted by its code category with an elegant floating header badge. */
export function drawRepoDistrict(
  ctx: CanvasRenderingContext2D,
  cam: CameraState,
  vw: number,
  vh: number,
  d: RepoDistrict
) {
  const p = worldToScreen(cam, vw, vh, d.center.x, d.center.y);
  const r = d.radius * cam.zoom;
  ctx.save();

  ctx.beginPath();
  ctx.ellipse(p.x, p.y, r, r * 0.65, 0, 0, Math.PI * 2);
  ctx.fillStyle = d.tint;
  ctx.globalAlpha = 0.55;
  ctx.fill();
  ctx.strokeStyle = 'rgba(167, 163, 196, 0.16)';
  ctx.lineWidth = 1.2;
  ctx.globalAlpha = 1;
  ctx.stroke();
  ctx.restore();

  // Floating District Header Badge
  if (cam.zoom > 0.38) {
    ctx.save();
    const categoryName = CATEGORY_NAMES[d.category] || '';
    const dirText = d.name; // e.g. "src/" or "components/"
    const countText = `${d.fileCount} ${d.fileCount === 1 ? 'file' : 'files'}`;

    ctx.font = '600 12px Inter, sans-serif';
    const dirW = ctx.measureText(dirText).width;
    ctx.font = '500 11px Inter, sans-serif';
    const catW = ctx.measureText(categoryName).width;
    ctx.font = '500 10px Inter, sans-serif';
    const countW = ctx.measureText(countText).width;

    const badgeH = 26;
    const totalW = 14 + 16 + 10 + dirW + 8 + 4 + 8 + catW + 12 + countW + 12;
    const badgeX = Math.round(p.x - totalW / 2);
    const badgeY = Math.round(p.y - r * 0.65 - 28);

    // Subtle drop shadow
    ctx.beginPath();
    roundRectPath(ctx, badgeX, badgeY + 2, totalW, badgeH, badgeH / 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fill();

    // Main badge container
    roundRectPath(ctx, badgeX, badgeY, totalW, badgeH, badgeH / 2);
    ctx.fillStyle = 'rgba(18, 17, 33, 0.94)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(167, 163, 196, 0.28)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Category icon
    const iconX = badgeX + 16;
    const iconY = badgeY + badgeH / 2;
    drawRepoCategoryIcon(ctx, iconX, iconY, d.category, 0.9);

    // Directory name
    const textStartX = iconX + 13;
    ctx.font = '600 12px Inter, sans-serif';
    ctx.fillStyle = '#f1ead9';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(dirText, textStartX, iconY);

    // Separator bullet
    const sepX = textStartX + dirW + 6;
    ctx.font = '400 11px Inter, sans-serif';
    ctx.fillStyle = '#504d78';
    ctx.fillText('·', sepX, iconY);

    // Category subtitle
    const catX = sepX + 10;
    ctx.font = '500 11px Inter, sans-serif';
    ctx.fillStyle = '#a7a3c4';
    ctx.fillText(categoryName, catX, iconY);

    // File count pill
    const pillX = catX + catW + 10;
    const pillW = countW + 12;
    const pillH = 16;
    roundRectPath(ctx, pillX, iconY - pillH / 2, pillW, pillH, pillH / 2);
    ctx.fillStyle = 'rgba(167, 163, 196, 0.12)';
    ctx.fill();
    ctx.font = '500 10px Inter, sans-serif';
    ctx.fillStyle = '#7c9a6f';
    ctx.textAlign = 'center';
    ctx.fillText(countText, pillX + pillW / 2, iconY + 0.5);

    ctx.restore();
  }
}


/** Connecting path between the root plaza, neighborhoods, and files. */
export function drawRepoPath(
  ctx: CanvasRenderingContext2D,
  cam: CameraState,
  vw: number,
  vh: number,
  path: RepoPath
) {
  if (!path.waypoints || path.waypoints.length < 2) return;
  const pts = path.waypoints.map((w) => worldToScreen(cam, vw, vh, w.x, w.y));
  ctx.save();

  if (path.tier === 'main') {
    ctx.strokeStyle = 'rgba(120, 115, 155, 0.32)';
    ctx.lineWidth = Math.max(2.5, 6 * cam.zoom);
  } else {
    ctx.strokeStyle = 'rgba(167, 163, 196, 0.2)';
    ctx.lineWidth = Math.max(1, 2 * cam.zoom);
    ctx.setLineDash([4 * cam.zoom, 5 * cam.zoom]);
  }

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();
  ctx.restore();
}

// Single-letter badges rather than symbol glyphs: canvas text doesn't reliably
// fall back fonts for missing Unicode symbols, so a plain letter is safer.
const CATEGORY_LETTER: Record<CodeCategory, string> = {
  application: 'A',
  ui: 'U',
  backend: 'S', // Service
  data: 'D',
  tests: 'T',
  docs: 'L', // Library
  config: 'C',
  build: 'B',
  scripts: 'W', // Workshop
  assets: 'M', // Media
  infra: 'I',
  generated: 'V', // Vendor
  unknown: '?',
};

/** Small letter badge identifying a district or building's code category. */
export function drawRepoCategoryIcon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  category: CodeCategory,
  scale: number
) {
  const r = Math.max(6, 7 * scale);
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(23,22,43,0.7)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(241,234,217,0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.font = `600 ${Math.max(8, 9 * scale)}px Inter, sans-serif`;
  ctx.fillStyle = 'rgba(241,234,217,0.85)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(CATEGORY_LETTER[category] ?? CATEGORY_LETTER.unknown, x, y + 0.5);
  ctx.restore();
}

/** A file (or aggregated directory) building inside a repo neighborhood. */
export function drawRepoBuilding(
  ctx: CanvasRenderingContext2D,
  cam: CameraState,
  vw: number,
  vh: number,
  b: RepoBuilding,
  opts: { hovered: boolean; selected: boolean; t: number }
) {
  const p = worldToScreen(cam, vw, vh, b.x, b.y);
  const fw = b.footprint * cam.zoom;
  const fh = b.heightPx * cam.zoom;

  ctx.save();

  // Ground shadow
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + fh * 0.08, fw * 0.62, fw * 0.22, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.36)';
  ctx.fill();

  const baseX = p.x - fw / 2;
  const baseY = p.y - fh;

  if (opts.selected || opts.hovered) {
    roundRectPath(ctx, baseX - 7, baseY - 7, fw + 14, fh + 14, 12);
    ctx.strokeStyle = opts.selected ? 'rgba(89,173,162,0.95)' : 'rgba(241,234,217,0.6)';
    ctx.lineWidth = opts.selected ? 2.6 : 1.6;
    ctx.stroke();
  }

  // Body
  roundRectPath(ctx, baseX, baseY, fw, fh, Math.max(3, 6 * cam.zoom));
  ctx.fillStyle = b.style.primary;
  ctx.fill();

  // Roof cap, styled by language motif
  ctx.beginPath();
  const capH = fh * 0.2;
  switch (b.style.motif) {
    case 'peak':
      ctx.moveTo(baseX - 2, baseY + 2);
      ctx.lineTo(p.x, baseY - capH);
      ctx.lineTo(baseX + fw + 2, baseY + 2);
      break;
    case 'spire':
      ctx.moveTo(p.x - fw * 0.16, baseY);
      ctx.lineTo(p.x, baseY - capH * 1.5);
      ctx.lineTo(p.x + fw * 0.16, baseY);
      break;
    case 'dome':
      ctx.ellipse(p.x, baseY + 2, fw * 0.4, capH, 0, Math.PI, 0, true);
      break;
    default:
      roundRectPath(ctx, baseX, baseY - capH * 0.5, fw, capH * 0.5, 3 * cam.zoom);
  }
  ctx.closePath();
  ctx.fillStyle = b.style.secondary;
  ctx.fill();

  // A few glowing windows for entry points; a quieter face otherwise
  if (b.isEntryPoint) {
    const glow = (Math.sin(opts.t * 0.0025) + 1) / 2;
    ctx.shadowColor = b.style.glow;
    ctx.shadowBlur = (6 + glow * 4) * cam.zoom;
    ctx.fillStyle = b.style.glow;
    ctx.beginPath();
    ctx.arc(p.x, baseY + fh * 0.4, Math.max(2, 3 * cam.zoom), 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Category glyph on the facade
  drawRepoCategoryIcon(ctx, p.x - 4 * cam.zoom, baseY + fh * 0.68, b.category, Math.max(0.6, cam.zoom));

  // Compound-directory badge (file count) when this building represents
  // an aggregated, collapsed directory rather than a single file.
  if (b.fileCount && b.fileCount > 1) {
    const badgeR = 8 * cam.zoom;
    const bx = baseX + fw - 2;
    const by = baseY + 2;
    ctx.beginPath();
    ctx.arc(bx, by, badgeR, 0, Math.PI * 2);
    ctx.fillStyle = '#e7b569';
    ctx.fill();
    ctx.fillStyle = '#0e0d18';
    ctx.font = `600 ${Math.max(8, 9 * cam.zoom)}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(b.fileCount), bx, by + 0.5);
  }

  ctx.restore();
}

/** Fixed-position horizontal bar showing repo language composition. */
export function drawLanguageBar(
  ctx: CanvasRenderingContext2D,
  vw: number,
  _vh: number,
  languages: Record<string, number>
) {
  const entries = Object.entries(languages).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  if (total <= 0) return;

  const barW = Math.min(320, vw * 0.42);
  const barH = 6;
  const x = vw / 2 - barW / 2;
  const y = 14;

  ctx.save();
  roundRectPath(ctx, x, y, barW, barH, barH / 2);
  ctx.fillStyle = 'rgba(23,22,43,0.7)';
  ctx.fill();

  let cursor = x;
  for (const [lang, bytes] of entries) {
    const w = (bytes / total) * barW;
    const style = getLanguageStyle(lang);
    ctx.fillStyle = style.primary;
    ctx.fillRect(cursor, y, Math.max(0, w), barH);
    cursor += w;
  }
  ctx.restore();
}

/**
 * Draws a clean, high-contrast floating header badge for a building in the repository.
 * Shows file name, size badge, entry point indicators, and proximity interaction prompts.
 */
export function drawRepoBuildingHeader(
  ctx: CanvasRenderingContext2D,
  cam: CameraState,
  vw: number,
  vh: number,
  b: RepoBuilding,
  opts: {
    hovered: boolean;
    selected: boolean;
    near: boolean;
  }
) {
  const p = worldToScreen(cam, vw, vh, b.x, b.y);
  const fh = b.heightPx * cam.zoom;
  const isTownHall = b.id === 'bldg-town-hall';

  // 1. Central Plaza Town Hall (Entry Core)
  if (isTownHall) {
    const y = p.y - fh - 22;
    ctx.save();

    const title = b.name;
    const subtitle = 'Central Realm Core';

    ctx.font = '600 13px Inter, sans-serif';
    const titleW = ctx.measureText(title).width;
    ctx.font = '500 11px Inter, sans-serif';
    const subW = ctx.measureText(subtitle).width;

    const contentW = Math.max(titleW, subW);
    const w = contentW + 44;
    const h = 42;

    // Drop shadow
    ctx.beginPath();
    roundRectPath(ctx, p.x - w / 2, y - h + 2, w, h, 12);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fill();

    // Main pill
    roundRectPath(ctx, p.x - w / 2, y - h, w, h, 12);
    ctx.fillStyle = 'rgba(23, 22, 43, 0.95)';
    ctx.fill();
    ctx.strokeStyle = opts.selected ? '#59ada2' : 'rgba(89, 173, 162, 0.65)';
    ctx.lineWidth = opts.selected ? 2 : 1.4;
    ctx.stroke();

    // Star icon
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⭐', p.x - w / 2 + 18, y - h / 2);

    // Title
    ctx.font = '600 13px Inter, sans-serif';
    ctx.fillStyle = '#f1ead9';
    ctx.textAlign = 'left';
    ctx.fillText(title, p.x - w / 2 + 34, y - h + 15);

    // Subtitle
    ctx.font = '500 11px Inter, sans-serif';
    ctx.fillStyle = '#59ada2';
    ctx.fillText(subtitle, p.x - w / 2 + 34, y - h + 30);

    ctx.restore();
    return;
  }

  // 2. Regular File Buildings
  const isEmphasized = opts.hovered || opts.selected || opts.near;

  // If zoomed out and not emphasized, skip to maintain clean viewport
  if (!isEmphasized && cam.zoom < 0.82) return;

  const y = p.y - fh - (isEmphasized ? 16 : 10);
  const fileName = b.name;
  const sizeText = formatBytes(b.bytes);

  ctx.save();

  if (isEmphasized) {
    // High-visibility, crisp pill with filename, size, and dot
    ctx.font = '600 12.5px Inter, sans-serif';
    const nameW = ctx.measureText(fileName).width;
    ctx.font = '500 11px Inter, sans-serif';
    const sizeW = ctx.measureText(sizeText).width;

    const pad = 12;
    const w = nameW + sizeW + pad * 2 + 18;
    const h = 26;

    // Drop shadow
    ctx.beginPath();
    roundRectPath(ctx, p.x - w / 2, y - h + 2, w, h, h / 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fill();

    // Container
    roundRectPath(ctx, p.x - w / 2, y - h, w, h, h / 2);
    ctx.fillStyle = 'rgba(18, 17, 33, 0.95)';
    ctx.fill();
    ctx.strokeStyle = opts.selected
      ? 'rgba(89, 173, 162, 0.95)'
      : opts.near
      ? 'rgba(89, 173, 162, 0.7)'
      : 'rgba(167, 163, 196, 0.4)';
    ctx.lineWidth = opts.selected ? 2 : 1.2;
    ctx.stroke();

    // Language dot
    ctx.beginPath();
    ctx.arc(p.x - w / 2 + 14, y - h / 2, 4, 0, Math.PI * 2);
    ctx.fillStyle = b.style.primary;
    ctx.fill();

    // Filename
    ctx.font = '600 12.5px Inter, sans-serif';
    ctx.fillStyle = '#f1ead9';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(fileName, p.x - w / 2 + 24, y - h / 2);

    // Sep
    ctx.font = '400 11px Inter, sans-serif';
    ctx.fillStyle = '#504d78';
    ctx.fillText('·', p.x - w / 2 + 24 + nameW + 6, y - h / 2);

    // Size
    ctx.font = '500 11px Inter, sans-serif';
    ctx.fillStyle = '#a7a3c4';
    ctx.fillText(sizeText, p.x - w / 2 + 24 + nameW + 16, y - h / 2);

    // If player is in proximity range, show "[E] View Code" prompt
    if (opts.near) {
      const promptText = '[E] View Code';
      ctx.font = '600 11px Inter, sans-serif';
      const pw = ctx.measureText(promptText).width + 16;
      const ph = 22;
      const py = p.y + 14 * cam.zoom;

      roundRectPath(ctx, p.x - pw / 2, py, pw, ph, ph / 2);
      ctx.fillStyle = 'rgba(14, 13, 24, 0.95)';
      ctx.fill();
      ctx.strokeStyle = '#59ada2';
      ctx.lineWidth = 1.6;
      ctx.stroke();

      ctx.fillStyle = '#59ada2';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(promptText, p.x, py + ph / 2 + 0.5);
    }
  } else {
    // Quiet compact label when zoomed in
    ctx.font = '500 11px Inter, sans-serif';
    const nameW = ctx.measureText(fileName).width;
    const w = nameW + 22;
    const h = 20;

    roundRectPath(ctx, p.x - w / 2, y - h, w, h, h / 2);
    ctx.fillStyle = 'rgba(18, 17, 33, 0.84)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(167, 163, 196, 0.16)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Small dot
    ctx.beginPath();
    ctx.arc(p.x - w / 2 + 9, y - h / 2, 3, 0, Math.PI * 2);
    ctx.fillStyle = b.style.primary;
    ctx.fill();

    ctx.font = '500 11px Inter, sans-serif';
    ctx.fillStyle = 'rgba(241, 234, 217, 0.85)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(fileName, p.x - w / 2 + 16, y - h / 2);
  }

  ctx.restore();
}

/**
 * Draws an in-world Town Exit Portal at the repository world's spawn/exit point.
 * Allows walking into or interacting with the portal to leave the repository.
 */
export function drawRepoExitPortal(
  ctx: CanvasRenderingContext2D,
  cam: CameraState,
  vw: number,
  vh: number,
  portal: { x: number; y: number },
  isNear: boolean,
  t: number
) {
  const p = worldToScreen(cam, vw, vh, portal.x, portal.y);
  const r = 28 * cam.zoom;
  ctx.save();

  // Ground shadow & mystic pool
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, r * 1.1, r * 0.55, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(10, 9, 20, 0.7)';
  ctx.fill();
  ctx.strokeStyle = isNear ? '#59ada2' : 'rgba(89, 173, 162, 0.5)';
  ctx.lineWidth = isNear ? 2 : 1.2;
  ctx.stroke();

  // Swirling rune pulse
  const pulse = (Math.sin(t * 0.002) + 1) / 2;
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, r * (0.6 + pulse * 0.25), r * (0.3 + pulse * 0.12), 0, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(89, 173, 162, ${0.15 + pulse * 0.2})`;
  ctx.fill();

  // Arch pillars / portal gateway posts
  const postH = 34 * cam.zoom;
  const postW = 6 * cam.zoom;
  ctx.fillStyle = '#201f3f';
  roundRectPath(ctx, p.x - r * 0.85, p.y - postH, postW, postH, 2);
  ctx.fill();
  roundRectPath(ctx, p.x + r * 0.85 - postW, p.y - postH, postW, postH, 2);
  ctx.fill();

  // Cross beam
  ctx.fillStyle = '#2b295a';
  roundRectPath(ctx, p.x - r * 0.95, p.y - postH - 4 * cam.zoom, r * 1.9, 6 * cam.zoom, 2);
  ctx.fill();

  // Portal sign / prompt
  if (cam.zoom > 0.4) {
    const label = isNear ? '[E] Exit to Town' : 'Town Portal (Esc)';
    ctx.font = '600 11.5px Inter, sans-serif';
    const textW = ctx.measureText(label).width;
    const badgeW = textW + 18;
    const badgeH = 22;
    const badgeY = p.y - postH - 18 * cam.zoom;

    roundRectPath(ctx, p.x - badgeW / 2, badgeY - badgeH, badgeW, badgeH, badgeH / 2);
    ctx.fillStyle = isNear ? 'rgba(14, 13, 24, 0.96)' : 'rgba(23, 22, 43, 0.88)';
    ctx.fill();
    ctx.strokeStyle = isNear ? '#59ada2' : 'rgba(167, 163, 196, 0.3)';
    ctx.lineWidth = isNear ? 1.8 : 1;
    ctx.stroke();

    ctx.fillStyle = isNear ? '#59ada2' : '#f1ead9';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, p.x, badgeY - badgeH / 2 + 0.5);
  }

  ctx.restore();
}


