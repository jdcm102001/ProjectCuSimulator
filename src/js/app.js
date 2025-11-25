/**
 * Perseverance Trading Simulator
 * Bare-bones Functional Version
 *
 * All code in one file for maximum traceability.
 * When you change something, you'll see the result immediately.
 */

// ============================================================
// SECTION 0A: NOTIFICATION SYSTEM
// ============================================================

/**
 * NotificationSystem provides styled popup notifications
 * for important game events like QP settlements
 */
const NotificationSystem = {
    /**
     * Show a QP Settlement notification with details
     * @param {object} data - Settlement data
     */
    showQPSettlement(data) {
        const { monthName, purchasesProcessed, salesProcessed, totalPurchaseAdjustment, totalSaleAdjustment, netEffect } = data;

        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.className = 'notification-overlay';
        overlay.id = 'qpNotificationOverlay';

        // Build content
        let purchasesHtml = '';
        if (purchasesProcessed > 0) {
            const isUp = totalPurchaseAdjustment > 0;
            purchasesHtml = `
                <div class="qp-section purchases">
                    <div class="qp-section-header">PURCHASES REPRICED</div>
                    <div class="qp-count">${purchasesProcessed} position${purchasesProcessed > 1 ? 's' : ''}</div>
                    <div class="qp-adjustment ${isUp ? 'negative' : 'positive'}">
                        Cost ${isUp ? 'Increased' : 'Decreased'}: ${isUp ? '+' : ''}$${totalPurchaseAdjustment.toLocaleString()}
                    </div>
                    <div class="qp-explanation">${isUp ? 'Additional funds deducted' : 'Funds refunded to you'}</div>
                </div>
            `;
        }

        let salesHtml = '';
        if (salesProcessed > 0) {
            const isUp = totalSaleAdjustment > 0;
            salesHtml = `
                <div class="qp-section sales">
                    <div class="qp-section-header">SALES REPRICED</div>
                    <div class="qp-count">${salesProcessed} sale${salesProcessed > 1 ? 's' : ''}</div>
                    <div class="qp-adjustment ${isUp ? 'positive' : 'negative'}">
                        Revenue ${isUp ? 'Increased' : 'Decreased'}: ${isUp ? '+' : ''}$${totalSaleAdjustment.toLocaleString()}
                    </div>
                    <div class="qp-explanation">${isUp ? 'Additional revenue received' : 'Revenue adjusted down'}</div>
                </div>
            `;
        }

        const netClass = netEffect >= 0 ? 'positive' : 'negative';

        overlay.innerHTML = `
            <div class="notification-modal qp-settlement">
                <div class="notification-header">
                    <span class="notification-icon">📊</span>
                    <span class="notification-title">M+1 QP Settlement</span>
                </div>
                <div class="notification-subtitle">${monthName} Average Prices Revealed</div>
                <div class="notification-body">
                    ${purchasesHtml}
                    ${salesHtml}
                    <div class="qp-net-effect">
                        <div class="qp-net-label">NET EFFECT ON FUNDS</div>
                        <div class="qp-net-value ${netClass}">${netEffect >= 0 ? '+' : ''}$${netEffect.toLocaleString()}</div>
                    </div>
                </div>
                <div class="notification-footer">
                    <button class="notification-btn" onclick="NotificationSystem.closeQPNotification()">ACKNOWLEDGE</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Animate in
        requestAnimationFrame(() => {
            overlay.classList.add('visible');
        });
    },

    /**
     * Close the QP notification
     */
    closeQPNotification() {
        const overlay = document.getElementById('qpNotificationOverlay');
        if (overlay) {
            overlay.classList.remove('visible');
            setTimeout(() => overlay.remove(), 300);
        }
    },

    /**
     * Show a simple toast notification
     * @param {string} message - Message to display
     * @param {string} type - 'success', 'warning', 'error', 'info'
     */
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast-notification ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.add('visible');
        });

        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};

// ============================================================
// SECTION 0B: TIME MANAGER
// ============================================================

/**
 * TimeManager handles the bi-weekly period system
 * 6 months × 2 periods = 12 turns total
 *
 * Turn 1  = January Early
 * Turn 2  = January Late
 * Turn 3  = February Early
 * Turn 4  = February Late
 * ... and so on
 * Turn 12 = June Late
 */
const TimeManager = {
    // Constants
    MONTHS: ['January', 'February', 'March', 'April', 'May', 'June'],
    PERIODS: ['Early', 'Late'],
    TOTAL_TURNS: 12,
    PERIODS_PER_MONTH: 2,

    // Current state
    currentTurn: 1,  // 1-12

    /**
     * Initialize TimeManager
     */
    init() {
        this.currentTurn = 1;
        console.log('[TIME] TimeManager initialized at Turn 1 (January Early)');
    },

    /**
     * Get turn number from month index and period
     * @param {number} monthIndex - 0-5 (January=0, June=5)
     * @param {number} period - 1 or 2 (Early=1, Late=2)
     * @returns {number} turn - 1-12
     */
    getTurnNumber(monthIndex, period) {
        return (monthIndex * this.PERIODS_PER_MONTH) + period;
    },

    /**
     * Get month index and period from turn number
     * @param {number} turn - 1-12
     * @returns {object} {monthIndex, period, monthName, periodName}
     */
    getMonthPeriod(turn = this.currentTurn) {
        const monthIndex = Math.floor((turn - 1) / this.PERIODS_PER_MONTH);
        const period = ((turn - 1) % this.PERIODS_PER_MONTH) + 1;
        return {
            monthIndex: monthIndex,
            period: period,
            monthName: this.MONTHS[monthIndex],
            periodName: this.PERIODS[period - 1]
        };
    },

    /**
     * Advance to the next period
     * @returns {object} {newTurn, isMonthChange, isGameOver, details}
     */
    advancePeriod() {
        const oldDetails = this.getMonthPeriod();
        const wasMonthEnd = oldDetails.period === 2; // Was Late period

        this.currentTurn++;

        // Check game over
        if (this.currentTurn > this.TOTAL_TURNS) {
            return {
                newTurn: this.currentTurn,
                isMonthChange: false,
                isGameOver: true,
                details: null
            };
        }

        const newDetails = this.getMonthPeriod();

        console.log(`[TIME] Advanced to Turn ${this.currentTurn}: ${newDetails.monthName} ${newDetails.periodName}`);

        return {
            newTurn: this.currentTurn,
            isMonthChange: wasMonthEnd,
            isGameOver: false,
            details: newDetails
        };
    },

    /**
     * Check if current turn is at a month boundary (Late → Early transition will occur on next advance)
     * @returns {boolean}
     */
    isMonthBoundary() {
        const details = this.getMonthPeriod();
        return details.period === 2; // Late period = end of month
    },

    /**
     * Get display string for current time
     * @returns {string} e.g., "JAN - Early (1/12)"
     */
    getDisplayString() {
        const details = this.getMonthPeriod();
        const monthShort = details.monthName.substring(0, 3).toUpperCase();
        return `${monthShort} - ${details.periodName} (${this.currentTurn}/${this.TOTAL_TURNS})`;
    },

    /**
     * Calculate arrival turn from current turn + travel days
     * Each period ≈ 15 days (half month)
     * @param {number} travelDays
     * @returns {number} arrivalTurn
     */
    calculateArrivalTurn(travelDays) {
        const periodsToTravel = Math.ceil(travelDays / 15);
        return Math.min(this.currentTurn + periodsToTravel, this.TOTAL_TURNS);
    },

    /**
     * Get remaining turns in game
     * @returns {number}
     */
    getRemainingTurns() {
        return this.TOTAL_TURNS - this.currentTurn;
    }
};


// ============================================================
// SECTION 1: GAME STATE
// ============================================================

const GAME_STATE = {
    // Finances
    practiceFunds: 200000,
    lineOfCredit: 200000,
    locUsed: 0,
    locInterestRate: 0.0036, // 0.36% monthly

    // Positions
    physicalPositions: [],
    futuresPositions: [],

    // Tracking
    totalPL: 0,
    inventory: 0,
    totalInterestPaid: 0,

    // Monthly Purchase Limits (MT) - reset at month boundaries
    monthlyPurchaseLimits: {
        CALLAO: { used: 0, max: 20 },        // Peruvian supplier
        ANTOFAGASTA: { used: 0, max: 90 }    // Chilean supplier
    },

    // Monthly Sales Limits (MT) - reset at month boundaries
    monthlySalesLimits: {
        AMERICAS: { used: 0, max: 90 },
        ASIA: { used: 0, max: 85 },
        EUROPE: { used: 0, max: 55 }
    },

    // Current period offers (simplified market - one supplier, one buyer per period)
    currentPeriodOffers: {
        supplier: null,      // Key like 'PERUVIAN' or 'CHILEAN'
        supplierData: null,  // Full supplier data object
        buyer: null,         // Index into CLIENTS.OPPORTUNITIES
        buyerData: null      // Full buyer data object
    },

    // M+1 Repricing System: Pending QP (Quotational Period) reveals
    // Both purchases and sales use provisional price, actual revealed at M+1
    // Premium and freight remain fixed - only base price adjusts
    purchasesPendingQP: [],
    purchasesCompleted: [],
    salesPendingQP: [],
    salesCompleted: [],

    // Month data array
    allMonthData: [],
    currentMonthData: null,

    /**
     * Initialize the game state
     */
    init() {
        console.log('[GAME] Initializing...');

        // Initialize TimeManager
        TimeManager.init();

        // Debug: Check what global data exists
        console.log('[GAME] window.JANUARY_DATA:', window.JANUARY_DATA);
        console.log('[GAME] JANUARY_DATA keys:', window.JANUARY_DATA ? Object.keys(window.JANUARY_DATA) : 'undefined');

        // Load all month data (from global variables set by data files)
        this.allMonthData = [
            window.JANUARY_DATA,
            window.FEBRUARY_DATA,
            window.MARCH_DATA,
            window.APRIL_DATA,
            window.MAY_DATA,
            window.JUNE_DATA
        ];

        // Set current month data based on TimeManager
        this.updateCurrentMonthData();
        console.log('[GAME] currentMonthData:', this.currentMonthData);
        console.log('[GAME] Current month:', this.currentMonthData ? this.currentMonthData.MONTH : 'undefined');

        // Generate initial period offers (simplified market)
        this.generatePeriodOffers();

        // Update header display
        this.updateHeader();
    },

    /**
     * Update current month data based on TimeManager
     */
    updateCurrentMonthData() {
        const timeInfo = TimeManager.getMonthPeriod();
        this.currentMonthData = this.allMonthData[timeInfo.monthIndex];
    },

    /**
     * Generate period offers - selects ONE supplier and ONE buyer for the current period
     * Uses turn number as seed for deterministic selection
     */
    generatePeriodOffers() {
        const data = this.currentMonthData;
        if (!data) {
            console.warn('[MARKET] No current month data for period offers');
            return;
        }

        const turn = TimeManager.currentTurn;

        // Get available suppliers (excluding TOTAL_MARKET_DEPTH_MT)
        const suppliers = Object.keys(data.MARKET_DEPTH.SUPPLY)
            .filter(k => k !== 'TOTAL_MARKET_DEPTH_MT');

        // Get available buyers
        const buyers = data.CLIENTS.OPPORTUNITIES;

        if (suppliers.length === 0 || buyers.length === 0) {
            console.warn('[MARKET] No suppliers or buyers available');
            return;
        }

        // Deterministic selection based on turn (alternates between options)
        const supplierIndex = (turn - 1) % suppliers.length;
        const buyerIndex = (turn - 1) % buyers.length;

        const selectedSupplier = suppliers[supplierIndex];
        const selectedBuyer = buyerIndex;

        this.currentPeriodOffers = {
            supplier: selectedSupplier,
            supplierData: data.MARKET_DEPTH.SUPPLY[selectedSupplier],
            buyer: selectedBuyer,
            buyerData: buyers[selectedBuyer]
        };

        console.log(`[MARKET] Period offers generated for Turn ${turn}:`);
        console.log(`  Supplier: ${selectedSupplier}`);
        console.log(`  Buyer: ${buyers[selectedBuyer].REGION} (index ${selectedBuyer})`);
    },

    /**
     * Update header displays
     */
    updateHeader() {
        // Period - using TimeManager
        document.getElementById('headerPeriod').textContent = TimeManager.getDisplayString();

        // Funds
        document.getElementById('headerFunds').textContent = this.formatCurrency(this.practiceFunds);

        // P&L
        const plEl = document.getElementById('headerPL');
        plEl.textContent = this.formatCurrency(this.totalPL);
        plEl.className = this.totalPL >= 0 ? 'value positive' : 'value negative';

        // Buying Power (Funds + Available LOC)
        const availableLOC = this.lineOfCredit - this.locUsed;
        const buyingPower = this.practiceFunds + availableLOC;
        document.getElementById('headerBuyingPower').textContent = this.formatCurrency(buyingPower);

        // Inventory
        document.getElementById('headerInventory').textContent = `${this.inventory} MT`;

        // LOC
        document.getElementById('headerLOC').textContent =
            `${this.formatCurrency(this.locUsed)} / $200K`;

        // QP Pending indicator
        const pendingQP = this.salesPendingQP || [];
        const qpMetric = document.getElementById('headerQPMetric');
        const qpPending = document.getElementById('headerQPPending');
        if (qpMetric && qpPending) {
            if (pendingQP.length > 0) {
                qpMetric.style.display = 'flex';
                qpPending.textContent = `${pendingQP.length} sale${pendingQP.length > 1 ? 's' : ''}`;
            } else {
                qpMetric.style.display = 'none';
            }
        }
    },

    /**
     * Format currency
     */
    formatCurrency(amount) {
        if (Math.abs(amount) >= 1000000) {
            return '$' + (amount / 1000000).toFixed(2) + 'M';
        }
        return '$' + amount.toLocaleString();
    },

    /**
     * Advance to next turn
     */
    nextTurn() {
        console.log('[GAME] Advancing turn...');

        // Update position statuses
        this.updatePositionStatuses();

        // Use TimeManager to advance
        const result = TimeManager.advancePeriod();

        // Check game over
        if (result.isGameOver) {
            alert('Game Over! You have completed all 6 months.');
            return;
        }

        // Update current month data if month changed
        if (result.isMonthChange) {
            this.updateCurrentMonthData();
            console.log('[GAME] New month:', result.details.monthName);

            // Charge LOC interest at month boundaries
            this.chargeLOCInterest();

            // Reset monthly purchase/sales limits
            this.resetMonthlyLimits();

            // Process M+1 QP reveals for sales made last month
            // Current month's price is the QP price for last month's sales
            this.processQPReveals(result.details.monthIndex);
        }

        // Mark futures positions for settlement
        this.settleFutures();

        // Generate new period offers (simplified market)
        this.generatePeriodOffers();

        // Update header
        this.updateHeader();

        // Re-render widgets
        MarketsWidget.render();
        PositionsWidget.render();
        FuturesWidget.render();
        AnalyticsWidget.render();
        if (typeof BankWidget !== 'undefined') BankWidget.render();

        console.log('[GAME] Now on Turn', TimeManager.currentTurn, '-', result.details.monthName, result.details.periodName);

        // Update debug panels
        if (typeof DebugPanel !== 'undefined') DebugPanel.update();
        if (typeof EnhancedDebugPanel !== 'undefined') EnhancedDebugPanel.update();
    },

    /**
     * Charge LOC interest at month boundaries
     */
    chargeLOCInterest() {
        if (this.locUsed <= 0) return;

        const interest = Math.round(this.locUsed * this.locInterestRate);
        this.locUsed += interest;
        this.totalInterestPaid += interest;

        console.log(`[GAME] LOC Interest charged: $${interest.toLocaleString()}`);

        // Check if LOC exceeded limit
        if (this.locUsed > this.lineOfCredit) {
            alert(`Warning: LOC exceeded! Used: $${this.locUsed.toLocaleString()} / Limit: $${this.lineOfCredit.toLocaleString()}`);
        }
    },

    /**
     * Reset monthly limits at month boundaries
     */
    resetMonthlyLimits() {
        // Reset purchase limits
        for (const port in this.monthlyPurchaseLimits) {
            this.monthlyPurchaseLimits[port].used = 0;
        }

        // Reset sales limits
        for (const region in this.monthlySalesLimits) {
            this.monthlySalesLimits[region].used = 0;
        }

        console.log('[GAME] Monthly purchase/sales limits reset');
    },

    /**
     * Process QP (Quotational Period) reveals for M+1 repricing
     * Called at Early periods when entering a new month
     * Reveals actual prices for BOTH purchases AND sales made in the previous month
     * Premium and freight remain FIXED - only base price adjusts
     * @param {number} currentMonthIndex - The current month index (0-5)
     */
    processQPReveals(currentMonthIndex) {
        // Get the M+1 price data (current month = M+1 for trades made last month)
        const m1Data = this.allMonthData[currentMonthIndex];
        if (!m1Data || !m1Data.PRICING) {
            console.warn('[QP] No pricing data for M+1 month:', currentMonthIndex);
            return;
        }

        const monthName = TimeManager.getMonthPeriod().monthName;
        let totalPurchaseAdjustment = 0;
        let totalSaleAdjustment = 0;
        let purchasesProcessed = 0;
        let salesProcessed = 0;

        // ========== PROCESS PURCHASES ==========
        const purchasesToProcess = this.purchasesPendingQP.filter(
            p => p.qpMonthIndex === currentMonthIndex && !p.qpRevealed
        );

        if (purchasesToProcess.length > 0) {
            console.log(`[QP] Processing ${purchasesToProcess.length} purchases for M+1 repricing...`);

            purchasesToProcess.forEach(purchase => {
                // Get actual M+1 base price
                const actualBasePrice = purchase.exchange === 'LME' ?
                    m1Data.PRICING.LME.SPOT_AVG : m1Data.PRICING.COMEX.SPOT_AVG;

                // Calculate actual cost (base + fixed premium + fixed freight)
                const actualPricePerMT = actualBasePrice + purchase.premium + purchase.freight;
                const actualTotalCost = actualPricePerMT * purchase.tonnage;

                // Calculate adjustment (difference from provisional)
                // Positive = cost went UP (bad for buyer), Negative = cost went DOWN (good for buyer)
                const costAdjustment = actualTotalCost - purchase.provisionalTotalCost;

                // Update the physical position
                const position = this.physicalPositions.find(p => p.id === purchase.positionId);
                if (position) {
                    position.actualBasePrice = actualBasePrice;
                    position.actualPricePerMT = actualPricePerMT;
                    position.actualTotalCost = actualTotalCost;
                    position.costAdjustment = costAdjustment;
                    position.pricePerMT = actualPricePerMT;  // Update displayed price
                    position.totalCost = actualTotalCost;    // Update displayed cost
                    position.qpRevealed = true;
                }

                // Apply adjustment to funds (if cost went up, deduct more; if down, refund)
                // Cost increase = we owe more = deduct from funds
                // Cost decrease = we overpaid = refund to funds
                if (costAdjustment > 0) {
                    // Cost went up - deduct additional from funds/LOC
                    if (costAdjustment <= this.practiceFunds) {
                        this.practiceFunds -= costAdjustment;
                    } else {
                        const fromLOC = costAdjustment - this.practiceFunds;
                        this.practiceFunds = 0;
                        this.locUsed += fromLOC;
                    }
                } else {
                    // Cost went down - refund to funds
                    this.practiceFunds += Math.abs(costAdjustment);
                }

                totalPurchaseAdjustment += costAdjustment;
                purchasesProcessed++;

                console.log(`[QP] Purchase ${purchase.positionId} repriced:`);
                console.log(`     Prov: $${purchase.provisionalBasePrice}/MT → Act: $${actualBasePrice}/MT`);
                console.log(`     Cost Adjustment: ${costAdjustment >= 0 ? '+' : ''}$${costAdjustment.toLocaleString()}`);

                // Mark as revealed and move to completed
                purchase.actualBasePrice = actualBasePrice;
                purchase.actualTotalCost = actualTotalCost;
                purchase.adjustment = costAdjustment;
                purchase.qpRevealed = true;
                this.purchasesCompleted.push(purchase);
            });

            // Remove processed purchases from pending
            this.purchasesPendingQP = this.purchasesPendingQP.filter(
                p => p.qpMonthIndex !== currentMonthIndex || !p.qpRevealed
            );
        }

        // ========== PROCESS SALES ==========
        const salesToProcess = this.salesPendingQP.filter(
            sale => sale.qpMonthIndex === currentMonthIndex && !sale.qpRevealed
        );

        if (salesToProcess.length > 0) {
            console.log(`[QP] Processing ${salesToProcess.length} sales for M+1 repricing...`);

            salesToProcess.forEach(sale => {
                // Get actual M+1 price
                const actualBasePrice = sale.exchange === 'LME' ?
                    m1Data.PRICING.LME.SPOT_AVG : m1Data.PRICING.COMEX.SPOT_AVG;

                const actualSalePrice = actualBasePrice + sale.premium;
                const actualRevenue = actualSalePrice * sale.tonnage;
                const actualProfit = actualRevenue - sale.costBasis;

                // Calculate adjustment (difference from estimate)
                const adjustment = actualRevenue - sale.estimatedRevenue;
                const profitAdjustment = actualProfit - sale.estimatedProfit;

                // Update sale record
                sale.actualBasePrice = actualBasePrice;
                sale.actualSalePrice = actualSalePrice;
                sale.actualRevenue = actualRevenue;
                sale.actualProfit = actualProfit;
                sale.adjustmentAmount = adjustment;
                sale.qpRevealed = true;
                sale.status = 'SETTLED';

                // Apply adjustment to funds and P&L
                this.practiceFunds += adjustment;
                this.totalPL += profitAdjustment;
                totalSaleAdjustment += adjustment;
                salesProcessed++;

                console.log(`[QP] Sale ${sale.id} repriced:`);
                console.log(`     Est: $${sale.estimatedBasePrice}/MT → Act: $${actualBasePrice}/MT`);
                console.log(`     Adjustment: $${adjustment.toLocaleString()}`);

                // Move to completed sales
                this.salesCompleted.push(sale);
            });

            // Remove processed sales from pending
            this.salesPendingQP = this.salesPendingQP.filter(
                sale => sale.qpMonthIndex !== currentMonthIndex || !sale.qpRevealed
            );
        }

        // ========== NOTIFY USER ==========
        if (purchasesProcessed > 0 || salesProcessed > 0) {
            // Net effect on funds: sale adjustment is direct, purchase adjustment was already applied
            // For purchases: positive adjustment = cost MORE = bad
            // For sales: positive adjustment = received MORE = good
            const netEffect = totalSaleAdjustment - totalPurchaseAdjustment;

            console.log(`[QP] Total adjustments - Purchases: $${totalPurchaseAdjustment.toLocaleString()}, Sales: $${totalSaleAdjustment.toLocaleString()}`);

            // Show styled notification popup
            NotificationSystem.showQPSettlement({
                monthName,
                purchasesProcessed,
                salesProcessed,
                totalPurchaseAdjustment,
                totalSaleAdjustment,
                netEffect
            });

            // Update UI
            PositionsWidget.render();
        } else {
            console.log('[QP] No trades pending QP reveal for month index:', currentMonthIndex);
        }
    },

    /**
     * Check if purchase is within monthly limit
     * @param {string} port - CALLAO or ANTOFAGASTA
     * @param {number} tonnage - Amount to purchase
     * @returns {object} {allowed, remaining, max}
     */
    checkPurchaseLimit(port, tonnage) {
        const limit = this.monthlyPurchaseLimits[port];
        if (!limit) return { allowed: true, remaining: 999, max: 999 };

        const remaining = limit.max - limit.used;
        return {
            allowed: tonnage <= remaining,
            remaining: remaining,
            max: limit.max
        };
    },

    /**
     * Check if sale is within monthly limit
     * @param {string} region - AMERICAS, ASIA, or EUROPE
     * @param {number} tonnage - Amount to sell
     * @returns {object} {allowed, remaining, max}
     */
    checkSalesLimit(region, tonnage) {
        const limit = this.monthlySalesLimits[region];
        if (!limit) return { allowed: true, remaining: 999, max: 999 };

        const remaining = limit.max - limit.used;
        return {
            allowed: tonnage <= remaining,
            remaining: remaining,
            max: limit.max
        };
    },

    /**
     * Update physical position statuses
     */
    updatePositionStatuses() {
        this.physicalPositions.forEach(pos => {
            if (pos.status === 'IN_TRANSIT') {
                // Check if arrived (using TimeManager turn)
                if (TimeManager.currentTurn >= pos.arrivalTurn) {
                    pos.status = 'ARRIVED';
                    // Update current location to destination
                    pos.currentLocation = 'AT_PORT';
                    pos.currentPort = pos.destinationPort;
                    pos.currentPortKey = pos.destination;
                    pos.currentPortName = pos.destinationPortName;
                    pos.currentRegion = pos.destinationRegion;
                    pos.arrivedTurn = TimeManager.currentTurn;
                    this.inventory += pos.tonnage;
                    console.log('[GAME] Position arrived at', pos.currentPort, ':', pos.id);
                }
            }
        });
    },

    // Map supplier keys to freight rate port keys
    supplierToPort: {
        'PERUVIAN': 'CALLAO',
        'CHILEAN': 'ANTOFAGASTA'
    },

    // Map destination keys to regions (for cargo location matching)
    destinationToRegion: {
        'SHANGHAI': 'ASIA',
        'BUSAN': 'ASIA',
        'NINGBO': 'ASIA',
        'SINGAPORE': 'ASIA',
        'ROTTERDAM': 'EUROPE',
        'ANTWERP': 'EUROPE',
        'HAMBURG': 'EUROPE',
        'VALENCIA': 'EUROPE',
        'NEW_ORLEANS': 'AMERICAS',
        'HOUSTON': 'AMERICAS',
        'NEWARK': 'AMERICAS',
        'MONTREAL': 'AMERICAS'
    },

    /**
     * Purchase copper
     * M+1 Repricing: Purchases use PROVISIONAL base price (current spot).
     * Actual base price is M+1 average, revealed at next month's Early period.
     * Premium and freight remain FIXED - only base price adjusts.
     */
    purchaseCopper(supplier, tonnage, destination, exchange, shippingTerms) {
        console.log('[TRADE] Purchasing', tonnage, 'MT from', supplier);

        const data = this.currentMonthData;
        const supplierData = data.MARKET_DEPTH.SUPPLY[supplier];
        const portKey = this.supplierToPort[supplier];
        const destData = data.LOGISTICS.FREIGHT_RATES[portKey][destination];
        const timeInfo = TimeManager.getMonthPeriod();

        // Check monthly purchase limit
        const limitCheck = this.checkPurchaseLimit(portKey, tonnage);
        if (!limitCheck.allowed) {
            alert(`Monthly purchase limit exceeded for ${portKey}!\nRemaining: ${limitCheck.remaining} MT / ${limitCheck.max} MT`);
            return false;
        }

        // Calculate costs - base price is PROVISIONAL (current spot)
        const provisionalBasePrice = exchange === 'LME' ? data.PRICING.LME.SPOT_AVG : data.PRICING.COMEX.SPOT_AVG;
        const premium = supplierData.SUPPLIER_PREMIUM_USD || 0;  // FIXED - does not change
        const freight = shippingTerms === 'CIF' ? destData.CIF_RATE_USD_PER_TONNE : destData.FOB_RATE_USD_PER_TONNE;  // FIXED

        const provisionalPricePerMT = provisionalBasePrice + premium + freight;
        const provisionalTotalCost = provisionalPricePerMT * tonnage;

        // Check funds (based on provisional cost)
        const availableFunds = this.practiceFunds + (this.lineOfCredit - this.locUsed);
        if (provisionalTotalCost > availableFunds) {
            alert('Insufficient funds!');
            return false;
        }

        // Update monthly purchase limit
        this.monthlyPurchaseLimits[portKey].used += tonnage;

        // Deduct provisional funds
        if (provisionalTotalCost <= this.practiceFunds) {
            this.practiceFunds -= provisionalTotalCost;
        } else {
            const fromLOC = provisionalTotalCost - this.practiceFunds;
            this.practiceFunds = 0;
            this.locUsed += fromLOC;
        }

        // Calculate travel time using TimeManager
        const travelDays = destData.TRAVEL_TIME_DAYS;
        const arrivalTurn = TimeManager.calculateArrivalTurn(travelDays);

        // Determine destination region for future sale matching
        const destinationRegion = this.destinationToRegion[destination] || 'UNKNOWN';

        // Create position with M+1 pricing info
        const position = {
            id: 'PHYS_' + Date.now(),
            type: 'BUY',
            supplier: supplier,
            originPort: supplierData.ORIGIN_PORT,
            originPortKey: portKey,
            destination: destination,
            destinationPort: destData.PORT_NAME + ', ' + destData.COUNTRY,
            destinationPortName: destData.PORT_NAME,
            destinationCountry: destData.COUNTRY,
            destinationRegion: destinationRegion,
            tonnage: tonnage,
            exchange: exchange,
            shippingTerms: shippingTerms,
            // M+1 Pricing - provisional values (base price will adjust)
            provisionalBasePrice: provisionalBasePrice,
            premium: premium,           // FIXED
            freight: freight,           // FIXED
            pricePerMT: provisionalPricePerMT,        // Will be updated at QP reveal
            totalCost: provisionalTotalCost,          // Will be updated at QP reveal
            // QP tracking
            qpMonthIndex: timeInfo.monthIndex + 1,    // M+1
            qpRevealed: false,
            actualBasePrice: null,
            actualPricePerMT: null,
            actualTotalCost: null,
            costAdjustment: null,
            // Timing
            purchaseTurn: TimeManager.currentTurn,
            purchaseMonth: timeInfo.monthName,
            purchaseMonthIndex: timeInfo.monthIndex,
            purchasePeriod: timeInfo.periodName,
            arrivalTurn: arrivalTurn,
            travelTimeDays: travelDays,
            distanceNM: destData.DISTANCE_NM,
            // Current location tracking
            currentLocation: 'IN_TRANSIT',
            currentPort: null,
            currentPortKey: null,
            currentRegion: null,
            status: 'IN_TRANSIT'
        };

        this.physicalPositions.push(position);

        // Check if this is June (no M+1 available) - settle immediately
        if (timeInfo.monthIndex >= 5) {
            position.actualBasePrice = provisionalBasePrice;
            position.actualPricePerMT = provisionalPricePerMT;
            position.actualTotalCost = provisionalTotalCost;
            position.costAdjustment = 0;
            position.qpRevealed = true;
            this.purchasesCompleted.push({
                positionId: position.id,
                tonnage: tonnage,
                provisionalBasePrice: provisionalBasePrice,
                actualBasePrice: provisionalBasePrice,
                adjustment: 0,
                month: timeInfo.monthName
            });
            console.log('[TRADE] June purchase settled immediately:', position.id);
        } else {
            // Add to pending QP for M+1 repricing
            this.purchasesPendingQP.push({
                positionId: position.id,
                tonnage: tonnage,
                exchange: exchange,
                provisionalBasePrice: provisionalBasePrice,
                premium: premium,
                freight: freight,
                provisionalTotalCost: provisionalTotalCost,
                purchaseMonth: timeInfo.monthName,
                purchaseMonthIndex: timeInfo.monthIndex,
                qpMonthIndex: timeInfo.monthIndex + 1,
                qpRevealed: false
            });
            console.log('[TRADE] Purchase pending QP reveal at M+1:', position.id);
        }

        // Update display
        this.updateHeader();
        PositionsWidget.render();
        MapWidget.addShipment(position);

        console.log('[TRADE] Position created:', position.id);

        // Update debug panel
        if (typeof DebugPanel !== 'undefined') DebugPanel.update();
        if (typeof EnhancedDebugPanel !== 'undefined') EnhancedDebugPanel.update();

        return true;
    },

    // Map buyer regions to sales limit regions
    regionToSalesLimit: {
        'NORTH AMERICA': 'AMERICAS',
        'SOUTH AMERICA': 'AMERICAS',
        'AMERICAS': 'AMERICAS',
        'ASIA': 'ASIA',
        'ASIA PACIFIC': 'ASIA',
        'CHINA': 'ASIA',
        'EUROPE': 'EUROPE',
        'WESTERN EUROPE': 'EUROPE',
        'EASTERN EUROPE': 'EUROPE'
    },

    /**
     * Sell copper
     * M+1 Repricing: Sales are recorded with ESTIMATED price based on current month.
     * Actual QP price is revealed at the start of the next month (M+1).
     */
    sellCopper(positionId, buyerIndex, tonnage) {
        console.log('[TRADE] Selling', tonnage, 'MT to buyer index', buyerIndex);

        const position = this.physicalPositions.find(p => p.id === positionId);
        if (!position || position.status !== 'ARRIVED') {
            alert('Invalid position or position not arrived!');
            return false;
        }

        if (tonnage > position.tonnage) {
            alert('Cannot sell more than available!');
            return false;
        }

        const data = this.currentMonthData;
        const buyerData = data.CLIENTS.OPPORTUNITIES[buyerIndex];
        const timeInfo = TimeManager.getMonthPeriod();

        // Map buyer region to sales limit region
        const buyerRegion = buyerData.REGION || 'AMERICAS';
        const salesLimitRegion = this.regionToSalesLimit[buyerRegion.toUpperCase()] || 'AMERICAS';

        // Check monthly sales limit
        const limitCheck = this.checkSalesLimit(salesLimitRegion, tonnage);
        if (!limitCheck.allowed) {
            alert(`Monthly sales limit exceeded for ${salesLimitRegion}!\nRemaining: ${limitCheck.remaining} MT / ${limitCheck.max} MT`);
            return false;
        }

        // Calculate ESTIMATED sale price (current month's price)
        const estimatedBasePrice = position.exchange === 'LME' ?
            data.PRICING.LME.SPOT_AVG : data.PRICING.COMEX.SPOT_AVG;
        const premium = buyerData.REGIONAL_PREMIUM_USD || 0;
        const estimatedSalePrice = estimatedBasePrice + premium;
        const estimatedRevenue = estimatedSalePrice * tonnage;

        // Calculate cost basis
        const costBasis = position.pricePerMT * tonnage;
        const estimatedProfit = estimatedRevenue - costBasis;

        // Update monthly sales limit
        this.monthlySalesLimits[salesLimitRegion].used += tonnage;

        // Update inventory
        this.inventory -= tonnage;

        // Update position
        if (tonnage === position.tonnage) {
            position.status = 'SOLD';
        } else {
            position.tonnage -= tonnage;
        }

        // Create sale record for M+1 repricing
        const saleRecord = {
            id: 'SALE_' + Date.now(),
            positionId: positionId,
            tonnage: tonnage,
            buyer: buyerData.REGION,
            buyerPort: buyerData.PORT_OF_DISCHARGE,
            exchange: position.exchange,
            premium: premium,
            costBasis: costBasis,
            pricePerMT: position.pricePerMT,
            // Estimated values (based on current month)
            estimatedBasePrice: estimatedBasePrice,
            estimatedSalePrice: estimatedSalePrice,
            estimatedRevenue: estimatedRevenue,
            estimatedProfit: estimatedProfit,
            // Sale timing info
            saleTurn: TimeManager.currentTurn,
            saleMonth: timeInfo.monthName,
            saleMonthIndex: timeInfo.monthIndex,
            salePeriod: timeInfo.periodName,
            // QP info (to be revealed at M+1)
            qpMonthIndex: timeInfo.monthIndex + 1, // M+1
            qpRevealed: false,
            // Actual values (set when QP revealed)
            actualBasePrice: null,
            actualSalePrice: null,
            actualRevenue: null,
            actualProfit: null,
            adjustmentAmount: null,
            status: 'PENDING_QP'
        };

        // Check if this is the last month (June) - no M+1 exists
        if (timeInfo.monthIndex >= 5) {
            // June sales settle at current price (no M+1)
            saleRecord.actualBasePrice = estimatedBasePrice;
            saleRecord.actualSalePrice = estimatedSalePrice;
            saleRecord.actualRevenue = estimatedRevenue;
            saleRecord.actualProfit = estimatedProfit;
            saleRecord.adjustmentAmount = 0;
            saleRecord.qpRevealed = true;
            saleRecord.status = 'SETTLED';

            // Immediate settlement for June
            this.practiceFunds += estimatedRevenue;
            this.totalPL += estimatedProfit;
            this.salesCompleted.push(saleRecord);

            console.log('[TRADE] June sale settled immediately:', saleRecord.id);
        } else {
            // M+1 repricing: Add to pending QP
            // Credit estimated revenue now (will be adjusted at QP reveal)
            this.practiceFunds += estimatedRevenue;
            this.totalPL += estimatedProfit;
            this.salesPendingQP.push(saleRecord);

            console.log('[TRADE] Sale pending QP reveal at M+1:', saleRecord.id);
            console.log('[TRADE] Estimated profit:', estimatedProfit, '(subject to QP adjustment)');
        }

        // Update display
        this.updateHeader();
        PositionsWidget.render();

        // Update debug panel
        if (typeof DebugPanel !== 'undefined') DebugPanel.update();
        if (typeof EnhancedDebugPanel !== 'undefined') EnhancedDebugPanel.update();

        return estimatedProfit;
    },

    /**
     * Open futures position
     */
    openFutures(exchange, contract, direction, contracts) {
        console.log('[FUTURES] Opening', direction, contracts, 'contracts on', exchange, contract);

        const data = this.currentMonthData;
        const price = exchange === 'LME' ?
            data.PRICING.LME[contract] : data.PRICING.COMEX[contract];

        const marginPerContract = 9000;
        const feePerContract = 25;
        const totalMargin = marginPerContract * contracts;
        const totalFees = feePerContract * contracts;
        const totalDeducted = totalMargin + totalFees;

        // Check funds
        if (totalDeducted > this.practiceFunds) {
            alert('Insufficient funds for margin!');
            return false;
        }

        // Deduct margin
        this.practiceFunds -= totalDeducted;

        // Get current time info
        const timeInfo = TimeManager.getMonthPeriod();

        // Create position
        const position = {
            id: 'FUT_' + Date.now(),
            exchange: exchange,
            contract: contract,
            direction: direction,
            contracts: contracts,
            entryPrice: price,
            margin: totalMargin,
            fees: totalFees,
            openTurn: TimeManager.currentTurn,
            openMonth: timeInfo.monthName,
            openPeriod: timeInfo.periodName,
            status: 'OPEN',
            unrealizedPL: 0
        };

        this.futuresPositions.push(position);

        // Update display
        this.updateHeader();
        FuturesWidget.render();

        console.log('[FUTURES] Position opened:', position.id);

        // Update debug panel
        if (typeof DebugPanel !== 'undefined') DebugPanel.update();
        if (typeof EnhancedDebugPanel !== 'undefined') EnhancedDebugPanel.update();

        return true;
    },

    /**
     * Close futures position
     */
    closeFutures(positionId) {
        const position = this.futuresPositions.find(p => p.id === positionId);
        if (!position || position.status !== 'OPEN') return false;

        const data = this.currentMonthData;
        const currentPrice = position.exchange === 'LME' ?
            data.PRICING.LME[position.contract] :
            data.PRICING.COMEX[position.contract];

        // Calculate P&L
        const contractSize = position.exchange === 'LME' ? 25 : 25; // 25 MT per contract
        const priceDiff = position.direction === 'LONG' ?
            currentPrice - position.entryPrice :
            position.entryPrice - currentPrice;
        const pl = priceDiff * contractSize * position.contracts;

        // Return margin + P&L
        this.practiceFunds += position.margin + pl;
        this.totalPL += pl;

        position.status = 'CLOSED';
        position.closedPL = pl;

        // Update display
        this.updateHeader();
        FuturesWidget.render();

        console.log('[FUTURES] Position closed with P&L:', pl);

        // Update debug panel
        if (typeof DebugPanel !== 'undefined') DebugPanel.update();
        if (typeof EnhancedDebugPanel !== 'undefined') EnhancedDebugPanel.update();

        return pl;
    },

    /**
     * Update futures P&L
     */
    settleFutures() {
        const data = this.currentMonthData;

        this.futuresPositions.forEach(pos => {
            if (pos.status !== 'OPEN') return;

            const currentPrice = pos.exchange === 'LME' ?
                data.PRICING.LME[pos.contract] :
                data.PRICING.COMEX[pos.contract];

            const contractSize = 25;
            const priceDiff = pos.direction === 'LONG' ?
                currentPrice - pos.entryPrice :
                pos.entryPrice - currentPrice;

            pos.unrealizedPL = priceDiff * contractSize * pos.contracts;
            pos.currentPrice = currentPrice;
        });
    }
};


// ============================================================
// SECTION 2: MARKETS WIDGET
// ============================================================

const MarketsWidget = {
    /**
     * Map supplier keys to freight rate port keys
     */
    supplierToPort: {
        'PERUVIAN': 'CALLAO',
        'CHILEAN': 'ANTOFAGASTA'
    },

    /**
     * Render the markets widget
     */
    render() {
        const container = document.getElementById('content1');
        if (!container) return;

        const data = GAME_STATE.currentMonthData;
        console.log('[MARKETS] Rendering with data:', data);
        console.log('[MARKETS] data keys:', data ? Object.keys(data) : 'null');
        console.log('[MARKETS] MARKET_DEPTH:', data ? data.MARKET_DEPTH : 'null');

        if (!data) {
            container.innerHTML = '<div class="empty-state">No data loaded</div>';
            return;
        }

        if (!data.MARKET_DEPTH || !data.MARKET_DEPTH.SUPPLY) {
            container.innerHTML = '<div class="empty-state">Data structure invalid - missing MARKET_DEPTH.SUPPLY</div>';
            console.error('[MARKETS] Invalid data structure:', data);
            return;
        }

        let html = '';

        // Get simplified period offers
        const offers = GAME_STATE.currentPeriodOffers;
        const portKey = this.supplierToPort[offers.supplier];
        const purchaseLimit = GAME_STATE.checkPurchaseLimit(portKey, 0);

        // Suppliers section - SIMPLIFIED (one supplier per period)
        html += '<div class="markets-section">';
        html += '<h4>THIS PERIOD\'S SUPPLIER</h4>';
        html += '<table class="market-table">';
        html += '<tr><th>Name</th><th>Port</th><th>Premium</th><th>Available</th><th></th></tr>';

        if (offers.supplier && offers.supplierData) {
            const key = offers.supplier;
            const supplier = offers.supplierData;
            const premium = supplier.SUPPLIER_PREMIUM_USD || 0;
            const premiumSign = premium >= 0 ? '+' : '';
            // Determine tonnage range based on supplier type
            let minMT, maxMT;
            if (supplier.LTA_FIXED_MT) {
                minMT = supplier.LTA_FIXED_MT;
                maxMT = supplier.TOTAL_MAX_AVAILABLE_MT || supplier.LTA_FIXED_MT;
            } else {
                minMT = supplier.MIN_AVAILABLE_MT || 0;
                maxMT = supplier.MAX_AVAILABLE_MT || 0;
            }
            // Show remaining limit
            const remainingLimit = purchaseLimit.remaining;
            const limitClass = remainingLimit <= 0 ? 'negative' : '';
            html += `
                <tr>
                    <td><strong>${key}</strong></td>
                    <td>${supplier.ORIGIN_PORT}</td>
                    <td>${premiumSign}$${premium}/MT</td>
                    <td class="${limitClass}">${remainingLimit}/${purchaseLimit.max} MT left</td>
                    <td><button class="trade-btn" onclick="TradePanel.openBuy('${key}')" ${remainingLimit <= 0 ? 'disabled' : ''}>BUY</button></td>
                </tr>
            `;
        } else {
            html += '<tr><td colspan="5">No supplier available this period</td></tr>';
        }
        html += '</table></div>';

        // Buyers section - SIMPLIFIED (one buyer per period)
        html += '<div class="markets-section">';
        html += '<h4>THIS PERIOD\'S BUYER</h4>';
        html += '<table class="market-table">';
        html += '<tr><th>Region</th><th>Destination</th><th>Premium</th><th>Available</th><th></th></tr>';

        if (offers.buyer !== null && offers.buyerData) {
            const buyer = offers.buyerData;
            const index = offers.buyer;
            const premium = buyer.REGIONAL_PREMIUM_USD || 0;
            const premiumSign = premium >= 0 ? '+' : '';
            // Get sales limit for this region
            const buyerRegion = buyer.REGION || 'AMERICAS';
            const salesLimitRegion = GAME_STATE.regionToSalesLimit[buyerRegion.toUpperCase()] || 'AMERICAS';
            const salesLimit = GAME_STATE.checkSalesLimit(salesLimitRegion, 0);
            const limitClass = salesLimit.remaining <= 0 ? 'negative' : '';
            html += `
                <tr>
                    <td><strong>${buyer.REGION}</strong></td>
                    <td>${buyer.PORT_OF_DISCHARGE}</td>
                    <td>${premiumSign}$${premium}/MT</td>
                    <td class="${limitClass}">${salesLimit.remaining}/${salesLimit.max} MT left</td>
                    <td><button class="trade-btn sell" onclick="TradePanel.openSell(${index})" ${salesLimit.remaining <= 0 ? 'disabled' : ''}>SELL</button></td>
                </tr>
            `;
        } else {
            html += '<tr><td colspan="5">No buyer available this period</td></tr>';
        }
        html += '</table></div>';

        // Exchange prices
        html += '<div class="markets-section">';
        html += '<h4>EXCHANGE PRICES</h4>';
        html += '<table class="market-table">';
        html += '<tr><th>Exchange</th><th>Spot</th><th>1M</th><th>3M</th><th>12M</th></tr>';

        const lme = data.PRICING.LME;
        const comex = data.PRICING.COMEX;

        html += `
            <tr>
                <td>LME</td>
                <td>$${lme.SPOT_AVG}</td>
                <td>$${lme.FUTURES_1M}</td>
                <td>$${lme.FUTURES_3M}</td>
                <td>$${lme.FUTURES_12M}</td>
            </tr>
            <tr>
                <td>COMEX</td>
                <td>$${comex.SPOT_AVG}</td>
                <td>$${comex.FUTURES_1M}</td>
                <td>$${comex.FUTURES_3M}</td>
                <td>$${comex.FUTURES_12M}</td>
            </tr>
        `;
        html += '</table></div>';

        container.innerHTML = html;
    }
};


// ============================================================
// SECTION 3: POSITIONS WIDGET
// ============================================================

const PositionsWidget = {
    /**
     * Calculate transit progress for a position
     */
    getTransitInfo(pos) {
        const currentTurn = TimeManager.currentTurn;
        const turnsElapsed = currentTurn - pos.purchaseTurn;
        const totalTurns = pos.arrivalTurn - pos.purchaseTurn;
        const turnsRemaining = Math.max(0, pos.arrivalTurn - currentTurn);

        // Each turn ≈ 15 days
        const daysElapsed = turnsElapsed * 15;
        const daysRemaining = turnsRemaining * 15;

        const progressPercent = totalTurns > 0 ? Math.min(100, (turnsElapsed / totalTurns) * 100) : 100;

        // Get ETA month/period
        const etaInfo = TimeManager.getMonthPeriod(pos.arrivalTurn);

        return {
            turnsElapsed,
            totalTurns,
            turnsRemaining,
            daysElapsed,
            daysRemaining,
            totalDays: pos.travelTimeDays,
            progressPercent,
            etaTurn: pos.arrivalTurn,
            etaMonth: etaInfo.monthName,
            etaPeriod: etaInfo.periodName
        };
    },

    /**
     * Render the positions widget
     */
    render() {
        const container = document.getElementById('content2');
        if (!container) return;

        // Check active tab
        const activeTab = container.closest('.panel').querySelector('.tab.active');
        if (activeTab && activeTab.dataset.widget !== 'Positions') return;

        let html = '';

        // Physical positions
        html += '<div class="markets-section">';
        html += '<h4>PHYSICAL POSITIONS</h4>';

        const physPositions = GAME_STATE.physicalPositions.filter(p => p.status !== 'SOLD');

        if (physPositions.length === 0) {
            html += '<div class="empty-state">No physical positions</div>';
        } else {
            physPositions.forEach(pos => {
                html += this.renderPositionCard(pos);
            });
        }
        html += '</div>';

        // Purchases Pending QP
        const pendingPurchases = GAME_STATE.purchasesPendingQP || [];
        if (pendingPurchases.length > 0) {
            html += '<div class="markets-section">';
            html += '<h4>PURCHASES PENDING QP REVEAL</h4>';
            pendingPurchases.forEach(purchase => {
                const qpMonth = TimeManager.MONTHS[purchase.qpMonthIndex] || 'N/A';
                html += `
                    <div class="position-card pending-qp purchase">
                        <div class="position-header">
                            <span class="position-id">${purchase.id || purchase.positionId}</span>
                            <span class="status-badge pending">PENDING QP</span>
                        </div>
                        <div class="position-details">
                            <div class="detail-row">
                                <span class="label">Purchased:</span>
                                <span>${purchase.tonnage} MT from ${purchase.supplier}</span>
                            </div>
                            <div class="detail-row">
                                <span class="label">QP Reveals:</span>
                                <span class="highlight">${qpMonth} Early</span>
                            </div>
                            <div class="detail-row">
                                <span class="label">Prov. Base:</span>
                                <span>$${purchase.provisionalBasePrice?.toLocaleString()}/MT</span>
                            </div>
                            <div class="detail-row">
                                <span class="label">Premium (Fixed):</span>
                                <span>$${purchase.premium?.toLocaleString()}/MT</span>
                            </div>
                            <div class="detail-row">
                                <span class="label">Prov. Total:</span>
                                <span>$${purchase.totalCost?.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
        }

        // Sales Pending QP
        const pendingQP = GAME_STATE.salesPendingQP || [];
        if (pendingQP.length > 0) {
            html += '<div class="markets-section">';
            html += '<h4>SALES PENDING QP REVEAL</h4>';
            pendingQP.forEach(sale => {
                const qpMonth = TimeManager.MONTHS[sale.qpMonthIndex] || 'N/A';
                html += `
                    <div class="position-card pending-qp sale">
                        <div class="position-header">
                            <span class="position-id">${sale.id}</span>
                            <span class="status-badge pending">PENDING QP</span>
                        </div>
                        <div class="position-details">
                            <div class="detail-row">
                                <span class="label">Sold:</span>
                                <span>${sale.tonnage} MT to ${sale.buyer}</span>
                            </div>
                            <div class="detail-row">
                                <span class="label">QP Reveals:</span>
                                <span class="highlight">${qpMonth} Early</span>
                            </div>
                            <div class="detail-row">
                                <span class="label">Est. Revenue:</span>
                                <span>$${sale.estimatedRevenue?.toLocaleString()}</span>
                            </div>
                            <div class="detail-row">
                                <span class="label">Est. Profit:</span>
                                <span class="${sale.estimatedProfit >= 0 ? 'positive' : 'negative'}">$${sale.estimatedProfit?.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
        }

        // Futures positions
        html += '<div class="markets-section">';
        html += '<h4>FUTURES POSITIONS</h4>';

        const futPositions = GAME_STATE.futuresPositions.filter(p => p.status === 'OPEN');

        if (futPositions.length === 0) {
            html += '<div class="empty-state">No open futures</div>';
        } else {
            html += '<table class="positions-table">';
            html += '<tr><th>Contract</th><th>Dir</th><th>Qty</th><th>Entry</th><th>P&L</th><th></th></tr>';

            futPositions.forEach(pos => {
                const plClass = pos.unrealizedPL >= 0 ? 'positive' : 'negative';
                html += `
                    <tr>
                        <td>${pos.exchange} ${pos.contract}</td>
                        <td>${pos.direction}</td>
                        <td>${pos.contracts}</td>
                        <td>$${pos.entryPrice}</td>
                        <td class="${plClass}">$${pos.unrealizedPL.toLocaleString()}</td>
                        <td><button class="trade-btn sell" onclick="GAME_STATE.closeFutures('${pos.id}')">CLOSE</button></td>
                    </tr>
                `;
            });
            html += '</table>';
        }
        html += '</div>';

        container.innerHTML = html;
    },

    /**
     * Render a single position card with full details
     */
    renderPositionCard(pos) {
        const isInTransit = pos.status === 'IN_TRANSIT';
        const isArrived = pos.status === 'ARRIVED';

        let statusHtml = '';
        let locationHtml = '';
        let actionHtml = '';

        if (isInTransit) {
            const transit = this.getTransitInfo(pos);
            statusHtml = `
                <div class="transit-info">
                    <div class="transit-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${transit.progressPercent}%"></div>
                        </div>
                        <span class="progress-text">${Math.round(transit.progressPercent)}%</span>
                    </div>
                    <div class="transit-eta">
                        ETA: <strong>${transit.etaMonth} ${transit.etaPeriod}</strong> (Turn ${transit.etaTurn})
                        <span class="days-remaining">~${Math.round(transit.daysRemaining)} days</span>
                    </div>
                </div>
            `;
            locationHtml = `
                <div class="detail-row">
                    <span class="label">Route:</span>
                    <span>${pos.originPort} → ${pos.destinationPortName || pos.destination}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Destination Region:</span>
                    <span>${pos.destinationRegion}</span>
                </div>
            `;
        } else if (isArrived) {
            statusHtml = `
                <div class="arrived-info">
                    <span class="location-icon">📍</span>
                    <span class="current-location">At ${pos.currentPort || pos.destinationPort}</span>
                </div>
            `;
            locationHtml = `
                <div class="detail-row">
                    <span class="label">Current Location:</span>
                    <span class="highlight">${pos.currentPortName || pos.destinationPortName || pos.destination}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Region:</span>
                    <span>${pos.currentRegion || pos.destinationRegion}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Arrived:</span>
                    <span>Turn ${pos.arrivedTurn || pos.arrivalTurn}</span>
                </div>
            `;
            actionHtml = `
                <div class="position-actions">
                    <button class="trade-btn sell" onclick="TradePanel.openSellFromPosition('${pos.id}')">SELL</button>
                </div>
            `;
        }

        return `
            <div class="position-card ${isInTransit ? 'in-transit' : 'arrived'}">
                <div class="position-header">
                    <span class="position-id">${pos.id}</span>
                    <span class="status-badge ${isInTransit ? 'transit' : 'arrived'}">${pos.status.replace('_', ' ')}</span>
                </div>
                ${statusHtml}
                <div class="position-details">
                    <div class="detail-row">
                        <span class="label">Quantity:</span>
                        <span><strong>${pos.tonnage} MT</strong></span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Supplier:</span>
                        <span>${pos.supplier} (${pos.originPort})</span>
                    </div>
                    ${locationHtml}
                    ${this.renderCostBasis(pos)}
                    <div class="detail-row">
                        <span class="label">Terms:</span>
                        <span>${pos.shippingTerms} | ${pos.exchange}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Purchased:</span>
                        <span>${pos.purchaseMonth} ${pos.purchasePeriod} (Turn ${pos.purchaseTurn})</span>
                    </div>
                </div>
                ${actionHtml}
            </div>
        `;
    },

    /**
     * Render cost basis with provisional/final M+1 pricing info
     */
    renderCostBasis(pos) {
        // Check if this position has M+1 pricing info
        const hasM1Pricing = pos.provisionalBasePrice !== undefined;

        if (!hasM1Pricing) {
            // Legacy position without M+1 tracking
            return `
                <div class="detail-row">
                    <span class="label">Cost Basis:</span>
                    <span>$${pos.pricePerMT?.toLocaleString()}/MT ($${pos.totalCost?.toLocaleString()} total)</span>
                </div>
            `;
        }

        // Position has M+1 pricing - check if QP revealed
        if (pos.qpRevealed) {
            // QP has been revealed - show final pricing
            const adjustment = pos.costAdjustment || 0;
            const adjClass = adjustment <= 0 ? 'positive' : 'negative';
            const adjSign = adjustment > 0 ? '+' : '';
            return `
                <div class="detail-row">
                    <span class="label">Final Cost:</span>
                    <span>$${pos.actualPricePerMT?.toLocaleString()}/MT ($${pos.actualTotalCost?.toLocaleString()} total)</span>
                </div>
                <div class="detail-row">
                    <span class="label">M+1 Adjustment:</span>
                    <span class="${adjClass}">${adjSign}$${adjustment.toLocaleString()} ${adjustment > 0 ? '(cost up)' : adjustment < 0 ? '(cost down)' : ''}</span>
                </div>
            `;
        } else {
            // QP not yet revealed - show provisional with pending notice
            const qpMonthIndex = pos.qpMonthIndex || (TimeManager.MONTHS.indexOf(pos.purchaseMonth) + 1);
            const qpMonth = TimeManager.MONTHS[qpMonthIndex] || 'N/A';
            return `
                <div class="detail-row">
                    <span class="label">Provisional Cost:</span>
                    <span>$${pos.pricePerMT?.toLocaleString()}/MT ($${pos.totalCost?.toLocaleString()} total)</span>
                </div>
                <div class="detail-row qp-pending-row">
                    <span class="label">Final Price:</span>
                    <span class="qp-pending-badge">⏳ PENDING - Reveals ${qpMonth} Early</span>
                </div>
            `;
        }
    }
};


// ============================================================
// SECTION 4: FUTURES WIDGET
// ============================================================

const FuturesWidget = {
    selectedExchange: 'LME',
    selectedContract: 'FUTURES_1M',
    selectedDirection: 'LONG',

    // Map internal contract keys to display names
    contractLabels: {
        'SPOT_AVG': 'Spot',
        'FUTURES_1M': '1M',
        'FUTURES_3M': '3M',
        'FUTURES_12M': '12M'
    },

    /**
     * Render the futures widget
     */
    render() {
        const container = document.getElementById('content2');
        if (!container) return;

        // Check active tab
        const activeTab = container.closest('.panel').querySelector('.tab.active');
        if (activeTab && activeTab.dataset.widget !== 'Futures') return;

        const data = GAME_STATE.currentMonthData;
        console.log('[FUTURES] Rendering with data:', data);
        if (!data || !data.PRICING) {
            console.warn('[FUTURES] No data or PRICING missing');
            return;
        }

        let html = '';

        // LME Section
        html += '<div class="futures-section">';
        html += '<h4>LME COPPER</h4>';
        html += '<div class="futures-grid">';

        ['SPOT_AVG', 'FUTURES_1M', 'FUTURES_3M', 'FUTURES_12M'].forEach(contract => {
            const price = data.PRICING.LME[contract];
            const label = this.contractLabels[contract];
            html += `
                <div class="futures-card">
                    <div class="contract">${label}</div>
                    <div class="price">$${price.toLocaleString()}</div>
                    <div class="futures-btn-group">
                        <button class="futures-btn long" onclick="FuturesWidget.openPanel('LME', '${contract}', 'LONG')">LONG</button>
                        <button class="futures-btn short" onclick="FuturesWidget.openPanel('LME', '${contract}', 'SHORT')">SHORT</button>
                    </div>
                </div>
            `;
        });
        html += '</div></div>';

        // COMEX Section
        html += '<div class="futures-section">';
        html += '<h4>COMEX COPPER</h4>';
        html += '<div class="futures-grid">';

        ['SPOT_AVG', 'FUTURES_1M', 'FUTURES_3M', 'FUTURES_12M'].forEach(contract => {
            const price = data.PRICING.COMEX[contract];
            const label = this.contractLabels[contract];
            html += `
                <div class="futures-card">
                    <div class="contract">${label}</div>
                    <div class="price">$${price.toLocaleString()}</div>
                    <div class="futures-btn-group">
                        <button class="futures-btn long" onclick="FuturesWidget.openPanel('COMEX', '${contract}', 'LONG')">LONG</button>
                        <button class="futures-btn short" onclick="FuturesWidget.openPanel('COMEX', '${contract}', 'SHORT')">SHORT</button>
                    </div>
                </div>
            `;
        });
        html += '</div></div>';

        container.innerHTML = html;
    },

    /**
     * Open futures trading panel
     */
    openPanel(exchange, contract, direction) {
        this.selectedExchange = exchange;
        this.selectedContract = contract;
        this.selectedDirection = direction;

        const data = GAME_STATE.currentMonthData;
        const price = exchange === 'LME' ?
            data.PRICING.LME[contract] :
            data.PRICING.COMEX[contract];

        document.getElementById('futuresExchange').textContent = exchange;
        document.getElementById('futuresContract').textContent = this.contractLabels[contract];
        document.getElementById('futuresDirection').textContent = direction;
        document.getElementById('futuresPrice').textContent = '$' + price.toLocaleString();

        document.getElementById('futuresContracts').value = 1;
        this.updateCalc();

        document.getElementById('futuresPanel').style.display = 'block';
    },

    /**
     * Close panel
     */
    closePanel() {
        document.getElementById('futuresPanel').style.display = 'none';
    },

    /**
     * Update calculation
     */
    updateCalc() {
        const contracts = parseInt(document.getElementById('futuresContracts').value) || 1;
        const margin = contracts * 9000;
        const fees = contracts * 25;
        const total = margin + fees;

        document.getElementById('futuresMargin').textContent = '$' + margin.toLocaleString();
        document.getElementById('futuresFees').textContent = '$' + fees.toLocaleString();
        document.getElementById('futuresTotal').textContent = '$' + total.toLocaleString();
    },

    /**
     * Execute futures trade
     */
    execute() {
        const contracts = parseInt(document.getElementById('futuresContracts').value) || 1;

        const success = GAME_STATE.openFutures(
            this.selectedExchange,
            this.selectedContract,
            this.selectedDirection,
            contracts
        );

        if (success) {
            this.closePanel();
            alert('Futures position opened successfully!');
        }
    }
};


// ============================================================
// SECTION 5: MAP WIDGET
// ============================================================

const MapWidget = {
    map: null,
    routesData: null,
    activeShipments: new Map(),

    /**
     * Initialize the map
     */
    async init() {
        console.log('[MAP] Initializing...');

        // Load routes data
        try {
            const response = await fetch('data/maritime_routes.json');
            this.routesData = await response.json();
            console.log('[MAP] Routes loaded:', Object.keys(this.routesData.routes).length);
        } catch (e) {
            console.error('[MAP] Failed to load routes:', e);
        }

        // Initialize Mapbox
        mapboxgl.accessToken = 'pk.eyJ1IjoiamRjbTEwMjAwMSIsImEiOiJjbWhtcTdhNGQyNHlmMnFwcjF3YTF6YmlyIn0.uugX8H3ObKHWL7ia1MBFBg';

        this.map = new mapboxgl.Map({
            container: 'mapContainer',
            style: 'mapbox://styles/mapbox/dark-v11',
            center: [-50, 10],
            zoom: 1.5
        });

        this.map.on('load', () => {
            this.addPortMarkers();
            console.log('[MAP] Map loaded');
        });
    },

    /**
     * Add port markers
     */
    addPortMarkers() {
        const ports = {
            antofagasta: { name: 'Antofagasta', coords: [-70.38, -23.65], type: 'seller' },
            callao: { name: 'Callao', coords: [-77.13, -12.04], type: 'seller' },
            neworleans: { name: 'New Orleans', coords: [-90.07, 29.88], type: 'hub' },
            houston: { name: 'Houston', coords: [-95.06, 29.76], type: 'parity' },
            shanghai: { name: 'Shanghai', coords: [121.47, 31.23], type: 'hub' },
            ningbo: { name: 'Ningbo', coords: [121.55, 29.87], type: 'parity' },
            busan: { name: 'Busan', coords: [129.04, 35.10], type: 'parity' },
            rotterdam: { name: 'Rotterdam', coords: [4.48, 51.92], type: 'hub' },
            antwerp: { name: 'Antwerp', coords: [4.40, 51.22], type: 'parity' },
            hamburg: { name: 'Hamburg', coords: [9.99, 53.55], type: 'parity' },
            valencia: { name: 'Valencia', coords: [-0.38, 39.47], type: 'parity' },
            singapore: { name: 'Singapore', coords: [103.85, 1.29], type: 'parity' },
            newark: { name: 'Newark', coords: [-74.17, 40.73], type: 'parity' },
            montreal: { name: 'Montreal', coords: [-73.56, 45.50], type: 'parity' }
        };

        for (const [id, port] of Object.entries(ports)) {
            const el = document.createElement('div');
            el.className = 'port-marker port-' + port.type;

            new mapboxgl.Marker(el)
                .setLngLat(port.coords)
                .setPopup(new mapboxgl.Popup({ offset: 10 })
                    .setHTML(`<strong>${port.name}</strong>`))
                .addTo(this.map);
        }
    },

    /**
     * Add a shipment route to the map
     */
    addShipment(position) {
        if (!this.routesData) return;

        // Find route key
        const origin = position.supplier.toLowerCase();
        const dest = position.destination.toLowerCase().replace(/\s+/g, '').replace('_', '');
        const routeKey = `${origin}_to_${dest}`;

        const route = this.routesData.routes[routeKey];
        if (!route) {
            console.warn('[MAP] Route not found:', routeKey);
            return;
        }

        // Add route line
        const sourceId = 'route-' + position.id;
        const layerId = 'layer-' + position.id;

        this.map.addSource(sourceId, {
            type: 'geojson',
            data: {
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: route.coordinates
                }
            }
        });

        this.map.addLayer({
            id: layerId,
            type: 'line',
            source: sourceId,
            paint: {
                'line-color': '#3b82f6',
                'line-width': 2,
                'line-opacity': 0.8
            }
        });

        // Add ship marker
        const shipEl = document.createElement('div');
        shipEl.className = 'ship-marker';
        shipEl.textContent = '🚢';

        const shipMarker = new mapboxgl.Marker(shipEl)
            .setLngLat(route.coordinates[0])
            .addTo(this.map);

        // Store shipment data
        this.activeShipments.set(position.id, {
            sourceId,
            layerId,
            marker: shipMarker,
            route: route.coordinates,
            position
        });

        // Animate ship
        this.animateShip(position.id);

        console.log('[MAP] Shipment added:', position.id);
    },

    /**
     * Animate a ship along its route
     */
    animateShip(positionId) {
        const shipment = this.activeShipments.get(positionId);
        if (!shipment) return;

        const duration = 10000; // 10 seconds
        const startTime = Date.now();
        const coords = shipment.route;

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Calculate position along route
            const totalSegments = coords.length - 1;
            const position = progress * totalSegments;
            const segment = Math.floor(position);
            const segmentProgress = position - segment;

            if (segment < totalSegments) {
                const start = coords[segment];
                const end = coords[segment + 1];
                const lng = start[0] + (end[0] - start[0]) * segmentProgress;
                const lat = start[1] + (end[1] - start[1]) * segmentProgress;

                shipment.marker.setLngLat([lng, lat]);
            }

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Animation complete - change route color
                this.map.setPaintProperty(shipment.layerId, 'line-color', '#10b981');
                console.log('[MAP] Ship arrived:', positionId);
            }
        };

        animate();
    }
};


// ============================================================
// SECTION 6: ANALYTICS WIDGET
// ============================================================

const AnalyticsWidget = {
    chart: null,

    /**
     * Render the analytics widget
     */
    render() {
        const canvas = document.getElementById('futuresChart');
        if (!canvas) return;

        // Collect historical prices
        const labels = [];
        const lmeData = [];
        const comexData = [];

        console.log('[ANALYTICS] allMonthData:', GAME_STATE.allMonthData);
        GAME_STATE.allMonthData.forEach((data, index) => {
            console.log(`[ANALYTICS] Month ${index}:`, data);
            if (data && data.PRICING) {
                labels.push(data.MONTH.substring(0, 3));
                lmeData.push(data.PRICING.LME.SPOT_AVG);
                comexData.push(data.PRICING.COMEX.SPOT_AVG);
            }
        });

        // Destroy existing chart
        if (this.chart) {
            this.chart.destroy();
        }

        // Create new chart
        this.chart = new Chart(canvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'LME Spot',
                        data: lmeData,
                        borderColor: '#3b82f6',
                        backgroundColor: 'transparent',
                        tension: 0.3
                    },
                    {
                        label: 'COMEX Spot',
                        data: comexData,
                        borderColor: '#f59e0b',
                        backgroundColor: 'transparent',
                        tension: 0.3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: '#888' }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: '#666' },
                        grid: { color: '#333' }
                    },
                    y: {
                        ticks: { color: '#666' },
                        grid: { color: '#333' }
                    }
                }
            }
        });
    }
};


// ============================================================
// SECTION 7: TRADE PANEL
// ============================================================

const TradePanel = {
    currentSupplier: null,
    currentBuyer: null,
    currentPosition: null,

    // Map supplier keys to freight rate port keys
    supplierToPort: {
        'PERUVIAN': 'CALLAO',
        'CHILEAN': 'ANTOFAGASTA'
    },

    /**
     * Open buy panel
     */
    openBuy(supplierKey) {
        this.currentSupplier = supplierKey;

        const data = GAME_STATE.currentMonthData;
        const supplier = data.MARKET_DEPTH.SUPPLY[supplierKey];
        const premium = supplier.SUPPLIER_PREMIUM_USD || 0;

        // Populate panel
        document.getElementById('buySupplier').textContent = supplierKey;
        document.getElementById('buyPort').textContent = supplier.ORIGIN_PORT;
        document.getElementById('buyPremium').textContent =
            (premium >= 0 ? '+' : '') + '$' + premium + '/MT';

        // Determine tonnage range based on supplier type
        let minMT, maxMT;
        if (supplier.LTA_FIXED_MT) {
            minMT = supplier.LTA_FIXED_MT;
            maxMT = supplier.TOTAL_MAX_AVAILABLE_MT || supplier.LTA_FIXED_MT;
        } else {
            minMT = supplier.MIN_AVAILABLE_MT || 5;
            maxMT = supplier.MAX_AVAILABLE_MT || 100;
        }
        document.getElementById('buyTonnage').min = minMT;
        document.getElementById('buyTonnage').max = maxMT;
        document.getElementById('buyTonnage').value = minMT;
        document.getElementById('buyRange').textContent = `Range: ${minMT}-${maxMT} MT`;

        // Populate destinations
        const destSelect = document.getElementById('buyDestination');
        destSelect.innerHTML = '<option value="">Select destination...</option>';

        const portKey = this.supplierToPort[supplierKey];
        const freightData = data.LOGISTICS.FREIGHT_RATES[portKey];
        for (const [destKey, dest] of Object.entries(freightData)) {
            destSelect.innerHTML += `<option value="${destKey}">${dest.PORT_NAME}, ${dest.COUNTRY}</option>`;
        }

        // Update calculation
        this.updateBuyCalc();

        // Show panel
        document.getElementById('buyPanel').style.display = 'block';
    },

    /**
     * Update buy calculation
     */
    updateBuyCalc() {
        const data = GAME_STATE.currentMonthData;
        if (!this.currentSupplier || !data) return;

        const supplier = data.MARKET_DEPTH.SUPPLY[this.currentSupplier];
        const tonnage = parseInt(document.getElementById('buyTonnage').value) || 0;
        const exchange = document.getElementById('buyExchange').value;
        const destKey = document.getElementById('buyDestination').value;
        const shipping = document.getElementById('buyShipping').value;

        // Base price
        const basePrice = exchange === 'LME' ?
            data.PRICING.LME.SPOT_AVG : data.PRICING.COMEX.SPOT_AVG;
        document.getElementById('buyBasePrice').textContent = '$' + basePrice + '/MT';

        // Premium
        const premium = supplier.SUPPLIER_PREMIUM_USD || 0;
        document.getElementById('buyPremiumCost').textContent =
            (premium >= 0 ? '+' : '') + '$' + premium + '/MT';

        // Freight
        let freight = 0;
        if (destKey) {
            const portKey = this.supplierToPort[this.currentSupplier];
            const dest = data.LOGISTICS.FREIGHT_RATES[portKey][destKey];
            freight = shipping === 'CIF' ? dest.CIF_RATE_USD_PER_TONNE : dest.FOB_RATE_USD_PER_TONNE;
        }
        document.getElementById('buyFreight').textContent = '$' + freight + '/MT';

        // Total
        const pricePerMT = basePrice + premium + freight;
        const total = pricePerMT * tonnage;
        document.getElementById('buyTotal').textContent = '$' + total.toLocaleString();
    },

    /**
     * Execute buy
     */
    executeBuy() {
        const tonnage = parseInt(document.getElementById('buyTonnage').value);
        const exchange = document.getElementById('buyExchange').value;
        const destination = document.getElementById('buyDestination').value;
        const shipping = document.getElementById('buyShipping').value;

        if (!destination) {
            alert('Please select a destination!');
            return;
        }

        const success = GAME_STATE.purchaseCopper(
            this.currentSupplier,
            tonnage,
            destination,
            exchange,
            shipping
        );

        if (success) {
            this.close();
            alert('Purchase successful!');
        }
    },

    /**
     * Open sell panel
     */
    openSell(buyerIndex) {
        this.currentBuyer = buyerIndex;

        const data = GAME_STATE.currentMonthData;
        const buyer = data.CLIENTS.OPPORTUNITIES[buyerIndex];
        const premium = buyer.REGIONAL_PREMIUM_USD || 0;

        document.getElementById('sellBuyer').textContent = buyer.REGION;
        document.getElementById('sellDest').textContent = buyer.PORT_OF_DISCHARGE;
        document.getElementById('sellPremiumInfo').textContent =
            (premium >= 0 ? '+' : '') + '$' + premium + '/MT';

        // Populate inventory
        this.populateInventory();

        // Show panel
        document.getElementById('sellPanel').style.display = 'block';
    },

    /**
     * Open sell from position
     */
    openSellFromPosition(positionId) {
        this.currentPosition = GAME_STATE.physicalPositions.find(p => p.id === positionId);
        if (!this.currentPosition) return;

        // Use the current period's buyer offer (simplified market)
        const data = GAME_STATE.currentMonthData;
        const offers = GAME_STATE.currentPeriodOffers;
        this.currentBuyer = offers.buyer;

        const buyer = offers.buyerData || data.CLIENTS.OPPORTUNITIES[0];
        const premium = buyer.REGIONAL_PREMIUM_USD || 0;
        document.getElementById('sellBuyer').textContent = buyer.REGION;
        document.getElementById('sellDest').textContent = buyer.PORT_OF_DISCHARGE;
        document.getElementById('sellPremiumInfo').textContent =
            (premium >= 0 ? '+' : '') + '$' + premium + '/MT';

        // Update cargo location display
        this.updateCargoLocationDisplay(this.currentPosition);

        // Update region match indicator
        this.updateRegionMatchIndicator(this.currentPosition, buyer);

        // Update QP warning
        this.updateQPWarning();

        // Populate inventory with this position selected
        this.populateInventory(positionId);

        document.getElementById('sellPanel').style.display = 'block';
    },

    /**
     * Update cargo location display
     */
    updateCargoLocationDisplay(position) {
        if (!position) return;

        const cargoPort = position.currentPortName || position.destinationPortName || position.destination;
        const cargoRegion = position.currentRegion || position.destinationRegion || 'UNKNOWN';

        document.getElementById('sellCargoPort').textContent = cargoPort;
        document.getElementById('sellCargoRegion').textContent = cargoRegion;
    },

    /**
     * Update region match indicator
     */
    updateRegionMatchIndicator(position, buyer) {
        const indicator = document.getElementById('regionMatchIndicator');
        if (!position || !buyer) return;

        const cargoRegion = position.currentRegion || position.destinationRegion;
        const buyerRegion = buyer.REGION || '';

        // Map buyer region to our region system
        const buyerRegionMapped = GAME_STATE.regionToSalesLimit[buyerRegion.toUpperCase()] || 'UNKNOWN';

        const isMatch = cargoRegion === buyerRegionMapped;

        if (isMatch) {
            indicator.className = 'region-match-indicator match';
            indicator.innerHTML = `SAME REGION - No additional freight required`;
        } else {
            indicator.className = 'region-match-indicator mismatch';
            indicator.innerHTML = `DIFFERENT REGION - Cargo at ${cargoRegion}, Buyer in ${buyerRegionMapped}<br><small>FOB from ${position.currentPortName || position.destination} - Buyer arranges freight</small>`;
        }
    },

    /**
     * Update QP warning display
     */
    updateQPWarning() {
        const timeInfo = TimeManager.getMonthPeriod();
        const qpMonthIndex = timeInfo.monthIndex + 1;

        // Check if June (no M+1)
        if (timeInfo.monthIndex >= 5) {
            document.getElementById('qpWarning').style.display = 'none';
        } else {
            document.getElementById('qpWarning').style.display = 'flex';
            const qpMonth = TimeManager.MONTHS[qpMonthIndex];
            document.getElementById('qpRevealDate').textContent = `${qpMonth} Early`;
        }
    },

    /**
     * Populate inventory dropdown
     */
    populateInventory(selectedId) {
        const select = document.getElementById('sellInventory');
        select.innerHTML = '';

        const arrivedPositions = GAME_STATE.physicalPositions.filter(p => p.status === 'ARRIVED');

        if (arrivedPositions.length === 0) {
            select.innerHTML = '<option value="">No inventory available</option>';
            return;
        }

        arrivedPositions.forEach(pos => {
            const selected = pos.id === selectedId ? 'selected' : '';
            const location = pos.currentPortName || pos.destinationPortName || pos.destination;
            select.innerHTML += `<option value="${pos.id}" ${selected}>${pos.tonnage} MT at ${location}</option>`;
        });

        this.updateSellCalc();
    },

    /**
     * Update sell calculation
     */
    updateSellCalc() {
        const data = GAME_STATE.currentMonthData;
        if (this.currentBuyer === null || !data) return;

        const buyer = data.CLIENTS.OPPORTUNITIES[this.currentBuyer];
        const positionId = document.getElementById('sellInventory').value;
        const position = GAME_STATE.physicalPositions.find(p => p.id === positionId);
        const tonnage = parseInt(document.getElementById('sellTonnage').value) || 0;

        // Update cargo location display when inventory changes
        if (position) {
            this.updateCargoLocationDisplay(position);
            this.updateRegionMatchIndicator(position, buyer);
        }

        // Sale price
        let basePrice = data.PRICING.LME.SPOT_AVG; // Default
        if (position) {
            basePrice = position.exchange === 'LME' ?
                data.PRICING.LME.SPOT_AVG : data.PRICING.COMEX.SPOT_AVG;
        }
        const premium = buyer.REGIONAL_PREMIUM_USD || 0;
        const salePrice = basePrice + premium;
        document.getElementById('sellPrice').textContent = '$' + salePrice + '/MT';

        // Revenue
        const revenue = salePrice * tonnage;
        document.getElementById('sellRevenue').textContent = '$' + revenue.toLocaleString();

        // Cost
        let cost = 0;
        if (position) {
            cost = position.pricePerMT * tonnage;
        }
        document.getElementById('sellCost').textContent = '$' + cost.toLocaleString();

        // Profit (estimated)
        const profit = revenue - cost;
        const profitEl = document.getElementById('sellProfit');
        profitEl.textContent = '$' + profit.toLocaleString();
        profitEl.className = profit >= 0 ? 'positive' : 'negative';
    },

    /**
     * Execute sell
     */
    executeSell() {
        const positionId = document.getElementById('sellInventory').value;
        const tonnage = parseInt(document.getElementById('sellTonnage').value);

        if (!positionId) {
            alert('Please select inventory to sell!');
            return;
        }

        const timeInfo = TimeManager.getMonthPeriod();
        const isJune = timeInfo.monthIndex >= 5;

        const profit = GAME_STATE.sellCopper(positionId, this.currentBuyer, tonnage);

        if (profit !== false) {
            this.close();

            // Show appropriate message based on M+1 status
            if (isJune) {
                alert(`Sale complete!\nFinal Profit: $${profit.toLocaleString()}\n\n(June sales settle at current price)`);
            } else {
                const qpMonth = TimeManager.MONTHS[timeInfo.monthIndex + 1];
                alert(`Sale recorded!\n\nEstimated Profit: $${profit.toLocaleString()}\n\nFinal price will be revealed at ${qpMonth} Early.\nProfit is subject to M+1 adjustment.`);
            }
        }
    },

    /**
     * Close panels
     */
    close() {
        document.getElementById('buyPanel').style.display = 'none';
        document.getElementById('sellPanel').style.display = 'none';
        this.currentSupplier = null;
        this.currentBuyer = null;
        this.currentPosition = null;
    }
};


// ============================================================
// SECTION 8: TAB SWITCHING
// ============================================================

const TabManager = {
    /**
     * Initialize tab switching
     */
    init() {
        // Add click handlers to all tabs
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchTab(e.target));
        });
    },

    /**
     * Switch to a tab
     */
    switchTab(tabElement) {
        const panel = tabElement.closest('.panel');
        const widgetName = tabElement.dataset.widget;

        // Update active states
        panel.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tabElement.classList.add('active');

        // Render appropriate widget
        const contentId = panel.querySelector('.panel-content').id;

        console.log('[TAB] Switching to:', widgetName);

        switch (widgetName) {
            case 'Markets':
                MarketsWidget.render();
                break;
            case 'Positions':
                PositionsWidget.render();
                break;
            case 'Futures':
                FuturesWidget.render();
                break;
            case 'Analytics':
                AnalyticsWidget.render();
                break;
            case 'Map':
                // Map is always visible
                break;
        }
    }
};


// ============================================================
// SECTION 9: SIDEBAR WIDGET CLICKS
// ============================================================

const SidebarManager = {
    /**
     * Initialize sidebar
     */
    init() {
        document.querySelectorAll('#widgetList li').forEach(item => {
            item.addEventListener('click', () => {
                const widgetName = item.dataset.widget;
                console.log('[SIDEBAR] Clicked:', widgetName);

                // Find first panel with this widget as a tab and switch to it
                document.querySelectorAll('.tab').forEach(tab => {
                    if (tab.dataset.widget === widgetName) {
                        TabManager.switchTab(tab);
                    }
                });
            });
        });
    }
};


// ============================================================
// SECTION 10: BANK WIDGET (LOC Management)
// ============================================================

const BankWidget = {
    /**
     * Render the bank widget in sidebar or dedicated panel
     */
    render() {
        const container = document.getElementById('bankContent');
        if (!container) return;

        const locAvailable = GAME_STATE.lineOfCredit - GAME_STATE.locUsed;
        const utilizationPercent = ((GAME_STATE.locUsed / GAME_STATE.lineOfCredit) * 100).toFixed(1);

        let html = `
            <div class="bank-section">
                <h4>LINE OF CREDIT</h4>
                <div class="bank-stats">
                    <div class="stat-row">
                        <span class="label">Credit Limit:</span>
                        <span class="value">$${GAME_STATE.lineOfCredit.toLocaleString()}</span>
                    </div>
                    <div class="stat-row">
                        <span class="label">Used:</span>
                        <span class="value ${GAME_STATE.locUsed > 0 ? 'negative' : ''}">$${GAME_STATE.locUsed.toLocaleString()}</span>
                    </div>
                    <div class="stat-row">
                        <span class="label">Available:</span>
                        <span class="value positive">$${locAvailable.toLocaleString()}</span>
                    </div>
                    <div class="stat-row">
                        <span class="label">Utilization:</span>
                        <span class="value">${utilizationPercent}%</span>
                    </div>
                    <div class="stat-row">
                        <span class="label">Interest Rate:</span>
                        <span class="value">${(GAME_STATE.locInterestRate * 100).toFixed(2)}% / month</span>
                    </div>
                    <div class="stat-row">
                        <span class="label">Total Interest Paid:</span>
                        <span class="value negative">$${GAME_STATE.totalInterestPaid.toLocaleString()}</span>
                    </div>
                </div>

                <div class="bank-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${Math.min(utilizationPercent, 100)}%"></div>
                    </div>
                </div>

                <div class="bank-actions">
                    <button class="bank-btn draw" onclick="BankWidget.openDrawPanel()" ${locAvailable <= 0 ? 'disabled' : ''}>
                        DRAW FUNDS
                    </button>
                    <button class="bank-btn repay" onclick="BankWidget.openRepayPanel()" ${GAME_STATE.locUsed <= 0 ? 'disabled' : ''}>
                        REPAY LOAN
                    </button>
                </div>

                <div class="bank-note">
                    <small>Interest charged at end of each month on outstanding balance.</small>
                </div>
            </div>
        `;

        container.innerHTML = html;
    },

    /**
     * Open draw funds panel
     */
    openDrawPanel() {
        const locAvailable = GAME_STATE.lineOfCredit - GAME_STATE.locUsed;
        if (locAvailable <= 0) {
            alert('No credit available to draw!');
            return;
        }

        document.getElementById('bankDrawMax').textContent = '$' + locAvailable.toLocaleString();
        document.getElementById('bankDrawAmount').max = locAvailable;
        document.getElementById('bankDrawAmount').value = Math.min(50000, locAvailable);
        this.updateDrawCalc();

        document.getElementById('bankDrawPanel').style.display = 'block';
    },

    /**
     * Update draw calculation
     */
    updateDrawCalc() {
        const amount = parseInt(document.getElementById('bankDrawAmount').value) || 0;
        const newFunds = GAME_STATE.practiceFunds + amount;
        const newLocUsed = GAME_STATE.locUsed + amount;
        const monthlyInterest = Math.round(newLocUsed * GAME_STATE.locInterestRate);

        document.getElementById('bankDrawNewFunds').textContent = '$' + newFunds.toLocaleString();
        document.getElementById('bankDrawNewLoc').textContent = '$' + newLocUsed.toLocaleString();
        document.getElementById('bankDrawInterest').textContent = '$' + monthlyInterest.toLocaleString() + '/month';
    },

    /**
     * Execute draw
     */
    executeDraw() {
        const amount = parseInt(document.getElementById('bankDrawAmount').value) || 0;
        const locAvailable = GAME_STATE.lineOfCredit - GAME_STATE.locUsed;

        if (amount <= 0) {
            alert('Please enter a valid amount!');
            return;
        }

        if (amount > locAvailable) {
            alert('Amount exceeds available credit!');
            return;
        }

        // Transfer from LOC to practice funds
        GAME_STATE.locUsed += amount;
        GAME_STATE.practiceFunds += amount;

        console.log(`[BANK] Drew $${amount.toLocaleString()} from LOC`);

        // Close panel and update displays
        this.closePanel();
        GAME_STATE.updateHeader();
        this.render();
        if (typeof DebugPanel !== 'undefined') DebugPanel.update();
        if (typeof EnhancedDebugPanel !== 'undefined') EnhancedDebugPanel.update();

        alert(`Successfully drew $${amount.toLocaleString()} from Line of Credit!`);
    },

    /**
     * Open repay panel
     */
    openRepayPanel() {
        if (GAME_STATE.locUsed <= 0) {
            alert('No outstanding balance to repay!');
            return;
        }

        const maxRepay = Math.min(GAME_STATE.practiceFunds, GAME_STATE.locUsed);
        document.getElementById('bankRepayOutstanding').textContent = '$' + GAME_STATE.locUsed.toLocaleString();
        document.getElementById('bankRepayMax').textContent = '$' + maxRepay.toLocaleString();
        document.getElementById('bankRepayAmount').max = maxRepay;
        document.getElementById('bankRepayAmount').value = Math.min(maxRepay, GAME_STATE.locUsed);
        this.updateRepayCalc();

        document.getElementById('bankRepayPanel').style.display = 'block';
    },

    /**
     * Update repay calculation
     */
    updateRepayCalc() {
        const amount = parseInt(document.getElementById('bankRepayAmount').value) || 0;
        const newFunds = GAME_STATE.practiceFunds - amount;
        const newLocUsed = GAME_STATE.locUsed - amount;
        const monthlyInterest = Math.round(newLocUsed * GAME_STATE.locInterestRate);

        document.getElementById('bankRepayNewFunds').textContent = '$' + newFunds.toLocaleString();
        document.getElementById('bankRepayNewLoc').textContent = '$' + newLocUsed.toLocaleString();
        document.getElementById('bankRepaySavings').textContent = '$' + Math.round(amount * GAME_STATE.locInterestRate).toLocaleString() + '/month';
    },

    /**
     * Execute repay
     */
    executeRepay() {
        const amount = parseInt(document.getElementById('bankRepayAmount').value) || 0;

        if (amount <= 0) {
            alert('Please enter a valid amount!');
            return;
        }

        if (amount > GAME_STATE.practiceFunds) {
            alert('Insufficient funds to repay!');
            return;
        }

        if (amount > GAME_STATE.locUsed) {
            alert('Amount exceeds outstanding balance!');
            return;
        }

        // Transfer from practice funds to LOC
        GAME_STATE.practiceFunds -= amount;
        GAME_STATE.locUsed -= amount;

        console.log(`[BANK] Repaid $${amount.toLocaleString()} to LOC`);

        // Close panel and update displays
        this.closePanel();
        GAME_STATE.updateHeader();
        this.render();
        if (typeof DebugPanel !== 'undefined') DebugPanel.update();
        if (typeof EnhancedDebugPanel !== 'undefined') EnhancedDebugPanel.update();

        alert(`Successfully repaid $${amount.toLocaleString()} to Line of Credit!`);
    },

    /**
     * Close panels
     */
    closePanel() {
        document.getElementById('bankDrawPanel').style.display = 'none';
        document.getElementById('bankRepayPanel').style.display = 'none';
    }
};


// ============================================================
// SECTION 11: DEBUG PANEL
// ============================================================

const DebugPanel = {
    visible: false,
    element: null,

    /**
     * Initialize debug panel
     */
    init() {
        // Create debug panel element
        this.element = document.createElement('div');
        this.element.id = 'debugPanel';
        this.element.innerHTML = `
            <div class="debug-header">
                <span>DEBUG PANEL</span>
                <button onclick="DebugPanel.toggle()">×</button>
            </div>
            <div class="debug-content" id="debugContent"></div>
        `;
        document.body.appendChild(this.element);

        // Add keyboard listener for ~ key
        document.addEventListener('keydown', (e) => {
            if (e.key === '`' || e.key === '~') {
                this.toggle();
            }
        });

        // Initial render
        this.update();

        console.log('[DEBUG] Debug panel initialized. Press ~ to toggle.');
    },

    /**
     * Toggle visibility
     */
    toggle() {
        this.visible = !this.visible;
        this.element.style.display = this.visible ? 'block' : 'none';
        if (this.visible) {
            this.update();
        }
    },

    /**
     * Update debug panel content
     */
    update() {
        if (!this.visible) return;

        const content = document.getElementById('debugContent');
        if (!content) return;

        const data = GAME_STATE.currentMonthData;

        const timeInfo = TimeManager.getMonthPeriod();
        let html = `
<div class="debug-section">
<h4>⏱ TIME SYSTEM</h4>
<pre>
Current Turn:   ${TimeManager.currentTurn} / ${TimeManager.TOTAL_TURNS}
Month:          ${timeInfo.monthName} (index: ${timeInfo.monthIndex})
Period:         ${timeInfo.periodName} (${timeInfo.period}/2)
Display:        ${TimeManager.getDisplayString()}
Remaining:      ${TimeManager.getRemainingTurns()} turns
Month Boundary: ${TimeManager.isMonthBoundary() ? 'YES (interest will charge on next turn)' : 'No'}
</pre>
</div>

<div class="debug-section">
<h4>💰 FINANCIAL</h4>
<pre>
Practice Funds: $${GAME_STATE.practiceFunds.toLocaleString()}
LOC Limit:      $${GAME_STATE.lineOfCredit.toLocaleString()}
LOC Used:       $${GAME_STATE.locUsed.toLocaleString()}
LOC Available:  $${(GAME_STATE.lineOfCredit - GAME_STATE.locUsed).toLocaleString()}
Buying Power:   $${(GAME_STATE.practiceFunds + GAME_STATE.lineOfCredit - GAME_STATE.locUsed).toLocaleString()}
Total P&L:      $${GAME_STATE.totalPL.toLocaleString()}
Interest Paid:  $${GAME_STATE.totalInterestPaid.toLocaleString()}
Interest Rate:  ${(GAME_STATE.locInterestRate * 100).toFixed(2)}% monthly
Inventory:      ${GAME_STATE.inventory} MT
</pre>
</div>

<div class="debug-section">
<h4>📦 PHYSICAL POSITIONS (${GAME_STATE.physicalPositions.length})</h4>
<pre>${this.formatPositions()}</pre>
</div>

<div class="debug-section">
<h4>📈 FUTURES POSITIONS (${GAME_STATE.futuresPositions.length})</h4>
<pre>${this.formatFutures()}</pre>
</div>

<div class="debug-section">
<h4>📊 CURRENT PRICES</h4>
<pre>${this.formatPrices(data)}</pre>
</div>

<div class="debug-section">
<h4>📁 DATA LOAD STATUS</h4>
<pre>${this.formatDataStatus()}</pre>
</div>
`;

        content.innerHTML = html;
    },

    /**
     * Format physical positions
     */
    formatPositions() {
        if (GAME_STATE.physicalPositions.length === 0) {
            return '[No positions]';
        }

        return GAME_STATE.physicalPositions.map((pos, i) => {
            return `#${i + 1} [${pos.status}]
  ${pos.tonnage} MT | ${pos.supplier} → ${pos.destination}
  Cost: $${pos.totalCost?.toLocaleString() || 'N/A'} ($${pos.pricePerMT}/MT)
  Bought: Turn ${pos.purchaseTurn} | Arrives: Turn ${pos.arrivalTurn}`;
        }).join('\n\n');
    },

    /**
     * Format futures positions
     */
    formatFutures() {
        if (GAME_STATE.futuresPositions.length === 0) {
            return '[No futures]';
        }

        return GAME_STATE.futuresPositions.map((pos, i) => {
            return `#${i + 1} [${pos.status}]
  ${pos.exchange} ${pos.contract} | ${pos.direction} x${pos.contracts}
  Entry: $${pos.entryPrice} | Current: $${pos.currentPrice || 'N/A'}
  Unrealized P&L: $${pos.unrealizedPL?.toLocaleString() || '0'}`;
        }).join('\n\n');
    },

    /**
     * Format prices
     */
    formatPrices(data) {
        if (!data || !data.PRICING) {
            return '[No pricing data]';
        }

        return `LME:
  Spot:  $${data.PRICING.LME.SPOT_AVG}
  1M:    $${data.PRICING.LME.FUTURES_1M}
  3M:    $${data.PRICING.LME.FUTURES_3M}
  12M:   $${data.PRICING.LME.FUTURES_12M}

COMEX:
  Spot:  $${data.PRICING.COMEX.SPOT_AVG}
  1M:    $${data.PRICING.COMEX.FUTURES_1M}
  3M:    $${data.PRICING.COMEX.FUTURES_3M}
  12M:   $${data.PRICING.COMEX.FUTURES_12M}`;
    },

    /**
     * Format data load status
     */
    formatDataStatus() {
        const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE'];
        const globalData = [
            window.JANUARY_DATA,
            window.FEBRUARY_DATA,
            window.MARCH_DATA,
            window.APRIL_DATA,
            window.MAY_DATA,
            window.JUNE_DATA
        ];

        return months.map((name, i) => {
            const data = globalData[i];
            if (!data) return `❌ ${name}: NOT LOADED`;

            const hasMarket = data.MARKET_DEPTH?.SUPPLY ? '✓' : '✗';
            const hasPricing = data.PRICING?.LME ? '✓' : '✗';
            const hasClients = data.CLIENTS?.OPPORTUNITIES ? '✓' : '✗';
            const hasLogistics = data.LOGISTICS?.FREIGHT_RATES ? '✓' : '✗';

            return `✅ ${name}: MARKET${hasMarket} PRICE${hasPricing} CLIENT${hasClients} LOGISTICS${hasLogistics}`;
        }).join('\n');
    }
};


// ============================================================
// SECTION 11: INITIALIZATION
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('=== PERSEVERANCE TRADING SIMULATOR ===');
    console.log('Bare-bones Functional Version');
    console.log('=====================================');

    // Initialize game state
    GAME_STATE.init();

    // Initialize UI components
    TabManager.init();
    SidebarManager.init();

    // Initialize debug panel
    DebugPanel.init();

    // Render initial widgets
    MarketsWidget.render();
    PositionsWidget.render();
    AnalyticsWidget.render();
    BankWidget.render();

    // Initialize map
    MapWidget.init();

    // Update debug panels after initial render
    DebugPanel.update();
    if (typeof EnhancedDebugPanel !== 'undefined') EnhancedDebugPanel.update();

    // Set up event listeners
    document.getElementById('nextTurnBtn').addEventListener('click', () => {
        if (confirm('Advance to next turn?')) {
            GAME_STATE.nextTurn();
        }
    });

    // Buy panel inputs
    ['buyTonnage', 'buyExchange', 'buyDestination', 'buyShipping'].forEach(id => {
        document.getElementById(id).addEventListener('change', () => TradePanel.updateBuyCalc());
    });

    // Sell panel inputs
    ['sellInventory', 'sellTonnage'].forEach(id => {
        document.getElementById(id).addEventListener('change', () => TradePanel.updateSellCalc());
    });

    // Futures panel input
    document.getElementById('futuresContracts').addEventListener('input', () => FuturesWidget.updateCalc());

    console.log('[APP] Initialization complete');
});
