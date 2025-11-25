/**
 * Enhanced Debug Panel for Perseverance Trading Simulator
 *
 * For TESTING/DEVELOPMENT only - shows real-time game state
 * Toggle with ~ (tilde) key or DEBUG button
 */

const EnhancedDebugPanel = {
    visible: false,
    element: null,
    collapsed: false,

    /**
     * Initialize the debug panel
     */
    init() {
        // Create panel element
        this.element = document.createElement('div');
        this.element.id = 'enhancedDebugPanel';
        this.element.className = 'debug-panel';
        this.element.innerHTML = `
            <div class="debug-panel-header" onclick="EnhancedDebugPanel.toggleCollapse()">
                <span>DEBUG PANEL</span>
                <div class="debug-controls">
                    <button onclick="EnhancedDebugPanel.refresh(); event.stopPropagation();">↻</button>
                    <button onclick="EnhancedDebugPanel.toggle(); event.stopPropagation();">×</button>
                </div>
            </div>
            <div class="debug-panel-content" id="enhancedDebugContent"></div>
        `;
        document.body.appendChild(this.element);

        // Add keyboard listener for ~ key
        document.addEventListener('keydown', (e) => {
            if (e.key === '`' || e.key === '~') {
                this.toggle();
            }
        });

        // Restore state from sessionStorage
        const savedState = sessionStorage.getItem('debugPanelVisible');
        if (savedState === 'true') {
            this.visible = true;
            this.element.style.display = 'block';
        }

        const savedCollapsed = sessionStorage.getItem('debugPanelCollapsed');
        if (savedCollapsed === 'true') {
            this.collapsed = true;
            this.element.classList.add('collapsed');
        }

        // Initial render
        this.update();

        console.log('[DEBUG] Enhanced Debug Panel initialized. Press ~ to toggle.');
    },

    /**
     * Toggle visibility
     */
    toggle() {
        this.visible = !this.visible;
        this.element.style.display = this.visible ? 'block' : 'none';
        sessionStorage.setItem('debugPanelVisible', this.visible);
        if (this.visible) {
            this.update();
        }
    },

    /**
     * Toggle collapse state
     */
    toggleCollapse() {
        this.collapsed = !this.collapsed;
        this.element.classList.toggle('collapsed', this.collapsed);
        sessionStorage.setItem('debugPanelCollapsed', this.collapsed);
    },

    /**
     * Refresh/update the panel
     */
    refresh() {
        this.update();
    },

    /**
     * Update panel content
     */
    update() {
        if (!this.visible || this.collapsed) return;

        const content = document.getElementById('enhancedDebugContent');
        if (!content) return;

        let html = '';

        html += this.renderTimeSystemStatus();
        html += this.renderPositionTrackingStatus();
        html += this.renderFuturesStatus();
        html += this.renderFinancialStatus();
        html += this.renderM1RepricingStatus();
        html += this.renderSaveLoadStatus();
        html += this.renderScenarioEventStatus();
        html += this.renderMarketSimplificationStatus();

        content.innerHTML = html;
    },

    /**
     * Render Time System Status section
     */
    renderTimeSystemStatus() {
        const timeInfo = typeof TimeManager !== 'undefined' ? TimeManager.getMonthPeriod() : null;

        if (!timeInfo) {
            return `
                <div class="debug-section">
                    <h3>TIME SYSTEM STATUS</h3>
                    <div class="status-bad">❌ TimeManager not found!</div>
                </div>
            `;
        }

        // Test calculations
        const testTurn = TimeManager.getTurnNumber(2, 1); // March Early should be 5
        const testMonthPeriod = TimeManager.getMonthPeriod(5); // Should be March Early
        const isBoundary = TimeManager.isMonthBoundary();

        const turnCalcOK = testTurn === 5;
        const monthPeriodOK = testMonthPeriod.monthName === 'March' && testMonthPeriod.period === 1;
        const boundaryOK = (timeInfo.period === 2) === isBoundary;

        return `
            <div class="debug-section">
                <h3>TIME SYSTEM STATUS</h3>
                <pre>
Current Turn: ${TimeManager.currentTurn} / ${TimeManager.TOTAL_TURNS}
Current Month: ${timeInfo.monthIndex + 1} - ${timeInfo.monthName}
Current Period: ${timeInfo.period} - ${timeInfo.periodName}
Display String: ${TimeManager.getDisplayString()}
Remaining Turns: ${TimeManager.getRemainingTurns()}

<span class="status-header">Turn Calculations Working?</span>
${this.statusIcon(turnCalcOK)} getTurnNumber(2, 1) → ${testTurn} (expected: 5)
${this.statusIcon(monthPeriodOK)} getMonthPeriod(5) → ${testMonthPeriod.monthName} ${testMonthPeriod.periodName} (expected: March Early)
${this.statusIcon(boundaryOK)} isMonthBoundary() → ${isBoundary} (period=${timeInfo.period}, should be ${timeInfo.period === 2})
                </pre>
            </div>
        `;
    },

    /**
     * Render Position Tracking Status section
     */
    renderPositionTrackingStatus() {
        const positions = typeof GAME_STATE !== 'undefined' ? GAME_STATE.physicalPositions : [];

        let positionHtml = '';
        if (positions.length === 0) {
            positionHtml = '<span class="status-warn">No positions yet</span>';
        } else {
            positions.forEach((pos, i) => {
                const hasOldFields = 'purchaseTurn' in pos && !('purchaseMonth' in pos && 'purchasePeriod' in pos);
                const hasNewFields = 'purchaseMonth' in pos && 'purchasePeriod' in pos;

                positionHtml += `
<div class="position-item">
- ID: ${pos.id}
- Purchase: ${pos.purchaseMonth || 'N/A'}, ${pos.purchasePeriod || 'N/A'} (Turn ${pos.purchaseTurn || 'N/A'})
- Arrival: Turn ${pos.arrivalTurn || 'N/A'}
- Status: <span class="status-${pos.status === 'ARRIVED' ? 'good' : 'info'}">${pos.status}</span>
- Has OLD turn fields only?: ${this.statusIcon(!hasOldFields)} ${hasOldFields ? 'Yes (BAD!)' : 'No'}
- Has NEW month/period fields?: ${this.statusIcon(hasNewFields)} ${hasNewFields ? 'Yes' : 'No (BAD!)'}
${pos.status === 'SOLD' || pos.status === 'SOLD_PENDING' ? `
- Sold: ${pos.soldMonth || 'N/A'}, ${pos.soldPeriod || 'N/A'}
- Settlement: ${pos.settlementMonth || 'N/A'}, ${pos.settlementPeriod || 'N/A'}
- QP Revealed?: ${pos.qpRevealed ? 'Yes' : 'No'}
- Estimated Revenue: $${(pos.estimatedRevenue || 0).toLocaleString()}
- Actual Revenue: $${(pos.actualRevenue || pos.estimatedRevenue || 0).toLocaleString()}
` : ''}
</div>`;
            });
        }

        return `
            <div class="debug-section">
                <h3>POSITION TRACKING STATUS</h3>
                <pre>
Physical Positions: ${positions.length} total
${positionHtml}
                </pre>
            </div>
        `;
    },

    /**
     * Render Futures Status section
     */
    renderFuturesStatus() {
        const futures = typeof GAME_STATE !== 'undefined' ? GAME_STATE.futuresPositions : [];

        let futuresHtml = '';
        if (futures.length === 0) {
            futuresHtml = '<span class="status-warn">No futures positions yet</span>';
        } else {
            futures.forEach((pos, i) => {
                // Validate contract naming - should NOT be M+1/M+3 format
                const badNaming = pos.contract && (pos.contract.includes('M+') || pos.contract.includes('m+'));

                futuresHtml += `
<div class="position-item">
- Contract: ${pos.exchange} ${pos.contract} ${this.statusIcon(!badNaming)} ${badNaming ? '(BAD - should not use M+ notation!)' : ''}
- Direction: ${pos.direction}
- Contracts: ${pos.contracts}
- Entry Price: $${pos.entryPrice?.toLocaleString() || 'N/A'}
- Open: ${pos.openMonth || 'N/A'}, ${pos.openPeriod || 'N/A'} (Turn ${pos.openTurn || 'N/A'})
- Expiry: ${pos.expiryMonth || 'Not set'}, ${pos.expiryPeriod || 'Late'} (should be Late period!)
- Status: <span class="status-${pos.status === 'OPEN' ? 'good' : 'info'}">${pos.status}</span>
- Unrealized P&L: $${(pos.unrealizedPL || 0).toLocaleString()}
</div>`;
            });
        }

        return `
            <div class="debug-section">
                <h3>FUTURES STATUS</h3>
                <pre>
Futures Positions: ${futures.length} total
${futuresHtml}
                </pre>
            </div>
        `;
    },

    /**
     * Render Financial Status section
     */
    renderFinancialStatus() {
        if (typeof GAME_STATE === 'undefined') {
            return `
                <div class="debug-section">
                    <h3>FINANCIAL STATUS</h3>
                    <div class="status-bad">❌ GAME_STATE not found!</div>
                </div>
            `;
        }

        const locAvailable = GAME_STATE.lineOfCredit - GAME_STATE.locUsed;
        const buyingPower = GAME_STATE.practiceFunds + locAvailable;

        // Monthly limits (default structure if not implemented)
        const purchaseLimits = GAME_STATE.monthlyPurchaseLimits || { CALLAO: { used: 0, max: 20 }, ANTOFAGASTA: { used: 0, max: 90 } };
        const salesLimits = GAME_STATE.monthlySalesLimits || { AMERICAS: { used: 0, max: 90 }, ASIA: { used: 0, max: 85 }, EUROPE: { used: 0, max: 55 } };

        return `
            <div class="debug-section">
                <h3>FINANCIAL STATUS</h3>
                <pre>
Practice Funds: <span class="status-good">$${GAME_STATE.practiceFunds.toLocaleString()}</span>
LOC Used: $${GAME_STATE.locUsed.toLocaleString()} / $${GAME_STATE.lineOfCredit.toLocaleString()}
LOC Available: <span class="status-good">$${locAvailable.toLocaleString()}</span>
Buying Power: <span class="status-good">$${buyingPower.toLocaleString()}</span>
Total P&L: <span class="${GAME_STATE.totalPL >= 0 ? 'status-good' : 'status-bad'}">$${GAME_STATE.totalPL.toLocaleString()}</span>
Inventory: ${GAME_STATE.inventory} MT

<span class="status-header">Interest Tracking</span>
Interest Rate: ${((GAME_STATE.locInterestRate || 0.0036) * 100).toFixed(2)}% monthly
Interest Paid (Total): $${(GAME_STATE.totalInterestPaid || 0).toLocaleString()}
Next Interest Charge: ${typeof TimeManager !== 'undefined' && TimeManager.isMonthBoundary() ? 'NEXT TURN!' : 'At month boundary'}

<span class="status-header">Monthly Limits (resets at month boundaries)</span>
${this.statusIcon(purchaseLimits !== null)} Purchases Implemented: ${purchaseLimits ? 'Yes' : 'No'}
  - CALLAO: ${purchaseLimits?.CALLAO?.used || 0}/${purchaseLimits?.CALLAO?.max || 20} MT
  - ANTOFAGASTA: ${purchaseLimits?.ANTOFAGASTA?.used || 0}/${purchaseLimits?.ANTOFAGASTA?.max || 90} MT
${this.statusIcon(salesLimits !== null)} Sales Implemented: ${salesLimits ? 'Yes' : 'No'}
  - AMERICAS: ${salesLimits?.AMERICAS?.used || 0}/${salesLimits?.AMERICAS?.max || 90} MT
  - ASIA: ${salesLimits?.ASIA?.used || 0}/${salesLimits?.ASIA?.max || 85} MT
  - EUROPE: ${salesLimits?.EUROPE?.used || 0}/${salesLimits?.EUROPE?.max || 55} MT
                </pre>
            </div>
        `;
    },

    /**
     * Render M+1 Repricing Status section
     */
    renderM1RepricingStatus() {
        // Check if repricing system exists
        const repricingExists = typeof GAME_STATE !== 'undefined' && GAME_STATE.repricingHistory;

        return `
            <div class="debug-section">
                <h3>M+1 REPRICING STATUS</h3>
                <pre>
${this.statusIcon(repricingExists)} Repricing System Implemented: ${repricingExists ? 'Yes' : 'No (NOT YET)'}

Last QP Reveal: ${GAME_STATE?.lastQPReveal || 'None yet'}
Positions Repriced: ${GAME_STATE?.positionsRepriced || 0}
Next Reveal Due: ${this.getNextRevealTurn()}

<span class="status-header">Upcoming Reveals Schedule</span>
- Turn 3 (Feb Early): Reveals Jan M+1, reprices Dec sales
- Turn 5 (Mar Early): Reveals Feb M+1, reprices Jan sales
- Turn 7 (Apr Early): Reveals Mar M+1, reprices Feb sales
- Turn 9 (May Early): Reveals Apr M+1, reprices Mar sales
- Turn 11 (Jun Early): Reveals May M+1, reprices Apr sales

<span class="status-warn">⚠️ Note: M+1 repricing not yet implemented</span>
                </pre>
            </div>
        `;
    },

    /**
     * Get next reveal turn
     */
    getNextRevealTurn() {
        if (typeof TimeManager === 'undefined') return 'Unknown';
        const turn = TimeManager.currentTurn;
        const revealTurns = [3, 5, 7, 9, 11];
        for (const rt of revealTurns) {
            if (turn < rt) return `Turn ${rt}`;
        }
        return 'Game End';
    },

    /**
     * Render Save/Load Status section
     */
    renderSaveLoadStatus() {
        // Check localStorage for saves
        let autoSave = null;
        let manualSlots = [null, null, null];

        try {
            autoSave = localStorage.getItem('perseverance_autosave');
            manualSlots[0] = localStorage.getItem('perseverance_save_1');
            manualSlots[1] = localStorage.getItem('perseverance_save_2');
            manualSlots[2] = localStorage.getItem('perseverance_save_3');
        } catch (e) {
            // localStorage not available
        }

        const saveSystemExists = typeof SaveManager !== 'undefined';

        return `
            <div class="debug-section">
                <h3>SAVE/LOAD STATUS</h3>
                <pre>
${this.statusIcon(saveSystemExists)} Save System Implemented: ${saveSystemExists ? 'Yes' : 'No (NOT YET)'}

Auto-save Exists?: ${autoSave ? 'Yes' : 'No'}
Last Auto-save: ${autoSave ? this.parseSaveInfo(autoSave) : 'Never'}

Manual Save Slots:
- Slot 1: ${manualSlots[0] ? this.parseSaveInfo(manualSlots[0]) : 'Empty'}
- Slot 2: ${manualSlots[1] ? this.parseSaveInfo(manualSlots[1]) : 'Empty'}
- Slot 3: ${manualSlots[2] ? this.parseSaveInfo(manualSlots[2]) : 'Empty'}

Checkpoint Triggered?: ${GAME_STATE?.checkpointTriggered || 'Not yet (Turn 6)'}

<span class="status-warn">⚠️ Note: Save/Load not yet implemented</span>
                </pre>
            </div>
        `;
    },

    /**
     * Parse save info from JSON string
     */
    parseSaveInfo(saveStr) {
        try {
            const data = JSON.parse(saveStr);
            return `Turn ${data.turn || '?'}, ${data.timestamp || 'unknown time'}`;
        } catch (e) {
            return 'Invalid save data';
        }
    },

    /**
     * Render Scenario/Event Status section
     */
    renderScenarioEventStatus() {
        const scenarioExists = typeof ScenarioManager !== 'undefined';
        const eventsExist = typeof EventSystem !== 'undefined';

        // Check loaded months
        const monthsLoaded = [];
        if (typeof GAME_STATE !== 'undefined' && GAME_STATE.allMonthData) {
            GAME_STATE.allMonthData.forEach((data, i) => {
                if (data) monthsLoaded.push(i + 1);
            });
        }

        return `
            <div class="debug-section">
                <h3>SCENARIO/EVENT STATUS</h3>
                <pre>
${this.statusIcon(scenarioExists)} Scenario System Implemented: ${scenarioExists ? 'Yes' : 'No (NOT YET)'}
${this.statusIcon(eventsExist)} Event System Implemented: ${eventsExist ? 'Yes' : 'No (NOT YET)'}

Scenario Loaded: ${GAME_STATE?.currentScenario || 'None (default data)'}
Months Loaded: ${monthsLoaded.length > 0 ? monthsLoaded.join(', ') : 'None'} / 6

Current Period Events:
- Early Events: ${GAME_STATE?.earlyEvents?.length || 0} scheduled
- Late Events: ${GAME_STATE?.lateEvents?.length || 0} scheduled
Events Triggered This Period: ${GAME_STATE?.eventsTriggeredThisPeriod || 0}

<span class="status-warn">⚠️ Note: Scenarios/Events not yet implemented</span>
                </pre>
            </div>
        `;
    },

    /**
     * Render Market Simplification Status section
     */
    renderMarketSimplificationStatus() {
        const simplifiedMarket = typeof GAME_STATE !== 'undefined' && GAME_STATE.currentPeriodOffers;

        // Get current data if available
        let supplierCount = 0;
        let buyerCount = 0;
        if (GAME_STATE?.currentMonthData) {
            const supply = GAME_STATE.currentMonthData.MARKET_DEPTH?.SUPPLY;
            const buyers = GAME_STATE.currentMonthData.CLIENTS?.OPPORTUNITIES;
            supplierCount = supply ? Object.keys(supply).filter(k => k !== 'TOTAL_MARKET_DEPTH_MT').length : 0;
            buyerCount = buyers ? buyers.length : 0;
        }

        return `
            <div class="debug-section">
                <h3>MARKET SIMPLIFICATION (NEW RULE)</h3>
                <pre>
${this.statusIcon(simplifiedMarket)} Simplified Market Implemented: ${simplifiedMarket ? 'Yes' : 'No (NOT YET)'}

Each period SHOULD show:
- ONE supplier available
- ONE buyer available
(Simplified from multiple options)

<span class="status-header">Current State (Raw Data)</span>
Suppliers in Data: ${supplierCount} ${supplierCount === 1 ? '✅' : '⚠️ (should be 1)'}
Buyers in Data: ${buyerCount} ${buyerCount === 1 ? '✅' : '⚠️ (should be 1)'}

${simplifiedMarket ? `
Current Period Offers:
- Supplier: ${GAME_STATE.currentPeriodOffers?.supplier || 'N/A'}
- Buyer: ${GAME_STATE.currentPeriodOffers?.buyer || 'N/A'}
` : '<span class="status-warn">⚠️ Note: Market simplification not yet implemented</span>'}
                </pre>
            </div>
        `;
    },

    /**
     * Helper: Status icon based on boolean
     */
    statusIcon(ok) {
        if (ok === true) return '<span class="status-good">✅</span>';
        if (ok === false) return '<span class="status-bad">❌</span>';
        return '<span class="status-warn">⚠️</span>';
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => EnhancedDebugPanel.init());
} else {
    // DOM already loaded, initialize immediately
    setTimeout(() => EnhancedDebugPanel.init(), 100);
}
