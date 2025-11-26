/**
 * Admin Pricing Module
 * Interactive graph for setting LME/COMEX spot prices
 */

const AdminPricing = {
    canvas: null,
    ctx: null,
    isDragging: false,
    dragPoint: null,

    // Graph dimensions
    padding: { top: 40, right: 40, bottom: 50, left: 70 },

    // Price range
    minPrice: 7500,
    maxPrice: 12000,

    // Months
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],

    // Current prices (will be loaded from simulation data)
    prices: {
        lme: {},
        comex: {}
    },

    // Point radius for interaction
    pointRadius: 8,
    hoverRadius: 12,

    // Colors
    colors: {
        lme: '#4a9eff',
        comex: '#2ed573',
        lmeBaseline: '#4a9eff80',  // Semi-transparent for dashed baseline
        comexBaseline: '#2ed57380',
        grid: '#333',
        text: '#888',
        background: '#151525'
    },

    // Track effective prices (baseline + events)
    effectivePrices: {
        lme: {},
        comex: {}
    },

    /**
     * Initialize the pricing module
     */
    init(simData) {
        this.canvas = document.getElementById('priceGraph');
        if (!this.canvas) {
            console.error('[AdminPricing] Canvas not found');
            return;
        }

        this.ctx = this.canvas.getContext('2d');

        // Load prices from simulation data
        this.loadPrices(simData);

        // Set up event listeners
        this.setupEventListeners();

        // Initial render
        this.render();

        // Set up input field listeners
        this.setupInputListeners();

        console.log('[AdminPricing] Initialized');
    },

    /**
     * Load prices from simulation data
     */
    loadPrices(simData) {
        if (!simData || !simData.pricing) {
            // Use defaults
            simData = AdminStorage.getDefaultSimulation();
        }

        // Copy prices
        this.prices.lme = {};
        this.prices.comex = {};

        for (let month = 1; month <= 6; month++) {
            this.prices.lme[month] = { ...simData.pricing.lme[month] };
            this.prices.comex[month] = { ...simData.pricing.comex[month] };
        }

        // Update input fields
        this.updateInputFields();
    },

    /**
     * Set up canvas event listeners
     */
    setupEventListeners() {
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.canvas.addEventListener('mouseleave', (e) => this.onMouseUp(e));
    },

    /**
     * Set up input field listeners
     */
    setupInputListeners() {
        for (let month = 1; month <= 6; month++) {
            // LME inputs
            const lmeAvgInput = document.querySelector(`.month-prices[data-month="${month}"] .lme-avg`);
            const lmeEarlyInput = document.querySelector(`.month-prices[data-month="${month}"] .lme-early`);
            const lmeLateInput = document.querySelector(`.month-prices[data-month="${month}"] .lme-late`);

            if (lmeAvgInput) {
                lmeAvgInput.addEventListener('change', () => this.onAvgChange('lme', month, parseFloat(lmeAvgInput.value)));
            }
            if (lmeEarlyInput) {
                lmeEarlyInput.addEventListener('change', () => this.onEarlyLateChange('lme', month, 'early', parseFloat(lmeEarlyInput.value)));
            }
            if (lmeLateInput) {
                lmeLateInput.addEventListener('change', () => this.onEarlyLateChange('lme', month, 'late', parseFloat(lmeLateInput.value)));
            }

            // COMEX inputs
            const comexAvgInput = document.querySelector(`.month-prices[data-month="${month}"] .comex-avg`);
            const comexEarlyInput = document.querySelector(`.month-prices[data-month="${month}"] .comex-early`);
            const comexLateInput = document.querySelector(`.month-prices[data-month="${month}"] .comex-late`);

            if (comexAvgInput) {
                comexAvgInput.addEventListener('change', () => this.onAvgChange('comex', month, parseFloat(comexAvgInput.value)));
            }
            if (comexEarlyInput) {
                comexEarlyInput.addEventListener('change', () => this.onEarlyLateChange('comex', month, 'early', parseFloat(comexEarlyInput.value)));
            }
            if (comexLateInput) {
                comexLateInput.addEventListener('change', () => this.onEarlyLateChange('comex', month, 'late', parseFloat(comexLateInput.value)));
            }
        }
    },

    /**
     * Handle average price change from input
     */
    onAvgChange(exchange, month, newAvg) {
        if (isNaN(newAvg) || newAvg <= 0) return;

        const price = this.prices[exchange][month];
        const oldAvg = price.average;
        const diff = newAvg - oldAvg;

        // Adjust early and late proportionally
        price.average = newAvg;
        price.early = Math.round(price.early + diff);
        price.late = Math.round(price.late + diff);

        this.updateInputFields();
        this.render();
    },

    /**
     * Handle early/late price change from input
     */
    onEarlyLateChange(exchange, month, which, newValue) {
        if (isNaN(newValue) || newValue <= 0) return;

        const price = this.prices[exchange][month];

        if (which === 'early') {
            price.early = newValue;
            // Adjust late to maintain average
            price.late = (price.average * 2) - price.early;
        } else {
            price.late = newValue;
            // Adjust early to maintain average
            price.early = (price.average * 2) - price.late;
        }

        this.updateInputFields();
        this.render();
    },

    /**
     * Update all input fields with current prices
     */
    updateInputFields() {
        for (let month = 1; month <= 6; month++) {
            // LME
            const lmeAvgInput = document.querySelector(`.month-prices[data-month="${month}"] .lme-avg`);
            const lmeEarlyInput = document.querySelector(`.month-prices[data-month="${month}"] .lme-early`);
            const lmeLateInput = document.querySelector(`.month-prices[data-month="${month}"] .lme-late`);

            if (lmeAvgInput) lmeAvgInput.value = this.prices.lme[month].average;
            if (lmeEarlyInput) lmeEarlyInput.value = this.prices.lme[month].early;
            if (lmeLateInput) lmeLateInput.value = this.prices.lme[month].late;

            // COMEX
            const comexAvgInput = document.querySelector(`.month-prices[data-month="${month}"] .comex-avg`);
            const comexEarlyInput = document.querySelector(`.month-prices[data-month="${month}"] .comex-early`);
            const comexLateInput = document.querySelector(`.month-prices[data-month="${month}"] .comex-late`);

            if (comexAvgInput) comexAvgInput.value = this.prices.comex[month].average;
            if (comexEarlyInput) comexEarlyInput.value = this.prices.comex[month].early;
            if (comexLateInput) comexLateInput.value = this.prices.comex[month].late;
        }
    },

    /**
     * Get mouse position relative to canvas
     */
    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    },

    /**
     * Convert price to Y coordinate
     */
    priceToY(price) {
        const graphHeight = this.canvas.height - this.padding.top - this.padding.bottom;
        const priceRange = this.maxPrice - this.minPrice;
        return this.padding.top + graphHeight - ((price - this.minPrice) / priceRange * graphHeight);
    },

    /**
     * Convert Y coordinate to price
     */
    yToPrice(y) {
        const graphHeight = this.canvas.height - this.padding.top - this.padding.bottom;
        const priceRange = this.maxPrice - this.minPrice;
        const price = this.minPrice + ((this.padding.top + graphHeight - y) / graphHeight * priceRange);
        return Math.round(Math.max(this.minPrice, Math.min(this.maxPrice, price)));
    },

    /**
     * Get X coordinate for month
     */
    monthToX(month) {
        const graphWidth = this.canvas.width - this.padding.left - this.padding.right;
        return this.padding.left + ((month - 1) / 5 * graphWidth);
    },

    /**
     * Find point at mouse position
     */
    findPointAtPos(pos) {
        for (const exchange of ['lme', 'comex']) {
            for (let month = 1; month <= 6; month++) {
                const x = this.monthToX(month);
                const y = this.priceToY(this.prices[exchange][month].average);
                const dist = Math.sqrt(Math.pow(pos.x - x, 2) + Math.pow(pos.y - y, 2));

                if (dist <= this.hoverRadius) {
                    return { exchange, month };
                }
            }
        }
        return null;
    },

    /**
     * Mouse down handler
     */
    onMouseDown(e) {
        const pos = this.getMousePos(e);
        const point = this.findPointAtPos(pos);

        if (point) {
            this.isDragging = true;
            this.dragPoint = point;
            this.canvas.style.cursor = 'grabbing';
        }
    },

    /**
     * Mouse move handler
     */
    onMouseMove(e) {
        const pos = this.getMousePos(e);

        if (this.isDragging && this.dragPoint) {
            // Update price
            const newPrice = this.yToPrice(pos.y);
            const price = this.prices[this.dragPoint.exchange][this.dragPoint.month];
            const oldAvg = price.average;
            const diff = newPrice - oldAvg;

            price.average = newPrice;
            price.early = Math.round(price.early + diff);
            price.late = Math.round(price.late + diff);

            this.updateInputFields();
            this.render();
        } else {
            // Check for hover
            const point = this.findPointAtPos(pos);
            this.canvas.style.cursor = point ? 'grab' : 'crosshair';
        }
    },

    /**
     * Mouse up handler
     */
    onMouseUp(e) {
        this.isDragging = false;
        this.dragPoint = null;
        this.canvas.style.cursor = 'crosshair';
    },

    /**
     * Calculate effective prices with events applied
     */
    calculateEffectivePrices() {
        // Get events from AdminEvents
        const events = typeof AdminEvents !== 'undefined' ? AdminEvents.getEventsData() : [];

        // Calculate effective prices
        this.effectivePrices = AdminStorage.calculateEffectivePrices(this.prices, events);
    },

    /**
     * Check if events affect pricing
     */
    hasEventImpacts() {
        const events = typeof AdminEvents !== 'undefined' ? AdminEvents.getEventsData() : [];
        // Filter for price-affecting events
        return events.some(e => e.type === 'price' || e.sentiment);
    },

    /**
     * Render the graph
     */
    render() {
        if (!this.ctx) return;

        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Calculate effective prices with events
        this.calculateEffectivePrices();

        // Clear
        ctx.fillStyle = this.colors.background;
        ctx.fillRect(0, 0, width, height);

        // Draw grid
        this.drawGrid();

        // If there are events affecting prices, draw baseline (dashed) and effective (solid)
        if (this.hasEventImpacts()) {
            // Draw baseline (dashed) lines first
            this.drawBaselineLine('lme');
            this.drawBaselineLine('comex');

            // Draw effective (solid) lines
            this.drawEffectiveLine('lme');
            this.drawEffectiveLine('comex');

            // Draw legend
            this.drawLegend();
        } else {
            // No events - just draw normal lines
            this.drawLine('lme');
            this.drawLine('comex');
        }

        // Draw points (on baseline prices since those are draggable)
        this.drawPoints('lme');
        this.drawPoints('comex');

        // Draw dragging label
        if (this.isDragging && this.dragPoint) {
            this.drawDragLabel();
        }
    },

    /**
     * Draw grid lines
     */
    drawGrid() {
        const ctx = this.ctx;
        const graphWidth = this.canvas.width - this.padding.left - this.padding.right;
        const graphHeight = this.canvas.height - this.padding.top - this.padding.bottom;

        ctx.strokeStyle = this.colors.grid;
        ctx.lineWidth = 1;
        ctx.font = '12px Arial';
        ctx.fillStyle = this.colors.text;

        // Horizontal lines (price levels)
        const priceStep = 500;
        for (let price = this.minPrice; price <= this.maxPrice; price += priceStep) {
            const y = this.priceToY(price);

            ctx.beginPath();
            ctx.moveTo(this.padding.left, y);
            ctx.lineTo(this.canvas.width - this.padding.right, y);
            ctx.stroke();

            // Price label
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            ctx.fillText('$' + price.toLocaleString(), this.padding.left - 10, y);
        }

        // Vertical lines (months)
        for (let month = 1; month <= 6; month++) {
            const x = this.monthToX(month);

            ctx.beginPath();
            ctx.moveTo(x, this.padding.top);
            ctx.lineTo(x, this.canvas.height - this.padding.bottom);
            ctx.stroke();

            // Month label
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(this.months[month - 1], x, this.canvas.height - this.padding.bottom + 10);
        }
    },

    /**
     * Draw price line (normal, solid)
     */
    drawLine(exchange) {
        const ctx = this.ctx;
        ctx.strokeStyle = this.colors[exchange];
        ctx.lineWidth = 2;
        ctx.setLineDash([]);

        ctx.beginPath();
        for (let month = 1; month <= 6; month++) {
            const x = this.monthToX(month);
            const y = this.priceToY(this.prices[exchange][month].average);

            if (month === 1) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
    },

    /**
     * Draw baseline price line (dashed, semi-transparent)
     */
    drawBaselineLine(exchange) {
        const ctx = this.ctx;
        ctx.strokeStyle = this.colors[exchange + 'Baseline'];
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]); // Dashed line pattern

        ctx.beginPath();
        for (let month = 1; month <= 6; month++) {
            const x = this.monthToX(month);
            const y = this.priceToY(this.prices[exchange][month].average);

            if (month === 1) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
        ctx.setLineDash([]); // Reset dash
    },

    /**
     * Draw effective price line (solid, with event impacts)
     */
    drawEffectiveLine(exchange) {
        const ctx = this.ctx;
        ctx.strokeStyle = this.colors[exchange];
        ctx.lineWidth = 3;
        ctx.setLineDash([]);

        ctx.beginPath();
        for (let month = 1; month <= 6; month++) {
            const x = this.monthToX(month);
            const y = this.priceToY(this.effectivePrices[exchange][month].average);

            if (month === 1) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
    },

    /**
     * Draw legend explaining baseline vs effective
     */
    drawLegend() {
        const ctx = this.ctx;
        const x = this.canvas.width - this.padding.right - 150;
        const y = this.padding.top + 10;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(x - 10, y - 5, 160, 55);

        // Baseline (dashed) legend
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 3]);
        ctx.beginPath();
        ctx.moveTo(x, y + 10);
        ctx.lineTo(x + 30, y + 10);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#aaa';
        ctx.font = '11px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('Baseline (Admin Set)', x + 40, y + 14);

        // Effective (solid) legend
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x, y + 35);
        ctx.lineTo(x + 30, y + 35);
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.fillText('Effective (+ Events)', x + 40, y + 39);
    },

    /**
     * Draw draggable points
     */
    drawPoints(exchange) {
        const ctx = this.ctx;

        for (let month = 1; month <= 6; month++) {
            const x = this.monthToX(month);
            const y = this.priceToY(this.prices[exchange][month].average);

            // Outer circle (glow effect)
            ctx.beginPath();
            ctx.arc(x, y, this.pointRadius + 2, 0, Math.PI * 2);
            ctx.fillStyle = this.colors[exchange] + '40';
            ctx.fill();

            // Inner circle
            ctx.beginPath();
            ctx.arc(x, y, this.pointRadius, 0, Math.PI * 2);
            ctx.fillStyle = this.colors[exchange];
            ctx.fill();

            // Center dot
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();
        }
    },

    /**
     * Draw label while dragging
     */
    drawDragLabel() {
        if (!this.dragPoint) return;

        const ctx = this.ctx;
        const price = this.prices[this.dragPoint.exchange][this.dragPoint.month].average;
        const x = this.monthToX(this.dragPoint.month);
        const y = this.priceToY(price);

        const label = '$' + price.toLocaleString();
        const labelWidth = ctx.measureText(label).width + 20;

        // Background
        ctx.fillStyle = this.colors[this.dragPoint.exchange];
        ctx.beginPath();
        ctx.roundRect(x - labelWidth / 2, y - 35, labelWidth, 25, 4);
        ctx.fill();

        // Text
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x, y - 22);
    },

    /**
     * Get current prices data
     */
    getPricesData() {
        return {
            lme: { ...this.prices.lme },
            comex: { ...this.prices.comex }
        };
    },

    /**
     * Render mini preview graph (non-interactive)
     */
    renderMiniPreview(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `<canvas id="miniPriceGraph" width="500" height="150"></canvas>`;
        const canvas = document.getElementById('miniPriceGraph');
        const ctx = canvas.getContext('2d');

        const padding = { top: 20, right: 20, bottom: 30, left: 50 };

        // Clear
        ctx.fillStyle = '#0d0d1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw simplified lines
        for (const exchange of ['lme', 'comex']) {
            ctx.strokeStyle = this.colors[exchange];
            ctx.lineWidth = 2;

            ctx.beginPath();
            for (let month = 1; month <= 6; month++) {
                const graphWidth = canvas.width - padding.left - padding.right;
                const graphHeight = canvas.height - padding.top - padding.bottom;
                const priceRange = this.maxPrice - this.minPrice;

                const x = padding.left + ((month - 1) / 5 * graphWidth);
                const y = padding.top + graphHeight - ((this.prices[exchange][month].average - this.minPrice) / priceRange * graphHeight);

                if (month === 1) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.stroke();
        }

        // Month labels
        ctx.fillStyle = '#888';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        for (let month = 1; month <= 6; month++) {
            const graphWidth = canvas.width - padding.left - padding.right;
            const x = padding.left + ((month - 1) / 5 * graphWidth);
            ctx.fillText(this.months[month - 1], x, canvas.height - 10);
        }
    }
};
