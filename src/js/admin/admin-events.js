/**
 * Admin Events Module
 * Gantt chart for managing simulation events
 */

const AdminEvents = {
    events: [],
    editingEvent: null,

    // Period labels for Gantt columns
    periodLabels: ['Jan-E', 'Jan-L', 'Feb-E', 'Feb-L', 'Mar-E', 'Mar-L', 'Apr-E', 'Apr-L', 'May-E', 'May-L', 'Jun-E', 'Jun-L'],

    /**
     * Initialize events module
     */
    init(simData) {
        // Load events from simulation data
        this.events = simData?.events ? [...simData.events] : [];

        // Set up event listeners
        this.setupListeners();

        // Render
        this.render();

        console.log('[AdminEvents] Initialized with', this.events.length, 'events');
    },

    /**
     * Set up event listeners
     */
    setupListeners() {
        // Add event button
        const addBtn = document.getElementById('addEventBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.openEventModal());
        }
    },

    /**
     * Render Gantt chart
     */
    render() {
        const container = document.getElementById('ganttBody');
        if (!container) return;

        if (this.events.length === 0) {
            container.innerHTML = `
                <div class="gantt-empty">
                    No events configured. Click "+ ADD EVENT" to create one.
                </div>
            `;
            return;
        }

        let html = '';
        this.events.forEach(event => {
            html += this.renderEventRow(event);
        });

        container.innerHTML = html;

        // Add click listeners to event bars
        this.events.forEach(event => {
            const bar = document.getElementById(`event-bar-${event.id}`);
            if (bar) {
                bar.addEventListener('click', () => this.openEventModal(event));
                bar.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    this.deleteEvent(event.id);
                });
            }
        });
    },

    /**
     * Render single event row
     */
    renderEventRow(event) {
        const arrowClass = event.sentiment === 'bullish' ? 'bullish' : event.sentiment === 'bearish' ? 'bearish' : 'neutral';
        const arrowIcon = event.sentiment === 'bullish' ? '↑' : event.sentiment === 'bearish' ? '↓' : '→';

        // Get type icons
        const types = event.types || [event.type] || ['price'];
        const typeIcons = types.map(t => {
            const config = AdminStorage.getEventTypeConfig(t);
            return config?.icon || '❓';
        }).join('');

        // Calculate bar position
        const startCol = event.startPeriod;
        const endCol = event.endPeriod;
        const span = endCol - startCol + 1;

        let cellsHtml = '';
        for (let i = 1; i <= 12; i++) {
            if (i === startCol) {
                cellsHtml += `
                    <div class="gantt-cell" style="grid-column: span ${span}; position: relative;">
                        <div id="event-bar-${event.id}"
                             class="gantt-bar ${arrowClass}"
                             style="width: 100%;"
                             title="${event.name}: ${event.description || ''}\nTypes: ${types.join(', ')}">
                        </div>
                    </div>
                `;
                i += span - 1; // Skip the spanned columns
            } else if (i < startCol || i > endCol) {
                cellsHtml += `<div class="gantt-cell"></div>`;
            }
        }

        return `
            <div class="gantt-row" data-event-id="${event.id}">
                <div class="gantt-event-name">
                    <span class="type-icons">${typeIcons}</span>
                    <span class="arrow ${arrowClass}">${arrowIcon}</span>
                    <span class="name">${this.truncateName(event.name)}</span>
                </div>
                ${cellsHtml}
            </div>
        `;
    },

    /**
     * Truncate event name for display
     */
    truncateName(name) {
        if (name.length > 18) {
            return name.substring(0, 15) + '...';
        }
        return name;
    },

    /**
     * Open event modal (create or edit)
     */
    openEventModal(event = null) {
        this.editingEvent = event;

        const modal = document.getElementById('eventModal');
        if (!modal) return;

        // Set modal title
        document.getElementById('eventModalTitle').textContent = event ? 'Edit Event' : 'Create Event';

        // Populate form
        document.getElementById('eventName').value = event?.name || '';
        document.getElementById('eventDescription').value = event?.description || '';
        document.getElementById('eventStartPeriod').value = event?.startPeriod || 1;
        document.getElementById('eventEndPeriod').value = event?.endPeriod || 2;
        document.getElementById('eventSeverity').value = event?.severity || 'medium';

        // Set event types (checkboxes)
        const eventTypes = event?.types || ['price']; // Default to price
        document.querySelectorAll('input[name="eventTypes"]').forEach(input => {
            input.checked = eventTypes.includes(input.value);
        });

        // Set sentiment
        const sentiment = event?.sentiment || 'bullish';
        document.querySelectorAll('input[name="eventSentiment"]').forEach(input => {
            input.checked = input.value === sentiment;
        });

        // Show/hide delete button
        const deleteBtn = document.getElementById('eventDeleteBtn');
        if (deleteBtn) {
            deleteBtn.style.display = event ? 'block' : 'none';
        }

        // Update dynamic effects section
        this.updateEffectsSection(event?.effects || {});

        // Update impacts preview
        this.updateImpactsPreview();

        // Show modal
        modal.style.display = 'flex';

        // Add form change listeners
        document.querySelectorAll('input[name="eventTypes"]').forEach(input => {
            input.addEventListener('change', () => this.updateEffectsSection());
        });
        ['eventSeverity'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', () => this.updateImpactsPreview());
        });
        document.querySelectorAll('input[name="eventSentiment"]').forEach(input => {
            input.addEventListener('change', () => this.updateImpactsPreview());
        });
    },

    /**
     * Get selected event types from checkboxes
     */
    getSelectedTypes() {
        const selected = [];
        document.querySelectorAll('input[name="eventTypes"]:checked').forEach(input => {
            selected.push(input.value);
        });
        return selected;
    },

    /**
     * Update dynamic effects section based on selected types
     */
    updateEffectsSection(savedEffects = {}) {
        const container = document.getElementById('eventEffectsContainer');
        if (!container) return;

        const selectedTypes = this.getSelectedTypes();

        if (selectedTypes.length === 0) {
            container.innerHTML = '';
            return;
        }

        let html = '';

        selectedTypes.forEach(type => {
            const config = AdminStorage.getEventTypeConfig(type);
            if (!config || config.effects.length === 0) return;

            html += `<div class="effect-type-group" data-type="${type}">`;
            html += `<div class="effect-type-header"><span>${config.icon}</span> ${config.name} Effects</div>`;

            config.effects.forEach(effect => {
                const savedValue = savedEffects[type]?.[effect.key] ?? effect.default;

                html += `<div class="effect-row">`;
                html += `<label>${effect.label}:</label>`;

                if (effect.type === 'dropdown') {
                    html += `<select class="effect-input" data-type="${type}" data-key="${effect.key}">`;
                    effect.options.forEach(opt => {
                        const selected = savedValue === opt ? 'selected' : '';
                        html += `<option value="${opt}" ${selected}>${opt}</option>`;
                    });
                    html += `</select>`;
                } else if (effect.type === 'number') {
                    const min = effect.min !== undefined ? `min="${effect.min}"` : '';
                    const max = effect.max !== undefined ? `max="${effect.max}"` : '';
                    const step = effect.step !== undefined ? `step="${effect.step}"` : '';
                    html += `<input type="number" class="effect-input" data-type="${type}" data-key="${effect.key}"
                             value="${savedValue}" ${min} ${max} ${step}>`;
                } else if (effect.type === 'sentiment') {
                    // Handled by the main sentiment selector
                    html += `<span style="color: #666;">(Use Sentiment selector above)</span>`;
                } else if (effect.type === 'severity') {
                    // Handled by the main severity selector
                    html += `<span style="color: #666;">(Use Severity selector above)</span>`;
                }

                html += `</div>`;
            });

            html += `</div>`;
        });

        container.innerHTML = html || '<span style="color: #666;">No additional configuration needed for selected types.</span>';
    },

    /**
     * Collect effects from dynamic form
     */
    collectEffects() {
        const effects = {};
        document.querySelectorAll('.effect-input').forEach(input => {
            const type = input.dataset.type;
            const key = input.dataset.key;
            if (!effects[type]) effects[type] = {};

            if (input.type === 'number') {
                effects[type][key] = parseFloat(input.value) || 0;
            } else {
                effects[type][key] = input.value;
            }
        });
        return effects;
    },

    /**
     * Close event modal
     */
    closeEventModal() {
        const modal = document.getElementById('eventModal');
        if (modal) {
            modal.style.display = 'none';
        }
        this.editingEvent = null;
    },

    /**
     * Update impacts preview based on form values
     */
    updateImpactsPreview() {
        const sentiment = document.querySelector('input[name="eventSentiment"]:checked')?.value || 'neutral';
        const severity = document.getElementById('eventSeverity')?.value || 'medium';

        // Get base prices from AdminPricing or defaults
        const basePrices = {
            lme: AdminPricing?.prices?.lme?.[1]?.average || 9000,
            comex: AdminPricing?.prices?.comex?.[1]?.average || 10000
        };

        const impacts = AdminStorage.calculateEventImpacts(sentiment, severity, basePrices);

        // Update preview
        const container = document.getElementById('eventImpactsPreview');
        if (!container) return;

        const formatValue = (val) => {
            if (val > 0) return `<span class="value positive">+$${val.toLocaleString()}</span>`;
            if (val < 0) return `<span class="value negative">-$${Math.abs(val).toLocaleString()}</span>`;
            return `<span class="value">$0</span>`;
        };

        container.innerHTML = `
            <div class="impact-row">
                <span>LME Spot:</span>
                ${formatValue(impacts.lmeSpot)}
            </div>
            <div class="impact-row">
                <span>COMEX Spot:</span>
                ${formatValue(impacts.comexSpot)}
            </div>
            <div class="impact-row">
                <span>Futures 1M:</span>
                ${formatValue(impacts.futures1M)}
            </div>
            <div class="impact-row">
                <span>Futures 3M:</span>
                ${formatValue(impacts.futures3M)}
            </div>
            <div class="impact-row">
                <span>Futures 6M:</span>
                ${formatValue(impacts.futures6M)}
            </div>
        `;
    },

    /**
     * Save event from modal form
     */
    saveEvent() {
        const name = document.getElementById('eventName').value.trim();
        const types = this.getSelectedTypes();
        const description = document.getElementById('eventDescription').value.trim();
        const startPeriod = parseInt(document.getElementById('eventStartPeriod').value);
        const endPeriod = parseInt(document.getElementById('eventEndPeriod').value);
        const sentiment = document.querySelector('input[name="eventSentiment"]:checked')?.value || 'neutral';
        const severity = document.getElementById('eventSeverity').value;
        const effects = this.collectEffects();

        // Validate
        if (!name) {
            alert('Event name is required');
            return;
        }
        if (types.length === 0) {
            alert('At least one event type must be selected');
            return;
        }
        if (endPeriod < startPeriod) {
            alert('End period must be >= start period');
            return;
        }

        // Calculate price impacts (for price-type events)
        const basePrices = {
            lme: AdminPricing?.prices?.lme?.[1]?.average || 9000,
            comex: AdminPricing?.prices?.comex?.[1]?.average || 10000
        };
        const impacts = types.includes('price')
            ? AdminStorage.calculateEventImpacts(sentiment, severity, basePrices)
            : null;

        // Use primary type for backwards compatibility (first selected)
        const type = types[0];

        if (this.editingEvent) {
            // Update existing event
            const idx = this.events.findIndex(e => e.id === this.editingEvent.id);
            if (idx !== -1) {
                this.events[idx] = {
                    ...this.events[idx],
                    name,
                    type, // Primary type for backwards compatibility
                    types, // All selected types
                    description,
                    startPeriod,
                    endPeriod,
                    sentiment,
                    severity,
                    effects, // Type-specific effects
                    impacts
                };
            }
        } else {
            // Create new event
            this.events.push({
                id: AdminStorage.generateEventId(),
                name,
                type, // Primary type for backwards compatibility
                types, // All selected types
                description,
                startPeriod,
                endPeriod,
                sentiment,
                severity,
                effects, // Type-specific effects
                impacts
            });
        }

        this.closeEventModal();
        this.render();

        // Trigger pricing graph re-render to show event effects
        if (typeof AdminPricing !== 'undefined') {
            AdminPricing.render();
        }
    },

    /**
     * Delete event
     */
    deleteEvent(eventId) {
        if (!confirm('Delete this event?')) return;

        this.events = this.events.filter(e => e.id !== eventId);
        this.closeEventModal();
        this.render();

        // Trigger pricing graph re-render
        if (typeof AdminPricing !== 'undefined') {
            AdminPricing.render();
        }
    },

    /**
     * Get all events data
     */
    getEventsData() {
        return [...this.events];
    },

    /**
     * Load events from simulation data
     */
    loadEvents(events) {
        this.events = events ? [...events] : [];
        this.render();
    }
};

// Export for use
if (typeof window !== 'undefined') {
    window.AdminEvents = AdminEvents;
}
