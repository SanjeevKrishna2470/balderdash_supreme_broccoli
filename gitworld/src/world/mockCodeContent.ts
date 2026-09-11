/**
 * Rich realistic mock file contents for demo repositories in GitWorld.
 * Allows offline / demo realm exploration with believable code.
 */

export function getMockFileContent(repoFullName: string, filePath: string): { content: string; language: string } {
  const normPath = filePath.replace(/^\//, '');
  const ext = normPath.split('.').pop()?.toLowerCase() || '';

  // 1. Check exact match in pre-written samples
  if (EXACT_SAMPLES[normPath]) {
    return EXACT_SAMPLES[normPath];
  }

  // 2. Check by filename
  const filename = normPath.split('/').pop() || '';
  if (EXACT_SAMPLES[filename]) {
    return EXACT_SAMPLES[filename];
  }

  // 3. Fallback procedural generator by extension and path
  return generateRealisticFallback(repoFullName, normPath, ext);
}

const EXACT_SAMPLES: Record<string, { content: string; language: string }> = {
  'src/index.ts': {
    language: 'typescript',
    content: `import { WorldSimulation } from './core/simulation';
import { RenderPipeline } from './pipeline';
import { useEngineStore } from './state';

export interface EngineConfig {
  fpsTarget: number;
  enableSpatialHashing: boolean;
  gravity: [number, number];
}

/**
 * Atlas 2D World Engine
 * Manages spatial simulations, rendering pipeline, and entity loops.
 */
export class AtlasEngine {
  private sim: WorldSimulation;
  private pipeline: RenderPipeline;
  private running: boolean = false;
  private lastTimestamp: number = 0;

  constructor(private config: EngineConfig = { fpsTarget: 60, enableSpatialHashing: true, gravity: [0, 9.8] }) {
    this.sim = new WorldSimulation({ gravity: config.gravity });
    this.pipeline = new RenderPipeline();
    console.log('[AtlasEngine] Initialized with config:', this.config);
  }

  public boot(canvas: HTMLCanvasElement): void {
    this.pipeline.attach(canvas);
    this.running = true;
    this.lastTimestamp = performance.now();
    requestAnimationFrame(this.loop.bind(this));
  }

  private loop(timestamp: number): void {
    if (!this.running) return;
    const dt = Math.min((timestamp - this.lastTimestamp) / 1000, 0.1);
    this.lastTimestamp = timestamp;

    // Step physics & update spatial chunks
    this.sim.step(dt);

    // Dispatch frame to GPU pipeline
    this.pipeline.render(this.sim.getState());

    requestAnimationFrame(this.loop.bind(this));
  }

  public stop(): void {
    this.running = false;
  }
}
`,
  },

  'src/lib.rs': {
    language: 'rust',
    content: `//! Parchment: Markdown notes that render like paper.
//! High-performance syntax-aware canvas rendering crate.

use std::collections::HashMap;

pub struct ParchmentDocument {
    pub title: String,
    pub ast_root: Node,
    pub frontmatter: HashMap<String, String>,
}

#[derive(Debug, Clone)]
pub enum Node {
    Paragraph(String),
    Heading { level: u8, text: String },
    CodeBlock { lang: String, source: String },
    Callout { kind: CalloutKind, body: Box<Node> },
}

#[derive(Debug, Clone, PartialEq)]
pub enum CalloutKind {
    Note,
    Tip,
    Warning,
    Scripture,
}

impl ParchmentDocument {
    pub fn parse_markdown(raw: &str) -> Result<Self, &'static str> {
        if raw.is_empty() {
            return Err("Empty document manuscript");
        }

        let mut frontmatter = HashMap::new();
        frontmatter.insert("rendered_at".into(), "realm-standard".into());

        Ok(ParchmentDocument {
            title: "Tome of Realms".to_string(),
            ast_root: Node::Paragraph(raw.to_string()),
            frontmatter,
        })
    }

    pub fn render_page(&self, width: f32, height: f32) -> Vec<u8> {
        // Pixel rasterization into paper-like fiber buffer
        vec![0u8; (width * height * 4.0) as usize]
    }
}
`,
  },

  'src/components/CanvasView.tsx': {
    language: 'typescript',
    content: `import React, { useEffect, useRef, useState, useCallback } from 'react';

interface CanvasViewProps {
  width?: number;
  height?: number;
  onTileClick?: (coord: [number, number]) => void;
}

export const CanvasView: React.FC<CanvasViewProps> = ({ onTileClick }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [zoom, setZoom] = useState<number>(1.0);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameId: number;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(zoom, zoom);
      ctx.translate(offset.x, offset.y);

      // Draw pixel grid
      ctx.strokeStyle = 'rgba(167, 163, 196, 0.12)';
      for (let x = 0; x < 2000; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 2000);
        ctx.stroke();
      }

      ctx.restore();
      frameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(frameId);
  }, [zoom, offset]);

  return (
    <div className="canvas-viewport" style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  );
};
`,
  },

  'src/components/Inspector.tsx': {
    language: 'typescript',
    content: `import React from 'react';

export interface InspectorProps {
  entityId: string;
  data: Record<string, unknown>;
  onClose: () => void;
}

export const Inspector: React.FC<InspectorProps> = ({ entityId, data, onClose }) => {
  return (
    <div className="inspector-card">
      <header className="inspector-header">
        <span className="entity-tag">ID: {entityId}</span>
        <button onClick={onClose} aria-label="Dismiss inspector">&times;</button>
      </header>
      <div className="inspector-properties">
        {Object.entries(data).map(([key, val]) => (
          <div key={key} className="prop-row">
            <span className="prop-name">{key}:</span>
            <span className="prop-val">{String(val)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
`,
  },

  'src/state.ts': {
    language: 'typescript',
    content: `import { create } from 'zustand';

interface SimulationState {
  tickCount: number;
  entityCount: number;
  fps: number;
  selectedEntityId: string | null;
  stepSimulation: () => void;
  selectEntity: (id: string | null) => void;
}

export const useEngineStore = create<SimulationState>((set) => ({
  tickCount: 0,
  entityCount: 142,
  fps: 60,
  selectedEntityId: null,

  stepSimulation: () => set((s) => ({ tickCount: s.tickCount + 1 })),
  selectEntity: (selectedEntityId) => set({ selectedEntityId }),
}));
`,
  },

  'package.json': {
    language: 'json',
    content: `{
  "name": "@realm/engine-core",
  "version": "2.4.0",
  "description": "High performance 2D pixel world rendering and physics engine",
  "main": "dist/index.js",
  "module": "dist/index.mjs",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsup src/index.ts --format cjs,esm --dts",
    "test": "vitest run",
    "bench": "vitest bench"
  },
  "dependencies": {
    "zustand": "^5.0.0",
    "gl-matrix": "^3.4.3"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vitest": "^2.1.0",
    "tsup": "^8.3.0"
  },
  "license": "MIT"
}
`,
  },

  'README.md': {
    language: 'markdown',
    content: `# Atlas Engine 🌌

A modular, high-performance 2D spatial simulation and canvas engine built for interactive generative worlds.

## Features
- **Spatial Partitioning**: Fast AABB and Quadtree query acceleration for 10,000+ simultaneous dynamic entities.
- **Pixel-Perfect Canvas Pipeline**: Multi-layered viewport rendering with camera follow, dampening, and screen-space overlays.
- **Deterministic Seed Architecture**: Seeded random generation to replay and share worlds identically.

## Quickstart
\`\`\`bash
npm install @realm/engine-core
\`\`\`

\`\`\`typescript
import { AtlasEngine } from '@realm/engine-core';

const engine = new AtlasEngine({ fpsTarget: 60, enableSpatialHashing: true });
engine.boot(document.getElementById('realm-canvas'));
\`\`\`

## License
MIT License.
`,
  },

  'Cargo.toml': {
    language: 'toml',
    content: `[package]
name = "parchment"
version = "0.8.2"
edition = "2021"
authors = ["Rowan Fell <rowan@realm.local>"]
description = "Markdown notes that render like paper on GPU canvas"

[dependencies]
serde = { version = "1.0", features = ["derive"] }
pulldown-cmark = "0.9"
wgpu = "0.19"
log = "0.4"

[dev-dependencies]
criterion = "0.5"
`,
  },

  'Dockerfile': {
    language: 'dockerfile',
    content: `FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
`,
  },
};

function generateRealisticFallback(repo: string, path: string, ext: string): { content: string; language: string } {
  const shortName = path.split('/').pop() || 'file';

  if (ext === 'rs') {
    return {
      language: 'rust',
      content: `//! ${path} — Component of ${repo}

pub struct ModuleState {
    pub initialized: bool,
    pub operations_counter: usize,
}

impl ModuleState {
    pub fn new() -> Self {
        Self {
            initialized: true,
            operations_counter: 0,
        }
    }

    pub fn execute(&mut self) -> Result<(), &'static str> {
        self.operations_counter += 1;
        Ok(())
    }
}
`,
    };
  }

  if (ext === 'go') {
    return {
      language: 'go',
      content: `package main

import (
	"context"
	"fmt"
	"time"
)

// Service defines the core interface for ${shortName}
type Service struct {
	startedAt time.Time
	running   bool
}

func NewService() *Service {
	return &Service{
		startedAt: time.Now(),
		running:   true,
	}
}

func (s *Service) HandleRequest(ctx context.Context, payload []byte) error {
	fmt.Printf("[Service] Processing request on %s\\n", "${path}")
	return nil
}
`,
    };
  }

  if (ext === 'py') {
    return {
      language: 'python',
      content: `"""
${path}
Part of ${repo}
"""

import os
import sys
from typing import Dict, Any, List

class Processor:
    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}
        self.ready = True

    def run(self, items: List[Any]) -> int:
        print(f"Executing processor pipeline for {len(items)} items...")
        return len(items)

if __name__ == "__main__":
    p = Processor()
    print("Ready.")
`,
    };
  }

  if (ext === 'json') {
    return {
      language: 'json',
      content: `{
  "name": "${shortName}",
  "version": "1.0.0",
  "repository": "${repo}",
  "path": "${path}",
  "active": true
}
`,
    };
  }

  if (ext === 'md') {
    return {
      language: 'markdown',
      content: `# ${shortName}

Part of the **${repo}** repository.

## Overview
This document contains specification and architectural guidelines for \`${path}\`.

- Created as part of the modular architecture.
- Follows the GitWorld realm visual and structural standards.
`,
    };
  }

  // Default TypeScript / JavaScript
  return {
    language: 'typescript',
    content: `/**
 * ${path}
 * Repository: ${repo}
 */

export interface Options {
  enabled: boolean;
  verbose?: boolean;
}

export function initialize(options: Options): boolean {
  console.log('[${shortName}] Initialized successfully with options:', options);
  return options.enabled;
}

export default {
  path: '${path}',
  active: true,
};
`,
  };
}
