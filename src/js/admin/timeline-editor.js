/**
 * TIMELINE EDITOR - Main Controller
 * Video editor-style event timeline with multi-track support
 */

const TimelineEditor = {
  // All events (each event can have bars on multiple tracks)
  events: [],

  // Currently selected event
  selectedEventId: null,

  // Zoom level (1 = 100%)
  zoom: 1,
  minZoom: 0.5,
  maxZoom: 2,

  // Column width at 100% zoom (fallback)
  baseColumnWidth: 80,

  // Next color to assign
  nextColorIndex: 1,
  maxColors: 10,

  // Undo state (simple - last action only)
  lastState: null,

  // Pending event creation
  pendingEvent: null,

  // Cached column width (updated on render)
  cachedColumnWidth: null,

  // Track definitions
  TRACKS: {
    price: {
      name: 'Price',
      icon: '💵',
      effects: [
        { key: 'lme', label: 'LME Spot', unit: '%', min: -50, max: 50 },
        { key: 'comex', label: 'COMEX Spot', unit: '%', min: -50, max: 50 }
      ]
    },
    supply: {
      name: 'Supply',
      icon: '📦',
      effects: [
        { key: 'supplier', label: 'Supplier', type: 'select', options: ['CALLAO', 'ANTOFAGASTA', 'BOTH'] },
        { key: 'tonnage', label: 'Tonnage', unit: '%', min: -100, max: 100 },
        { key: 'supplierPremium', label: 'Supplier Premium', unit: '$/MT', min: -50, max: 100 },
        { key: 'regionalPremium', label: 'Regional Premium', unit: '$/MT', min: -50, max: 100 }
      ]
    },
    demand: {
      name: 'Demand',
      icon: '🏭',
      effects: [
        { key: 'buyer', label: 'Buyer', type: 'select', options: ['AMERICAS', 'ASIA', 'EUROPE', 'ALL'] },
        { key: 'tonnage', label: 'Tonnage', unit: '%', min: -100, max: 100 },
        { key: 'buyerPremium', label: 'Buyer Premium', unit: '$/MT', min: -50, max: 100 },
        { key: 'regionalPremium', label: 'Regional Premium', unit: '$/MT', min: -50, max: 100 }
      ]
    },
    logistics: {
      name: 'Logistics',
      icon: '🚢',
      effects: [
        { key: 'routes', label: 'Routes', type: 'select', options: ['ALL', 'TO_AMERICAS', 'TO_ASIA', 'TO_EUROPE', 'FROM_CALLAO', 'FROM_ANTOFAGASTA'] },
        { key: 'fobRate', label: 'FOB Rate', unit: '$/MT', min: -50, max: 100 },
        { key: 'travelTime', label: 'Travel Time', unit: 'days', min: -10, max: 30 }
      ]
    },
    financial: {
      name: 'Financial',
      icon: '🏦',
      effects: [
        { key: 'interestRate', label: 'Interest Rate', unit: '%', min: -2, max: 3, step: 0.1 },
        { key: 'locLimit', label: 'LOC Limit', unit: '$', min: -100000, max: 100000, step: 10000 },
        { key: 'margin', label: 'Margin Req.', unit: '$', min: -50000, max: 50000, step: 5000 }
      ]
    },
    news: {
      name: 'News',
      icon: '📰',
      effects: [
        { key: 'headline', label: 'Headline', type: 'text' },
        { key: 'affectsPrice', label: 'Affects Price', type: 'checkbox' },
        { key: 'lme', label: 'LME', unit: '%', min: -5, max: 5, showIf: 'affectsPrice' },
        { key: 'comex', label: 'COMEX', unit: '%', min: -5, max: 5, showIf: 'affectsPrice' },
        { key: 'affectsSupply', label: 'Affects Supply', type: 'checkbox' },
        { key: 'supplyTonnage', label: 'Supply Tonnage', unit: '%', min: -5, max: 5, showIf: 'affectsSupply' },
        { key: 'affectsDemand', label: 'Affects Demand', type: 'checkbox' },
        { key: 'demandTonnage', label: 'Demand Tonnage', unit: '%', min: -5, max: 5, showIf: 'affectsDemand' },
        { key: 'affectsFinancial', label: 'Affects Financial', type: 'checkbox' },
        { key: 'interestRate', label: 'Interest', unit: '%', min: -0.5, max: 0.5, step: 0.1, showIf: 'affectsFinancial' }
      ]
    }
  },

  // Templates
  TEMPLATES: {
    'mine-strike': {
      name: 'Mine Strike',
      tracks: {
        supply: {
          effects: { supplier: 'CALLAO', tonnage: -40, supplierPremium: 25, regionalPremium: 0 }
        },
        price: {
          effects: { lme: 15, comex: 12 }
        },
        news: {
          effects: { headline: 'Labor tensions at mining operations', affectsPrice: true, lme: 3, comex: 2 }
        }
      },
      defaultDuration: 4
    },
    'stimulus': {
      name: 'Stimulus Package',
      tracks: {
        demand: {
          effects: { buyer: 'ASIA', tonnage: 30, buyerPremium: 20, regionalPremium: 0 }
        },
        price: {
          effects: { lme: 12, comex: 10 }
        }
      },
      defaultDuration: 4
    },
    'rate-hike': {
      name: 'Fed Rate Hike',
      tracks: {
        financial: {
          effects: { interestRate: 0.5, locLimit: 0, margin: 0 }
        },
        price: {
          effects: { lme: -5, comex: -4 }
        }
      },
      defaultDuration: 2
    },
    'port-strike': {
      name: 'Port Strike',
      tracks: {
        logistics: {
          effects: { routes: 'ALL', fobRate: 25, travelTime: 7 }
        }
      },
      defaultDuration: 3
    },
    'demand-surge': {
      name: 'Demand Surge',
      tracks: {
        demand: {
          effects: { buyer: 'ALL', tonnage: 25, buyerPremium: 0, regionalPremium: 15 }
        },
        price: {
          effects: { lme: 8, comex: 7 }
        }
      },
      defaultDuration: 3
    }
  },

  // Period labels
  PERIODS: [
    { value: 1, label: 'JAN', sub: 'Early' },
    { value: 2, label: 'JAN', sub: 'Late' },
    { value: 3, label: 'FEB', sub: 'Early' },
    { value: 4, label: 'FEB', sub: 'Late' },
    { value: 5, label: 'MAR', sub: 'Early' },
    { value: 6, label: 'MAR', sub: 'Late' },
    { value: 7, label: 'APR', sub: 'Early' },
    { value: 8, label: 'APR', sub: 'Late' },
    { value: 9, label: 'MAY', sub: 'Early' },
    { value: 10, label: 'MAY', sub: 'Late' },
    { value: 11, label: 'JUN', sub: 'Early' },
    { value: 12, label: 'JUN', sub: 'Late' }
  ],

  /**
   * Initialize the timeline editor
   */
  init() {
    this.renderTimeMarkers();
    this.bindPaletteDrag();
    this.bindTrackDrop();
    this.bindTrackDoubleClick();
    this.bindKeyboard();
    this.bindClickOutside();
    this.bindNameModalEnter();
    this.bindWindowResize();

    console.log('[TimelineEditor] Initialized');
  },

  /**
   * Bind window resize to re-render with correct widths
   */
  bindWindowResize() {
    window.addEventListener('resize', () => {
      this.cachedColumnWidth = null; // Clear cache
      this.renderTimeMarkers();
      this.renderAllBars();
    });
  },

  /**
   * Get the exact width of one period column based on track content
   * @returns {number} Width in pixels
   */
  getPeriodColumnWidth() {
    // Return cached value if available
    if (this.cachedColumnWidth) return this.cachedColumnWidth;

    const trackContent = document.querySelector('.track-content');
    if (!trackContent) {
      return this.baseColumnWidth * this.zoom; // Fallback
    }

    const totalWidth = trackContent.offsetWidth;
    this.cachedColumnWidth = totalWidth / 12; // 12 periods

    return this.cachedColumnWidth;
  },

  /**
   * Convert period number (1-12) to X position
   * @param {number} period - Period number (1-12)
   * @returns {number} X position in pixels (left edge of that period)
   */
  periodToX(period) {
    const columnWidth = this.getPeriodColumnWidth();
    return (period - 1) * columnWidth;
  },

  /**
   * Convert X position to period number (1-12)
   * @param {number} x - X position in pixels
   * @returns {number} Period number (1-12)
   */
  xToPeriod(x) {
    const columnWidth = this.getPeriodColumnWidth();
    const period = Math.floor(x / columnWidth) + 1;
    return Math.max(1, Math.min(12, period));
  },

  /**
   * Snap X position to nearest period boundary
   * @param {number} x - Raw X position
   * @returns {number} Snapped X position (at period boundary)
   */
  snapToNearestPeriod(x) {
    const columnWidth = this.getPeriodColumnWidth();
    const period = Math.round(x / columnWidth);
    return period * columnWidth;
  },

  /**
   * Convert period number to human-readable label
   * @param {number} period - Period number (1-12)
   * @returns {string} Label like "Jan-E" or "Mar-L"
   */
  periodToLabel(period) {
    const p = this.PERIODS.find(p => p.value === period);
    if (!p) return `P${period}`;
    return `${p.label}-${p.sub.charAt(0)}`;
  },

  /**
   * Render time markers (12 columns)
   */
  renderTimeMarkers() {
    const container = document.getElementById('timeMarkers');
    if (!container) return;

    // Clear cache to get fresh measurement
    this.cachedColumnWidth = null;

    // Use flex: 1 for even distribution that matches track content
    container.innerHTML = this.PERIODS.map(p => `
      <div class="time-marker">
        <div class="month">${p.label}</div>
        <div class="period">${p.sub}</div>
      </div>
    `).join('');
  },

  /**
   * Bind palette drag events
   */
  bindPaletteDrag() {
    const items = document.querySelectorAll('.palette-item');

    items.forEach(item => {
      item.addEventListener('dragstart', (e) => {
        const template = item.dataset.template;
        const type = item.dataset.type;

        e.dataTransfer.setData('template', template || '');
        e.dataTransfer.setData('type', type || '');
        e.dataTransfer.effectAllowed = 'copy';
      });
    });
  },

  /**
   * Bind track drop events
   */
  bindTrackDrop() {
    const trackContents = document.querySelectorAll('.track-content');

    trackContents.forEach(track => {
      track.addEventListener('dragover', (e) => {
        e.preventDefault();
        track.classList.add('drag-over');
      });

      track.addEventListener('dragleave', () => {
        track.classList.remove('drag-over');
        track.classList.remove('drag-invalid');
      });

      track.addEventListener('drop', (e) => {
        e.preventDefault();
        track.classList.remove('drag-over');

        const template = e.dataTransfer.getData('template');
        const type = e.dataTransfer.getData('type');
        const trackType = track.dataset.track;

        // Calculate drop position
        const rect = track.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const period = this.xToPeriod(x);

        if (template) {
          this.promptEventName(template, trackType, period, true);
        } else if (type) {
          this.promptEventName(type, trackType, period, false);
        }
      });
    });
  },

  /**
   * Bind double-click on tracks to create event
   */
  bindTrackDoubleClick() {
    const trackContents = document.querySelectorAll('.track-content');

    trackContents.forEach(track => {
      track.addEventListener('dblclick', (e) => {
        if (e.target.classList.contains('event-bar')) return;
        if (e.target.closest('.event-bar')) return;

        const trackType = track.dataset.track;
        const rect = track.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const period = this.xToPeriod(x);

        this.promptEventName(trackType, trackType, period, false);
      });
    });
  },

  /**
   * Prompt for event name
   */
  promptEventName(typeOrTemplate, track, period, isTemplate) {
    this.pendingEvent = {
      typeOrTemplate,
      track,
      period,
      isTemplate
    };

    const modal = document.getElementById('nameModal');
    const input = document.getElementById('eventNameInput');

    // Pre-fill with template name if applicable
    if (isTemplate && this.TEMPLATES[typeOrTemplate]) {
      input.value = this.TEMPLATES[typeOrTemplate].name;
    } else {
      input.value = '';
    }

    modal.classList.add('open');
    input.focus();
    input.select();
  },

  /**
   * Cancel name prompt
   */
  cancelNamePrompt() {
    this.pendingEvent = null;
    document.getElementById('nameModal').classList.remove('open');
  },

  /**
   * Bind Enter key for name modal
   */
  bindNameModalEnter() {
    const input = document.getElementById('eventNameInput');
    if (input) {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.confirmNamePrompt();
        }
      });
    }
  },

  /**
   * Confirm name prompt and create event
   */
  confirmNamePrompt() {
    const name = document.getElementById('eventNameInput').value.trim();
    if (!name) {
      alert('Please enter a name');
      return;
    }

    const { typeOrTemplate, track, period, isTemplate } = this.pendingEvent;

    // Save state for undo
    this.saveUndoState();

    if (isTemplate) {
      this.createFromTemplate(typeOrTemplate, name, period);
    } else {
      this.createEvent(name, track, period);
    }

    this.pendingEvent = null;
    document.getElementById('nameModal').classList.remove('open');
  },

  /**
   * Create event from template
   */
  createFromTemplate(templateKey, name, startPeriod) {
    const template = this.TEMPLATES[templateKey];
    if (!template) return;

    const colorIndex = this.getNextColor();
    const eventId = 'evt-' + Date.now();
    const endPeriod = Math.min(12, startPeriod + template.defaultDuration - 1);

    const event = {
      id: eventId,
      name: name,
      colorIndex: colorIndex,
      startPeriod: startPeriod,
      endPeriod: endPeriod,
      tracks: {}
    };

    // Copy template tracks
    Object.keys(template.tracks).forEach(trackType => {
      event.tracks[trackType] = {
        effects: { ...template.tracks[trackType].effects }
      };
    });

    this.events.push(event);
    this.renderAllBars();
    this.selectEvent(eventId);
    this.updateGraphs();
  },

  /**
   * Create custom event
   */
  createEvent(name, primaryTrack, startPeriod) {
    const colorIndex = this.getNextColor();
    const eventId = 'evt-' + Date.now();

    // Default duration: 2 periods (1 full month = Early + Late)
    // If dropped on a Late period (even number), start from Early of that month
    let adjustedStart = startPeriod;
    let adjustedEnd;

    if (startPeriod % 2 === 0) {
      // Late period - start from Early of the same month
      adjustedStart = startPeriod - 1;
      adjustedEnd = startPeriod;
    } else {
      // Early period - cover the full month (Early + Late)
      adjustedEnd = Math.min(12, startPeriod + 1);
    }

    const event = {
      id: eventId,
      name: name,
      colorIndex: colorIndex,
      startPeriod: adjustedStart,
      endPeriod: adjustedEnd,
      tracks: {
        [primaryTrack]: {
          effects: this.getDefaultEffects(primaryTrack)
        }
      }
    };

    this.events.push(event);
    this.renderAllBars();
    this.selectEvent(eventId);
    this.updateGraphs();
  },

  /**
   * Get default effects for a track type
   */
  getDefaultEffects(trackType) {
    const track = this.TRACKS[trackType];
    if (!track) return {};

    const effects = {};

    track.effects.forEach(effect => {
      if (effect.type === 'select') {
        effects[effect.key] = effect.options[0];
      } else if (effect.type === 'checkbox') {
        effects[effect.key] = false;
      } else if (effect.type === 'text') {
        effects[effect.key] = '';
      } else {
        effects[effect.key] = 0;
      }
    });

    return effects;
  },

  /**
   * Get next color index
   */
  getNextColor() {
    const color = this.nextColorIndex;
    this.nextColorIndex = (this.nextColorIndex % this.maxColors) + 1;
    return color;
  },

  /**
   * Render all event bars on all tracks
   */
  renderAllBars() {
    // Clear all tracks
    document.querySelectorAll('.track-content').forEach(track => {
      track.innerHTML = '';
    });

    // Render each event
    this.events.forEach(event => {
      Object.keys(event.tracks).forEach(trackType => {
        this.renderEventBar(event, trackType);
      });
    });

    // Bind bar events
    this.bindBarEvents();
  },

  /**
   * Render a single event bar on a track
   */
  renderEventBar(event, trackType) {
    const track = document.querySelector(`.track-content[data-track="${trackType}"]`);
    if (!track) return;

    // Use precise column width based on actual track content width
    const columnWidth = this.getPeriodColumnWidth();

    // Calculate EXACT position and width based on periods
    const left = (event.startPeriod - 1) * columnWidth;
    const width = (event.endPeriod - event.startPeriod + 1) * columnWidth;

    // Check if this is the primary track (first one added)
    const trackKeys = Object.keys(event.tracks);
    const isPrimary = trackKeys[0] === trackType;

    const bar = document.createElement('div');
    bar.className = `event-bar ${isPrimary ? '' : 'linked'} ${event.id === this.selectedEventId ? 'selected' : ''}`;
    bar.dataset.eventId = event.id;
    bar.dataset.track = trackType;
    bar.dataset.color = event.colorIndex;

    // Use calc to account for inner margin while maintaining alignment
    bar.style.left = `calc(${left}px + 2px)`;
    bar.style.width = `calc(${width}px - 4px)`;
    bar.style.boxSizing = 'border-box';

    bar.innerHTML = `
      <div class="resize-handle left"></div>
      <span class="event-bar-name">${event.name}</span>
      <div class="resize-handle right"></div>
      <div class="event-bar-toolbar">
        <button onclick="TimelineEditor.editSelectedEvent()" title="Edit">✏️</button>
        <button onclick="TimelineEditor.duplicateSelectedEvent()" title="Duplicate">📋</button>
        <button onclick="TimelineEditor.deleteSelectedEvent()" title="Delete">🗑️</button>
      </div>
    `;

    track.appendChild(bar);
  },

  /**
   * Bind event bar interactions
   */
  bindBarEvents() {
    const bars = document.querySelectorAll('.event-bar');

    bars.forEach(bar => {
      // Click to select
      bar.addEventListener('click', (e) => {
        if (e.target.classList.contains('resize-handle')) return;
        this.selectEvent(bar.dataset.eventId);
      });

      // Right-click for context menu
      bar.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.selectEvent(bar.dataset.eventId);
        this.showContextMenu(e.clientX, e.clientY);
      });

      // Drag to move
      bar.addEventListener('mousedown', (e) => {
        if (e.target.tagName === 'BUTTON') return;
        if (e.target.classList.contains('resize-handle')) {
          this.startResize(bar, e, e.target.classList.contains('left') ? 'left' : 'right');
        } else if (e.button === 0) {
          this.startDrag(bar, e);
        }
      });
    });
  },

  /**
   * Select an event
   */
  selectEvent(eventId) {
    this.selectedEventId = eventId;

    // Update bar selection visual
    document.querySelectorAll('.event-bar').forEach(bar => {
      bar.classList.toggle('selected', bar.dataset.eventId === eventId);
    });

    // Open properties panel
    this.openProperties(eventId);

    // Hide context menu
    this.hideContextMenu();
  },

  /**
   * Deselect all
   */
  deselectAll() {
    this.selectedEventId = null;
    document.querySelectorAll('.event-bar').forEach(bar => {
      bar.classList.remove('selected');
    });
    this.closeProperties();
    this.hideContextMenu();
  },

  /**
   * Open properties panel for event
   */
  openProperties(eventId) {
    const event = this.events.find(e => e.id === eventId);
    if (!event) return;

    const panel = document.getElementById('propertiesPanel');
    const title = document.getElementById('propertiesTitle');
    const body = document.getElementById('propertiesBody');

    title.textContent = event.name;

    // Build properties form
    let html = `
      <div class="prop-section">
        <div class="prop-section-title">Basic Info</div>
        <div class="prop-field">
          <label>Event Name</label>
          <input type="text" value="${event.name}" onchange="TimelineEditor.updateEventName('${eventId}', this.value)">
        </div>
        <div class="prop-field-row">
          <div class="prop-field">
            <label>Start</label>
            <select onchange="TimelineEditor.updateEventTiming('${eventId}', 'start', parseInt(this.value))">
              ${this.PERIODS.map(p => `
                <option value="${p.value}" ${event.startPeriod === p.value ? 'selected' : ''}>
                  ${p.label} ${p.sub}
                </option>
              `).join('')}
            </select>
          </div>
          <div class="prop-field">
            <label>End</label>
            <select onchange="TimelineEditor.updateEventTiming('${eventId}', 'end', parseInt(this.value))">
              ${this.PERIODS.map(p => `
                <option value="${p.value}" ${event.endPeriod === p.value ? 'selected' : ''}>
                  ${p.label} ${p.sub}
                </option>
              `).join('')}
            </select>
          </div>
        </div>
      </div>
    `;

    // Render effects for each track this event is on
    Object.keys(event.tracks).forEach(trackType => {
      const track = this.TRACKS[trackType];
      if (!track) return;
      const effects = event.tracks[trackType].effects;

      html += `
        <div class="prop-section">
          <div class="prop-section-title">${track.icon} ${track.name} Effects</div>
          ${this.renderEffectFields(eventId, trackType, track.effects, effects)}
          <button class="btn-secondary" style="width:100%;margin-top:8px;" onclick="TimelineEditor.removeTrackFromEvent('${eventId}', '${trackType}')">
            Remove ${track.name} Track
          </button>
        </div>
      `;
    });

    // Add "Add Effect To Track" button
    const availableTracks = Object.keys(this.TRACKS).filter(t => !event.tracks[t]);
    if (availableTracks.length > 0) {
      html += `
        <div class="prop-section">
          <div class="prop-section-title">Add More Effects</div>
          <select id="addTrackSelect" style="width: 100%; margin-bottom: 10px; padding: 8px; background: #252525; border: 1px solid #333; border-radius: 4px; color: #fff;">
            <option value="">-- Select Track --</option>
            ${availableTracks.map(t => `
              <option value="${t}">${this.TRACKS[t].icon} ${this.TRACKS[t].name}</option>
            `).join('')}
          </select>
          <button class="add-effect-btn" onclick="TimelineEditor.addTrackToEvent('${eventId}')">
            + Add Effect Track
          </button>
        </div>
      `;
    }

    body.innerHTML = html;
    panel.classList.add('open');
  },

  /**
   * Render effect input fields
   */
  renderEffectFields(eventId, trackType, effectDefs, effectValues) {
    return effectDefs.map(effect => {
      // Check showIf condition
      if (effect.showIf && !effectValues[effect.showIf]) {
        return '';
      }

      const value = effectValues[effect.key];

      if (effect.type === 'select') {
        return `
          <div class="prop-field">
            <label>${effect.label}</label>
            <select onchange="TimelineEditor.updateEffect('${eventId}', '${trackType}', '${effect.key}', this.value)">
              ${effect.options.map(opt => `
                <option value="${opt}" ${value === opt ? 'selected' : ''}>${opt}</option>
              `).join('')}
            </select>
          </div>
        `;
      } else if (effect.type === 'checkbox') {
        return `
          <div class="prop-field">
            <label style="display: flex; align-items: center; gap: 8px;">
              <input type="checkbox" ${value ? 'checked' : ''}
                     onchange="TimelineEditor.updateEffect('${eventId}', '${trackType}', '${effect.key}', this.checked)"
                     style="width: auto;">
              ${effect.label}
            </label>
          </div>
        `;
      } else if (effect.type === 'text') {
        return `
          <div class="prop-field">
            <label>${effect.label}</label>
            <input type="text" value="${value || ''}"
                   onchange="TimelineEditor.updateEffect('${eventId}', '${trackType}', '${effect.key}', this.value)">
          </div>
        `;
      } else {
        return `
          <div class="prop-field">
            <label>${effect.label}</label>
            <div style="display: flex; align-items: center; gap: 8px;">
              <input type="number" value="${value || 0}"
                     min="${effect.min}" max="${effect.max}" step="${effect.step || 1}"
                     style="flex: 1;"
                     onchange="TimelineEditor.updateEffect('${eventId}', '${trackType}', '${effect.key}', parseFloat(this.value))">
              <span style="color: #666; font-size: 11px;">${effect.unit}</span>
            </div>
          </div>
        `;
      }
    }).join('');
  },

  /**
   * Update event name
   */
  updateEventName(eventId, name) {
    const event = this.events.find(e => e.id === eventId);
    if (!event) return;

    this.saveUndoState();
    event.name = name;
    document.getElementById('propertiesTitle').textContent = name;
    this.renderAllBars();
  },

  /**
   * Update event timing
   */
  updateEventTiming(eventId, which, value) {
    const event = this.events.find(e => e.id === eventId);
    if (!event) return;

    this.saveUndoState();

    if (which === 'start') {
      event.startPeriod = value;
      if (event.endPeriod < value) event.endPeriod = value;
    } else {
      event.endPeriod = value;
      if (event.startPeriod > value) event.startPeriod = value;
    }

    this.renderAllBars();
    this.updateGraphs();
  },

  /**
   * Update an effect value
   */
  updateEffect(eventId, trackType, effectKey, value) {
    const event = this.events.find(e => e.id === eventId);
    if (!event || !event.tracks[trackType]) return;

    event.tracks[trackType].effects[effectKey] = value;

    // Re-render properties if checkbox changed (may show/hide fields)
    if (typeof value === 'boolean') {
      this.openProperties(eventId);
    }

    this.updateGraphs();
  },

  /**
   * Add a track to an event
   */
  addTrackToEvent(eventId) {
    const select = document.getElementById('addTrackSelect');
    const trackType = select.value;
    if (!trackType) return;

    const event = this.events.find(e => e.id === eventId);
    if (!event) return;

    this.saveUndoState();

    event.tracks[trackType] = {
      effects: this.getDefaultEffects(trackType)
    };

    this.renderAllBars();
    this.openProperties(eventId);
    this.updateGraphs();
  },

  /**
   * Remove a track from an event
   */
  removeTrackFromEvent(eventId, trackType) {
    const event = this.events.find(e => e.id === eventId);
    if (!event) return;

    // Don't remove if it's the last track
    if (Object.keys(event.tracks).length <= 1) {
      alert('Cannot remove the last track. Delete the event instead.');
      return;
    }

    this.saveUndoState();
    delete event.tracks[trackType];

    this.renderAllBars();
    this.openProperties(eventId);
    this.updateGraphs();
  },

  /**
   * Close properties panel
   */
  closeProperties() {
    document.getElementById('propertiesPanel')?.classList.remove('open');
  },

  /**
   * Show context menu
   */
  showContextMenu(x, y) {
    const menu = document.getElementById('contextMenu');
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.classList.add('open');
  },

  /**
   * Hide context menu
   */
  hideContextMenu() {
    document.getElementById('contextMenu')?.classList.remove('open');
  },

  /**
   * Edit selected event (open properties)
   */
  editSelectedEvent() {
    if (this.selectedEventId) {
      this.openProperties(this.selectedEventId);
    }
    this.hideContextMenu();
  },

  /**
   * Duplicate selected event
   */
  duplicateSelectedEvent() {
    const event = this.events.find(e => e.id === this.selectedEventId);
    if (!event) return;

    this.saveUndoState();

    const newEvent = JSON.parse(JSON.stringify(event));
    newEvent.id = 'evt-' + Date.now();
    newEvent.name = event.name + ' (copy)';
    newEvent.colorIndex = this.getNextColor();
    newEvent.startPeriod = Math.min(12, event.startPeriod + 1);
    newEvent.endPeriod = Math.min(12, event.endPeriod + 1);

    this.events.push(newEvent);
    this.renderAllBars();
    this.selectEvent(newEvent.id);
    this.hideContextMenu();
    this.updateGraphs();
  },

  /**
   * Delete selected event
   */
  deleteSelectedEvent() {
    if (!this.selectedEventId) return;

    this.saveUndoState();
    this.events = this.events.filter(e => e.id !== this.selectedEventId);
    this.selectedEventId = null;
    this.renderAllBars();
    this.closeProperties();
    this.hideContextMenu();
    this.updateGraphs();
  },

  /**
   * Add effect to a specific track via context menu
   */
  addEffectToTrack(trackType) {
    const event = this.events.find(e => e.id === this.selectedEventId);
    if (!event) return;

    if (event.tracks[trackType]) {
      alert('Event already has effects on this track');
      this.hideContextMenu();
      return;
    }

    this.saveUndoState();

    event.tracks[trackType] = {
      effects: this.getDefaultEffects(trackType)
    };

    this.renderAllBars();
    this.openProperties(this.selectedEventId);
    this.hideContextMenu();
    this.updateGraphs();
  },

  /**
   * Start dragging an event bar
   */
  startDrag(bar, e) {
    const eventId = bar.dataset.eventId;
    const event = this.events.find(ev => ev.id === eventId);
    if (!event) return;

    const track = bar.closest('.track-content');
    const trackRect = track.getBoundingClientRect();
    const columnWidth = this.getPeriodColumnWidth();

    const startX = e.clientX;
    const originalLeft = parseFloat(bar.style.left) || (event.startPeriod - 1) * columnWidth;
    const barWidth = parseFloat(bar.style.width) || (event.endPeriod - event.startPeriod + 1) * columnWidth;
    const duration = event.endPeriod - event.startPeriod;

    bar.classList.add('dragging');
    this.saveUndoState();

    const onMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      let newLeft = originalLeft + deltaX;

      // Clamp to track bounds (free visual movement)
      newLeft = Math.max(0, Math.min(trackRect.width - barWidth, newLeft));

      // Apply visual change (NOT snapped yet - free movement)
      bar.style.left = `calc(${newLeft}px + 2px)`;
    };

    const onMouseUp = () => {
      bar.classList.remove('dragging');
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);

      // NOW snap to period boundaries on mouse release
      const currentLeftStr = bar.style.left;
      // Parse the calc value - extract the px value
      const match = currentLeftStr.match(/calc\(([0-9.]+)px/);
      const currentLeft = match ? parseFloat(match[1]) : parseFloat(currentLeftStr);

      // Calculate new start period (snap to nearest)
      let newStartPeriod = Math.round(currentLeft / columnWidth) + 1;
      newStartPeriod = Math.max(1, Math.min(12 - duration, newStartPeriod));

      const newEndPeriod = newStartPeriod + duration;

      // Update event data
      event.startPeriod = newStartPeriod;
      event.endPeriod = newEndPeriod;

      // Re-render with snapped position
      this.renderAllBars();
      this.updateGraphs();

      // TWO-WAY SYNC: Update Basic Info panel if this event is selected
      if (this.selectedEventId === eventId) {
        this.openProperties(eventId);
      }

      console.log(`[Timeline] Moved "${event.name}" to periods ${newStartPeriod}-${newEndPeriod}`);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  },

  /**
   * Start resizing an event bar
   */
  startResize(bar, e, edge) {
    e.stopPropagation();
    e.preventDefault();

    const eventId = bar.dataset.eventId;
    const event = this.events.find(ev => ev.id === eventId);
    if (!event) return;

    const track = bar.closest('.track-content');
    const trackRect = track.getBoundingClientRect();
    const columnWidth = this.getPeriodColumnWidth();

    const startX = e.clientX;
    const originalLeft = (event.startPeriod - 1) * columnWidth;
    const originalWidth = (event.endPeriod - event.startPeriod + 1) * columnWidth;
    const originalStartPeriod = event.startPeriod;
    const originalEndPeriod = event.endPeriod;

    // Visual feedback during resize
    bar.classList.add('resizing');
    this.saveUndoState();

    const onMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;

      if (edge === 'left') {
        // Moving left edge
        let newLeft = originalLeft + deltaX;
        let newWidth = originalWidth - deltaX;

        // Prevent negative width or going off track
        if (newWidth < columnWidth) {
          newWidth = columnWidth;
          newLeft = originalLeft + originalWidth - columnWidth;
        }
        if (newLeft < 0) {
          newLeft = 0;
          newWidth = originalLeft + originalWidth;
        }

        // Apply visual change (NOT snapped yet)
        bar.style.left = `calc(${newLeft}px + 2px)`;
        bar.style.width = `calc(${newWidth}px - 4px)`;

      } else {
        // Moving right edge
        let newWidth = originalWidth + deltaX;

        // Prevent too small or going off track
        if (newWidth < columnWidth) {
          newWidth = columnWidth;
        }
        const maxWidth = trackRect.width - originalLeft;
        if (newWidth > maxWidth) {
          newWidth = maxWidth;
        }

        // Apply visual change (NOT snapped yet)
        bar.style.width = `calc(${newWidth}px - 4px)`;
      }
    };

    const onMouseUp = () => {
      bar.classList.remove('resizing');
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);

      // NOW snap to period boundaries on mouse release
      const currentLeftStr = bar.style.left;
      const currentWidthStr = bar.style.width;

      // Parse calc values
      const leftMatch = currentLeftStr.match(/calc\(([0-9.]+)px/);
      const widthMatch = currentWidthStr.match(/calc\(([0-9.]+)px/);
      const currentLeft = leftMatch ? parseFloat(leftMatch[1]) : originalLeft;
      const currentWidth = widthMatch ? parseFloat(widthMatch[1]) : originalWidth;

      let newStartPeriod, newEndPeriod;

      if (edge === 'left') {
        // Snap left edge to nearest period
        newStartPeriod = Math.round(currentLeft / columnWidth) + 1;
        newStartPeriod = Math.max(1, Math.min(originalEndPeriod, newStartPeriod));
        newEndPeriod = originalEndPeriod;
      } else {
        // Snap right edge to nearest period
        const rightEdge = currentLeft + currentWidth;
        newEndPeriod = Math.round(rightEdge / columnWidth);
        newEndPeriod = Math.max(originalStartPeriod, Math.min(12, newEndPeriod));
        newStartPeriod = originalStartPeriod;
      }

      // Ensure minimum 1 period duration
      if (newEndPeriod < newStartPeriod) {
        newEndPeriod = newStartPeriod;
      }

      // Update event data
      event.startPeriod = newStartPeriod;
      event.endPeriod = newEndPeriod;

      // Re-render with snapped position
      this.renderAllBars();
      this.updateGraphs();

      // TWO-WAY SYNC: Update Basic Info panel if this event is selected
      if (this.selectedEventId === eventId) {
        this.openProperties(eventId);
      }

      console.log(`[Timeline] Resized "${event.name}" to periods ${newStartPeriod}-${newEndPeriod}`);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  },

  /**
   * Bind keyboard shortcuts
   */
  bindKeyboard() {
    document.addEventListener('keydown', (e) => {
      // Only if timeline is visible/focused
      const timeline = document.getElementById('timelineEditor');
      if (!timeline || timeline.offsetParent === null) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (this.selectedEventId && !e.target.matches('input, select, textarea')) {
          e.preventDefault();
          this.deleteSelectedEvent();
        }
      }

      if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.undo();
      }

      if (e.key === 'Escape') {
        this.deselectAll();
        this.cancelNamePrompt();
      }
    });
  },

  /**
   * Bind click outside to deselect
   */
  bindClickOutside() {
    document.addEventListener('click', (e) => {
      // If clicking outside of bars, panels, menus
      if (!e.target.closest('.event-bar') &&
          !e.target.closest('.properties-panel') &&
          !e.target.closest('.context-menu') &&
          !e.target.closest('.name-modal') &&
          !e.target.closest('.palette-item')) {
        this.hideContextMenu();
      }
    });
  },

  /**
   * Zoom in
   */
  zoomIn() {
    this.zoom = Math.min(this.maxZoom, this.zoom + 0.25);
    this.updateZoom();
  },

  /**
   * Zoom out
   */
  zoomOut() {
    this.zoom = Math.max(this.minZoom, this.zoom - 0.25);
    this.updateZoom();
  },

  /**
   * Zoom to fit all
   */
  zoomFit() {
    this.zoom = 1;
    this.updateZoom();
  },

  /**
   * Update after zoom change
   */
  updateZoom() {
    const zoomLevel = document.getElementById('zoomLevel');
    if (zoomLevel) {
      zoomLevel.textContent = `${Math.round(this.zoom * 100)}%`;
    }
    // Clear cache and re-render
    this.cachedColumnWidth = null;
    this.renderTimeMarkers();
    this.renderAllBars();
  },

  /**
   * Save state for undo
   */
  saveUndoState() {
    this.lastState = JSON.stringify(this.events);
    const undoBtn = document.getElementById('undoBtn');
    if (undoBtn) undoBtn.disabled = false;
  },

  /**
   * Undo last action
   */
  undo() {
    if (!this.lastState) return;

    this.events = JSON.parse(this.lastState);
    this.lastState = null;
    const undoBtn = document.getElementById('undoBtn');
    if (undoBtn) undoBtn.disabled = true;

    this.renderAllBars();
    this.closeProperties();
    this.deselectAll();
    this.updateGraphs();
  },

  /**
   * Open graphs panel
   */
  openGraphsPanel() {
    document.getElementById('graphsPanel')?.classList.add('open');
    this.updateGraphs();
  },

  /**
   * Close graphs panel
   */
  closeGraphsPanel() {
    document.getElementById('graphsPanel')?.classList.remove('open');
  },

  /**
   * Update all graphs
   */
  updateGraphs() {
    // This will call the mini graph renderer
    if (window.TimelineGraphs) {
      TimelineGraphs.render(this.events);
    }
  },

  /**
   * Validate events
   */
  validateEvents() {
    const errors = [];
    const warnings = [];

    this.events.forEach(event => {
      if (!event.name) errors.push(`Event has no name`);
      if (Object.keys(event.tracks).length === 0) warnings.push(`"${event.name}" has no effects`);
      if (event.endPeriod < event.startPeriod) errors.push(`"${event.name}" end is before start`);
    });

    let message = '';
    if (errors.length > 0) {
      message += 'ERRORS:\n' + errors.map(e => '  - ' + e).join('\n') + '\n\n';
    }
    if (warnings.length > 0) {
      message += 'WARNINGS:\n' + warnings.map(w => '  - ' + w).join('\n') + '\n\n';
    }
    if (errors.length === 0 && warnings.length === 0) {
      message = 'All events are valid!';
    }

    alert(message);
  },

  /**
   * Get events for saving (converts to compatible format)
   */
  getEventsForSave() {
    return this.events.map(event => ({
      id: event.id,
      name: event.name,
      colorIndex: event.colorIndex,
      startPeriod: event.startPeriod,
      endPeriod: event.endPeriod,
      tracks: JSON.parse(JSON.stringify(event.tracks))
    }));
  },

  /**
   * Load events from saved data
   */
  loadEvents(savedEvents) {
    if (savedEvents && Array.isArray(savedEvents)) {
      this.events = savedEvents.map(e => ({
        id: e.id || 'evt-' + Date.now() + Math.random(),
        name: e.name || 'Unnamed Event',
        colorIndex: e.colorIndex || this.getNextColor(),
        startPeriod: e.startPeriod || 1,
        endPeriod: e.endPeriod || 3,
        tracks: e.tracks || {}
      }));

      // Find highest color index used
      let maxColor = 0;
      this.events.forEach(e => {
        if (e.colorIndex > maxColor) maxColor = e.colorIndex;
      });
      this.nextColorIndex = (maxColor % this.maxColors) + 1;
    } else {
      this.events = [];
    }

    this.renderAllBars();
    this.updateGraphs();
  },

  /**
   * Clear all events from workspace
   */
  clearWorkspace() {
    if (this.events.length === 0) return;

    if (!confirm('Clear all events? This cannot be undone.')) return;

    this.saveUndoState();
    this.events = [];
    this.renderAllBars();
    this.closeProperties();
    this.updateGraphs();
  }
};

// Export
window.TimelineEditor = TimelineEditor;
