(function () {
  const pageKey = document.body?.dataset.page || 'dashboard';

  // When the dashboard is hosted under a nested path (e.g. /MSA_D/dashboard/),
  // rewrite any absolute "/dashboard" links to the current base so navigation works.
  (function rewriteDashboardLinks() {
    try {
      const anchors = Array.from(document.querySelectorAll('a[href^="/dashboard"]'));
      if (!anchors.length) return;
      // determine base prefix that includes the /dashboard segment from the current path
      const m = window.location.pathname.match(/^(.*?\/dashboard)/);
      const basePrefix = m ? m[1] : '/dashboard';
      anchors.forEach((a) => {
        const href = a.getAttribute('href');
        if (!href) return;
        if (href === '/dashboard') a.setAttribute('href', basePrefix);
        else a.setAttribute('href', href.replace(/^\/dashboard/, basePrefix));
      });
    } catch (e) {
      // non-fatal
    }
  })();
  const pageContent = document.querySelector('.page-content');
  const sidebar = document.getElementById('sidebar');
  const toggleButton = document.getElementById('mobileToggle');
  const themeButton = document.getElementById('themeToggle');

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatCurrency(value) {
    return `$${Number(value).toLocaleString()}`;
  }

  function statusBadge(status) {
    return `<span class="status-badge ${escapeHtml(status).toLowerCase().replace(/\s+/g, '-')}">${escapeHtml(status)}</span>`;
  }

  const supportedStores = ['Spotify', 'Apple Music', 'YouTube Music', 'Amazon Music', 'Deezer', 'Boomplay', 'Audiomack', 'TikTok', 'Facebook / Instagram', 'Pandora', 'Tidal', 'Anghami', 'SoundCloud', 'Other supported platforms'];

  function getReleaseType(values) {
    return String(values.releaseType || 'Single');
  }

  function isMultiTrackRelease(values) {
    return ['EP', 'Album', 'Compilation'].includes(getReleaseType(values));
  }

  function createTrackEntry(index, source = {}) {
    return {
      id: source.id || `track-${index + 1}`,
      trackTitle: source.trackTitle || '',
      version: source.version || '',
      primaryArtist: source.primaryArtist || '',
      featuredArtists: source.featuredArtists || '',
      composer: source.composer || '',
      songwriter: source.songwriter || '',
      producer: source.producer || '',
      genre: source.genre || '',
      language: source.language || '',
      explicit: Boolean(source.explicit),
      lyrics: source.lyrics || '',
      isrc: source.isrc || '',
      bpm: source.bpm || '',
      musicalKey: source.musicalKey || '',
      internalNotes: source.internalNotes || '',
      audioFileName: source.audioFileName || '',
      audioValidation: source.audioValidation || 'Pending',
      trackDuration: source.trackDuration || '',
      previewUrl: source.previewUrl || ''
    };
  }

  function normalizeAudioTracks(values) {
    const existingTracks = Array.isArray(values.audioTracks) ? values.audioTracks : [];
    if (!existingTracks.length) {
      return [createTrackEntry(0, values)];
    }
    const normalized = existingTracks.map((track, index) => createTrackEntry(index, track));
    if (isMultiTrackRelease(values)) {
      return normalized;
    }
    return normalized.slice(0, 1);
  }

  function findAudioTrack(values, id) {
    return normalizeAudioTracks(values).find((track) => track.id === id);
  }

  function updateAudioTracks(values, tracks) {
    values.audioTracks = tracks.map((track, index) => createTrackEntry(index, track));
    return values;
  }

  function formatTrackDuration(seconds) {
    if (!Number.isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  }

  function validateTrackMetadata(track) {
    return Boolean(track.trackTitle && track.primaryArtist && track.genre && track.language && track.isrc && track.audioFileName);
  }

  function getArtworkValidationResult(values) {
    const hasArtwork = Boolean(values.artworkFileName);
    const validationStatus = values.artworkValidationStatus || (hasArtwork ? 'Valid' : 'Pending');
    const valid = Boolean(hasArtwork && validationStatus === 'Valid');
    const message = values.artworkValidationMessage || (hasArtwork
      ? 'Artwork has passed validation and is ready for review.'
      : 'Upload a square image in JPG or PNG format with a minimum resolution of 3000x3000 px.');
    return {
      valid,
      status: valid ? 'Valid' : (hasArtwork ? 'Needs attention' : 'Pending'),
      message
    };
  }

  function validateArtwork(values) {
    return getArtworkValidationResult(values).valid;
  }

  function validateAudioStep(values) {
    const tracks = normalizeAudioTracks(values);
    if (!isMultiTrackRelease(values)) {
      const firstTrack = tracks[0] || createTrackEntry(0, values);
      return Boolean(firstTrack.audioFileName && firstTrack.audioValidation === 'Approved' && validateTrackMetadata(firstTrack));
    }
    return tracks.length > 0 && tracks.every((track) => track.audioValidation === 'Approved' && validateTrackMetadata(track));
  }

  function validateDistribution(values) {
    return values.distributeEverywhere || (values.selectedPlatforms || []).length > 0;
  }

  function getStepValidationState(stepId, values) {
    switch (stepId) {
      case 'basic':
        return { valid: Boolean(values.releaseTitle && values.trackTitle && values.primaryArtist && values.genre && values.language), message: 'Required release basics are in place.' };
      case 'metadata':
        return { valid: Boolean(values.isrc && values.upc && values.catalogNumber && values.releaseDate && values.territories), message: 'Metadata is ready for distribution.' };
      case 'distribution':
        return { valid: validateDistribution(values), message: values.distributeEverywhere ? 'Every supported store is selected.' : 'Select stores or use distribute everywhere.' };
      case 'contributors':
        return { valid: Boolean(values.lyrics && values.contributors), message: 'Contributors and lyrics are captured.' };
      case 'artwork':
        return { valid: validateArtwork(values), message: getArtworkValidationResult(values).message };
      case 'audio':
        return { valid: validateAudioStep(values), message: isMultiTrackRelease(values) ? 'All uploaded tracks are ready for review.' : 'The single track is ready for review.' };
      case 'review':
        return { valid: getUploadStepDefinitions().slice(0, -1).every((step) => validateUploadStep(step.id, values)), message: 'Every section is ready for submission.' };
      default:
        return { valid: false, message: 'Needs attention.' };
    }
  }

  const uploadDraftStorageKey = 'msa_upload_wizard_draft';
  let uploadWizardState = null;
  let currentPageData = null;

  function normalizeNavigation() {
    const nav = document.querySelector('.sidebar-nav');
    if (!nav) return;
    const revenueLink = Array.from(nav.querySelectorAll('.nav-link')).find((link) => link.getAttribute('href') === '/dashboard/revenue');
    if (revenueLink) {
      revenueLink.textContent = 'Revenue & Payouts';
    }
    nav.querySelectorAll('.nav-link').forEach((link) => {
      if (link.getAttribute('href') === '/dashboard/balance' || link.getAttribute('href') === '/dashboard/withdrawals') {
        link.remove();
      }
    });
  }

  function loadUploadWizardState() {
    if (uploadWizardState) {
      return uploadWizardState;
    }
    try {
      const raw = localStorage.getItem(uploadDraftStorageKey);
      if (raw) {
        uploadWizardState = JSON.parse(raw);
      }
    } catch (error) {
      uploadWizardState = null;
    }
    if (!uploadWizardState) {
      uploadWizardState = { currentStep: 1, values: {}, lastMessage: 'Ready to begin your release upload.' };
    }
    return uploadWizardState;
  }

  function saveUploadWizardState(nextState) {
    uploadWizardState = nextState;
    localStorage.setItem(uploadDraftStorageKey, JSON.stringify(nextState));
  }

  const paymentMethodsStorageKey = 'msa_payment_methods';
  function loadPaymentMethods() {
    try {
      const raw = localStorage.getItem(paymentMethodsStorageKey);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      return null;
    }
    return null;
  }

  function savePaymentMethods(methods) {
    try {
      localStorage.setItem(paymentMethodsStorageKey, JSON.stringify(methods));
    } catch (e) {
      // ignore
    }
  }

  function getUploadStepDefinitions() {
    return [
      {
        id: 'basic',
        title: 'Basic',
        description: '',
        fields: [
          { name: 'releaseTitle', label: 'Release Title', type: 'text', required: true },
          { name: 'releaseType', label: 'Release Type', type: 'select', options: ['Single', 'EP', 'Album', 'Compilation'], required: true },
          { name: 'trackTitle', label: 'Track Title', type: 'text', required: true },
          { name: 'version', label: 'Version', type: 'text' },
          { name: 'primaryArtist', label: 'Primary Artist', type: 'text', required: true },
          { name: 'featuredArtists', label: 'Featured Artists', type: 'text' },
          { name: 'composer', label: 'Composer', type: 'text' },
          { name: 'songwriter', label: 'Songwriter', type: 'text' },
          { name: 'producer', label: 'Producer', type: 'text' },
          { name: 'publisher', label: 'Publisher', type: 'text' },
          { name: 'recordLabel', label: 'Record Label', type: 'text' },
          { name: 'copyrightHolder', label: 'Copyright Holder', type: 'text' },
          { name: 'genre', label: 'Genre', type: 'text', required: true },
          { name: 'subgenre', label: 'Subgenre', type: 'text' },
          { name: 'language', label: 'Language', type: 'text', required: true },
          { name: 'explicit', label: 'Explicit Content', type: 'checkbox' },
          { name: 'instrumental', label: 'Instrumental', type: 'checkbox' }
        ]
      },
      {
        id: 'metadata',
        title: 'Metadata',
        description: '',
        fields: [
          { name: 'isrc', label: 'ISRC', type: 'text', required: true },
          { name: 'upc', label: 'UPC', type: 'text', required: true },
          { name: 'catalogNumber', label: 'Catalog Number', type: 'text', required: true },
          { name: 'releaseDate', label: 'Release Date', type: 'date', required: true },
          { name: 'originalReleaseDate', label: 'Original Release Date', type: 'date' },
          { name: 'preOrderDate', label: 'Pre-order Date', type: 'date' },
          { name: 'copyrightNotice', label: 'Copyright Notice', type: 'textarea' },
          { name: 'publishingNotice', label: 'Publishing Notice', type: 'textarea' },
          { name: 'distributionNotes', label: 'Distribution Notes', type: 'textarea' },
          { name: 'internalNotes', label: 'Internal Notes', type: 'textarea' },
          { name: 'territories', label: 'Territories', type: 'text', required: true },
          { name: 'territoryScope', label: 'Worldwide or Selected Territories', type: 'select', options: ['Worldwide', 'Selected Territories'] }
        ]
      },
      {
        id: 'distribution',
        title: 'Distribution',
        description: '',
        fields: [
          { name: 'distributeEverywhere', label: 'Distribute Everywhere', type: 'checkbox' },
          { name: 'customStoreSelection', label: 'Custom Store Selection', type: 'custom' }
        ]
      },
      {
        id: 'contributors',
        title: 'Contributors',
        description: '',
        fields: [
          { name: 'lyrics', label: 'Lyrics', type: 'textarea', required: true },
          { name: 'lyricLanguage', label: 'Lyric Language', type: 'text' },
          { name: 'writers', label: 'Writers', type: 'text' },
          { name: 'producers', label: 'Producers', type: 'text' },
          { name: 'engineers', label: 'Engineers', type: 'text' },
          { name: 'mixEngineer', label: 'Mix Engineer', type: 'text' },
          { name: 'masteringEngineer', label: 'Mastering Engineer', type: 'text' },
          { name: 'contributors', label: 'Contributors', type: 'textarea', required: true },
          { name: 'credits', label: 'Credits', type: 'textarea' },
          { name: 'writerSplits', label: 'Writer Splits', type: 'textarea' },
          { name: 'publishingSplits', label: 'Publishing Splits', type: 'textarea' }
        ]
      },
      {
        id: 'artwork',
        title: 'Artwork',
        description: '',
        fields: [
          { name: 'artworkFileName', label: 'Artwork Upload', type: 'text', required: true },
          { name: 'artworkPreview', label: 'Artwork Preview', type: 'text' },
          { name: 'imageValidation', label: 'Image Validation', type: 'select', options: ['Pending', 'Approved'] },
          { name: 'resolutionValidation', label: 'Resolution Validation', type: 'select', options: ['Pending', 'Approved'] },
          { name: 'formatValidation', label: 'Format Validation', type: 'select', options: ['Pending', 'Approved'] }
        ]
      },
      {
        id: 'audio',
        title: 'Audio',
        description: '',
        fields: [
          { name: 'audioFileName', label: 'Audio Upload', type: 'text', required: true },
          { name: 'uploadProgress', label: 'Upload Progress', type: 'text' },
          { name: 'audioValidation', label: 'Audio Validation', type: 'select', options: ['Pending', 'Approved'] },
          { name: 'losslessValidation', label: 'Lossless Validation', type: 'select', options: ['Pending', 'Approved'] },
          { name: 'previewAudio', label: 'Preview Audio', type: 'text' },
          { name: 'trackDuration', label: 'Track Duration', type: 'text' }
        ]
      },
      {
        id: 'review',
        title: 'Review',
        description: ''
      }
    ];
  }

  function validateUploadStep(stepId, values) {
    switch (stepId) {
      case 'basic':
        return Boolean(values.releaseTitle && values.trackTitle && values.primaryArtist && values.genre && values.language);
      case 'metadata':
        return Boolean(values.isrc && values.upc && values.catalogNumber && values.releaseDate && values.territories);
      case 'distribution':
        return Boolean(values.distributeEverywhere || (values.selectedPlatforms || []).length > 0);
      case 'contributors':
        return Boolean(values.lyrics && values.contributors);
      case 'artwork':
        return validateArtwork(values);
      case 'audio':
        return validateAudioStep(values);
      case 'review':
        return getUploadStepDefinitions().every((step) => validateUploadStep(step.id, values) || step.id === 'review');
      default:
        return false;
    }
  }

  function getUploadStepSummary(stepId, values) {
    switch (stepId) {
      case 'basic':
        return [values.releaseTitle, values.trackTitle, values.primaryArtist].filter(Boolean).join(' • ') || 'Basic release details pending.';
      case 'metadata':
        return [values.isrc, values.upc, values.releaseDate].filter(Boolean).join(' • ') || 'Metadata details pending.';
      case 'distribution':
        if (values.distributeEverywhere) return 'Distribute everywhere enabled.';
        return values.selectedPlatforms && values.selectedPlatforms.length ? values.selectedPlatforms.join(', ') : 'Distribution settings pending.';
      case 'contributors':
        return values.contributors || values.lyrics || 'Creators and lyrics pending.';
      case 'artwork':
        return values.artworkFileName || 'Artwork not uploaded yet.';
      case 'audio':
        const tracks = normalizeAudioTracks(values);
        if (tracks.length > 1) return `${tracks.length} tracks uploaded`;
        return tracks[0]?.audioFileName || 'Audio not uploaded yet.';
      default:
        return 'Review and submit.';
    }
  }

  function renderUploadField(field, values) {
    const value = values[field.name] ?? '';
    if (field.type === 'checkbox') {
      return `<label class="check-row"><input type="checkbox" name="${escapeHtml(field.name)}" ${value ? 'checked' : ''}> ${escapeHtml(field.label)}</label>`;
    }
    if (field.type === 'textarea') {
      return `<label class="full-span">${escapeHtml(field.label)}<textarea name="${escapeHtml(field.name)}">${escapeHtml(value)}</textarea></label>`;
    }
    if (field.type === 'select') {
      return `<label>${escapeHtml(field.label)}<select name="${escapeHtml(field.name)}">${(field.options || []).map((option) => `<option value="${escapeHtml(option)}" ${value === option ? 'selected' : ''}>${escapeHtml(option)}</option>`).join('')}</select></label>`;
    }
    if (field.type === 'custom') {
      const selectedPlatforms = values.selectedPlatforms || [];
      const searchTerm = String(values.storeSearch || '').trim().toLowerCase();
      const filteredStores = supportedStores.filter((platform) => !searchTerm || platform.toLowerCase().includes(searchTerm));
      const isSpecificMode = !values.distributeEverywhere && values.selectSpecificStores;
      return `
        <div class="full-span">
          <div class="wizard-section-head">
            <h4>Distribution destinations</h4>
            <span class="pill">${selectedPlatforms.length} selected</span>
          </div>
          <div class="distribution-mode-grid">
            <label class="distribution-option ${values.distributeEverywhere ? 'active' : ''}">
              <input type="checkbox" name="distributeEverywhere" ${values.distributeEverywhere ? 'checked' : ''}>
              <strong>Distribute Everywhere</strong>
              <span>Automatically select all supported stores.</span>
            </label>
            <label class="distribution-option ${isSpecificMode ? 'active' : ''}">
              <input type="checkbox" name="selectSpecificStores" ${isSpecificMode ? 'checked' : ''}>
              <strong>Select Specific Stores</strong>
              <span>Search and curate your own platform mix.</span>
            </label>
          </div>
          <div class="distribution-search-panel ${values.distributeEverywhere ? 'disabled' : ''}">
            <input type="search" name="storeSearch" value="${escapeHtml(values.storeSearch || '')}" placeholder="Search supported stores" ${values.distributeEverywhere ? 'disabled' : ''}>
            <div class="chip-row">
              ${filteredStores.map((platform) => `<label class="check-row"><input type="checkbox" name="selectedPlatforms" value="${escapeHtml(platform)}" ${selectedPlatforms.includes(platform) ? 'checked' : ''} ${values.distributeEverywhere ? 'disabled' : ''}> ${escapeHtml(platform)}</label>`).join('')}
            </div>
          </div>
          <div class="wizard-section-head compact">
            <h4>Selected stores</h4>
            <span class="pill">${selectedPlatforms.length} total</span>
          </div>
          <div class="chip-row selected-stores">
            ${selectedPlatforms.length ? selectedPlatforms.map((platform) => `<span class="store-chip">${escapeHtml(platform)}<button type="button" class="store-chip-remove" data-remove-store="${escapeHtml(platform)}" aria-label="Remove ${escapeHtml(platform)}">×</button></span>`).join('') : '<span class="muted">No stores selected yet.</span>'}
          </div>
        </div>
      `;
    }
    if (['artworkFileName', 'artworkPreview', 'imageValidation', 'resolutionValidation', 'formatValidation'].includes(field.name)) {
      return '';
    }
    if (['audioFileName', 'uploadProgress', 'audioValidation', 'losslessValidation', 'previewAudio', 'trackDuration'].includes(field.name)) {
      return '';
    }
    return `<label>${escapeHtml(field.label)}<input type="${field.type === 'date' ? 'date' : 'text'}" name="${escapeHtml(field.name)}" value="${escapeHtml(value)}"></label>`;
  }

  function renderArtworkStep(values) {
    const validation = getArtworkValidationResult(values);
    const previewUrl = values.artworkPreviewUrl || '';
    return `
      <div class="full-span wizard-section-card">
        <div class="wizard-section-head">
          <h4>Artwork validation</h4>
          <span class="pill ${validation.valid ? 'good-pill' : 'warn-pill'}">${escapeHtml(validation.status)}</span>
        </div>
        <div class="upload-drop-shell">
          <label class="upload-drop-label" for="artworkFileInput">
            <strong>Upload artwork</strong>
            <span>${escapeHtml(values.artworkFileName || 'Drop a file here or tap to browse')}</span>
          </label>
          <input type="file" id="artworkFileInput" accept="image/*" class="wizard-file-input">
          <div class="muted">${escapeHtml(validation.message)}</div>
        </div>
        ${previewUrl ? `
          <div class="artwork-preview-card">
            <img src="${escapeHtml(previewUrl)}" alt="Artwork preview">
            <div class="artwork-meta-stack">
              <div><strong>${escapeHtml(values.artworkFileName || 'Artwork uploaded')}</strong></div>
              <div class="muted">${escapeHtml(values.artworkResolution || '')}</div>
              <div class="muted">${escapeHtml(values.artworkFileSize || '')}</div>
            </div>
          </div>
        ` : ''}
        ${values.artworkFileName ? `
          <div class="wizard-actions-inline">
            <button class="ghost-button" type="button" data-artwork-action="replace">Replace Artwork</button>
            <button class="ghost-button" type="button" data-artwork-action="remove">Remove Artwork</button>
          </div>
        ` : ''}
      </div>
    `;
  }

  function renderTrackEditor(values) {
    const tracks = normalizeAudioTracks(values);
    const editingTrackId = values.editingTrackId || '';
    const activeTrack = tracks.find((track) => track.id === editingTrackId) || tracks[0] || createTrackEntry(0);
    if (!editingTrackId && !tracks.length) {
      return '';
    }
    return `
      <div class="wizard-modal-overlay">
        <div class="wizard-modal-card">
          <div class="wizard-section-head">
            <h4>Track details</h4>
            <button class="ghost-button" type="button" data-track-editor-close="true">Close</button>
          </div>
          <form id="trackEditorForm" class="wizard-field-grid">
            <label class="full-span">Track Title<input type="text" name="trackTitle" value="${escapeHtml(activeTrack.trackTitle || '')}"></label>
            <label>Version<input type="text" name="version" value="${escapeHtml(activeTrack.version || '')}"></label>
            <label>Primary Artist<input type="text" name="primaryArtist" value="${escapeHtml(activeTrack.primaryArtist || '')}"></label>
            <label>Featured Artists<input type="text" name="featuredArtists" value="${escapeHtml(activeTrack.featuredArtists || '')}"></label>
            <label>Composer<input type="text" name="composer" value="${escapeHtml(activeTrack.composer || '')}"></label>
            <label>Songwriter<input type="text" name="songwriter" value="${escapeHtml(activeTrack.songwriter || '')}"></label>
            <label>Producer<input type="text" name="producer" value="${escapeHtml(activeTrack.producer || '')}"></label>
            <label>Genre<input type="text" name="genre" value="${escapeHtml(activeTrack.genre || '')}"></label>
            <label>Language<input type="text" name="language" value="${escapeHtml(activeTrack.language || '')}"></label>
            <label>BPM<input type="text" name="bpm" value="${escapeHtml(activeTrack.bpm || '')}"></label>
            <label>Musical Key<input type="text" name="musicalKey" value="${escapeHtml(activeTrack.musicalKey || '')}"></label>
            <label>ISRC<input type="text" name="isrc" value="${escapeHtml(activeTrack.isrc || '')}"></label>
            <label class="check-row"><input type="checkbox" name="explicit" ${activeTrack.explicit ? 'checked' : ''}> Explicit Content</label>
            <label class="full-span">Lyrics<textarea name="lyrics">${escapeHtml(activeTrack.lyrics || '')}</textarea></label>
            <label class="full-span">Internal Notes<textarea name="internalNotes">${escapeHtml(activeTrack.internalNotes || '')}</textarea></label>
            <div class="wizard-actions full-span">
              <button class="ghost-button" type="button" data-track-editor-cancel="true">Cancel</button>
              <button class="primary-button" type="submit">Save Track</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  function renderAudioStep(values) {
    const tracks = normalizeAudioTracks(values);
    const isMultiTrack = isMultiTrackRelease(values);
    return `
      <div class="full-span wizard-section-card">
        <div class="wizard-section-head">
          <h4>${isMultiTrack ? 'Multi-track audio management' : 'Single track audio'}</h4>
          <span class="pill">${isMultiTrack ? `${tracks.length} tracks` : 'Single track'}</span>
        </div>
        <div class="wizard-actions-inline">
          <button class="primary-button" type="button" id="addTrackButton">${isMultiTrack ? 'Add track' : 'Upload audio'}</button>
          <input type="file" id="addTrackInput" accept="audio/*" class="wizard-file-input">
          <span class="muted">${isMultiTrack ? 'Upload, reorder, edit, and preview each track independently.' : 'Upload and preview a single track for this release.'}</span>
        </div>
        <div class="track-list">
          ${tracks.map((track, index) => `
            <article class="track-card">
              <div class="track-card-main">
                <div>
                  <strong>${escapeHtml(track.trackTitle || `Track ${index + 1}`)}</strong>
                  <div class="muted">${escapeHtml(track.audioFileName || 'No audio uploaded yet')}</div>
                </div>
                <div class="track-card-meta">
                  <span class="pill">${escapeHtml(track.audioValidation || 'Pending')}</span>
                  <span class="pill">${escapeHtml(track.trackDuration || 'Duration pending')}</span>
                </div>
              </div>
              <div class="track-card-preview">
                ${track.previewUrl ? `<audio controls preload="metadata" src="${escapeHtml(track.previewUrl)}"></audio>` : '<div class="muted">Preview will appear once the track is uploaded.</div>'}
              </div>
              <div class="wizard-actions-inline">
                ${index > 0 ? `<button class="ghost-button" type="button" data-track-move="up" data-track-id="${escapeHtml(track.id)}">Move up</button>` : ''}
                ${index < tracks.length - 1 ? `<button class="ghost-button" type="button" data-track-move="down" data-track-id="${escapeHtml(track.id)}">Move down</button>` : ''}
                <button class="ghost-button" type="button" data-track-edit="${escapeHtml(track.id)}">Edit</button>
                ${tracks.length > 1 ? `<button class="ghost-button" type="button" data-track-remove="${escapeHtml(track.id)}">Delete</button>` : ''}
              </div>
            </article>
          `).join('')}
        </div>
      </div>
    `;
  }

  function renderReviewStep(values) {
    const sections = [
      { id: 'basic', title: 'Basic Information', valid: validateUploadStep('basic', values), summary: [values.releaseTitle, values.trackTitle, values.primaryArtist].filter(Boolean).join(' • ') || 'Basic details pending.' },
      { id: 'metadata', title: 'Release Metadata', valid: validateUploadStep('metadata', values), summary: [values.isrc, values.upc, values.releaseDate].filter(Boolean).join(' • ') || 'Metadata pending.' },
      { id: 'distribution', title: 'Distribution', valid: validateUploadStep('distribution', values), summary: values.distributeEverywhere ? 'Distribute Everywhere enabled.' : (values.selectedPlatforms || []).length ? (values.selectedPlatforms || []).join(', ') : 'No stores selected.' },
      { id: 'contributors', title: 'Contributors', valid: validateUploadStep('contributors', values), summary: values.contributors || values.lyrics || 'Contributors and lyrics pending.' },
      { id: 'artwork', title: 'Artwork', valid: validateUploadStep('artwork', values), summary: values.artworkFileName || 'Artwork pending.' },
      { id: 'audio', title: 'Audio', valid: validateUploadStep('audio', values), summary: normalizeAudioTracks(values).map((track) => track.trackTitle || track.audioFileName || 'Track').join(', ') || 'Audio pending.' }
    ];
    return `
      <div class="review-sections-list">
        ${sections.map((section) => `
          <div class="review-section-card">
            <div>
              <strong>${escapeHtml(section.title)}</strong>
              <p>${escapeHtml(section.summary)}</p>
            </div>
            <div class="review-section-actions">
              <span class="pill ${section.valid ? 'good-pill' : 'warn-pill'}">${section.valid ? 'Complete' : 'Needs Attention'}</span>
              <button class="ghost-button" type="button" data-jump-step="${getUploadStepDefinitions().findIndex((step) => step.id === section.id) + 1}">Edit</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function setActiveLink() {
    normalizeNavigation();
    const path = window.location.pathname.replace(/\/+$/, '') || '/dashboard';
    document.querySelectorAll('.sidebar-nav .nav-link').forEach((link) => {
      const target = link.getAttribute('href');
      link.classList.toggle('active', target === path);
    });
  }

  function renderUpload(data, wizardState = loadUploadWizardState()) {
    const steps = getUploadStepDefinitions();
    const currentStepIndex = Math.max(0, Math.min((wizardState.currentStep || 1) - 1, steps.length - 1));
    const currentStep = steps[currentStepIndex];
    const values = wizardState.values || {};
    const completedSteps = steps.filter((step) => validateUploadStep(step.id, values)).length;
    const progressPercent = Math.round((completedSteps / (steps.length - 1)) * 100);
    const reviewReady = steps.slice(0, -1).every((step) => validateUploadStep(step.id, values));

    return `
      <section class="page-shell">
        <div class="page-toolbar"><div><p class="eyebrow">Publishing</p><h3>Release builder</h3></div><div class="action-group"><a class="ghost-button" href="/dashboard/releases">See releases</a><button class="primary-button" type="button" id="saveDraft">Save draft</button></div></div>
        <div class="wizard-shell">
          <nav class="wizard-stepbar" aria-label="Release creation steps">
            ${steps.map((step, index) => {
              const stepNumber = index + 1;
              const isCurrent = index === currentStepIndex;
              const isComplete = validateUploadStep(step.id, values) || (step.id === 'review' && reviewReady);
              const previousCompleted = steps.slice(0, index).every((s) => validateUploadStep(s.id, values));
              const isLocked = !previousCompleted && index !== 0 && !isCurrent;
              const statusIcon = isComplete ? '<svg class="icon icon-check" viewBox="0 0 16 16" width="16" height="16"><path fill="currentColor" d="M6.6 11.2L3.4 8l-1 1 4.2 4 9-9-1-1z"/></svg>' : (isLocked ? '<svg class="icon icon-lock" viewBox="0 0 16 16" width="16" height="16"><path fill="currentColor" d="M4 7V5a4 4 0 018 0v2h1a1 1 0 011 1v6a1 1 0 01-1 1H3a1 1 0 01-1-1V8a1 1 0 011-1h1zM6 7V5a2 2 0 114 0v2H6z"/></svg>' : '<svg class="icon icon-step" viewBox="0 0 24 24" width="16" height="16"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1" fill="none"/><text x="12" y="16" text-anchor="middle" font-size="10" fill="currentColor">' + stepNumber + '</text></svg>');
              const statusClass = isComplete ? 'complete' : (isLocked ? 'locked' : 'incomplete');
              return `<button type="button" class="wizard-step ${statusClass} ${isCurrent ? 'current' : ''}" data-step-index="${index}" aria-current="${isCurrent ? 'step' : 'false'}">${statusIcon}<div class="step-meta"><span class="step-number">${stepNumber}</span><strong>${escapeHtml(step.title)}</strong></div></button>`;
            }).join('')}
          </nav>
          <div class="wizard-card">
            <div class="wizard-header">
              <div>
                <p class="eyebrow">Step ${currentStepIndex + 1} of ${steps.length}</p>
                <h3>${escapeHtml(currentStep.title)}</h3>
                <p class="muted">${escapeHtml(currentStep.description)}</p>
              </div>
              <div class="pill">${progressPercent}% complete</div>
            </div>
            <form id="uploadWizardForm" class="wizard-form">
              ${currentStep.id === 'review' ? renderReviewStep(values) : ''}
              ${currentStep.id === 'artwork' ? renderArtworkStep(values) : ''}
              ${currentStep.id === 'audio' ? renderAudioStep(values) : ''}
              ${currentStep.id !== 'review' && currentStep.id !== 'artwork' && currentStep.id !== 'audio' ? `<div class="wizard-field-grid">${currentStep.fields.map((field) => renderUploadField(field, values)).join('')}</div>` : ''}
              <div class="wizard-actions">
                <button class="ghost-button" type="button" id="wizardBack" ${currentStepIndex === 0 ? 'disabled' : ''}>Back</button>
                <button class="ghost-button" type="button" id="saveDraft">Save as Draft</button>
                ${currentStep.id === 'review' ? `<button class="primary-button" type="button" id="submitReview" ${reviewReady ? '' : 'disabled'}>Submit for Review</button>` : `<button class="primary-button" type="button" id="wizardNext">Save & Next</button>`}
              </div>
              <div class="form-status" id="uploadStatus">${escapeHtml(wizardState.lastMessage || 'Ready to begin your release upload.')}</div>
            </form>
            ${currentStep.id === 'audio' && values.editingTrackId ? renderTrackEditor(values) : ''}
          </div>
        </div>
      </section>
    `;
  }

  function renderReleases(data) {
    const releases = data.releases || [];
    return `
      <section class="page-shell">
        <div class="content-grid two-up">
          <article class="panel-card">
            <div class="panel-head"><h4>Search and filters</h4><span class="pill">Release control</span></div>
            <div class="form-grid">
              <label>Search<input value="Midnight"></label>
              <label>Status<select><option>All statuses</option><option>Approved</option><option>Pending</option><option>Live</option></select></label>
              <label>Sort<select><option>Most recent</option><option>Highest revenue</option><option>Most streams</option></select></label>
            </div>
          </article>
          <article class="panel-card">
            <div class="panel-head"><h4>Release health</h4><span class="pill">Fast review</span></div>
            <ul class="stack-list">
              <li><strong>Distribution status</strong><br><span class="muted">Spotify, Apple Music, Deezer and YouTube Music are configured.</span></li>
              <li><strong>Review status</strong><br><span class="muted">Metadata review is complete and legal checks passed.</span></li>
            </ul>
          </article>
        </div>
        <article class="panel-card">
          <div class="panel-head"><h4>Release inventory</h4><span class="pill">Professional operations</span></div>
          <div class="table-card">
            <table>
              <thead><tr><th>Artwork</th><th>Title</th><th>Artist</th><th>Release date</th><th>Genre</th><th>Status</th><th>Revenue</th><th>Streams</th><th>Action</th></tr></thead>
              <tbody>
                ${releases.map((item) => `<tr><td>${escapeHtml(item.artwork || 'Cover')}</td><td>${escapeHtml(item.title)}</td><td>${escapeHtml(item.artist)}</td><td>${escapeHtml(item.releaseDate)}</td><td>${escapeHtml(item.genre)}</td><td>${statusBadge(item.status)}</td><td>${formatCurrency(item.revenue || 0)}</td><td>${Number(item.streams || 0).toLocaleString()}</td><td><a href="/dashboard/analytics">View</a></td></tr>`).join('')}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    `;
  }

  function renderAnalytics(data) {
    const series = data.series || [];
    const countries = data.countries || [];
    const platforms = data.platforms || [];
    const linePoints = series.map((point, index) => `${40 + index * 36} ${130 - point.value / 6}`).join(' ');
    return `
      <section class="page-shell">
        <div class="content-grid two-up">
          <article class="panel-card">
            <div class="panel-head"><h4>Revenue and streams over time</h4><span class="pill">Live intelligence</span></div>
            <div class="svg-card">
              <svg viewBox="0 0 260 140" class="chart-svg" role="img" aria-label="Revenue and streams trend chart">
                <line x1="20" y1="120" x2="240" y2="120" class="axis" />
                <line x1="20" y1="20" x2="20" y2="120" class="axis" />
                <polyline points="${linePoints}" class="series" />
              </svg>
              <div class="legend-list">
                <span class="legend-chip"><i class="dot revenue"></i>Revenue</span>
                <span class="legend-chip"><i class="dot streams"></i>Streams</span>
              </div>
            </div>
          </article>
          <article class="panel-card">
            <div class="panel-head"><h4>Top tracks</h4><span class="pill">Best performers</span></div>
            <ul class="stack-list">
              ${(data.topTracks || []).map((track) => `<li><strong>${escapeHtml(track.title)}</strong><br><span class="muted">${escapeHtml(track.metric)} · ${escapeHtml(track.growth)}</span></li>`).join('')}
            </ul>
          </article>
        </div>
        <div class="content-grid two-up">
          <article class="panel-card">
            <div class="panel-head"><h4>Countries</h4><span class="pill">Top territories</span></div>
            <div class="table-card">
              <table><thead><tr><th>Country</th><th>Streams</th><th>Revenue</th></tr></thead><tbody>${countries.map((country) => `<tr><td>${escapeHtml(country.country)}</td><td>${Number(country.streams).toLocaleString()}</td><td>${formatCurrency(country.revenue)}</td></tr>`).join('')}</tbody></table>
            </div>
          </article>
          <article class="panel-card">
            <div class="panel-head"><h4>Platforms</h4><span class="pill">Distribution mix</span></div>
            <ul class="stack-list">${platforms.map((platform) => `<li><strong>${escapeHtml(platform.name)}</strong><br><span class="muted">${Number(platform.value).toLocaleString()} listens · ${formatCurrency(platform.revenue)}</span></li>`).join('')}</ul>
          </article>
        </div>
      </section>
    `;
  }

  function renderRevenue(data) {
    const summary = data.summary || {};
    const transactions = data.transactions || [];
    const storedWithdrawalsRaw = (function(){ try { return localStorage.getItem('msa_withdrawals') || '[]'; } catch(e) { return '[]'; } })();
    let storedWithdrawals = [];
    try { storedWithdrawals = JSON.parse(storedWithdrawalsRaw); } catch(e) { storedWithdrawals = []; }
    const pendingWithdrawals = (data.pendingWithdrawals || []).slice().concat(storedWithdrawals.filter(w => (w.status || '').toLowerCase() === 'pending'));
    const approvedWithdrawals = (data.approvedWithdrawals || []).slice().concat(storedWithdrawals.filter(w => (w.status || '').toLowerCase() === 'approved'));
    const rejectedWithdrawals = (data.rejectedWithdrawals || []).slice().concat(storedWithdrawals.filter(w => (w.status || '').toLowerCase() === 'rejected'));
    const completedWithdrawals = (data.completedWithdrawals || []).slice().concat(storedWithdrawals.filter(w => (w.status || '').toLowerCase() === 'completed'));
    const storedMethods = loadPaymentMethods();
    const defaultMethod = (storedMethods && storedMethods.find((m) => m.default)) || data.defaultPaymentMethod || {};
    return `
      <section class="page-shell">
        <div class="kpi-grid">
          <article class="kpi-card"><p class="label">Current balance</p><h4>${formatCurrency(summary.balance || 21340)}</h4><span class="muted">Available for payout</span></article>
          <article class="kpi-card"><p class="label">Pending balance</p><h4>${formatCurrency(summary.pendingBalance || 4800)}</h4><span class="muted">Awaiting settlement</span></article>
          <article class="kpi-card"><p class="label">Available balance</p><h4>${formatCurrency(summary.availableBalance || 16540)}</h4><span class="muted">Ready for withdrawal</span></article>
          <article class="kpi-card"><p class="label">Lifetime revenue</p><h4>${formatCurrency(summary.lifetimeRevenue || 182760)}</h4><span class="muted">All time</span></article>
        </div>
        <div class="content-grid two-up">
          <article class="panel-card">
            <div class="panel-head"><h4>Revenue performance</h4><span class="pill">Monthly + weekly</span></div>
            <ul class="stack-list">
              <li><strong>Monthly revenue</strong><br><span class="muted">${formatCurrency(summary.monthlyRevenue || 1368)}</span></li>
              <li><strong>Weekly revenue</strong><br><span class="muted">${formatCurrency(summary.weeklyRevenue || 320)}</span></li>
              <li><strong>Revenue history</strong><br><span class="muted">${(data.history || []).map((row) => `${escapeHtml(row.period)} · ${formatCurrency(row.amount)}`).join(' • ')}</span></li>
            </ul>
          </article>
          <article class="panel-card">
            <div class="panel-head"><h4>Revenue chart</h4><span class="pill">Live view</span></div>
            <div class="svg-card">
              <svg viewBox="0 0 260 140" class="chart-svg" role="img" aria-label="Revenue chart">
                <line x1="20" y1="120" x2="240" y2="120" class="axis" />
                <line x1="20" y1="20" x2="20" y2="120" class="axis" />
                <path d="M20 100 L60 84 L100 78 L140 70 L180 56 L220 40 L240 30" class="series" />
              </svg>
            </div>
          </article>
        </div>
        <div class="content-grid two-up">
          <article class="panel-card">
            <div class="panel-head"><h4>Pending withdrawals</h4><span class="pill">Review queue</span></div>
            <ul class="stack-list">${pendingWithdrawals.map((item) => `<li><strong>${escapeHtml(item.reference || 'Pending')}</strong><br><span class="muted">${escapeHtml(item.status)} · ${escapeHtml(item.date)}</span></li>`).join('')}</ul>
          </article>
          <article class="panel-card">
            <div class="panel-head"><h4>Withdrawal request</h4><span class="pill">Default method</span></div>
            <form class="form-grid" id="withdrawalForm">
              <label>Withdrawal amount<input type="number" name="amount" value="2400"></label>
              <label>Payment method<input value="${escapeHtml(defaultMethod.method || 'Bank Transfer')}" readonly></label>
              <label>Account details<input value="${escapeHtml(defaultMethod.account || 'HSBC • 01234567')}" readonly></label>
              <label>Reference number<input name="reference" value="W-2048"></label>
              <div class="full-span">
                <p class="muted">To change your payment method, update it from your Profile.</p>
              </div>
              <div class="form-actions full-span"><button class="primary-button" type="submit">Submit withdrawal</button></div>
              <div class="full-span form-status" id="withdrawalStatus">Default payment method will be used automatically.</div>
            </form>
          </article>
        </div>
        <div class="content-grid two-up">
          <article class="panel-card">
            <div class="panel-head"><h4>Transaction history</h4><span class="pill">Ledger</span></div>
            <div class="table-card"><table><thead><tr><th>Date</th><th>Type</th><th>Source</th><th>Status</th><th>Amount</th></tr></thead><tbody>${transactions.map((item) => `<tr><td>${escapeHtml(item.date)}</td><td>${escapeHtml(item.type)}</td><td>${escapeHtml(item.source)}</td><td>${statusBadge(item.status)}</td><td>${formatCurrency(item.amount)}</td></tr>`).join('')}</tbody></table></div>
          </article>
          <article class="panel-card">
            <div class="panel-head"><h4>Payout history</h4><span class="pill">Approvals</span></div>
            <ul class="stack-list">
              ${approvedWithdrawals.map((item) => `<li><strong>${escapeHtml(item.reference || 'Approved')}</strong><br><span class="muted">${escapeHtml(item.status)} · ${escapeHtml(item.date)}</span></li>`).join('')}
              ${rejectedWithdrawals.map((item) => `<li><strong>${escapeHtml(item.reference || 'Rejected')}</strong><br><span class="muted">${escapeHtml(item.status)} · ${escapeHtml(item.date)}</span></li>`).join('')}
              ${completedWithdrawals.map((item) => `<li><strong>${escapeHtml(item.reference || 'Completed')}</strong><br><span class="muted">${escapeHtml(item.status)} · ${escapeHtml(item.date)}</span></li>`).join('')}
            </ul>
          </article>
        </div>
      </section>
    `;
  }

  function renderBalance(data) {
    const balances = data.balances || [];
    return `
      <section class="page-shell">
        <div class="kpi-grid">${balances.map((item) => `<article class="kpi-card"><p class="label">${escapeHtml(item.label)}</p><h4>${escapeHtml(item.value)}</h4><span class="muted">${escapeHtml(item.note)}</span></article>`).join('')}</div>
        <article class="panel-card"><div class="panel-head"><h4>Ledger</h4><span class="pill">History</span></div><ul class="stack-list">${(data.ledger || []).map((entry) => `<li><strong>${escapeHtml(entry.title)}</strong><br><span class="muted">${escapeHtml(entry.detail)}</span></li>`).join('')}</ul></article>
      </section>
    `;
  }

  function renderWithdrawals(data) {
    const history = data.history || [];
    const storedMethods = loadPaymentMethods();
    const defaultMethod = (storedMethods && storedMethods.find((m) => m.default)) || null;
    return `
      <section class="page-shell">
        <div class="content-grid two-up">
          <article class="panel-card">
            <div class="panel-head"><h4>Withdrawal request form</h4><span class="pill">Approval workflow</span></div>
            <form class="form-grid" id="withdrawalForm">
              <label>Withdrawal amount<input type="number" name="amount" value="2400"></label>
              <label>Payment method<input value="${escapeHtml((defaultMethod && defaultMethod.method) || 'Bank Transfer')}" readonly></label>
              <label>Account details<input value="${escapeHtml((defaultMethod && defaultMethod.account) || 'HSBC • 01234567')}" readonly></label>
              <label>Reference number<input name="reference" value="W-2048"></label>
              <div class="form-actions full-span"><button class="primary-button" type="submit">Submit withdrawal</button></div>
              <div class="full-span form-status" id="withdrawalStatus">The default payment method will be used automatically.</div>
            </form>
          </article>
          <article class="panel-card">
            <div class="panel-head"><h4>Pending and completed withdrawals</h4><span class="pill">Status timeline</span></div>
            <ul class="stack-list">${history.map((item) => `<li><strong>${escapeHtml(item.amount)}</strong><br><span class="muted">${escapeHtml(item.status)} · ${escapeHtml(item.date)}</span></li>`).join('')}</ul>
          </article>
        </div>
        <article class="panel-card">
          <div class="panel-head"><h4>Withdrawal history</h4><span class="pill">Operations ledger</span></div>
          <div class="table-card"><table><thead><tr><th>Date</th><th>Amount</th><th>Status</th><th>Expected processing</th></tr></thead><tbody>${(data.historyDetailed || []).map((item) => `<tr><td>${escapeHtml(item.date)}</td><td>${escapeHtml(item.amount)}</td><td>${statusBadge(item.status)}</td><td>${escapeHtml(item.processing)}</td></tr>`).join('')}</tbody></table></div>
        </article>
      </section>
    `;
  }

  function renderSupport(data) {
    const tickets = data.tickets || [];
    return `
      <section class="page-shell">
        <div class="content-grid two-up">
          <article class="panel-card">
            <div class="panel-head"><h4>Open cases</h4><span class="pill">Priority routing</span></div>
            <div class="table-card"><table><thead><tr><th>Ticket</th><th>Category</th><th>Priority</th><th>Status</th></tr></thead><tbody>${tickets.map((ticket) => `<tr><td>${escapeHtml(ticket.number)}</td><td>${escapeHtml(ticket.category)}</td><td>${escapeHtml(ticket.priority)}</td><td>${statusBadge(ticket.status)}</td></tr>`).join('')}</tbody></table></div>
          </article>
          <article class="panel-card">
            <div class="panel-head"><h4>Conversation</h4><span class="pill">Admin only</span></div>
            <ul class="stack-list">
              ${(data.conversation || []).map((entry) => `<li><strong>${escapeHtml(entry.author)}</strong><br><span class="muted">${escapeHtml(entry.message)}</span></li>`).join('')}
            </ul>
          </article>
        </div>
      </section>
    `;
  }

  function bindShellEvents() {
    if (toggleButton) {
      toggleButton.addEventListener('click', () => {
        sidebar?.classList.toggle('open');
        document.querySelector('.mobile-overlay')?.classList.toggle('show');
      });
    }

    if (themeButton) {
      themeButton.addEventListener('click', () => {
        document.body.classList.toggle('light');
        themeButton.textContent = document.body.classList.contains('light') ? '☾' : '☀︎';
      });
    }

    if (!document.querySelector('.mobile-overlay')) {
      const overlay = document.createElement('div');
      overlay.className = 'mobile-overlay';
      document.body.appendChild(overlay);
      overlay.addEventListener('click', () => {
        sidebar?.classList.remove('open');
        overlay.classList.remove('show');
      });
    }
  }

  function loadingMarkup() {
    return `
      <section class="page-shell">
        <div class="loading-state">
          <div class="skeleton-bar wide"></div>
          <div class="skeleton-bar"></div>
          <div class="skeleton-row">
            <div class="skeleton-card"></div>
            <div class="skeleton-card"></div>
          </div>
        </div>
      </section>
    `;
  }

  function errorMarkup(message) {
    return `
      <section class="page-shell">
        <div class="error-state">
          <p class="eyebrow">Connection issue</p>
          <h3>We could not load this screen.</h3>
          <p>${escapeHtml(message)}</p>
          <a class="primary-button" href="/dashboard">Return to dashboard</a>
        </div>
      </section>
    `;
  }

  async function loadPageData(page) {
    const endpoints = {
      dashboard: '/api/dashboard',
      upload: '/api/uploads',
      releases: '/api/releases',
      analytics: '/api/analytics',
      revenue: '/api/revenue',
      balance: '/api/balance',
      withdrawals: '/api/withdrawals',
      support: '/api/support',
      messages: '/api/messages',
      notifications: '/api/notifications',
      profile: '/api/profile',
      settings: '/api/settings',
      help: '/api/help'
    };

    const response = await fetch(endpoints[page] || '/api/dashboard');
    if (!response.ok) {
      throw new Error('The platform could not fetch the latest workspace data.');
    }
    return response.json();
  }

  function renderDashboard(data) {
    const artist = data.artist || {};
    const metrics = data.metrics || {};
    const releases = data.releases || [];
    const activity = data.activity || [];
    const notifications = data.notifications || [];
    const withdrawals = data.withdrawals || [];
    return `
      <section class="page-shell">
        <div class="page-toolbar">
          <div>
            <p class="eyebrow">Studio overview</p>
            <h3>${escapeHtml(artist.name || 'Artist command center')}</h3>
          </div>
          <div class="action-group">
            <button class="ghost-button" type="button">Export summary</button>
            <a class="primary-button" href="/dashboard/upload">New upload</a>
          </div>
        </div>
        <div class="notice-banner">
          <div>
            <p class="eyebrow">Platform health</p>
            <strong>${escapeHtml(artist.verification || 'Verification complete')}</strong>
          </div>
          <div class="pill">Distribution status: ${escapeHtml(metrics.distributionStatus || 'Live')}</div>
        </div>
        <div class="kpi-grid">
          <article class="kpi-card"><p class="label">Current balance</p><h4>${formatCurrency(metrics.balance || 21340)}</h4><span class="muted">Live artist wallet</span></article>
          <article class="kpi-card"><p class="label">Pending balance</p><h4>${formatCurrency(metrics.pendingBalance || 4800)}</h4><span class="muted">Awaiting approval</span></article>
          <article class="kpi-card"><p class="label">Lifetime earnings</p><h4>${formatCurrency(metrics.lifetimeEarnings || 182760)}</h4><span class="muted">All-time revenue</span></article>
          <article class="kpi-card"><p class="label">Estimated monthly</p><h4>${formatCurrency(metrics.monthlyRevenue || 1368)}</h4><span class="muted">Projected payout</span></article>
        </div>
        <div class="content-grid two-up">
          <article class="panel-card">
            <div class="panel-head"><h4>Artist profile summary</h4><span class="pill">Verified</span></div>
            <ul class="stack-list">
              <li><strong>${escapeHtml(artist.name || 'Ava Lane')}</strong><br><span class="muted">${escapeHtml(artist.bio || 'Independent artist focused on global digital releases and premium brand growth.')}</span></li>
              <li><strong>${escapeHtml(metrics.totalReleases || 6)} total releases</strong><br><span class="muted">${escapeHtml(metrics.singles || 3)} singles · ${escapeHtml(metrics.albums || 1)} album · ${escapeHtml(metrics.eps || 2)} EPs</span></li>
              <li><strong>${escapeHtml(metrics.scheduledReleases || 2)} scheduled</strong><br><span class="muted">${escapeHtml(metrics.pendingReleases || 1)} pending · ${escapeHtml(metrics.approvedReleases || 4)} approved · ${escapeHtml(metrics.rejectedReleases || 0)} rejected · ${escapeHtml(metrics.liveReleases || 3)} live</span></li>
            </ul>
          </article>
          <article class="panel-card">
            <div class="panel-head"><h4>Quick actions</h4><a href="/dashboard/upload">Open uploads</a></div>
            <div class="chip-row">
              <a class="pill" href="/dashboard/upload">Submit release</a>
              <a class="pill" href="/dashboard/revenue">View revenue</a>
              <a class="pill" href="/dashboard/support">Get help</a>
            </div>
            <ul class="stack-list">
              <li><strong>Support shortcut</strong><br><span class="muted">Open the latest admin ticket or start a new one in seconds.</span></li>
              <li><strong>Upcoming releases</strong><br><span class="muted">Neon Skyline goes live on 2026-08-12.</span></li>
            </ul>
          </article>
        </div>
        <div class="content-grid two-up">
          <article class="panel-card">
            <div class="panel-head"><h4>Revenue summary</h4><a href="/dashboard/revenue">Open revenue</a></div>
            <div class="chart-card svg-card">
              <svg viewBox="0 0 260 140" class="chart-svg" role="img" aria-label="Revenue trend chart">
                <line x1="20" y1="120" x2="240" y2="120" class="axis" />
                <line x1="20" y1="20" x2="20" y2="120" class="axis" />
                <path d="M20 96 L60 84 L100 74 L140 64 L180 48 L220 34 L240 24" class="series" />
              </svg>
            </div>
            <ul class="stack-list">
              <li><strong>${formatCurrency(metrics.revenue || 3800)}</strong><br><span class="muted">Streaming and publishing revenue for the period.</span></li>
            </ul>
          </article>
          <article class="panel-card">
            <div class="panel-head"><h4>Recent activity timeline</h4><a href="/dashboard/notifications">View all</a></div>
            <ul class="timeline-list">
              ${activity.map((item) => `<li><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.time)}</span><p>${escapeHtml(item.detail)}</p></li>`).join('')}
            </ul>
          </article>
        </div>
        <div class="content-grid two-up">
          <article class="panel-card">
            <div class="panel-head"><h4>Notifications</h4><a href="/dashboard/notifications">Open inbox</a></div>
            <ul class="stack-list">
              ${notifications.map((item) => `<li><strong>${escapeHtml(item.title)}</strong><br><span class="muted">${escapeHtml(item.detail)}</span></li>`).join('')}
            </ul>
          </article>
          <article class="panel-card">
            <div class="panel-head"><h4>Recent withdrawal requests</h4><a href="/dashboard/withdrawals">Manage</a></div>
            <ul class="stack-list">
              ${withdrawals.map((item) => `<li><strong>${formatCurrency(item.amount)}</strong><br><span class="muted">${escapeHtml(item.status)} · ${escapeHtml(item.date)}</span></li>`).join('')}
            </ul>
          </article>
        </div>
        <article class="panel-card">
          <div class="panel-head"><h4>Upcoming releases</h4><span class="pill">Release calendar</span></div>
          <div class="table-card">
            <table>
              <thead><tr><th>Title</th><th>Status</th><th>Release date</th></tr></thead>
              <tbody>
                ${releases.slice(0, 3).map((release) => `<tr><td>${escapeHtml(release.title)}</td><td>${statusBadge(release.status)}</td><td>${escapeHtml(release.releaseDate)}</td></tr>`).join('')}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    `;
  }

  

  function renderReleases(data) {
    const releases = data.releases || [];
    return `
      <section class="page-shell">
        <div class="page-toolbar">
          <div><p class="eyebrow">Release management</p><h3>Lifecycle overview</h3></div>
          <a class="primary-button" href="/dashboard/upload">Create release</a>
        </div>
        <div class="content-grid two-up">
          <article class="panel-card">
            <div class="panel-head"><h4>Search and filters</h4><span class="pill">Release control</span></div>
            <div class="form-grid">
              <label>Search<input value="Midnight"></label>
              <label>Status<select><option>All statuses</option><option>Approved</option><option>Pending</option><option>Live</option></select></label>
              <label>Sort<select><option>Most recent</option><option>Highest revenue</option><option>Most streams</option></select></label>
            </div>
          </article>
          <article class="panel-card">
            <div class="panel-head"><h4>Release health</h4><span class="pill">Fast review</span></div>
            <ul class="stack-list">
              <li><strong>Distribution status</strong><br><span class="muted">Spotify, Apple Music, Deezer and YouTube Music are configured.</span></li>
              <li><strong>Review status</strong><br><span class="muted">Metadata review is complete and legal checks passed.</span></li>
            </ul>
          </article>
        </div>
        <article class="panel-card">
          <div class="panel-head"><h4>Release inventory</h4><span class="pill">Professional operations</span></div>
          <div class="table-card">
            <table>
              <thead><tr><th>Artwork</th><th>Title</th><th>Artist</th><th>Release date</th><th>Genre</th><th>Status</th><th>Revenue</th><th>Streams</th><th>Action</th></tr></thead>
              <tbody>
                ${releases.map((item) => `<tr><td>${escapeHtml(item.artwork || 'Cover')}</td><td>${escapeHtml(item.title)}</td><td>${escapeHtml(item.artist)}</td><td>${escapeHtml(item.releaseDate)}</td><td>${escapeHtml(item.genre)}</td><td>${statusBadge(item.status)}</td><td>${formatCurrency(item.revenue || 0)}</td><td>${Number(item.streams || 0).toLocaleString()}</td><td><a href="/dashboard/analytics">View</a></td></tr>`).join('')}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    `;
  }

  function renderAnalytics(data) {
    const series = data.series || [];
    const countries = data.countries || [];
    const platforms = data.platforms || [];
    const linePoints = series.map((point, index) => `${40 + index * 36} ${130 - point.value / 6}`).join(' ');
    return `
      <section class="page-shell">
        <div class="page-toolbar"><div><p class="eyebrow">Performance</p><h3>Analytics</h3></div><button class="ghost-button" type="button">Filter by range</button></div>
        <div class="content-grid two-up">
          <article class="panel-card">
            <div class="panel-head"><h4>Revenue and streams over time</h4><span class="pill">Live intelligence</span></div>
            <div class="svg-card">
              <svg viewBox="0 0 260 140" class="chart-svg" role="img" aria-label="Revenue and streams trend chart">
                <line x1="20" y1="120" x2="240" y2="120" class="axis" />
                <line x1="20" y1="20" x2="20" y2="120" class="axis" />
                <polyline points="${linePoints}" class="series" />
              </svg>
              <div class="legend-list">
                <span class="legend-chip"><i class="dot revenue"></i>Revenue</span>
                <span class="legend-chip"><i class="dot streams"></i>Streams</span>
              </div>
            </div>
          </article>
          <article class="panel-card">
            <div class="panel-head"><h4>Top tracks</h4><span class="pill">Best performers</span></div>
            <ul class="stack-list">
              ${(data.topTracks || []).map((track) => `<li><strong>${escapeHtml(track.title)}</strong><br><span class="muted">${escapeHtml(track.metric)} · ${escapeHtml(track.growth)}</span></li>`).join('')}
            </ul>
          </article>
        </div>
        <div class="content-grid two-up">
          <article class="panel-card">
            <div class="panel-head"><h4>Countries</h4><span class="pill">Top territories</span></div>
            <div class="table-card">
              <table><thead><tr><th>Country</th><th>Streams</th><th>Revenue</th></tr></thead><tbody>${countries.map((country) => `<tr><td>${escapeHtml(country.country)}</td><td>${Number(country.streams).toLocaleString()}</td><td>${formatCurrency(country.revenue)}</td></tr>`).join('')}</tbody></table>
            </div>
          </article>
          <article class="panel-card">
            <div class="panel-head"><h4>Platforms</h4><span class="pill">Distribution mix</span></div>
            <ul class="stack-list">${platforms.map((platform) => `<li><strong>${escapeHtml(platform.name)}</strong><br><span class="muted">${Number(platform.value).toLocaleString()} listens · ${formatCurrency(platform.revenue)}</span></li>`).join('')}</ul>
          </article>
        </div>
      </section>
    `;
  }

  function renderRevenue(data) {
    const summary = data.summary || {};
    const transactions = data.transactions || [];
    return `
      <section class="page-shell">
        <div class="page-toolbar"><div><p class="eyebrow">Earnings</p><h3>Revenue</h3></div><button class="ghost-button" type="button">Export report</button></div>
        <div class="kpi-grid">
          <article class="kpi-card"><p class="label">Current balance</p><h4>${formatCurrency(summary.balance || 21340)}</h4><span class="muted">Available for withdrawal</span></article>
          <article class="kpi-card"><p class="label">Pending balance</p><h4>${formatCurrency(summary.pendingBalance || 4800)}</h4><span class="muted">Awaiting settlement</span></article>
          <article class="kpi-card"><p class="label">Monthly revenue</p><h4>${formatCurrency(summary.monthlyRevenue || 1368)}</h4><span class="muted">Latest month</span></article>
          <article class="kpi-card"><p class="label">Lifetime revenue</p><h4>${formatCurrency(summary.lifetimeRevenue || 182760)}</h4><span class="muted">All-time</span></article>
        </div>
        <div class="content-grid two-up">
          <article class="panel-card">
            <div class="panel-head"><h4>Revenue by release</h4><span class="pill">Performance</span></div>
            <ul class="stack-list">${(data.byRelease || []).map((row) => `<li><strong>${escapeHtml(row.title)}</strong><br><span class="muted">${formatCurrency(row.revenue)} · ${Number(row.streams).toLocaleString()} streams</span></li>`).join('')}</ul>
          </article>
          <article class="panel-card">
            <div class="panel-head"><h4>Revenue history</h4><span class="pill">Forecast</span></div>
            <div class="table-card"><table><thead><tr><th>Period</th><th>Amount</th></tr></thead><tbody>${(data.history || []).map((row) => `<tr><td>${escapeHtml(row.period)}</td><td>${formatCurrency(row.amount)}</td></tr>`).join('')}</tbody></table></div>
          </article>
        </div>
        <article class="panel-card">
          <div class="panel-head"><h4>Transaction history</h4><span class="pill">Settlement ledger</span></div>
          <div class="table-card"><table><thead><tr><th>Date</th><th>Type</th><th>Source</th><th>Status</th><th>Amount</th></tr></thead><tbody>${transactions.map((item) => `<tr><td>${escapeHtml(item.date)}</td><td>${escapeHtml(item.type)}</td><td>${escapeHtml(item.source)}</td><td>${statusBadge(item.status)}</td><td>${formatCurrency(item.amount)}</td></tr>`).join('')}</tbody></table></div>
        </article>
      </section>
    `;
  }

  function renderBalance(data) {
    const balances = data.balances || [];
    return `
      <section class="page-shell">
        <div class="page-toolbar"><div><p class="eyebrow">Wallet</p><h3>Balance</h3></div><a class="primary-button" href="/dashboard/withdrawals">Request payout</a></div>
        <div class="kpi-grid">${balances.map((item) => `<article class="kpi-card"><p class="label">${escapeHtml(item.label)}</p><h4>${escapeHtml(item.value)}</h4><span class="muted">${escapeHtml(item.note)}</span></article>`).join('')}</div>
        <article class="panel-card"><div class="panel-head"><h4>Ledger</h4><span class="pill">History</span></div><ul class="stack-list">${(data.ledger || []).map((entry) => `<li><strong>${escapeHtml(entry.title)}</strong><br><span class="muted">${escapeHtml(entry.detail)}</span></li>`).join('')}</ul></article>
      </section>
    `;
  }

  function renderWithdrawals(data) {
    const history = data.history || [];
    return `
      <section class="page-shell">
        <div class="page-toolbar"><div><p class="eyebrow">Payouts</p><h3>Withdrawals</h3></div><button class="ghost-button" type="button">Add note</button></div>
        <div class="notice-banner">
          <div>
            <p class="eyebrow">Processing notice</p>
            <strong>Withdrawal requests are processed within 24–48 hours.</strong>
          </div>
          <div class="pill">Funds are deducted only after admin approval.</div>
        </div>
        <div class="content-grid two-up">
          <article class="panel-card">
            <div class="panel-head"><h4>Withdrawal request form</h4><span class="pill">Approval workflow</span></div>
            <form class="form-grid" id="withdrawalForm">
              <label>Withdrawal amount<input type="number" name="amount" value="2400"></label>
              <label>Payment method<select name="paymentMethod"><option>Bank transfer</option><option>PayPal</option><option>Wire</option></select></label>
              <label>Bank details<input name="bankDetails" value="HSBC • 01234567"></label>
              <label>Reference number<input name="reference" value="W-2048"></label>
              <div class="form-actions full-span"><button class="primary-button" type="submit">Submit withdrawal</button></div>
              <div class="full-span form-status" id="withdrawalStatus">Pending review with admin operations.</div>
            </form>
          </article>
          <article class="panel-card">
            <div class="panel-head"><h4>Pending and completed withdrawals</h4><span class="pill">Status timeline</span></div>
            <ul class="stack-list">${history.map((item) => `<li><strong>${escapeHtml(item.amount)}</strong><br><span class="muted">${escapeHtml(item.status)} · ${escapeHtml(item.date)}</span></li>`).join('')}</ul>
          </article>
        </div>
        <article class="panel-card">
          <div class="panel-head"><h4>Withdrawal history</h4><span class="pill">Operations ledger</span></div>
          <div class="table-card"><table><thead><tr><th>Date</th><th>Amount</th><th>Status</th><th>Expected processing</th></tr></thead><tbody>${(data.historyDetailed || []).map((item) => `<tr><td>${escapeHtml(item.date)}</td><td>${escapeHtml(item.amount)}</td><td>${statusBadge(item.status)}</td><td>${escapeHtml(item.processing)}</td></tr>`).join('')}</tbody></table></div>
        </article>
      </section>
    `;
  }

  function renderSupport(data) {
    const tickets = data.tickets || [];
    return `
      <section class="page-shell">
        <div class="page-toolbar"><div><p class="eyebrow">Artist support</p><h3>Support Center</h3></div><button class="primary-button" type="button">New ticket</button></div>
        <div class="content-grid two-up">
          <article class="panel-card">
            <div class="panel-head"><h4>Open cases</h4><span class="pill">Priority routing</span></div>
            <div class="table-card"><table><thead><tr><th>Ticket</th><th>Category</th><th>Priority</th><th>Status</th></tr></thead><tbody>${tickets.map((ticket) => `<tr><td>${escapeHtml(ticket.number)}</td><td>${escapeHtml(ticket.category)}</td><td>${escapeHtml(ticket.priority)}</td><td>${statusBadge(ticket.status)}</td></tr>`).join('')}</tbody></table></div>
          </article>
          <article class="panel-card">
            <div class="panel-head"><h4>Conversation</h4><span class="pill">Admin only</span></div>
            <ul class="stack-list">
              ${(data.conversation || []).map((entry) => `<li><strong>${escapeHtml(entry.author)}</strong><br><span class="muted">${escapeHtml(entry.message)}</span></li>`).join('')}
            </ul>
          </article>
        </div>
      </section>
    `;
  }

  function renderMessages(data) {
    const threads = data.threads || [];
    return `
      <section class="page-shell">
        <div class="page-toolbar"><div><p class="eyebrow">Support chat</p><h3>Messages</h3></div><button class="ghost-button" type="button">Search</button></div>
        <div class="content-grid two-up">
          <article class="panel-card">
            <div class="panel-head"><h4>Administrator conversations</h4><span class="pill">Unread</span></div>
            <ul class="stack-list">${threads.map((thread) => `<li><strong>${escapeHtml(thread.author)}</strong><br><span class="muted">${escapeHtml(thread.preview)}</span></li>`).join('')}</ul>
          </article>
          <article class="panel-card">
            <div class="panel-head"><h4>Latest update</h4><span class="pill">Live</span></div>
            <div class="empty-state"><h4>${escapeHtml(data.threadNote || 'Release review')}</h4><p>${escapeHtml(data.threadDetail || 'Latest updates are posted here with clear status context.')}</p></div>
          </article>
        </div>
      </section>
    `;
  }

  function renderNotifications(data) {
    const items = data.items || [];
    return `
      <section class="page-shell">
        <div class="page-toolbar"><div><p class="eyebrow">Updates</p><h3>Notifications</h3></div><button class="ghost-button" type="button">Mark all read</button></div>
        <article class="panel-card">
          <div class="panel-head"><h4>Inbox</h4><span class="pill">Priority sorted</span></div>
          <ul class="stack-list">${items.map((row) => `<li><strong>${escapeHtml(row.title)}</strong><br><span class="muted">${escapeHtml(row.detail)} · ${escapeHtml(row.category)}</span></li>`).join('')}</ul>
        </article>
      </section>
    `;
  }

  function renderProfile(data) {
    const persisted = loadPaymentMethods();
    const methods = persisted || data.paymentMethods || [
      { method: 'Bank Transfer', account: 'HSBC • 01234567', default: true },
      { method: 'Mobile Money', account: 'MTN • 055 123 4567', default: false },
      { method: 'PayPal', account: 'ava@msa.company', default: false }
    ];
    return `
      <section class="page-shell">
        <div class="content-grid two-up">
          <article class="panel-card"><div class="panel-head"><h4>Identity</h4><span class="pill">Verified</span></div><ul class="stack-list"><li><strong>${escapeHtml(data.name || 'Ava Lane')}</strong><br><span class="muted">${escapeHtml(data.stageName || 'Artist')}</span></li><li><strong>${escapeHtml(data.email || 'ava@msa.company')}</strong><br><span class="muted">${escapeHtml(data.phone || '+233 55 123 4567')}</span></li><li><strong>${escapeHtml(data.country || 'Ghana')}</strong><br><span class="muted">${escapeHtml(data.city || 'Accra')}</span></li><li><strong>Biography</strong><br><span class="muted">${escapeHtml(data.biography || 'Independent artist building a global catalog with premium release and royalty management.')}</span></li></ul></article>
          <article class="panel-card"><div class="panel-head"><h4>Social links</h4><span class="pill">Connected</span></div><ul class="stack-list">${(data.links || []).map((item) => `<li><strong>${escapeHtml(item.label)}</strong><br><span class="muted">${escapeHtml(item.value)}</span></li>`).join('')}</ul></article>
        </div>
        <div class="content-grid two-up">
          <article class="panel-card">
            <div class="panel-head"><h4>Payment methods</h4><span class="pill">Default-first</span></div>
            <form class="form-grid" id="paymentMethodForm">
              <label>Method<select name="method"><option>Bank Transfer</option><option>Mobile Money</option><option>PayPal</option></select></label>
              <label>Account details<input name="account" placeholder="Enter account details"></label>
              <label class="check-row"><input type="checkbox" name="defaultMethod"> Set as default</label>
              <div class="form-actions full-span"><button class="primary-button" type="submit">Add payment method</button></div>
            </form>
            <ul class="stack-list" id="paymentMethodList">
              ${methods.map((method, index) => `<li class="payment-method-item"><div><strong>${escapeHtml(method.method)}</strong><br><span class="muted">${escapeHtml(method.account)}</span></div><div class="action-group"><button class="ghost-button" type="button" data-action="default" data-index="${index}">${method.default ? 'Default' : 'Set default'}</button><button class="ghost-button" type="button" data-action="edit" data-index="${index}">Edit</button><button class="ghost-button" type="button" data-action="delete" data-index="${index}">Delete</button></div></li>`).join('')}
            </ul>
          </article>
          <article class="panel-card"><div class="panel-head"><h4>Bank and tax</h4><span class="pill">Compliance</span></div><ul class="stack-list"><li><strong>Bank details</strong><br><span class="muted">${escapeHtml(data.bankDetails || 'HSBC • 01234567')}</span></li><li><strong>Tax info</strong><br><span class="muted">${escapeHtml(data.taxInfo || 'Tax ID verified')}</span></li></ul></article>
        </div>
      </section>
    `;
  }

  function renderSettings(data) {
    return `
      <section class="page-shell">
        <div class="page-toolbar"><div><p class="eyebrow">Preferences</p><h3>Settings</h3></div><button class="ghost-button" type="button">Save</button></div>
        <div class="content-grid two-up">
          <article class="panel-card"><div class="panel-head"><h4>Workspace preferences</h4><span class="pill">Personalized</span></div><ul class="stack-list">${(data.preferences || []).map((item) => `<li><strong>${escapeHtml(item.label)}</strong><br><span class="muted">${escapeHtml(item.value)}</span></li>`).join('')}</ul></article>
          <article class="panel-card"><div class="panel-head"><h4>Security</h4><span class="pill">Protected</span></div><ul class="stack-list">${(data.security || []).map((item) => `<li><strong>${escapeHtml(item.label)}</strong><br><span class="muted">${escapeHtml(item.value)}</span></li>`).join('')}</ul></article>
        </div>
        <div class="content-grid two-up">
          <article class="panel-card"><div class="panel-head"><h4>Connected accounts</h4><span class="pill">Integrations</span></div><ul class="stack-list">${(data.connectedAccounts || []).map((item) => `<li><strong>${escapeHtml(item.name)}</strong><br><span class="muted">${escapeHtml(item.status)}</span></li>`).join('')}</ul></article>
          <article class="panel-card"><div class="panel-head"><h4>Session history</h4><span class="pill">Audit</span></div><ul class="stack-list">${(data.sessions || []).map((item) => `<li><strong>${escapeHtml(item.device)}</strong><br><span class="muted">${escapeHtml(item.location)} · ${escapeHtml(item.time)}</span></li>`).join('')}</ul></article>
        </div>
      </section>
    `;
  }

  function renderHelp(data) {
    return `
      <section class="page-shell">
        <div class="page-toolbar"><div><p class="eyebrow">Resources</p><h3>Help Center</h3></div><button class="primary-button" type="button">Contact support</button></div>
        <div class="content-grid two-up">
          <article class="panel-card"><div class="panel-head"><h4>FAQ</h4><span class="pill">Quick answers</span></div><ul class="stack-list">${(data.faq || []).map((item) => `<li><strong>${escapeHtml(item.question)}</strong><br><span class="muted">${escapeHtml(item.answer)}</span></li>`).join('')}</ul></article>
          <article class="panel-card"><div class="panel-head"><h4>Guides</h4><span class="pill">Reference</span></div><ul class="stack-list">${(data.guides || []).map((item) => `<li><strong>${escapeHtml(item.title)}</strong><br><span class="muted">${escapeHtml(item.detail)}</span></li>`).join('')}</ul></article>
        </div>
      </section>
    `;
  }

  function renderPage(page, data) {
    if (!pageContent) return;
    const renderers = {
      dashboard: renderDashboard,
      upload: renderUpload,
      releases: renderReleases,
      analytics: renderAnalytics,
      revenue: renderRevenue,
      balance: renderBalance,
      withdrawals: renderWithdrawals,
      support: renderSupport,
      messages: renderMessages,
      notifications: renderNotifications,
      profile: renderProfile,
      settings: renderSettings,
      help: renderHelp
    };

    const renderer = renderers[page] || renderDashboard;
    pageContent.innerHTML = renderer(data);
    rewriteDashboardLinks();
  }

  function bindPageInteractions(page) {
    if (page === 'upload') {
      const form = document.getElementById('uploadWizardForm');
      let state = loadUploadWizardState();
      const updateStatus = (message) => {
        const status = document.getElementById('uploadStatus');
        if (status) {
          status.textContent = message;
        }
      };

      const collectWizardValues = () => {
        const values = { ...(loadUploadWizardState().values || {}) };
        if (!form) {
          return values;
        }
        const formData = new FormData(form);
        formData.forEach((value, key) => {
          if (key !== 'selectedPlatforms') {
            values[key] = value;
          }
        });
        values.selectedPlatforms = Array.from(form.querySelectorAll('input[name="selectedPlatforms"]:checked')).map((input) => input.value);
        values.distributeEverywhere = Boolean(form.querySelector('input[name="distributeEverywhere"]')?.checked);
        values.selectSpecificStores = Boolean(form.querySelector('input[name="selectSpecificStores"]')?.checked);
        values.storeSearch = String(form.querySelector('input[name="storeSearch"]')?.value || '');
        values.explicit = Boolean(form.querySelector('input[name="explicit"]')?.checked);
        values.instrumental = Boolean(form.querySelector('input[name="instrumental"]')?.checked);
        return values;
      };

      const saveWizardState = (extraState = {}) => {
        const values = collectWizardValues();
        const nextState = { ...loadUploadWizardState(), values, ...extraState };
        saveUploadWizardState(nextState);
        state = nextState;
        return nextState;
      };

      const rerenderUpload = () => {
        pageContent.innerHTML = renderUpload(currentPageData, loadUploadWizardState());
        bindPageInteractions('upload');
        requestAnimationFrame(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
      };

      function getMissingFieldsForStep(step, values) {
        const missing = [];
        if (!step.fields) return missing;
        step.fields.forEach((f) => {
          if (f.required) {
            const v = values[f.name];
            if (f.type === 'checkbox') {
              // checkbox may be false but still present
              if (v !== true && v !== 'on' && v !== 'true') missing.push(f.label || f.name);
            } else if (!v) {
              missing.push(f.label || f.name);
            }
          }
        });
        return missing;
      }

      if (form) {
        form.addEventListener('input', () => {
          saveWizardState();
        });
        form.addEventListener('change', () => {
          saveWizardState();
        });
      }

      const saveDraftButton = document.getElementById('saveDraft');
      if (saveDraftButton) {
        saveDraftButton.addEventListener('click', () => {
          saveWizardState({ lastMessage: 'Draft saved successfully. You can continue editing later.' });
          updateStatus('Draft saved successfully. You can continue editing later.');
        });
      }

      // stepbar click handling: allow moving to completed or previous steps; lock future steps until prerequisites pass
      const stepButtons = document.querySelectorAll('.wizard-stepbar .wizard-step');
      stepButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
          const idx = Number(btn.getAttribute('data-step-index'));
          const steps = getUploadStepDefinitions();
          const values = state.values || {};
          const previousOk = steps.slice(0, idx).every((s) => validateUploadStep(s.id, values));
          if (!previousOk && idx > (state.currentStep || 1) - 1) {
            const missing = [];
            steps.slice(0, idx).forEach((s) => {
              if (!validateUploadStep(s.id, values)) {
                missing.push(`${s.title}: ${getMissingFieldsForStep(s, values).join(', ')}`);
              }
            });
            updateStatus('Complete required fields before opening this step. ' + (missing.length ? missing.join(' | ') : ''));
            return;
          }
          saveWizardState({ currentStep: idx + 1, lastMessage: 'Navigated to ' + steps[idx].title });
          rerenderUpload();
        });
      });

      const backButton = document.getElementById('wizardBack');
      if (backButton) {
        backButton.addEventListener('click', () => {
          saveWizardState({ currentStep: Math.max(1, (loadUploadWizardState().currentStep || 1) - 1), lastMessage: 'Moved to the previous step.' });
          rerenderUpload();
        });
      }

      const nextButton = document.getElementById('wizardNext');
      if (nextButton) {
        nextButton.addEventListener('click', () => {
          const values = collectWizardValues();
          const currentStep = getUploadStepDefinitions()[Math.max(0, (loadUploadWizardState().currentStep || 1) - 1)];
          const valid = validateUploadStep(currentStep.id, values);
          if (!valid) {
            const missing = getMissingFieldsForStep(currentStep, values);
            updateStatus(`Please complete the required fields in ${currentStep.title.toLowerCase()}. ${missing.length ? 'Missing: ' + missing.join(', ') : ''}`);
            return;
          }
          saveWizardState({ currentStep: Math.min(getUploadStepDefinitions().length, (loadUploadWizardState().currentStep || 1) + 1), lastMessage: `${currentStep.title} is complete. Moving to the next step.` });
          rerenderUpload();
        });
      }

      const submitButton = document.getElementById('submitReview');
      if (submitButton) {
        submitButton.addEventListener('click', () => {
          const steps = getUploadStepDefinitions();
          const reviewReady = steps.slice(0, -1).every((step) => validateUploadStep(step.id, state.values || {}));
          if (!reviewReady) {
            const missing = [];
            steps.slice(0, -1).forEach((step) => {
              if (!validateUploadStep(step.id, state.values || {})) {
                missing.push(`${step.title}: ${getMissingFieldsForStep(step, state.values || {}).join(', ')}`);
              }
            });
            updateStatus('All required sections must pass validation before submission. ' + (missing.length ? missing.join(' | ') : ''));
            return;
          }
          saveWizardState({ lastMessage: 'Release submitted for review and queued for validation.' });
          updateStatus('Release submitted for review and queued for validation.');
        });
      }

      // file input handlers for artwork and audio uploads
      const artworkInput = document.getElementById('artworkFileInput');
      if (artworkInput) {
        artworkInput.addEventListener('change', async (e) => {
          const file = e.target.files && e.target.files[0];
          if (!file) return;
          const values = collectWizardValues();
          values.artworkFileName = file.name;
          values.artworkFileSize = `${Math.round(file.size / 1024)} KB`;
          values.artworkPreviewUrl = URL.createObjectURL(file);
          values.artworkValidationStatus = 'Pending';
          values.artworkValidationMessage = 'Validating artwork file…';
          saveWizardState({ lastMessage: 'Uploading artwork...' });
          const image = new Image();
          image.onload = () => {
            values.artworkResolution = `${image.naturalWidth}×${image.naturalHeight}`;
            const meetsResolution = image.naturalWidth >= 3000 && image.naturalHeight >= 3000;
            values.artworkValidationStatus = meetsResolution ? 'Valid' : 'Invalid';
            values.artworkValidationMessage = meetsResolution ? 'Artwork meets recommended platform resolution.' : 'Artwork should be at least 3000×3000 px.';
            saveWizardState({ lastMessage: meetsResolution ? 'Artwork validated successfully.' : 'Artwork needs a higher resolution image.' });
            rerenderUpload();
          };
          image.onerror = () => {
            values.artworkValidationStatus = 'Invalid';
            values.artworkValidationMessage = 'The uploaded artwork file could not be previewed.';
            saveWizardState({ lastMessage: 'Artwork upload failed.' });
            rerenderUpload();
          };
          image.src = values.artworkPreviewUrl;
        });
      }

      const addTrackInput = document.getElementById('addTrackInput');
      const addTrackButton = document.getElementById('addTrackButton');
      if (addTrackButton && addTrackInput) {
        addTrackButton.addEventListener('click', () => {
          addTrackInput.click();
        });
      }

      if (addTrackInput) {
        addTrackInput.addEventListener('change', async (e) => {
          const file = e.target.files && e.target.files[0];
          if (!file) return;
          const values = collectWizardValues();
          const tracks = normalizeAudioTracks(values);
          const isMulti = isMultiTrackRelease(values);
          const trackIndex = isMulti ? tracks.length : 0;
          const newTrack = createTrackEntry(trackIndex, {
            audioFileName: file.name,
            trackTitle: tracks[trackIndex]?.trackTitle || file.name.replace(/\.[^/.]+$/, ''),
            audioValidation: 'Pending',
            previewUrl: URL.createObjectURL(file),
            trackDuration: '0:00'
          });
          if (!isMulti) {
            tracks[0] = newTrack;
          } else {
            tracks.push(newTrack);
          }
          values.audioTracks = tracks;
          saveWizardState({ lastMessage: 'Audio file added. Extracting metadata…' });
          const audio = new Audio(newTrack.previewUrl);
          audio.addEventListener('loadedmetadata', () => {
            newTrack.trackDuration = formatTrackDuration(audio.duration);
            newTrack.audioValidation = 'Approved';
            values.audioTracks = tracks;
            saveWizardState({ lastMessage: 'Audio uploaded and ready for review.' });
            rerenderUpload();
          });
          audio.addEventListener('error', () => {
            newTrack.audioValidation = 'Invalid';
            saveWizardState({ lastMessage: 'Audio file could not be read.' });
            rerenderUpload();
          });
          rerenderUpload();
        });
      }

      const artworkActionButtons = pageContent.querySelectorAll('[data-artwork-action]');
      artworkActionButtons.forEach((button) => {
        button.addEventListener('click', () => {
          const values = collectWizardValues();
          const action = button.getAttribute('data-artwork-action');
          if (action === 'remove') {
            values.artworkFileName = '';
            values.artworkPreviewUrl = '';
            values.artworkValidationStatus = 'Pending';
            values.artworkValidationMessage = 'Upload cover art to meet platform requirements.';
            values.artworkResolution = '';
            saveWizardState({ values, lastMessage: 'Artwork removed. Please upload a replacement.' });
            rerenderUpload();
            return;
          }
          if (action === 'replace' && artworkInput) {
            artworkInput.click();
          }
        });
      });

      const trackButtons = pageContent.querySelectorAll('[data-track-edit], [data-track-remove], [data-track-move]');
      trackButtons.forEach((button) => {
        button.addEventListener('click', () => {
          const values = collectWizardValues();
          const trackId = button.getAttribute('data-track-id') || button.getAttribute('data-track-edit');
          if (button.hasAttribute('data-track-edit')) {
            values.editingTrackId = trackId;
            saveWizardState({ values, lastMessage: 'Opening track editor.' });
            rerenderUpload();
            return;
          }
          if (button.hasAttribute('data-track-remove')) {
            const remaining = normalizeAudioTracks(values).filter((track) => track.id !== trackId);
            values.audioTracks = remaining.length ? remaining : [createTrackEntry(0, {})];
            saveWizardState({ values, lastMessage: 'Track removed from upload list.' });
            rerenderUpload();
            return;
          }
          if (button.hasAttribute('data-track-move')) {
            const direction = button.getAttribute('data-track-move');
            const tracks = normalizeAudioTracks(values);
            const index = tracks.findIndex((track) => track.id === trackId);
            if (index === -1) return;
            const target = direction === 'up' ? index - 1 : index + 1;
            if (target < 0 || target >= tracks.length) return;
            [tracks[index], tracks[target]] = [tracks[target], tracks[index]];
            values.audioTracks = tracks;
            saveWizardState({ values, lastMessage: 'Track order updated.' });
            rerenderUpload();
          }
        });
      });

      const trackEditorClose = pageContent.querySelector('[data-track-editor-close]');
      const trackEditorCancel = pageContent.querySelector('[data-track-editor-cancel]');
      if (trackEditorClose) {
        trackEditorClose.addEventListener('click', () => {
          const values = collectWizardValues();
          values.editingTrackId = '';
          saveWizardState({ values, lastMessage: 'Closed track editor.' });
          rerenderUpload();
        });
      }
      if (trackEditorCancel) {
        trackEditorCancel.addEventListener('click', () => {
          const values = collectWizardValues();
          values.editingTrackId = '';
          saveWizardState({ values, lastMessage: 'Track edits canceled.' });
          rerenderUpload();
        });
      }

      const trackEditorForm = document.getElementById('trackEditorForm');
      if (trackEditorForm) {
        trackEditorForm.addEventListener('submit', (event) => {
          event.preventDefault();
          const values = collectWizardValues();
          const editingTrackId = values.editingTrackId;
          if (!editingTrackId) return;
          const track = findAudioTrack(values, editingTrackId);
          if (!track) return;
          const trackData = new FormData(trackEditorForm);
          const updated = { ...track };
          trackData.forEach((value, key) => {
            if (key === 'explicit') {
              updated.explicit = Boolean(trackEditorForm.querySelector('input[name="explicit"]')?.checked);
            } else {
              updated[key] = value;
            }
          });
          const tracks = normalizeAudioTracks(values).map((item) => item.id === editingTrackId ? updated : item);
          values.audioTracks = tracks;
          values.editingTrackId = '';
          saveWizardState({ values, lastMessage: 'Track metadata updated.' });
          rerenderUpload();
        });
      }

      const removeStoreButtons = pageContent.querySelectorAll('[data-remove-store]');
      removeStoreButtons.forEach((button) => {
        button.addEventListener('click', () => {
          const values = collectWizardValues();
          const store = button.getAttribute('data-remove-store');
          values.selectedPlatforms = (values.selectedPlatforms || []).filter((item) => item !== store);
          saveWizardState({ values, lastMessage: `${store} removed from distribution.` });
          rerenderUpload();
        });
      });

      const jumpButtons = form?.querySelectorAll('[data-jump-step]');
      jumpButtons?.forEach((button) => {
        button.addEventListener('click', () => {
          const targetStep = Number(button.getAttribute('data-jump-step'));
          saveWizardState({ currentStep: targetStep, lastMessage: 'You can update the selected section before submission.' });
          rerenderUpload();
        });
      });
    }

    const withdrawalForm = document.getElementById('withdrawalForm');
    if (withdrawalForm) {
        withdrawalForm.addEventListener('submit', async (event) => {
          event.preventDefault();
          const formData = new FormData(withdrawalForm);
          const amount = Number(formData.get('amount')) || 0;
          try {
            const resp = await fetch('/api/withdrawals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount }) });
            const json = await resp.json();
            if (json && json.withdrawal) {
              const status = document.getElementById('withdrawalStatus');
              if (status) status.textContent = 'Withdrawal request captured and routed for approval.';
              // re-fetch or update local state
              currentPageData.pendingWithdrawals = currentPageData.pendingWithdrawals || [];
              currentPageData.pendingWithdrawals.unshift(json.withdrawal);
              pageContent.innerHTML = renderRevenue(currentPageData || {});
              bindPageInteractions('revenue');
            }
          } catch (err) {
            const status = document.getElementById('withdrawalStatus');
            if (status) status.textContent = 'Failed to submit withdrawal. Try again.';
          }
        });
    }

    const paymentMethodForm = document.getElementById('paymentMethodForm');
    if (paymentMethodForm) {
      paymentMethodForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const formData = new FormData(paymentMethodForm);
        const method = formData.get('method');
        const account = formData.get('account');
        const isDefault = Boolean(formData.get('defaultMethod'));
        // send to server
        (async () => {
          try {
            const resp = await fetch('/api/profile/payment-methods', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'add', method, account, default: isDefault }) });
            const json = await resp.json();
            if (json && json.methods) {
              if (currentPageData) currentPageData.paymentMethods = json.methods;
              savePaymentMethods(json.methods);
              pageContent.innerHTML = renderProfile(currentPageData || {});
              bindPageInteractions('profile');
            }
          } catch (err) {
            // fallback to client-only
            const methods = currentPageData?.paymentMethods || [];
            const nextMethods = [...methods, { method, account, default: isDefault || methods.length === 0 }];
            if (isDefault) nextMethods.forEach((entry) => { entry.default = entry.method === method && entry.account === account; });
            if (currentPageData) currentPageData.paymentMethods = nextMethods;
            savePaymentMethods(nextMethods);
            pageContent.innerHTML = renderProfile(currentPageData || {});
            bindPageInteractions('profile');
          }
        })();
      });
    }

    const paymentMethodList = document.getElementById('paymentMethodList');
    if (paymentMethodList) {
      paymentMethodList.querySelectorAll('[data-action]').forEach((button) => {
        button.addEventListener('click', () => {
          const action = button.getAttribute('data-action');
          const index = Number(button.getAttribute('data-index'));
          const methods = currentPageData?.paymentMethods || [];
          if (action === 'delete' || action === 'default') {
            (async () => {
              try {
                const resp = await fetch('/api/profile/payment-methods', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(action === 'delete' ? { action: 'delete', index } : { action: 'set-default', index }) });
                const json = await resp.json();
                if (json && json.methods) {
                  if (currentPageData) currentPageData.paymentMethods = json.methods;
                  savePaymentMethods(json.methods);
                  pageContent.innerHTML = renderProfile(currentPageData || {});
                  bindPageInteractions('profile');
                  return;
                }
              } catch (err) {
                // fallback to client-only
              }
              if (action === 'delete') {
                const nextMethods = methods.filter((_, itemIndex) => itemIndex !== index);
                if (currentPageData) currentPageData.paymentMethods = nextMethods;
                savePaymentMethods(nextMethods);
              }
              if (action === 'default') {
                const nextMethods = methods.map((method, itemIndex) => ({ ...method, default: itemIndex === index }));
                if (currentPageData) currentPageData.paymentMethods = nextMethods;
                savePaymentMethods(nextMethods);
              }
              pageContent.innerHTML = renderProfile(currentPageData || {});
              bindPageInteractions('profile');
            })();
            return;
          }
          pageContent.innerHTML = renderProfile(currentPageData || {});
          bindPageInteractions('profile');
        });
      });
    }

    rewriteDashboardLinks();
  }

  async function init() {
    setActiveLink();
    bindShellEvents();
    if (pageContent) {
      pageContent.innerHTML = loadingMarkup();
    }

    try {
      const payload = await loadPageData(pageKey);
      currentPageData = payload;
      renderPage(pageKey, payload);
      bindPageInteractions(pageKey);
    } catch (error) {
      if (pageContent) {
        pageContent.innerHTML = errorMarkup(error.message);
        rewriteDashboardLinks();
      }
    }
  }

  init();
})();
