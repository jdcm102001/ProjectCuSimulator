/**
 * MULTI-GRAPH - Renders 4 live graphs showing event impacts
 */

const MultiGraph = {
  // Baseline values (what admin sets)
  baseline: {
    prices: {
      lme: [8960, 9117, 9075, 9138, 9200, 9280],
      comex: [9344, 10229, 10187, 10210, 10300, 10380]
    },
    supplyDemand: {
      callao: [25, 25, 25, 25, 25, 25],
      antof: [90, 90, 90, 90, 90, 90],
      americas: [90, 90, 90, 90, 90, 90],
      asia: [85, 85, 85, 85, 85, 85],
      europe: [55, 55, 55, 55, 55, 55]
    },
    shipping: {
      fob: [73, 73, 73, 73, 73, 73],
      cif: [65, 65, 65, 65, 65, 65]
    },
    financial: {
      interest: [4.32, 4.32, 4.32, 4.32, 4.32, 4.32]
    }
  },

  // Effective values (baseline + events)
  effective: null,

  // Current events
  events: [],

  // Canvas contexts
  contexts: {},

  // Graph colors
  colors: {
    lme: '#3b82f6',
    comex: '#10b981',
    callao: '#f59e0b',
    antof: '#8b5cf6',
    americas: '#ec4899',
    asia: '#06b6d4',
    europe: '#84cc16',
    fob: '#f97316',
    cif: '#a855f7',
    interest: '#f43f5e'
  },

  // Line positions for click detection
  linePositions: {},

  /**
   * Initialize all graphs
   */
  init() {
    console.log('[MultiGraph] Initializing...');

    // Get canvas contexts
    this.contexts = {
      prices: document.getElementById('graphPrices')?.getContext('2d'),
      supplyDemand: document.getElementById('graphSupplyDemand')?.getContext('2d'),
      shipping: document.getElementById('graphShipping')?.getContext('2d'),
      financial: document.getElementById('graphFinancial')?.getContext('2d')
    };

    // Clone baseline to effective
    this.effective = JSON.parse(JSON.stringify(this.baseline));

    this.render();

    console.log('[MultiGraph] Initialized');
  },

  /**
   * Set baseline values from admin settings
   */
  setBaseline(data) {
    if (data.prices) {
      if (data.prices.lme) {
        this.baseline.prices.lme = Object.values(data.prices.lme).map(p => p.average || p);
      }
      if (data.prices.comex) {
        this.baseline.prices.comex = Object.values(data.prices.comex).map(p => p.average || p);
      }
    }

    this.recalculateEffective();
    this.render();
  },

  /**
   * Set events and recalculate
   */
  setEvents(events) {
    this.events = events || [];
    this.recalculateEffective();
  },

  /**
   * Recalculate effective values based on events
   */
  recalculateEffective() {
    // Start fresh from baseline
    this.effective = JSON.parse(JSON.stringify(this.baseline));

    // Apply each event's affects
    this.events.forEach(event => {
      const startMonth = Math.ceil(event.startPeriod / 2) - 1;  // 0-indexed

      event.affects.forEach(affect => {
        this.applyAffect(affect, startMonth);
      });
    });
  },

  /**
   * Apply a single affect to effective values
   */
  applyAffect(affect, startMonth) {
    const target = affect.target;
    const value = affect.value;

    // Map target to data structure
    const mapping = {
      'lme': { category: 'prices', line: 'lme', isPercent: true },
      'comex': { category: 'prices', line: 'comex', isPercent: true },
      'futures_1m': { category: 'prices', line: 'lme', isPercent: true },
      'futures_3m': { category: 'prices', line: 'lme', isPercent: true },
      'futures_6m': { category: 'prices', line: 'lme', isPercent: true },
      'callao_tonnage': { category: 'supplyDemand', line: 'callao', isPercent: true },
      'callao_premium': { category: 'supplyDemand', line: 'callao', isPercent: false },
      'antof_tonnage': { category: 'supplyDemand', line: 'antof', isPercent: true },
      'antof_premium': { category: 'supplyDemand', line: 'antof', isPercent: false },
      'americas_tonnage': { category: 'supplyDemand', line: 'americas', isPercent: true },
      'americas_premium': { category: 'supplyDemand', line: 'americas', isPercent: false },
      'asia_tonnage': { category: 'supplyDemand', line: 'asia', isPercent: true },
      'asia_premium': { category: 'supplyDemand', line: 'asia', isPercent: false },
      'europe_tonnage': { category: 'supplyDemand', line: 'europe', isPercent: true },
      'europe_premium': { category: 'supplyDemand', line: 'europe', isPercent: false },
      'fob_rate': { category: 'shipping', line: 'fob', isPercent: false },
      'cif_rate': { category: 'shipping', line: 'cif', isPercent: false },
      'travel_time': { category: 'shipping', line: 'fob', isPercent: false },
      'interest_rate': { category: 'financial', line: 'interest', isPercent: false },
      'loc_limit': { category: 'financial', line: 'interest', isPercent: false },
      'margin': { category: 'financial', line: 'interest', isPercent: false }
    };

    const map = mapping[target];
    if (!map) return;

    const data = this.effective[map.category][map.line];
    if (!data) return;

    // Apply from startMonth onward (permanent effect)
    for (let i = startMonth; i < 6; i++) {
      if (map.isPercent) {
        // Percentage change
        data[i] = data[i] * (1 + value / 100);
      } else {
        // Absolute change
        data[i] = data[i] + value;
      }
    }
  },

  /**
   * Render all graphs
   */
  render() {
    this.renderPrices();
    this.renderSupplyDemand();
    this.renderShipping();
    this.renderFinancial();
  },

  /**
   * Render prices graph
   */
  renderPrices() {
    const ctx = this.contexts.prices;
    if (!ctx) return;

    const canvas = ctx.canvas;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Get price range
    const allPrices = [
      ...this.baseline.prices.lme,
      ...this.baseline.prices.comex,
      ...this.effective.prices.lme,
      ...this.effective.prices.comex
    ];
    const minPrice = Math.min(...allPrices) * 0.95;
    const maxPrice = Math.max(...allPrices) * 1.05;

    // Draw grid
    this.drawGrid(ctx, canvas.width, canvas.height, minPrice, maxPrice, '$');

    // Baseline (dashed)
    this.drawLine(ctx, this.baseline.prices.lme, this.colors.lme, true, canvas.width, canvas.height, minPrice, maxPrice);
    this.drawLine(ctx, this.baseline.prices.comex, this.colors.comex, true, canvas.width, canvas.height, minPrice, maxPrice);

    // Effective (solid)
    const lmePoints = this.drawLine(ctx, this.effective.prices.lme, this.colors.lme, false, canvas.width, canvas.height, minPrice, maxPrice);
    const comexPoints = this.drawLine(ctx, this.effective.prices.comex, this.colors.comex, false, canvas.width, canvas.height, minPrice, maxPrice);

    this.linePositions.prices = {
      lme: lmePoints,
      comex: comexPoints
    };
  },

  /**
   * Render supply/demand graph
   */
  renderSupplyDemand() {
    const ctx = this.contexts.supplyDemand;
    if (!ctx) return;

    const canvas = ctx.canvas;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Get range
    const allValues = [
      ...Object.values(this.baseline.supplyDemand).flat(),
      ...Object.values(this.effective.supplyDemand).flat()
    ];
    const minVal = 0;
    const maxVal = Math.max(...allValues) * 1.2;

    // Draw grid
    this.drawGrid(ctx, canvas.width, canvas.height, minVal, maxVal, 'MT');

    const lines = ['callao', 'antof', 'americas', 'asia', 'europe'];

    this.linePositions.supplyDemand = {};

    lines.forEach(line => {
      // Baseline (dashed)
      this.drawLine(ctx, this.baseline.supplyDemand[line], this.colors[line], true, canvas.width, canvas.height, minVal, maxVal, 0.3);
      // Effective (solid)
      const points = this.drawLine(ctx, this.effective.supplyDemand[line], this.colors[line], false, canvas.width, canvas.height, minVal, maxVal);
      this.linePositions.supplyDemand[line + '_tonnage'] = points;
    });
  },

  /**
   * Render shipping graph
   */
  renderShipping() {
    const ctx = this.contexts.shipping;
    if (!ctx) return;

    const canvas = ctx.canvas;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Get range
    const allValues = [
      ...this.baseline.shipping.fob,
      ...this.baseline.shipping.cif,
      ...this.effective.shipping.fob,
      ...this.effective.shipping.cif
    ];
    const minVal = Math.min(...allValues) * 0.8;
    const maxVal = Math.max(...allValues) * 1.2;

    // Draw grid
    this.drawGrid(ctx, canvas.width, canvas.height, minVal, maxVal, '$/MT');

    // Baseline (dashed)
    this.drawLine(ctx, this.baseline.shipping.fob, this.colors.fob, true, canvas.width, canvas.height, minVal, maxVal);
    this.drawLine(ctx, this.baseline.shipping.cif, this.colors.cif, true, canvas.width, canvas.height, minVal, maxVal);

    // Effective (solid)
    const fobPoints = this.drawLine(ctx, this.effective.shipping.fob, this.colors.fob, false, canvas.width, canvas.height, minVal, maxVal);
    const cifPoints = this.drawLine(ctx, this.effective.shipping.cif, this.colors.cif, false, canvas.width, canvas.height, minVal, maxVal);

    this.linePositions.shipping = { fob_rate: fobPoints, cif_rate: cifPoints };
  },

  /**
   * Render financial graph
   */
  renderFinancial() {
    const ctx = this.contexts.financial;
    if (!ctx) return;

    const canvas = ctx.canvas;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Get range
    const allValues = [
      ...this.baseline.financial.interest,
      ...this.effective.financial.interest
    ];
    const minVal = Math.min(...allValues) * 0.8;
    const maxVal = Math.max(...allValues) * 1.2;

    // Draw grid
    this.drawGrid(ctx, canvas.width, canvas.height, minVal, maxVal, '%');

    // Baseline (dashed)
    this.drawLine(ctx, this.baseline.financial.interest, this.colors.interest, true, canvas.width, canvas.height, minVal, maxVal);

    // Effective (solid)
    const interestPoints = this.drawLine(ctx, this.effective.financial.interest, this.colors.interest, false, canvas.width, canvas.height, minVal, maxVal);

    this.linePositions.financial = { interest_rate: interestPoints };
  },

  /**
   * Draw grid lines
   */
  drawGrid(ctx, width, height, minVal, maxVal, unit) {
    const padding = { left: 50, right: 20, top: 10, bottom: 25 };
    const graphWidth = width - padding.left - padding.right;
    const graphHeight = height - padding.top - padding.bottom;

    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#666';
    ctx.font = '10px sans-serif';

    // Horizontal grid lines (5 lines)
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (graphHeight / 4) * i;
      const value = maxVal - ((maxVal - minVal) / 4) * i;

      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      // Value label
      ctx.textAlign = 'right';
      ctx.fillText(this.formatValue(value, unit), padding.left - 5, y + 4);
    }

    // Month labels
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN'];
    ctx.textAlign = 'center';

    for (let i = 0; i < 6; i++) {
      const x = padding.left + (graphWidth / 5) * i;
      ctx.fillText(months[i], x, height - 5);
    }
  },

  /**
   * Draw a line on the graph
   */
  drawLine(ctx, data, color, dashed, width, height, minVal, maxVal, alpha = 1) {
    const padding = { left: 50, right: 20, top: 10, bottom: 25 };
    const graphWidth = width - padding.left - padding.right;
    const graphHeight = height - padding.top - padding.bottom;

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = dashed ? 1.5 : 2.5;
    ctx.globalAlpha = alpha;

    if (dashed) {
      ctx.setLineDash([5, 3]);
    } else {
      ctx.setLineDash([]);
    }

    const points = [];

    data.forEach((value, index) => {
      const x = padding.left + (graphWidth / 5) * index;
      const y = padding.top + graphHeight - ((value - minVal) / (maxVal - minVal)) * graphHeight;

      points.push({ x, y, value, index });

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);

    // Draw points (only for effective lines)
    if (!dashed) {
      points.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      });
    }

    return points;
  },

  /**
   * Format value for display
   */
  formatValue(value, unit) {
    if (unit === '$') {
      return '$' + Math.round(value).toLocaleString();
    } else if (unit === '%') {
      return value.toFixed(2) + '%';
    } else if (unit === 'MT') {
      return Math.round(value) + ' MT';
    } else if (unit === '$/MT') {
      return '$' + Math.round(value);
    }
    return value.toString();
  },

  /**
   * Get which line was clicked
   */
  getLineAtPoint(graphType, x, y, canvasWidth, canvasHeight) {
    const positions = this.linePositions[graphType];
    if (!positions) return null;

    const threshold = 15;

    for (const [lineKey, points] of Object.entries(positions)) {
      if (!points) continue;

      for (const point of points) {
        const dist = Math.sqrt(Math.pow(x - point.x, 2) + Math.pow(y - point.y, 2));
        if (dist < threshold) {
          return lineKey;
        }
      }
    }

    return null;
  }
};

// Export
window.MultiGraph = MultiGraph;
