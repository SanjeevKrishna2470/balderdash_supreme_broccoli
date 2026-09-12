import { useState, useMemo, useEffect } from 'react';
import type { RepositoryModel } from '../types';
import { createRepository } from '../world/api';
import { useWorldStore } from '../state/useWorldStore';
import './CreateRepoModal.css';

interface Props {
  onClose: () => void;
  onRepoCreated: (repo: RepositoryModel) => void;
}

type Step = 'draft' | 'review' | 'progress' | 'success';

interface Archetype {
  id: string;
  label: string;
  role: string;
  icon: string;
  bldgHeight: number;
  accent: string;
}

const ARCHETYPES: Archetype[] = [
  { id: 'web', label: 'Web Application', role: 'React / Frontend Guildhall', icon: '🌐', bldgHeight: 48, accent: '#59ada2' },
  { id: 'api', label: 'Backend API', role: 'Microservice Citadel', icon: '⚡', bldgHeight: 56, accent: '#4d7fb3' },
  { id: 'lib', label: 'Library / SDK', role: 'Reusable Workshop', icon: '📦', bldgHeight: 40, accent: '#948bd0' },
  { id: 'cli', label: 'CLI & Systems', role: 'Systems Engine Foundry', icon: '⚙️', bldgHeight: 50, accent: '#c1694a' },
  { id: 'data', label: 'AI & Data Science', role: 'Neural Spire & Lab', icon: '🧠', bldgHeight: 64, accent: '#d9805f' },
  { id: 'mobile', label: 'Mobile App', role: 'Portable Device Atelier', icon: '📱', bldgHeight: 44, accent: '#5fb0c9' },
  { id: 'game', label: 'Indie Game', role: 'Interactive Realm Studio', icon: '🎮', bldgHeight: 52, accent: '#e7b569' },
];

const GITIGNORE_TEMPLATES = ['None', 'Node', 'Python', 'Rust', 'Go', 'Java', 'C++', 'Unity'];
const LICENSE_TEMPLATES = ['None', 'MIT', 'Apache-2.0', 'GPL-3.0', 'BSD-3-Clause', 'Unlicense'];

export function CreateRepoModal({ onClose, onRepoCreated }: Props) {
  const world = useWorldStore((s) => s.world);
  const username = world?.user.username || 'developer';

  const [step, setStep] = useState<Step>('draft');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [autoInit, setAutoInit] = useState(true);
  const [projectType, setProjectType] = useState('web');
  const [gitignore, setGitignore] = useState('Node');
  const [license, setLicense] = useState('MIT');
  const [publicOptIn, setPublicOptIn] = useState<'private' | 'landmark' | 'explorable'>('explorable');

  const [progressMsg, setProgressMsg] = useState('Surveying foundation plot...');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdRepo, setCreatedRepo] = useState<RepositoryModel | null>(null);

  // Keyboard shortcut: Escape to close / back out
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (step === 'review') {
          setStep('draft');
        } else if (step !== 'progress') {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step, onClose]);

  // GitHub repository naming validation: ^[a-zA-Z0-9_.-]+$
  const nameError = useMemo(() => {
    if (!name.trim()) return null;
    const regex = /^[a-zA-Z0-9_.-]+$/;
    if (!regex.test(name.trim())) {
      return 'Repository name may only contain letters, numbers, hyphens, periods, and underscores.';
    }
    return null;
  }, [name]);

  const selectedType = ARCHETYPES.find((t) => t.id === projectType) || ARCHETYPES[0];

  const handleDraftSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || nameError) return;
    setStep('review');
  };

  const handleConfirmBreakGround = async () => {
    setStep('progress');
    setErrorMsg(null);

    // Multi-stage construction status sequence
    setProgressMsg('Surveying south riverbank & preparing plot...');
    await new Promise((r) => setTimeout(r, 650));

    setProgressMsg('Registering repository in the GitHub ledger...');
    try {
      const res = await createRepository({
        name: name.trim(),
        description: description.trim(),
        isPrivate,
        autoInit,
        gitignoreTemplate: gitignore !== 'None' ? gitignore : undefined,
        licenseTemplate: license !== 'None' ? license : undefined,
        projectType: selectedType.label,
      });

      setProgressMsg('Laying cornerstone & activating construction scaffolding...');
      await new Promise((r) => setTimeout(r, 750));

      setCreatedRepo(res.repo);
      onRepoCreated(res.repo);
      setStep('success');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not forge repository.');
      setStep('draft');
    }
  };

  return (
    <div className="blueprint-backdrop" onClick={onClose}>
      <div className="blueprint-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="blueprint-header">
          <div className="blueprint-title-wrap">
            <div className="blueprint-seal">
              <CompassIcon />
            </div>
            <div>
              <h2 className="blueprint-title">Construction Works — Break Ground</h2>
              <p className="blueprint-subtitle">Draft and forge a new software repository in your town</p>
            </div>
          </div>
          <button className="blueprint-close" onClick={onClose} aria-label="Close modal">
            Esc
          </button>
        </div>

        {/* Stepper Progress Indicator */}
        <div className="blueprint-stepper">
          <div
            className={`blueprint-step-node ${
              step === 'draft' ? 'blueprint-step-node--active' : 'blueprint-step-node--done'
            }`}
          >
            <span className="blueprint-step-pill">{step === 'draft' ? '1' : '✓'}</span>
            <span>1. Specifications</span>
          </div>

          <div className="blueprint-step-line" />

          <div
            className={`blueprint-step-node ${
              step === 'review'
                ? 'blueprint-step-node--active'
                : step === 'progress' || step === 'success'
                ? 'blueprint-step-node--done'
                : ''
            }`}
          >
            <span className="blueprint-step-pill">
              {step === 'progress' || step === 'success' ? '✓' : '2'}
            </span>
            <span>2. Blueprint Review</span>
          </div>

          <div className="blueprint-step-line" />

          <div
            className={`blueprint-step-node ${
              step === 'progress' || step === 'success' ? 'blueprint-step-node--active' : ''
            }`}
          >
            <span className="blueprint-step-pill">3</span>
            <span>3. Groundbreaking</span>
          </div>
        </div>

        {/* Step 1: Draft Form */}
        {step === 'draft' && (
          <form className="blueprint-body" onSubmit={handleDraftSubmit}>
            <div className="blueprint-form">
              {errorMsg && <div className="blueprint-error-text">⚠️ {errorMsg}</div>}

              {/* Repository Name */}
              <div className="blueprint-field">
                <label className="blueprint-label">
                  <span>Repository Identifier *</span>
                  {name.trim() && !nameError && (
                    <span className="blueprint-valid-text">✓ Valid identifier</span>
                  )}
                </label>
                <div
                  className={`blueprint-name-box ${
                    nameError ? 'blueprint-name-box--error' : ''
                  }`}
                >
                  <span className="blueprint-name-prefix">{username} /</span>
                  <input
                    className="blueprint-input-inner"
                    placeholder="e.g. quantum-gateway or realm-engine"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                    required
                  />
                </div>
                {nameError && <span className="blueprint-error-text">⚠️ {nameError}</span>}
              </div>

              {/* Project Archetype Grid */}
              <div className="blueprint-field">
                <label className="blueprint-label">
                  <span>Architectural Archetype</span>
                  <span className="blueprint-label-sub">Defines structure & height tier</span>
                </label>
                <div className="blueprint-archetype-grid">
                  {ARCHETYPES.map((type) => {
                    const isSelected = type.id === projectType;
                    return (
                      <div
                        key={type.id}
                        className={`blueprint-archetype-card ${
                          isSelected ? 'blueprint-archetype-card--selected' : ''
                        }`}
                        onClick={() => setProjectType(type.id)}
                      >
                        <div className="blueprint-archetype-head">
                          <span className="blueprint-archetype-icon">{type.icon}</span>
                          <span
                            className="blueprint-archetype-dot"
                            style={{ background: type.accent }}
                          />
                        </div>
                        <span className="blueprint-archetype-title">{type.label}</span>
                        <span className="blueprint-archetype-role">{type.role}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Visibility Segmented Toggle */}
              <div className="blueprint-field">
                <label className="blueprint-label">
                  <span>Plot Access & Visibility</span>
                </label>
                <div className="blueprint-vis-group">
                  <button
                    type="button"
                    className={`blueprint-vis-btn ${
                      !isPrivate ? 'blueprint-vis-btn--active' : ''
                    }`}
                    onClick={() => setIsPrivate(false)}
                  >
                    <span>🌐</span>
                    <span>Public (Explorable in Realm)</span>
                  </button>
                  <button
                    type="button"
                    className={`blueprint-vis-btn ${
                      isPrivate ? 'blueprint-vis-btn--active' : ''
                    }`}
                    onClick={() => setIsPrivate(true)}
                  >
                    <span>🔒</span>
                    <span>Private (Restricted Access)</span>
                  </button>
                </div>
              </div>

              {/* Description */}
              <div className="blueprint-field">
                <label className="blueprint-label">
                  <span>Project Description</span>
                  <span className="blueprint-label-sub">Optional summary for GitHub</span>
                </label>
                <textarea
                  className="blueprint-textarea"
                  rows={2}
                  placeholder="A short description of this repository's purpose..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* Templates Row */}
              <div className="blueprint-row">
                <div className="blueprint-field">
                  <label className="blueprint-label">.gitignore Template</label>
                  <select
                    className="blueprint-select"
                    value={gitignore}
                    onChange={(e) => setGitignore(e.target.value)}
                  >
                    {GITIGNORE_TEMPLATES.map((g) => (
                      <option key={g} value={g}>
                        {g === 'None' ? 'None (Empty)' : `${g} Template`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="blueprint-field">
                  <label className="blueprint-label">License Template</label>
                  <select
                    className="blueprint-select"
                    value={license}
                    onChange={(e) => setLicense(e.target.value)}
                  >
                    {LICENSE_TEMPLATES.map((l) => (
                      <option key={l} value={l}>
                        {l === 'None' ? 'None (All Rights Reserved)' : `${l} License`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* README Checkbox */}
              <label className="blueprint-checkbox-group">
                <input
                  type="checkbox"
                  checked={autoInit}
                  onChange={(e) => setAutoInit(e.target.checked)}
                />
                <span>Initialize repository with a README.md cornerstone</span>
              </label>
            </div>

            {/* Live Architectural Workbench Preview */}
            <div className="blueprint-preview-card">
              <div className="blueprint-preview-title">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <RulerIcon />
                  <span>Live Blueprint Draft</span>
                </div>
                <span className="blueprint-preview-tag">Plot S-04</span>
              </div>

              <div className="blueprint-drawing-area">
                <div className="blueprint-signpost">
                  {name.trim() ? `${username}/${name.trim()}` : `${username}/foundation`}
                </div>

                <div
                  className="blueprint-bldg-model"
                  style={{
                    height: `${selectedType.bldgHeight}px`,
                    borderColor: selectedType.accent,
                    background: `${selectedType.accent}24`,
                    boxShadow: `0 0 16px ${selectedType.accent}20`,
                  }}
                >
                  <div
                    className="blueprint-roof"
                    style={{ borderBottomColor: selectedType.accent }}
                  />
                  <div className="blueprint-window-grid">
                    <div className="blueprint-window" />
                    <div className="blueprint-window" />
                    <div className="blueprint-window" />
                  </div>
                </div>

                <div className="blueprint-scaffolding" />
              </div>

              <ul className="blueprint-specs-list">
                <li className="blueprint-spec-item">
                  <span className="blueprint-spec-label">District Plot</span>
                  <span className="blueprint-spec-val">Foundry &amp; Works</span>
                </li>
                <li className="blueprint-spec-item">
                  <span className="blueprint-spec-label">Structure Tier</span>
                  <span className="blueprint-spec-val">Starter Guildhall (Tier 1)</span>
                </li>
                <li className="blueprint-spec-item">
                  <span className="blueprint-spec-label">Height Unit</span>
                  <span className="blueprint-spec-val">{selectedType.bldgHeight} units</span>
                </li>
                <li className="blueprint-spec-item">
                  <span className="blueprint-spec-label">Visibility</span>
                  <span className="blueprint-spec-val">
                    {isPrivate ? '🔒 Private' : '🌐 Public'}
                  </span>
                </li>
                <li className="blueprint-spec-item">
                  <span className="blueprint-spec-label">Target License</span>
                  <span className="blueprint-spec-val">{license}</span>
                </li>
              </ul>
            </div>
          </form>
        )}

        {/* Step 2: Final Review and Confirmation */}
        {step === 'review' && (
          <div className="blueprint-body" style={{ gridTemplateColumns: '1fr' }}>
            <div className="blueprint-review-box">
              <h3 className="blueprint-review-title">Review Realm Specifications</h3>
              <p className="blueprint-review-callout">
                You are about to break ground on a new project. GitWorld will forge this repository on
                GitHub under <strong>@{username}</strong> (or simulate local creation in demo mode).
                Review the structural parameters below:
              </p>

              <div className="blueprint-review-grid">
                <div className="blueprint-review-card">
                  <span className="blueprint-review-card-label">Repository Path</span>
                  <span className="blueprint-review-card-val" style={{ color: 'var(--teal)' }}>
                    {username} / {name.trim()}
                  </span>
                </div>

                <div className="blueprint-review-card">
                  <span className="blueprint-review-card-label">Architectural Archetype</span>
                  <span className="blueprint-review-card-val">
                    {selectedType.icon} {selectedType.label}
                  </span>
                </div>

                <div className="blueprint-review-card">
                  <span className="blueprint-review-card-label">Access / Visibility</span>
                  <span className="blueprint-review-card-val">
                    {isPrivate ? '🔒 Private' : '🌐 Public (Visible in Realm)'}
                  </span>
                </div>

                <div className="blueprint-review-card">
                  <span className="blueprint-review-card-label">District Assignment</span>
                  <span className="blueprint-review-card-val">Foundry &amp; Construction Plaza</span>
                </div>

                <div className="blueprint-review-card">
                  <span className="blueprint-review-card-label">Templates</span>
                  <span className="blueprint-review-card-val">
                    Ignore: {gitignore} • License: {license}
                  </span>
                </div>

                <div className="blueprint-review-card">
                  <span className="blueprint-review-card-label">Cornerstone Readme</span>
                  <span className="blueprint-review-card-val">
                    {autoInit ? '✓ Auto-initialize README.md' : 'Empty repository'}
                  </span>
                </div>
              </div>

              {description.trim() && (
                <div style={{ fontSize: 12.5, color: 'var(--cool-gray)', marginTop: 4 }}>
                  <strong style={{ color: 'var(--ivory)' }}>Description: </strong>
                  {description.trim()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Progress Sequence */}
        {step === 'progress' && (
          <div className="blueprint-progress-box">
            <div className="blueprint-progress-compass">
              <CompassIcon />
            </div>
            <div className="blueprint-progress-bar-wrap">
              <div className="blueprint-progress-bar-fill" />
            </div>
            <p className="blueprint-progress-step">{progressMsg}</p>
          </div>
        )}

        {/* Step 4: Success & Public Opt-In */}
        {step === 'success' && createdRepo && (
          <div className="blueprint-success-card">
            <div className="blueprint-success-seal">✓</div>
            <h3 className="blueprint-success-title">Ground Broken Successfully!</h3>
            <p className="blueprint-success-desc">
              The cornerstone for <strong>{createdRepo.name}</strong> has been set. Scaffolding has risen in
              your town’s construction district!
            </p>

            <div className="blueprint-optin-box">
              <span className="blueprint-optin-title">Shared Realm Publication</span>
              <div className="blueprint-optin-options">
                <label
                  className={`blueprint-optin-card ${
                    publicOptIn === 'explorable' ? 'blueprint-optin-card--active' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="optin"
                    checked={publicOptIn === 'explorable'}
                    onChange={() => setPublicOptIn('explorable')}
                  />
                  <div className="blueprint-optin-card-text">
                    <span className="blueprint-optin-card-label">Explorable World</span>
                    <span className="blueprint-optin-card-desc">
                      Travelers can walk inside this repository’s interior building in Shared Realms.
                    </span>
                  </div>
                </label>

                <label
                  className={`blueprint-optin-card ${
                    publicOptIn === 'landmark' ? 'blueprint-optin-card--active' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="optin"
                    checked={publicOptIn === 'landmark'}
                    onChange={() => setPublicOptIn('landmark')}
                  />
                  <div className="blueprint-optin-card-text">
                    <span className="blueprint-optin-card-label">Landmark Façade Only</span>
                    <span className="blueprint-optin-card-desc">
                      Visible in global panoramic maps as a sealed guildhall monument.
                    </span>
                  </div>
                </label>

                <label
                  className={`blueprint-optin-card ${
                    publicOptIn === 'private' ? 'blueprint-optin-card--active' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="optin"
                    checked={publicOptIn === 'private'}
                    onChange={() => setPublicOptIn('private')}
                  />
                  <div className="blueprint-optin-card-text">
                    <span className="blueprint-optin-card-label">Personal Town Only</span>
                    <span className="blueprint-optin-card-desc">
                      Keep this structure exclusive to your private domain.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              {createdRepo.htmlUrl && (
                <a
                  href={createdRepo.htmlUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="blueprint-btn blueprint-btn--cancel"
                  style={{ textDecoration: 'none' }}
                >
                  View on GitHub ↗
                </a>
              )}
              <button className="blueprint-btn blueprint-btn--submit" onClick={onClose}>
                Enter Town &amp; Inspect Building →
              </button>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        {step !== 'progress' && step !== 'success' && (
          <div className="blueprint-footer">
            {step === 'draft' ? (
              <>
                <button
                  type="button"
                  className="blueprint-btn blueprint-btn--cancel"
                  onClick={onClose}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="blueprint-btn blueprint-btn--submit"
                  disabled={!name.trim() || !!nameError}
                  onClick={() => setStep('review')}
                >
                  Review Specifications →
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="blueprint-btn blueprint-btn--cancel"
                  onClick={() => setStep('draft')}
                >
                  ← Revise Specifications
                </button>
                <button
                  type="button"
                  className="blueprint-btn blueprint-btn--submit"
                  onClick={handleConfirmBreakGround}
                >
                  Break Ground on Repository ⚒
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CompassIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polygon
        points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"
        fill="currentColor"
        opacity="0.35"
      />
    </svg>
  );
}

function RulerIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 12h20M7 12v3M12 12v4M17 12v3" />
    </svg>
  );
}
