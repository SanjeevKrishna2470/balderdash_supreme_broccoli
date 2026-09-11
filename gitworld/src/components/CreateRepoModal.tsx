import { useState, useMemo } from 'react';
import type { RepositoryModel } from '../types';
import { createRepository } from '../world/api';
import './CreateRepoModal.css';

interface Props {
  onClose: () => void;
  onRepoCreated: (repo: RepositoryModel) => void;
}

type Step = 'draft' | 'review' | 'progress' | 'success';

const PROJECT_TYPES = [
  { id: 'web', label: 'Web Application (React/Frontend)', bldgHeight: 48, accent: '#59ada2' },
  { id: 'api', label: 'Backend / Microservice API', bldgHeight: 56, accent: '#4d7fb3' },
  { id: 'lib', label: 'Library / Reusable SDK', bldgHeight: 40, accent: '#948bd0' },
  { id: 'cli', label: 'Command-Line Tool / Systems', bldgHeight: 50, accent: '#c1694a' },
  { id: 'data', label: 'Data Science / AI Model', bldgHeight: 64, accent: '#d9805f' },
  { id: 'mobile', label: 'Mobile Application', bldgHeight: 44, accent: '#5fb0c9' },
  { id: 'game', label: 'Indie Game Project', bldgHeight: 52, accent: '#e7b569' },
];

const GITIGNORE_TEMPLATES = ['None', 'Node', 'Python', 'Rust', 'Go', 'Java', 'C++', 'Unity'];
const LICENSE_TEMPLATES = ['None', 'MIT', 'Apache-2.0', 'GPL-3.0', 'BSD-3-Clause', 'Unlicense'];

export function CreateRepoModal({ onClose, onRepoCreated }: Props) {
  const [step, setStep] = useState<Step>('draft');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [autoInit, setAutoInit] = useState(true);
  const [projectType, setProjectType] = useState('web');
  const [gitignore, setGitignore] = useState('Node');
  const [license, setLicense] = useState('MIT');
  const [publicOptIn, setPublicOptIn] = useState<'private' | 'landmark' | 'explorable'>('explorable');

  const [progressMsg, setProgressMsg] = useState('Reviewing blueprints...');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdRepo, setCreatedRepo] = useState<RepositoryModel | null>(null);

  // GitHub repository naming validation: ^[a-zA-Z0-9_.-]+$
  const nameError = useMemo(() => {
    if (!name.trim()) return null;
    const regex = /^[a-zA-Z0-9_.-]+$/;
    if (!regex.test(name.trim())) {
      return 'Name can only contain letters, numbers, hyphens, periods, and underscores.';
    }
    return null;
  }, [name]);

  const selectedType = PROJECT_TYPES.find((t) => t.id === projectType) || PROJECT_TYPES[0];

  const handleDraftSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || nameError) return;
    setStep('review');
  };

  const handleConfirmBreakGround = async () => {
    setStep('progress');
    setErrorMsg(null);

    // Progressive construction status updates
    setProgressMsg('Reviewing architectural plans...');
    await new Promise((r) => setTimeout(r, 600));

    setProgressMsg('Forging repository in the realm ledger (GitHub)...');
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
      await new Promise((r) => setTimeout(r, 700));

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
              <p className="blueprint-subtitle">Draft and forge a new software repository in your realm</p>
            </div>
          </div>
          <button className="blueprint-close" onClick={onClose} aria-label="Close">
            Esc
          </button>
        </div>

        {/* Step 1: Draft Form */}
        {step === 'draft' && (
          <form className="blueprint-body" onSubmit={handleDraftSubmit}>
            <div className="blueprint-form">
              {errorMsg && <div className="blueprint-error-text">{errorMsg}</div>}

              <div className="blueprint-field">
                <label className="blueprint-label">Repository Name *</label>
                <input
                  className={`blueprint-input ${nameError ? 'blueprint-input--error' : ''}`}
                  placeholder="e.g. quantum-gateway or realm-engine"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  required
                />
                {nameError && <span className="blueprint-error-text">{nameError}</span>}
              </div>

              <div className="blueprint-field">
                <label className="blueprint-label">Project Description</label>
                <textarea
                  className="blueprint-textarea"
                  rows={2}
                  placeholder="A short description of this repository's purpose..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="blueprint-row">
                <div className="blueprint-field">
                  <label className="blueprint-label">Project Type</label>
                  <select
                    className="blueprint-select"
                    value={projectType}
                    onChange={(e) => setProjectType(e.target.value)}
                  >
                    {PROJECT_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="blueprint-field">
                  <label className="blueprint-label">Visibility</label>
                  <select
                    className="blueprint-select"
                    value={isPrivate ? 'private' : 'public'}
                    onChange={(e) => setIsPrivate(e.target.value === 'private')}
                  >
                    <option value="public">Public (Visible in Realm)</option>
                    <option value="private">Private (Restricted)</option>
                  </select>
                </div>
              </div>

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
                        {g}
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
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <label className="blueprint-checkbox-group">
                <input
                  type="checkbox"
                  checked={autoInit}
                  onChange={(e) => setAutoInit(e.target.checked)}
                />
                <span>Initialize repository with a README</span>
              </label>
            </div>

            {/* Live Architectural Preview */}
            <div className="blueprint-preview-card">
              <div className="blueprint-preview-title">
                <RulerIcon />
                <span>Architectural Blueprint</span>
              </div>

              <div className="blueprint-drawing-area">
                <div className="blueprint-signpost">
                  {name.trim() ? name.trim() : 'Project Foundation'}
                </div>
                <div
                  className="blueprint-bldg-model"
                  style={{
                    height: `${selectedType.bldgHeight}px`,
                    borderColor: selectedType.accent,
                    background: `${selectedType.accent}22`,
                  }}
                >
                  <div className="blueprint-roof" style={{ borderBottomColor: selectedType.accent }} />
                </div>
              </div>

              <ul className="blueprint-specs-list">
                <li className="blueprint-spec-item">
                  <span className="blueprint-spec-label">District Plot:</span>
                  <span className="blueprint-spec-val">Construction Foundry</span>
                </li>
                <li className="blueprint-spec-item">
                  <span className="blueprint-spec-label">Structure Tier:</span>
                  <span className="blueprint-spec-val">Starter Guildhall</span>
                </li>
                <li className="blueprint-spec-item">
                  <span className="blueprint-spec-label">Visibility:</span>
                  <span className="blueprint-spec-val">{isPrivate ? 'Private' : 'Public'}</span>
                </li>
              </ul>
            </div>
          </form>
        )}

        {/* Step 2: Final Review and Confirmation */}
        {step === 'review' && (
          <div className="blueprint-body" style={{ gridTemplateColumns: '1fr' }}>
            <div className="blueprint-review-box">
              <h3 className="blueprint-review-title">Review Realm Blueprint Before Breaking Ground</h3>
              <p className="blueprint-review-callout">
                You are about to break ground on a new project. GitWorld will forge this repository on GitHub
                under your account (or simulate the build in demo mode). Please review the final specifications:
              </p>

              <ul className="blueprint-specs-list" style={{ gap: 10, marginTop: 10 }}>
                <li className="blueprint-spec-item">
                  <span className="blueprint-spec-label">Repository Name:</span>
                  <span className="blueprint-spec-val">{name.trim()}</span>
                </li>
                <li className="blueprint-spec-item">
                  <span className="blueprint-spec-label">Visibility:</span>
                  <span className="blueprint-spec-val">{isPrivate ? 'Private' : 'Public'}</span>
                </li>
                <li className="blueprint-spec-item">
                  <span className="blueprint-spec-label">Description:</span>
                  <span className="blueprint-spec-val">{description.trim() || '(None)'}</span>
                </li>
                <li className="blueprint-spec-item">
                  <span className="blueprint-spec-label">Initialize README:</span>
                  <span className="blueprint-spec-val">{autoInit ? 'Yes' : 'No'}</span>
                </li>
                <li className="blueprint-spec-item">
                  <span className="blueprint-spec-label">.gitignore Template:</span>
                  <span className="blueprint-spec-val">{gitignore}</span>
                </li>
                <li className="blueprint-spec-item">
                  <span className="blueprint-spec-label">License:</span>
                  <span className="blueprint-spec-val">{license}</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Step 3: Progress Sequence */}
        {step === 'progress' && (
          <div className="blueprint-progress-box">
            <div className="blueprint-spinner" />
            <p className="blueprint-progress-step">{progressMsg}</p>
          </div>
        )}

        {/* Step 4: Success & Public Opt-In */}
        {step === 'success' && createdRepo && (
          <div className="blueprint-success-card">
            <div className="blueprint-success-icon">✓</div>
            <h3 style={{ margin: 0, fontSize: 18, color: '#f1ead9' }}>Ground Broken Successfully!</h3>
            <p style={{ margin: 0, fontSize: 13, color: '#a7a3c4', maxWidth: 460 }}>
              The cornerstone for <strong>{createdRepo.name}</strong> has been laid. Scaffolding has risen in
              your town’s construction district!
            </p>

            <div className="blueprint-optin-box">
              <span className="blueprint-label" style={{ display: 'block', marginBottom: 6 }}>
                Shared GitWorld Publication (AGENT.md Section 9)
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="optin"
                    checked={publicOptIn === 'explorable'}
                    onChange={() => setPublicOptIn('explorable')}
                  />
                  <span>Make project world explorable in Public Realms</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="optin"
                    checked={publicOptIn === 'landmark'}
                    onChange={() => setPublicOptIn('landmark')}
                  />
                  <span>Show as public landmark only</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="optin"
                    checked={publicOptIn === 'private'}
                    onChange={() => setPublicOptIn('private')}
                  />
                  <span>Keep private to my town</span>
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              {createdRepo.htmlUrl && (
                <a
                  href={createdRepo.htmlUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="blueprint-btn blueprint-btn--cancel"
                  style={{ textDecoration: 'none' }}
                >
                  View on GitHub
                </a>
              )}
              <button className="blueprint-btn blueprint-btn--submit" onClick={onClose}>
                Return to Town & Inspect
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        {step !== 'progress' && step !== 'success' && (
          <div className="blueprint-footer">
            {step === 'draft' ? (
              <>
                <button type="button" className="blueprint-btn blueprint-btn--cancel" onClick={onClose}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="blueprint-btn blueprint-btn--submit"
                  disabled={!name.trim() || !!nameError}
                  onClick={() => setStep('review')}
                >
                  Review Plan →
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="blueprint-btn blueprint-btn--cancel"
                  onClick={() => setStep('draft')}
                >
                  ← Edit Plan
                </button>
                <button
                  type="button"
                  className="blueprint-btn blueprint-btn--submit"
                  onClick={handleConfirmBreakGround}
                >
                  Break Ground on Repository
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
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="currentColor" opacity="0.3" />
    </svg>
  );
}

function RulerIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 12h20M7 12v3M12 12v4M17 12v3" />
    </svg>
  );
}
