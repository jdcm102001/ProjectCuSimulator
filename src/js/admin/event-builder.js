/**
 * EVENT BUILDER - Main Controller
 * Manages Scratch-style block creation and event logic
 */

const EventBuilder = {
  // All events in workspace
  events: [],

  // Currently selected event for editing
  selectedEvent: null,

  // Available affect targets
  AFFECT_TARGETS: {
    // Prices
    'lme': { label: 'LME Price', category: 'prices', unit: '%', color: '#3b82f6' },
    'comex': { label: 'COMEX Price', category: 'prices', unit: '%', color: '#10b981' },
    'futures_1m': { label: 'Futures 1M', category: 'prices', unit: '%', color: '#60a5fa' },
    'futures_3m': { label: 'Futures 3M', category: 'prices', unit: '%', color: '#34d399' },
    'futures_6m': { label: 'Futures 6M', category: 'prices', unit: '%', color: '#a78bfa' },

    // Supply
    'callao_tonnage': { label: 'Callao Tonnage', category: 'supply-demand', unit: '%', color: '#f59e0b' },
    'callao_premium': { label: 'Callao Premium', category: 'supply-demand', unit: '$/MT', color: '#fbbf24' },
    'antof_tonnage': { label: 'Antofagasta Tonnage', category: 'supply-demand', unit: '%', color: '#8b5cf6' },
    'antof_premium': { label: 'Antofagasta Premium', category: 'supply-demand', unit: '$/MT', color: '#a78bfa' },

    // Demand
    'americas_tonnage': { label: 'Americas Demand', category: 'supply-demand', unit: '%', color: '#ec4899' },
    'americas_premium': { label: 'Americas Premium', category: 'supply-demand', unit: '$/MT', color: '#f472b6' },
    'asia_tonnage': { label: 'Asia Demand', category: 'supply-demand', unit: '%', color: '#06b6d4' },
    'asia_premium': { label: 'Asia Premium', category: 'supply-demand', unit: '$/MT', color: '#22d3d4' },
    'europe_tonnage': { label: 'Europe Demand', category: 'supply-demand', unit: '%', color: '#84cc16' },
    'europe_premium': { label: 'Europe Premium', category: 'supply-demand', unit: '$/MT', color: '#a3e635' },

    // Shipping
    'fob_rate': { label: 'FOB Rate', category: 'shipping', unit: '$/MT', color: '#f97316' },
    'cif_rate': { label: 'CIF Rate', category: 'shipping', unit: '$/MT', color: '#a855f7' },
    'travel_time': { label: 'Travel Time', category: 'shipping', unit: 'days', color: '#fb923c' },

    // Financial
    'interest_rate': { label: 'Interest Rate', category: 'financial', unit: '%', color: '#f43f5e' },
    'loc_limit': { label: 'LOC Limit', category: 'financial', unit: '$', color: '#fb7185' },
    'margin': { label: 'Margin Req.', category: 'financial', unit: '$', color: '#fda4af' }
  },

  // Period options
  PERIODS: [
    { value: 1, label: 'January - Early' },
    { value: 2, label: 'January - Late' },
    { value: 3, label: 'February - Early' },
    { value: 4, label: 'February - Late' },
    { value: 5, label: 'March - Early' },
    { value: 6, label: 'March - Late' },
    { value: 7, label: 'April - Early' },
    { value: 8, label: 'April - Late' },
    { value: 9, label: 'May - Early' },
    { value: 10, label: 'May - Late' },
    { value: 11, label: 'June - Early' },
    { value: 12, label: 'June - Late' }
  ],

  // Effect magnitude limits
  MAGNITUDE_LIMITS: {
    news: { min: -5, max: 5, label: 'News: +/-1-5%' },
    event: { min: -50, max: 50, label: 'Events: +/-5-50%' }
  },

  // Templates for quick event creation
  TEMPLATES: {
    'mine-strike': {
      name: 'Mine Strike',
      news: {
        name: 'Labor Tensions Rising',
        text: 'Reports of labor disputes at mining operations.',
        affects: [
          { target: 'lme', value: 3 },
          { target: 'callao_tonnage', value: -5 }
        ]
      },
      event: {
        name: 'Major Mine Strike',
        text: 'Workers at major copper mine have gone on strike.',
        affects: [
          { target: 'lme', value: 15 },
          { target: 'callao_tonnage', value: -40 },
          { target: 'callao_premium', value: 25 }
        ]
      },
      leadTime: 2
    },
    'stimulus': {
      name: 'Stimulus Package',
      news: {
        name: 'Government Signals Support',
        text: 'Officials hint at upcoming economic stimulus measures.',
        affects: [
          { target: 'asia_tonnage', value: 5 },
          { target: 'lme', value: 2 }
        ]
      },
      event: {
        name: 'Major Stimulus Announced',
        text: 'Government announces $500B infrastructure spending.',
        affects: [
          { target: 'asia_tonnage', value: 30 },
          { target: 'asia_premium', value: 20 },
          { target: 'lme', value: 12 },
          { target: 'comex', value: 10 }
        ]
      },
      leadTime: 2
    },
    'rate-hike': {
      name: 'Fed Rate Hike',
      news: {
        name: 'Fed Signals Tighter Policy',
        text: 'Fed minutes suggest possible rate increases.',
        affects: [
          { target: 'interest_rate', value: 0.25 }
        ]
      },
      event: {
        name: 'Fed Raises Rates',
        text: 'Federal Reserve increases interest rates by 50 basis points.',
        affects: [
          { target: 'interest_rate', value: 0.5 },
          { target: 'lme', value: -5 }
        ]
      },
      leadTime: 3
    },
    'port-strike': {
      name: 'Port Strike',
      news: {
        name: 'Port Workers Vote on Strike',
        text: 'Dock workers scheduled to vote on industrial action.',
        affects: [
          { target: 'fob_rate', value: 5 },
          { target: 'travel_time', value: 1 }
        ]
      },
      event: {
        name: 'Major Port Strike',
        text: 'Port workers begin indefinite strike action.',
        affects: [
          { target: 'fob_rate', value: 25 },
          { target: 'cif_rate', value: 20 },
          { target: 'travel_time', value: 7 }
        ]
      },
      leadTime: 2
    }
  },

  /**
   * Initialize the Event Builder
   */
  init() {
    console.log('[EventBuilder] Initializing...');

    this.bindPaletteDrag();
    this.bindWorkspaceDrop();
    this.bindGraphClicks();

    // Initialize MultiGraph
    if (typeof MultiGraph !== 'undefined') {
      MultiGraph.init();
    }

    this.renderWorkspace();
    this.updateGraphs();

    console.log('[EventBuilder] Initialized');
  },

  /**
   * Bind drag events for palette blocks
   */
  bindPaletteDrag() {
    const blocks = document.querySelectorAll('.palette-block');

    blocks.forEach(block => {
      block.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('blockType', block.dataset.blockType || '');
        e.dataTransfer.setData('template', block.dataset.template || '');
        block.classList.add('dragging');
      });

      block.addEventListener('dragend', () => {
        block.classList.remove('dragging');
      });
    });
  },

  /**
   * Bind drop events for workspace
   */
  bindWorkspaceDrop() {
    const workspace = document.getElementById('workspaceArea');
    if (!workspace) return;

    workspace.addEventListener('dragover', (e) => {
      e.preventDefault();
      workspace.classList.add('drag-over');
    });

    workspace.addEventListener('dragleave', () => {
      workspace.classList.remove('drag-over');
    });

    workspace.addEventListener('drop', (e) => {
      e.preventDefault();
      workspace.classList.remove('drag-over');

      const blockType = e.dataTransfer.getData('blockType');
      const template = e.dataTransfer.getData('template');

      if (template) {
        this.createFromTemplate(template);
      } else if (blockType) {
        this.createEvent(blockType);
      }
    });
  },

  /**
   * Bind click events for graphs (quick affect creation)
   */
  bindGraphClicks() {
    const graphs = document.querySelectorAll('.graph-panel');

    graphs.forEach(panel => {
      const canvas = panel.querySelector('canvas');
      if (!canvas) return;

      canvas.addEventListener('click', (e) => {
        if (typeof MultiGraph === 'undefined') return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const graphType = panel.dataset.graph;
        const clickedLine = MultiGraph.getLineAtPoint(graphType, x, y, canvas.width, canvas.height);

        if (clickedLine) {
          this.showQuickAffectPopup(clickedLine, e.clientX, e.clientY);
        }
      });

      canvas.addEventListener('mousemove', (e) => {
        if (typeof MultiGraph === 'undefined') return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const graphType = panel.dataset.graph;
        const hoveredLine = MultiGraph.getLineAtPoint(graphType, x, y, canvas.width, canvas.height);

        canvas.style.cursor = hoveredLine ? 'pointer' : 'crosshair';
      });
    });
  },

  /**
   * Show quick affect popup when clicking graph
   */
  showQuickAffectPopup(lineKey, x, y) {
    // Remove existing popup
    const existing = document.querySelector('.quick-affect-popup');
    if (existing) existing.remove();

    const target = this.AFFECT_TARGETS[lineKey];
    if (!target) return;

    const popup = document.createElement('div');
    popup.className = 'quick-affect-popup';
    popup.innerHTML = `
      <div class="quick-affect-header">
        <span>Add Effect: ${target.label}</span>
        <button class="close-popup" onclick="this.parentElement.parentElement.remove()">x</button>
      </div>
      <div class="quick-affect-body">
        <div class="quick-affect-row">
          <label>Change:</label>
          <input type="number" id="quickAffectValue" value="10" min="-50" max="50">
          <span class="unit">${target.unit}</span>
        </div>
        <div class="quick-affect-row">
          <label>Add to:</label>
          <select id="quickAffectTarget">
            <option value="new-event">New Event</option>
            <option value="new-news">New News</option>
            ${this.events.map(e => `<option value="${e.id}">${e.name}</option>`).join('')}
          </select>
        </div>
        <button class="quick-affect-add" onclick="EventBuilder.addQuickAffect('${lineKey}')">Add Effect</button>
      </div>
    `;

    popup.style.cssText = `
      position: fixed;
      left: ${x}px;
      top: ${y}px;
      z-index: 10000;
    `;

    document.body.appendChild(popup);

    document.getElementById('quickAffectValue').focus();
    document.getElementById('quickAffectValue').select();

    setTimeout(() => {
      document.addEventListener('click', function closePopup(e) {
        if (!popup.contains(e.target)) {
          popup.remove();
          document.removeEventListener('click', closePopup);
        }
      });
    }, 100);
  },

  /**
   * Add affect from quick popup
   */
  addQuickAffect(lineKey) {
    const value = parseFloat(document.getElementById('quickAffectValue').value);
    const targetSelect = document.getElementById('quickAffectTarget').value;

    const affect = { target: lineKey, value: value };

    if (targetSelect === 'new-event') {
      this.createEvent('event', [affect]);
    } else if (targetSelect === 'new-news') {
      this.createEvent('news', [affect]);
    } else {
      const event = this.events.find(e => e.id === targetSelect);
      if (event) {
        event.affects.push(affect);
        this.renderWorkspace();
        this.updateGraphs();
      }
    }

    document.querySelector('.quick-affect-popup')?.remove();
  },

  /**
   * Create a new event block
   */
  createEvent(type, initialAffects = []) {
    const event = {
      id: 'evt-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      type: type,
      name: type === 'news' ? 'New News Item' : 'New Event',
      text: '',
      startPeriod: 3,
      endPeriod: type === 'news' ? 3 : 6,
      affects: initialAffects,
      chainTo: null,
      leadTime: 2
    };

    this.events.push(event);
    this.renderWorkspace();
    this.updateGraphs();

    return event;
  },

  /**
   * Create events from template
   */
  createFromTemplate(templateKey) {
    const template = this.TEMPLATES[templateKey];
    if (!template) return;

    const newsEvent = {
      id: 'evt-' + Date.now() + '-news',
      type: 'news',
      name: template.news.name,
      text: template.news.text,
      startPeriod: 3,
      endPeriod: 3,
      affects: [...template.news.affects],
      chainTo: null,
      leadTime: template.leadTime
    };

    const mainEvent = {
      id: 'evt-' + Date.now() + '-main',
      type: 'event',
      name: template.event.name,
      text: template.event.text,
      startPeriod: 3 + template.leadTime,
      endPeriod: 3 + template.leadTime + 2,
      affects: [...template.event.affects],
      chainTo: null,
      leadTime: 0
    };

    newsEvent.chainTo = mainEvent.id;

    this.events.push(newsEvent);
    this.events.push(mainEvent);

    this.renderWorkspace();
    this.updateGraphs();
  },

  /**
   * Delete an event
   */
  deleteEvent(eventId) {
    this.events.forEach(e => {
      if (e.chainTo === eventId) {
        e.chainTo = null;
      }
    });

    this.events = this.events.filter(e => e.id !== eventId);
    this.renderWorkspace();
    this.updateGraphs();
  },

  /**
   * Update event data
   */
  updateEvent(eventId, field, value) {
    const event = this.events.find(e => e.id === eventId);
    if (!event) return;

    event[field] = value;

    if (field === 'chainTo' && value) {
      const linkedEvent = this.events.find(e => e.id === value);
      if (linkedEvent) {
        linkedEvent.startPeriod = event.startPeriod + event.leadTime;
        if (linkedEvent.startPeriod > 12) linkedEvent.startPeriod = 12;
      }
    }

    this.updateGraphs();
  },

  /**
   * Add an affect to an event
   */
  addAffect(eventId) {
    const event = this.events.find(e => e.id === eventId);
    if (!event) return;

    event.affects.push({ target: 'lme', value: 5 });
    this.renderWorkspace();
    this.updateGraphs();
  },

  /**
   * Remove an affect from an event
   */
  removeAffect(eventId, affectIndex) {
    const event = this.events.find(e => e.id === eventId);
    if (!event) return;

    event.affects.splice(affectIndex, 1);
    this.renderWorkspace();
    this.updateGraphs();
  },

  /**
   * Update an affect value
   */
  updateAffect(eventId, affectIndex, field, value) {
    const event = this.events.find(e => e.id === eventId);
    if (!event || !event.affects[affectIndex]) return;

    event.affects[affectIndex][field] = value;
    this.updateGraphs();
  },

  /**
   * Render all events in workspace
   */
  renderWorkspace() {
    const workspace = document.getElementById('workspaceArea');
    if (!workspace) return;

    const sortedEvents = this.getSortedEventsForDisplay();

    let html = '';

    sortedEvents.forEach((event) => {
      const chainedFrom = this.events.find(e => e.chainTo === event.id);

      if (chainedFrom) {
        html += `
          <div class="chain-arrow">
            <div class="chain-arrow-line"></div>
            <div class="chain-arrow-head"></div>
            <span class="chain-label">${chainedFrom.leadTime} periods later</span>
          </div>
        `;
      }

      html += this.renderEventBlock(event);
    });

    if (this.events.length === 0) {
      workspace.innerHTML = '<div class="workspace-placeholder">Drag blocks here to create events</div>';
      workspace.classList.remove('has-blocks');
    } else {
      workspace.innerHTML = html;
      workspace.classList.add('has-blocks');
    }

    this.bindBlockEvents();
  },

  /**
   * Get events sorted for display (chains together)
   */
  getSortedEventsForDisplay() {
    const result = [];
    const used = new Set();

    this.events.filter(e => e.type === 'news').forEach(news => {
      if (used.has(news.id)) return;

      result.push(news);
      used.add(news.id);

      if (news.chainTo) {
        const chained = this.events.find(e => e.id === news.chainTo);
        if (chained && !used.has(chained.id)) {
          result.push(chained);
          used.add(chained.id);
        }
      }
    });

    this.events.filter(e => !used.has(e.id)).forEach(event => {
      result.push(event);
    });

    return result;
  },

  /**
   * Render a single event block
   */
  renderEventBlock(event) {
    const isNews = event.type === 'news';
    const icon = isNews ? '📰' : '📦';
    const limits = this.MAGNITUDE_LIMITS[event.type];

    const chainOptions = isNews ? this.events
      .filter(e => e.type === 'event' && e.id !== event.id)
      .map(e => `<option value="${e.id}" ${event.chainTo === e.id ? 'selected' : ''}>${e.name}</option>`)
      .join('') : '';

    return `
      <div class="event-block ${event.type}" data-event-id="${event.id}">
        <div class="event-block-header">
          <div class="event-block-title">
            <span class="icon">${icon}</span>
            <span class="name">${event.name}</span>
          </div>
          <div class="event-block-actions">
            <button onclick="EventBuilder.duplicateEvent('${event.id}')" title="Duplicate">📋</button>
            <button onclick="EventBuilder.deleteEvent('${event.id}')" title="Delete">🗑️</button>
          </div>
        </div>

        <div class="event-block-body">
          <div class="event-field">
            <label>Name</label>
            <input type="text" value="${event.name}"
                   onchange="EventBuilder.updateEvent('${event.id}', 'name', this.value)">
          </div>

          <div class="event-field-row">
            <div class="event-field">
              <label>${isNews ? 'When' : 'From'}</label>
              <select onchange="EventBuilder.updateEvent('${event.id}', 'startPeriod', parseInt(this.value))">
                ${this.PERIODS.map(p => `<option value="${p.value}" ${event.startPeriod === p.value ? 'selected' : ''}>${p.label}</option>`).join('')}
              </select>
            </div>
            ${!isNews ? `
            <div class="event-field">
              <label>To</label>
              <select onchange="EventBuilder.updateEvent('${event.id}', 'endPeriod', parseInt(this.value))">
                ${this.PERIODS.map(p => `<option value="${p.value}" ${event.endPeriod === p.value ? 'selected' : ''}>${p.label}</option>`).join('')}
              </select>
            </div>
            ` : ''}
          </div>

          <div class="event-field">
            <label>Effects ${limits.label}</label>
            <div class="affects-list">
              ${event.affects.map((affect, i) => this.renderAffectItem(event.id, affect, i, limits)).join('')}
            </div>
            <button class="add-affect-btn" onclick="EventBuilder.addAffect('${event.id}')">
              + Add Effect
            </button>
          </div>

          <div class="event-field">
            <label>Display Text (shown to player)</label>
            <textarea rows="2" placeholder="What the player will see..."
                      onchange="EventBuilder.updateEvent('${event.id}', 'text', this.value)">${event.text || ''}</textarea>
          </div>

          ${isNews ? `
          <div class="chain-section ${event.chainTo ? 'active' : ''}">
            <label>
              <input type="checkbox" ${event.chainTo ? 'checked' : ''}
                     onchange="EventBuilder.toggleChain('${event.id}', this.checked)">
              Chain to main event
            </label>
            <div class="chain-config">
              <div class="event-field-row">
                <div class="event-field">
                  <label>Links to</label>
                  <select onchange="EventBuilder.updateEvent('${event.id}', 'chainTo', this.value || null)">
                    <option value="">-- Select Event --</option>
                    ${chainOptions}
                  </select>
                </div>
                <div class="event-field">
                  <label>Lead Time</label>
                  <select onchange="EventBuilder.updateEvent('${event.id}', 'leadTime', parseInt(this.value))">
                    <option value="1" ${event.leadTime === 1 ? 'selected' : ''}>1 period</option>
                    <option value="2" ${event.leadTime === 2 ? 'selected' : ''}>2 periods</option>
                    <option value="3" ${event.leadTime === 3 ? 'selected' : ''}>3 periods</option>
                    <option value="4" ${event.leadTime === 4 ? 'selected' : ''}>4 periods</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          ` : ''}
        </div>
      </div>
    `;
  },

  /**
   * Render an affect item
   */
  renderAffectItem(eventId, affect, index, limits) {
    const target = this.AFFECT_TARGETS[affect.target];

    return `
      <div class="affect-item">
        <select onchange="EventBuilder.updateAffect('${eventId}', ${index}, 'target', this.value)">
          ${Object.keys(this.AFFECT_TARGETS).map(key => {
            const t = this.AFFECT_TARGETS[key];
            return `<option value="${key}" ${affect.target === key ? 'selected' : ''}>${t.label}</option>`;
          }).join('')}
        </select>
        <input type="number" value="${affect.value}"
               min="${limits.min}" max="${limits.max}" step="1"
               onchange="EventBuilder.updateAffect('${eventId}', ${index}, 'value', parseFloat(this.value))">
        <span class="unit">${target?.unit || '%'}</span>
        <button class="remove-affect" onclick="EventBuilder.removeAffect('${eventId}', ${index})">x</button>
      </div>
    `;
  },

  /**
   * Toggle chain section
   */
  toggleChain(eventId, enabled) {
    const event = this.events.find(e => e.id === eventId);
    if (!event) return;

    if (!enabled) {
      event.chainTo = null;
    }

    this.renderWorkspace();
  },

  /**
   * Duplicate an event
   */
  duplicateEvent(eventId) {
    const event = this.events.find(e => e.id === eventId);
    if (!event) return;

    const newEvent = {
      ...event,
      id: 'evt-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      name: event.name + ' (copy)',
      affects: [...event.affects.map(a => ({ ...a }))],
      chainTo: null
    };

    this.events.push(newEvent);
    this.renderWorkspace();
    this.updateGraphs();
  },

  /**
   * Bind event handlers for blocks
   */
  bindBlockEvents() {
    const blocks = document.querySelectorAll('.event-block');

    blocks.forEach(block => {
      block.setAttribute('draggable', true);

      block.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('eventId', block.dataset.eventId);
        block.classList.add('dragging');
      });

      block.addEventListener('dragend', () => {
        block.classList.remove('dragging');
      });
    });
  },

  /**
   * Update all graphs with current events
   */
  updateGraphs() {
    if (typeof MultiGraph !== 'undefined') {
      MultiGraph.setEvents(this.events);
      MultiGraph.render();
    }
  },

  /**
   * Clear all events from workspace
   */
  clearWorkspace() {
    if (!confirm('Clear all events? This cannot be undone.')) return;

    this.events = [];
    this.renderWorkspace();
    this.updateGraphs();
  },

  /**
   * Validate all events
   */
  validateEvents() {
    const errors = [];
    const warnings = [];

    this.events.forEach(event => {
      if (!event.name || event.name.trim() === '') {
        errors.push(`Event has no name`);
      }

      if (event.affects.length === 0) {
        warnings.push(`"${event.name}" has no effects`);
      }

      if (event.endPeriod < event.startPeriod) {
        errors.push(`"${event.name}" end period is before start`);
      }

      if (event.type === 'news') {
        event.affects.forEach(affect => {
          if (Math.abs(affect.value) > 5 && (affect.target.includes('lme') || affect.target.includes('comex'))) {
            warnings.push(`"${event.name}" has large effect (${affect.value}%) for a news item`);
          }
        });
      }

      if (event.chainTo) {
        const linked = this.events.find(e => e.id === event.chainTo);
        if (!linked) {
          errors.push(`"${event.name}" chains to non-existent event`);
        }
      }
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
    return errors.length === 0;
  },

  /**
   * Get all events for saving
   */
  getEventsForSave() {
    return this.events.map(event => ({
      ...event,
      affects: [...event.affects]
    }));
  },

  /**
   * Load events from saved data
   */
  loadEvents(savedEvents) {
    if (savedEvents && Array.isArray(savedEvents)) {
      this.events = savedEvents.map(e => ({
        ...e,
        affects: [...(e.affects || [])]
      }));
    } else {
      this.events = [];
    }

    this.renderWorkspace();
    this.updateGraphs();
  }
};

// Export for use in other modules
window.EventBuilder = EventBuilder;
