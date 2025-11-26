/**
 * TIMELINE GRAPHS - Mini graphs showing event impacts
 * Displays baseline vs effective values in the graphs panel
 */

const TimelineGraphs = {
  // Baseline values (monthly averages)
  baseline: {
    lme: [8960, 9117, 9075, 9138, 9200, 9280],
    comex: [9344, 10229, 10187, 10210, 10300, 10380],
    callaoTonnage: [25, 25, 25, 25, 25, 25],
    antofTonnage: [90, 90, 90, 90, 90, 90],
    demandTonnage: [50, 50, 50, 50, 50, 50],
    fobRate: [73, 73, 73, 73, 73, 73],
    travelTime: [21, 21, 21, 21, 21, 21],
    interestRate: [4.32, 4.32, 4.32, 4.32, 4.32, 4.32]
  },

  /**
   * Render all graphs
   */
  render(events) {
    this.renderPriceGraph(events);
    this.renderSupplyGraph(events);
    this.renderLogisticsGraph(events);
    this.renderFinancialGraph(events);
  },

  /**
   * Calculate effective values by applying event effects
   * Effects are cumulative and apply from start period onward within the event duration
   */
  calculateEffective(baselineArray, events, effectKey, trackType, isAdditive = false) {
    const effective = [...baselineArray];

    events.forEach(event => {
      if (!event.tracks || !event.tracks[trackType]) return;

      const effects = event.tracks[trackType].effects;
      const value = effects[effectKey];
      if (value === undefined || value === 0) return;

      // Convert period to month index (periods 1-2 = month 0, 3-4 = month 1, etc.)
      const startMonth = Math.ceil(event.startPeriod / 2) - 1;
      const endMonth = Math.ceil(event.endPeriod / 2) - 1;

      // Apply effect for duration of event
      for (let i = startMonth; i <= endMonth && i < 6; i++) {
        if (isAdditive) {
          // Additive change (for interest rates, absolute values)
          effective[i] = effective[i] + value;
        } else {
          // Percentage change
          effective[i] = effective[i] * (1 + value / 100);
        }
      }
    });

    return effective;
  },

  /**
   * Render price graph (LME and COMEX)
   */
  renderPriceGraph(events) {
    const canvas = document.getElementById('canvasMiniPrice');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Calculate effective prices from price track effects
    const lmeEffective = this.calculateEffective(this.baseline.lme, events, 'lme', 'price');
    const comexEffective = this.calculateEffective(this.baseline.comex, events, 'comex', 'price');

    // Also apply news effects if they affect price
    events.forEach(event => {
      if (!event.tracks || !event.tracks.news) return;
      const newsEffects = event.tracks.news.effects;
      if (!newsEffects.affectsPrice) return;

      const startMonth = Math.ceil(event.startPeriod / 2) - 1;
      const endMonth = Math.ceil(event.endPeriod / 2) - 1;

      for (let i = startMonth; i <= endMonth && i < 6; i++) {
        if (newsEffects.lme) {
          lmeEffective[i] = lmeEffective[i] * (1 + newsEffects.lme / 100);
        }
        if (newsEffects.comex) {
          comexEffective[i] = comexEffective[i] * (1 + newsEffects.comex / 100);
        }
      }
    });

    this.drawMiniGraph(ctx, canvas.width, canvas.height, [
      { data: this.baseline.lme, color: '#3b82f6', dashed: true, label: 'LME Base' },
      { data: lmeEffective, color: '#3b82f6', dashed: false, label: 'LME Eff' },
      { data: this.baseline.comex, color: '#10b981', dashed: true, label: 'COMEX Base' },
      { data: comexEffective, color: '#10b981', dashed: false, label: 'COMEX Eff' }
    ]);
  },

  /**
   * Render supply/demand graph
   */
  renderSupplyGraph(events) {
    const canvas = document.getElementById('canvasMiniSupply');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Calculate effective tonnage from supply track
    const supplyEffective = this.calculateEffective(this.baseline.callaoTonnage, events, 'tonnage', 'supply');

    // Calculate effective demand tonnage
    const demandEffective = this.calculateEffective(this.baseline.demandTonnage, events, 'tonnage', 'demand');

    // Also apply news effects
    events.forEach(event => {
      if (!event.tracks || !event.tracks.news) return;
      const newsEffects = event.tracks.news.effects;

      const startMonth = Math.ceil(event.startPeriod / 2) - 1;
      const endMonth = Math.ceil(event.endPeriod / 2) - 1;

      for (let i = startMonth; i <= endMonth && i < 6; i++) {
        if (newsEffects.affectsSupply && newsEffects.supplyTonnage) {
          supplyEffective[i] = supplyEffective[i] * (1 + newsEffects.supplyTonnage / 100);
        }
        if (newsEffects.affectsDemand && newsEffects.demandTonnage) {
          demandEffective[i] = demandEffective[i] * (1 + newsEffects.demandTonnage / 100);
        }
      }
    });

    this.drawMiniGraph(ctx, canvas.width, canvas.height, [
      { data: this.baseline.callaoTonnage, color: '#f59e0b', dashed: true, label: 'Supply Base' },
      { data: supplyEffective, color: '#f59e0b', dashed: false, label: 'Supply Eff' },
      { data: this.baseline.demandTonnage, color: '#8b5cf6', dashed: true, label: 'Demand Base' },
      { data: demandEffective, color: '#8b5cf6', dashed: false, label: 'Demand Eff' }
    ], 0, 100);
  },

  /**
   * Render logistics/shipping graph
   */
  renderLogisticsGraph(events) {
    const canvas = document.getElementById('canvasMiniLogistics');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Calculate effective FOB rate
    const fobEffective = this.calculateEffective(this.baseline.fobRate, events, 'fobRate', 'logistics', true);

    // Calculate effective travel time
    const travelEffective = this.calculateEffective(this.baseline.travelTime, events, 'travelTime', 'logistics', true);

    this.drawMiniGraph(ctx, canvas.width, canvas.height, [
      { data: this.baseline.fobRate, color: '#f97316', dashed: true, label: 'FOB Base' },
      { data: fobEffective, color: '#f97316', dashed: false, label: 'FOB Eff' },
      { data: this.baseline.travelTime.map(v => v * 3), color: '#06b6d4', dashed: true, label: 'Travel Base' },
      { data: travelEffective.map(v => v * 3), color: '#06b6d4', dashed: false, label: 'Travel Eff' }
    ], 40, 120);
  },

  /**
   * Render financial graph
   */
  renderFinancialGraph(events) {
    const canvas = document.getElementById('canvasMiniFinancial');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Calculate effective interest rate (additive)
    const interestEffective = this.calculateEffective(this.baseline.interestRate, events, 'interestRate', 'financial', true);

    // Also apply news effects
    events.forEach(event => {
      if (!event.tracks || !event.tracks.news) return;
      const newsEffects = event.tracks.news.effects;
      if (!newsEffects.affectsFinancial) return;

      const startMonth = Math.ceil(event.startPeriod / 2) - 1;
      const endMonth = Math.ceil(event.endPeriod / 2) - 1;

      for (let i = startMonth; i <= endMonth && i < 6; i++) {
        if (newsEffects.interestRate) {
          interestEffective[i] = interestEffective[i] + newsEffects.interestRate;
        }
      }
    });

    this.drawMiniGraph(ctx, canvas.width, canvas.height, [
      { data: this.baseline.interestRate, color: '#f43f5e', dashed: true, label: 'Interest Base' },
      { data: interestEffective, color: '#f43f5e', dashed: false, label: 'Interest Eff' }
    ], 3, 7);
  },

  /**
   * Draw a mini graph with multiple lines
   */
  drawMiniGraph(ctx, width, height, lines, minVal, maxVal) {
    ctx.clearRect(0, 0, width, height);

    // Calculate range if not provided
    if (minVal === undefined || maxVal === undefined) {
      const allValues = lines.flatMap(l => l.data);
      minVal = Math.min(...allValues) * 0.95;
      maxVal = Math.max(...allValues) * 1.05;
    }

    // Ensure we have a valid range
    if (maxVal === minVal) {
      minVal -= 1;
      maxVal += 1;
    }

    const padding = { left: 5, right: 5, top: 5, bottom: 5 };
    const graphWidth = width - padding.left - padding.right;
    const graphHeight = height - padding.top - padding.bottom;

    // Draw light grid
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 6; i++) {
      const x = padding.left + (i / 6) * graphWidth;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, height - padding.bottom);
      ctx.stroke();
    }

    // Draw lines
    lines.forEach(line => {
      ctx.beginPath();
      ctx.strokeStyle = line.color;
      ctx.lineWidth = line.dashed ? 1 : 2;
      ctx.setLineDash(line.dashed ? [3, 3] : []);
      ctx.globalAlpha = line.dashed ? 0.5 : 1;

      line.data.forEach((value, i) => {
        const x = padding.left + (i / 5) * graphWidth;
        const y = padding.top + graphHeight - ((value - minVal) / (maxVal - minVal)) * graphHeight;

        // Clamp y to valid range
        const clampedY = Math.max(padding.top, Math.min(height - padding.bottom, y));

        if (i === 0) ctx.moveTo(x, clampedY);
        else ctx.lineTo(x, clampedY);
      });

      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.setLineDash([]);
    });
  },

  /**
   * Set baseline values (can be called from admin panel to sync with pricing data)
   */
  setBaseline(data) {
    if (data.lme) this.baseline.lme = data.lme;
    if (data.comex) this.baseline.comex = data.comex;
    if (data.callaoTonnage) this.baseline.callaoTonnage = data.callaoTonnage;
    if (data.antofTonnage) this.baseline.antofTonnage = data.antofTonnage;
    if (data.demandTonnage) this.baseline.demandTonnage = data.demandTonnage;
    if (data.fobRate) this.baseline.fobRate = data.fobRate;
    if (data.travelTime) this.baseline.travelTime = data.travelTime;
    if (data.interestRate) this.baseline.interestRate = data.interestRate;
  }
};

// Export
window.TimelineGraphs = TimelineGraphs;
