/**
 * Perseverance Trading Simulator
 * Bare-bones Functional Version
 *
 * All code in one file for maximum traceability.
 * When you change something, you'll see the result immediately.
 */

// ============================================================
// SECTION 0A: NOTIFICATION MANAGER (Bell System)
// ============================================================

/**
 * NotificationManager handles the bell icon notification system
 * Stores notifications, manages unread count, and renders dropdown
 */
const NotificationManager = {
    notifications: [],
    unreadCount: 0,
    isOpen: false,

    /**
     * Initialize notification manager
     */
    init() {
        this.loadFromStorage();
        this.bindEvents();
        this.updateBadge();
        this.renderList();
        console.log('[NOTIF] NotificationManager initialized');
    },

    /**
     * Bind event listeners
     * Fixed: Added flag to prevent multiple bindings (memory leak prevention)
     */
    bindEvents() {
        // Prevent multiple bindings
        if (this._eventsBound) return;
        this._eventsBound = true;

        const bell = document.getElementById('notificationBell');
        if (bell) {
            bell.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleDropdown();
            });
        }

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.notification-bell')) {
                this.closeDropdown();
            }
        });

        // Mark all read button
        const markAllBtn = document.getElementById('markAllReadBtn');
        if (markAllBtn) {
            markAllBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.markAllAsRead();
            });
        }
    },

    /**
     * Add a new notification
     * @param {string} type - Notification type (qp-credit, qp-debit, cargo-arrived, etc.)
     * @param {string} title - Notification title
     * @param {string} message - Notification message
     * @param {string} icon - Emoji icon
     */
    add(type, title, message, icon) {
        const notification = {
            id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            type: type,
            title: title,
            message: message,
            icon: icon,
            turn: typeof TimeManager !== 'undefined' ? TimeManager.currentTurn : 1,
            turnDisplay: typeof TimeManager !== 'undefined' ? TimeManager.getDisplayString() : 'Turn 1',
            timestamp: new Date().toISOString(),
            read: false
        };

        this.notifications.unshift(notification);
        this.unreadCount++;
        this.updateBadge();
        this.saveToStorage();
        this.renderList();

        // Pulse animation on badge
        const badge = document.getElementById('notificationBadge');
        if (badge) {
            badge.classList.add('new');
            setTimeout(() => badge.classList.remove('new'), 1500);
        }

        console.log(`[NOTIF] Added: ${title}`);
    },

    /**
     * Mark single notification as read
     * @param {string} notificationId - ID of notification to mark as read
     */
    markAsRead(notificationId) {
        const notif = this.notifications.find(n => n.id === notificationId);
        if (notif && !notif.read) {
            notif.read = true;
            this.unreadCount = Math.max(0, this.unreadCount - 1);
            this.updateBadge();
            this.saveToStorage();
            this.renderList();
        }
    },

    /**
     * Mark all notifications as read
     */
    markAllAsRead() {
        this.notifications.forEach(n => n.read = true);
        this.unreadCount = 0;
        this.updateBadge();
        this.saveToStorage();
        this.renderList();
    },

    /**
     * Update badge display
     */
    updateBadge() {
        const badge = document.getElementById('notificationBadge');
        if (!badge) return;

        if (this.unreadCount > 0) {
            badge.style.display = 'flex';
            badge.textContent = this.unreadCount > 9 ? '9+' : this.unreadCount;
        } else {
            badge.style.display = 'none';
        }
    },

    /**
     * Toggle dropdown visibility
     */
    toggleDropdown() {
        const dropdown = document.getElementById('notificationDropdown');
        if (!dropdown) return;

        this.isOpen = !this.isOpen;
        dropdown.style.display = this.isOpen ? 'block' : 'none';
    },

    /**
     * Close dropdown
     */
    closeDropdown() {
        const dropdown = document.getElementById('notificationDropdown');
        if (dropdown) {
            dropdown.style.display = 'none';
            this.isOpen = false;
        }
    },

    /**
     * Render notification list
     */
    renderList() {
        const list = document.getElementById('notificationList');
        if (!list) return;

        if (this.notifications.length === 0) {
            list.innerHTML = '<div class="notification-empty">No notifications</div>';
            return;
        }

        // Show most recent 20 notifications
        const recentNotifs = this.notifications.slice(0, 20);

        list.innerHTML = recentNotifs.map(notif => `
            <div class="notification-item ${notif.read ? 'read' : 'unread'}"
                 data-id="${notif.id}"
                 onclick="NotificationManager.markAsRead('${notif.id}')">
                <div class="notification-icon">${notif.icon}</div>
                <div class="notification-content">
                    <div class="notification-message">
                        <strong>${notif.title}</strong>
                        <p>${notif.message}</p>
                    </div>
                    <div class="notification-time">${notif.turnDisplay}</div>
                </div>
            </div>
        `).join('');

        // Update mark all read button visibility
        const markAllBtn = document.getElementById('markAllReadBtn');
        if (markAllBtn) {
            markAllBtn.style.display = this.unreadCount > 0 ? 'block' : 'none';
        }
    },

    /**
     * Save to localStorage
     */
    saveToStorage() {
        try {
            localStorage.setItem('perseverance_notifications', JSON.stringify(this.notifications));
        } catch (e) {
            console.warn('[NOTIF] Could not save to localStorage');
        }
    },

    /**
     * Load from localStorage
     */
    loadFromStorage() {
        try {
            const saved = localStorage.getItem('perseverance_notifications');
            if (saved) {
                this.notifications = JSON.parse(saved);
                this.unreadCount = this.notifications.filter(n => !n.read).length;
            }
        } catch (e) {
            console.warn('[NOTIF] Could not load from localStorage');
        }
    },

    /**
     * Clear all notifications (for new game)
     */
    clearAll() {
        this.notifications = [];
        this.unreadCount = 0;
        this.updateBadge();
        this.saveToStorage();
        this.renderList();
    },

    /**
     * Reset for new game - clears notifications and triggered events
     */
    resetForNewGame() {
        console.log('[NOTIF] Resetting for new game');
        this.clearAll();
        localStorage.removeItem('perseverance_triggered_events');
    },

    /**
     * Get set of triggered event IDs
     */
    getTriggeredEvents() {
        try {
            const saved = localStorage.getItem('perseverance_triggered_events');
            return saved ? new Set(JSON.parse(saved)) : new Set();
        } catch (e) {
            return new Set();
        }
    },

    /**
     * Mark an event as triggered
     */
    markEventTriggered(eventId) {
        const triggered = this.getTriggeredEvents();
        triggered.add(eventId);
        localStorage.setItem('perseverance_triggered_events', JSON.stringify([...triggered]));
    },

    /**
     * Check if an event has been triggered
     */
    isEventTriggered(eventId) {
        return this.getTriggeredEvents().has(eventId);
    }
};

// Make globally available
window.NotificationManager = NotificationManager;

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
    // Finances (cash-only, no LOC)
    practiceFunds: 200000,

    // Positions
    physicalPositions: [],
    futuresPositions: [],

    // Tracking
    totalPL: 0,
    inventory: 0,

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

        // Check for new game (coming from scenario-select.html with newgame=true)
        const urlParams = new URLSearchParams(window.location.search);
        const isNewGame = urlParams.get('newgame') === 'true';
        if (isNewGame) {
            console.log('[GAME] New game detected - resetting notifications and events');
            NotificationManager.resetForNewGame();
            // Remove newgame param from URL to prevent reset on subsequent refreshes
            urlParams.delete('newgame');
            const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
            window.history.replaceState({}, '', newUrl);
        }

        // Initialize TimeManager
        TimeManager.init();

        // Use ScenarioLoader if available, otherwise fall back to direct globals
        if (window.ScenarioLoader) {
            console.log('[GAME] Using ScenarioLoader');
            const isCustom = ScenarioLoader.loadSelectedScenario();
            const metadata = ScenarioLoader.getMetadata();
            console.log('[GAME] Scenario:', metadata.name, '(Custom:', isCustom, ')');

            // Load all month data from ScenarioLoader
            this.allMonthData = ScenarioLoader.getAllMonthData();

            // Apply scenario settings (cash-only)
            const settings = ScenarioLoader.getSettings();
            if (settings) {
                this.practiceFunds = settings.startingFunds || 200000;
                console.log('[GAME] Applied settings - Funds:', this.practiceFunds);
            }
        } else {
            // Fallback: Load from global variables (default behavior)
            console.log('[GAME] ScenarioLoader not available, using global data');
            console.log('[GAME] window.JANUARY_DATA:', window.JANUARY_DATA);

            this.allMonthData = [
                window.JANUARY_DATA,
                window.FEBRUARY_DATA,
                window.MARCH_DATA,
                window.APRIL_DATA,
                window.MAY_DATA,
                window.JUNE_DATA
            ];
        }

        console.log('[GAME] Loaded', this.allMonthData.filter(Boolean).length, 'months of data');

        // Set current month data based on TimeManager
        this.updateCurrentMonthData();
        console.log('[GAME] currentMonthData:', this.currentMonthData);
        console.log('[GAME] Current month:', this.currentMonthData ? this.currentMonthData.MONTH : 'undefined');

        // Generate initial period offers (simplified market)
        this.generatePeriodOffers();

        // Update header display
        this.updateHeader();

        // Check for scenario events at game start (Turn 1)
        this.checkScenarioEvents();
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
     * Update displays (sidebar metrics)
     */
    updateHeader() {
        // Update sidebar metrics
        const periodEl = document.getElementById('sidebarPeriod');
        const fundsEl = document.getElementById('sidebarFunds');
        const plEl = document.getElementById('sidebarPL');
        const inventoryEl = document.getElementById('sidebarInventory');

        // Calculate unrealized futures P&L
        const unrealizedFuturesPL = this.futuresPositions
            .filter(f => f.status === 'OPEN')
            .reduce((sum, f) => sum + (f.unrealizedPL || 0), 0);

        // Total P&L includes realized + unrealized futures
        const totalPLWithFutures = this.totalPL + unrealizedFuturesPL;

        if (periodEl) periodEl.textContent = TimeManager.getDisplayString();
        if (fundsEl) fundsEl.textContent = this.formatCurrency(this.practiceFunds);
        if (plEl) {
            // Show total P&L including unrealized futures
            plEl.textContent = this.formatCurrency(totalPLWithFutures);
            plEl.className = 'metric-value ' + (totalPLWithFutures >= 0 ? 'positive' : 'negative');
            // Add title tooltip showing breakdown
            plEl.title = `Realized: ${this.formatCurrency(this.totalPL)}\nUnrealized Futures: ${this.formatCurrency(unrealizedFuturesPL)}`;
        }
        if (inventoryEl) inventoryEl.textContent = `${this.inventory} MT`;
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

            // Reset monthly purchase/sales limits
            this.resetMonthlyLimits();

            // Process M+1 QP reveals for sales made last month
            // Current month's price is the QP price for last month's sales
            this.processQPReveals(result.details.monthIndex);
        }

        // Mark futures positions for settlement
        this.settleFutures();

        // Check for futures expiring while physical still in transit
        this.checkFuturesExpiryWarnings();

        // Generate new period offers (simplified market)
        this.generatePeriodOffers();

        // Update header
        this.updateHeader();

        // Re-render widgets
        MarketsWidget.render();
        PositionsWidget.render();
        FuturesWidget.render();
        AnalyticsWidget.render();
        HedgeStatusWidget.render();

        console.log('[GAME] Now on Turn', TimeManager.currentTurn, '-', result.details.monthName, result.details.periodName);

        // Check for scenario events at the new turn
        this.checkScenarioEvents();

        // Update debug panels
        if (typeof DebugPanel !== 'undefined') DebugPanel.update();
        if (typeof EnhancedDebugPanel !== 'undefined') EnhancedDebugPanel.update();
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
     *
     * TIMING LOGIC:
     * - Trade in Month X → M+1 = Month X+1 (the QP period)
     * - QP = average of all trading days in Month X+1
     * - This average is only known at the END of Month X+1
     * - So reveal happens at the START of Month X+2
     *
     * Example: January trade → M+1=February → reveals at March Early
     *
     * @param {number} currentMonthIndex - The current month index (0-5)
     */
    processQPReveals(currentMonthIndex) {
        // We're entering a new month - check for QP reveals from the PREVIOUS month
        // If we're in March (index 2), we reveal February (index 1) QP averages
        // These February averages finalize trades made in January (index 0)
        const qpMonthToReveal = currentMonthIndex - 1;

        if (qpMonthToReveal < 0) {
            console.log('[QP] No QP to reveal yet (still in first month)');
            return;
        }

        // Get the QP month's pricing data (the month whose average is now known)
        const qpMonthData = this.allMonthData[qpMonthToReveal];
        if (!qpMonthData || !qpMonthData.PRICING) {
            console.warn('[QP] No pricing data for QP month:', qpMonthToReveal);
            return;
        }

        const qpMonthName = TimeManager.MONTHS[qpMonthToReveal] || 'Beyond June';
        const monthName = TimeManager.getMonthPeriod().monthName;
        let totalPurchaseAdjustment = 0;
        let totalSaleAdjustment = 0;
        let purchasesProcessed = 0;
        let salesProcessed = 0;

        // ========== PROCESS PURCHASES ==========
        // Find purchases where qpMonthIndex matches the month we're now revealing
        const purchasesToProcess = this.purchasesPendingQP.filter(
            p => p.qpMonthIndex === qpMonthToReveal && !p.qpRevealed
        );

        if (purchasesToProcess.length > 0) {
            console.log(`[QP] Processing ${purchasesToProcess.length} purchases for M+1 repricing...`);

            purchasesToProcess.forEach(purchase => {
                // Get actual M+1 base price (the QP month's average)
                const actualBasePrice = purchase.exchange === 'LME' ?
                    qpMonthData.PRICING.LME.SPOT_AVG : qpMonthData.PRICING.COMEX.SPOT_AVG;

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
                    // Cost went up - deduct additional from funds
                    this.practiceFunds -= costAdjustment;
                } else {
                    // Cost went down - refund to funds
                    this.practiceFunds += Math.abs(costAdjustment);
                }

                totalPurchaseAdjustment += costAdjustment;
                purchasesProcessed++;

                console.log(`[QP] Purchase ${purchase.positionId} repriced:`);
                console.log(`     Prov: $${purchase.provisionalBasePrice}/MT → Act: $${actualBasePrice}/MT`);
                console.log(`     Cost Adjustment: ${costAdjustment >= 0 ? '+' : ''}$${costAdjustment.toLocaleString()}`);

                // Send notification for this purchase
                if (costAdjustment > 0) {
                    NotificationManager.add(
                        'qp-debit',
                        'QP Settlement: Letter of Debit',
                        `${qpMonthName} avg revealed at $${actualBasePrice.toLocaleString()}/MT. Your ${purchase.purchaseMonth} purchase cost increased by $${costAdjustment.toLocaleString()}.`,
                        '📉'
                    );
                } else if (costAdjustment < 0) {
                    NotificationManager.add(
                        'qp-credit',
                        'QP Settlement: Letter of Credit',
                        `${qpMonthName} avg revealed at $${actualBasePrice.toLocaleString()}/MT. Your ${purchase.purchaseMonth} purchase cost decreased - $${Math.abs(costAdjustment).toLocaleString()} refunded.`,
                        '💰'
                    );
                }

                // Mark as revealed and move to completed
                purchase.actualBasePrice = actualBasePrice;
                purchase.actualTotalCost = actualTotalCost;
                purchase.costAdjustment = costAdjustment;
                purchase.qpRevealed = true;
                this.purchasesCompleted.push(purchase);
            });

            // Remove processed purchases from pending
            // Keep items that are BOTH: not for this reveal month AND not yet revealed
            this.purchasesPendingQP = this.purchasesPendingQP.filter(
                p => p.qpMonthIndex !== qpMonthToReveal && !p.qpRevealed
            );
        }

        // ========== PROCESS SALES ==========
        // Find sales where qpMonthIndex matches the month we're now revealing
        const salesToProcess = this.salesPendingQP.filter(
            sale => sale.qpMonthIndex === qpMonthToReveal && !sale.qpRevealed
        );

        if (salesToProcess.length > 0) {
            console.log(`[QP] Processing ${salesToProcess.length} sales for M+1 repricing...`);

            salesToProcess.forEach(sale => {
                // Get actual M+1 price (the QP month's average)
                const actualBasePrice = sale.exchange === 'LME' ?
                    qpMonthData.PRICING.LME.SPOT_AVG : qpMonthData.PRICING.COMEX.SPOT_AVG;

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

                // Send notification for this sale
                if (adjustment > 0) {
                    NotificationManager.add(
                        'qp-credit',
                        'QP Settlement: Letter of Credit',
                        `${qpMonthName} avg revealed at $${actualBasePrice.toLocaleString()}/MT. Your ${sale.saleMonth} sale received +$${adjustment.toLocaleString()} credit.`,
                        '💰'
                    );
                } else if (adjustment < 0) {
                    NotificationManager.add(
                        'qp-debit',
                        'QP Settlement: Letter of Debit',
                        `${qpMonthName} avg revealed at $${actualBasePrice.toLocaleString()}/MT. Your ${sale.saleMonth} sale revenue decreased by $${Math.abs(adjustment).toLocaleString()}.`,
                        '📉'
                    );
                }

                // Move to completed sales
                this.salesCompleted.push(sale);
            });

            // Remove processed sales from pending
            // Keep items that are BOTH: not for this reveal month AND not yet revealed
            this.salesPendingQP = this.salesPendingQP.filter(
                sale => sale.qpMonthIndex !== qpMonthToReveal && !sale.qpRevealed
            );
        }

        // Update UI if any trades were processed
        if (purchasesProcessed > 0 || salesProcessed > 0) {
            console.log(`[QP] Total adjustments - Purchases: $${totalPurchaseAdjustment.toLocaleString()}, Sales: $${totalSaleAdjustment.toLocaleString()}`);
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

                    // Send cargo arrived notification
                    NotificationManager.add(
                        'cargo-arrived',
                        'Cargo Arrived',
                        `Your ${pos.tonnage} MT shipment from ${pos.originPort} has arrived at ${pos.destinationPortName || pos.destination}. Ready to sell.`,
                        '🚢'
                    );
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

        // Check funds (cash-only)
        if (provisionalTotalCost > this.practiceFunds) {
            alert('Insufficient funds!');
            return false;
        }

        // Update monthly purchase limit
        this.monthlyPurchaseLimits[portKey].used += tonnage;

        // Deduct funds
        this.practiceFunds -= provisionalTotalCost;

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
        HedgeStatusWidget.render();
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
        if (!position) {
            alert('Invalid position!');
            return false;
        }

        // Check if already sold (but allow in-transit sales - player owns Bill of Lading)
        if (position.sold || position.status === 'SOLD') {
            alert('This cargo has already been sold!');
            return false;
        }

        if (tonnage > position.tonnage) {
            alert('Cannot sell more than available!');
            return false;
        }

        // Check for linked futures positions (hedges)
        const linkedFutures = this.futuresPositions.filter(
            f => f.linkedPhysicalId === positionId && f.status === 'OPEN'
        );

        if (linkedFutures.length > 0) {
            const hedgeTonnage = linkedFutures.reduce((sum, f) => sum + (f.contracts * 25), 0);
            const futuresDetails = linkedFutures.map(f =>
                `${f.exchange} ${f.contract} ${f.direction} x${f.contracts} (${f.contracts * 25} MT)`
            ).join('\n');

            const closeHedges = confirm(
                `This position has linked hedge(s):\n${futuresDetails}\n\n` +
                `Total hedged: ${hedgeTonnage} MT\n\n` +
                `Do you want to close the linked futures positions?\n\n` +
                `[OK] = Close futures and realize hedge P&L\n` +
                `[Cancel] = Keep futures open (unlinks from this position)`
            );

            if (closeHedges) {
                // Close all linked futures
                linkedFutures.forEach(f => {
                    const pl = this.closeFutures(f.id);
                    console.log(`[HEDGE] Auto-closed linked futures ${f.id} with P&L: $${pl}`);
                });
            } else {
                // Unlink futures from this position
                linkedFutures.forEach(f => {
                    f.linkedPhysicalId = null;
                    console.log(`[HEDGE] Unlinked futures ${f.id} from physical ${positionId}`);
                });
            }
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
            position.sold = true;  // Mark as sold so it won't appear in inventory
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
        HedgeStatusWidget.render();

        // Update debug panel
        if (typeof DebugPanel !== 'undefined') DebugPanel.update();
        if (typeof EnhancedDebugPanel !== 'undefined') EnhancedDebugPanel.update();

        return estimatedProfit;
    },

    /**
     * Open futures position
     * Flat $25 fee per contract, no margin required
     */
    openFutures(exchange, contract, direction, contracts) {
        console.log('[FUTURES] Opening', direction, contracts, 'contracts on', exchange, contract);

        const data = this.currentMonthData;
        const price = exchange === 'LME' ?
            data.PRICING.LME[contract] : data.PRICING.COMEX[contract];

        const feePerContract = 25;
        const totalFees = feePerContract * contracts;

        // Check funds for fee
        if (totalFees > this.practiceFunds) {
            alert('Insufficient funds for fees!');
            return false;
        }

        // Deduct fee only (no margin)
        this.practiceFunds -= totalFees;

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
        HedgeStatusWidget.render();

        console.log('[FUTURES] Position opened:', position.id);

        // Update debug panel
        if (typeof DebugPanel !== 'undefined') DebugPanel.update();
        if (typeof EnhancedDebugPanel !== 'undefined') EnhancedDebugPanel.update();

        return true;
    },

    /**
     * Close futures position
     * Returns P&L only (no margin to return)
     */
    closeFutures(positionId) {
        const position = this.futuresPositions.find(p => p.id === positionId);
        if (!position || position.status !== 'OPEN') return false;

        const data = this.currentMonthData;
        const currentPrice = position.exchange === 'LME' ?
            data.PRICING.LME[position.contract] :
            data.PRICING.COMEX[position.contract];

        // Calculate P&L
        const contractSize = 25; // 25 MT per contract
        const priceDiff = position.direction === 'LONG' ?
            currentPrice - position.entryPrice :
            position.entryPrice - currentPrice;
        const pl = priceDiff * contractSize * position.contracts;

        // Return P&L only (no margin was held)
        this.practiceFunds += pl;
        this.totalPL += pl;

        position.status = 'CLOSED';
        position.closedPL = pl;

        // Update display
        this.updateHeader();
        FuturesWidget.render();
        HedgeStatusWidget.render();

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
    },

    /**
     * Calculate net exposure (physical tonnage minus hedged tonnage)
     * Positive = net long (exposed to price drops)
     * Negative = net short (exposed to price rises)
     * Zero = fully hedged
     */
    calculateNetExposure() {
        // Physical positions = long copper exposure
        const physicalLong = this.physicalPositions
            .filter(p => p.status !== 'SOLD')
            .reduce((sum, p) => sum + (p.tonnage || 0), 0);

        // SHORT futures offset physical long exposure
        const futuresShort = this.futuresPositions
            .filter(f => f.status === 'OPEN' && f.direction === 'SHORT')
            .reduce((sum, f) => sum + (f.contracts * 25), 0);

        // LONG futures add to long exposure
        const futuresLong = this.futuresPositions
            .filter(f => f.status === 'OPEN' && f.direction === 'LONG')
            .reduce((sum, f) => sum + (f.contracts * 25), 0);

        const netExposure = physicalLong - futuresShort + futuresLong;

        return {
            physical: physicalLong,
            futuresShort: futuresShort,
            futuresLong: futuresLong,
            net: netExposure,
            hedgeRatio: physicalLong > 0 ? Math.round((futuresShort / physicalLong) * 100) : 0
        };
    },

    /**
     * Check for futures positions expiring while linked physical is still in transit
     * Warns user before hedge expires, leaving physical unhedged
     */
    checkFuturesExpiryWarnings() {
        const currentTurn = TimeManager.currentTurn;
        const timeInfo = TimeManager.getMonthPeriod();

        // Futures expire at Late period of their contract month
        // Check if we're at a Late period (potential expiry point)
        if (timeInfo.period !== 2) return;

        this.futuresPositions.forEach(futures => {
            if (futures.status !== 'OPEN' || !futures.linkedPhysicalId) return;

            // Find linked physical position
            const physical = this.physicalPositions.find(p => p.id === futures.linkedPhysicalId);
            if (!physical || physical.status === 'SOLD') return;

            // Check if physical is still in transit
            if (physical.status === 'IN_TRANSIT') {
                // Check if futures expires this turn (contract month matches current month)
                const contractMonth = futures.contract; // e.g., 'MAR_24'
                const currentMonthShort = timeInfo.monthName.substring(0, 3).toUpperCase();

                if (contractMonth && contractMonth.startsWith(currentMonthShort)) {
                    // Futures is expiring but physical still in transit!
                    NotificationManager.add(
                        'hedge-expiry-warning',
                        'Hedge Expiry Warning',
                        `Futures ${futures.id} (${futures.exchange} ${futures.contract}) is expiring this turn, but linked physical ${physical.id} is still in transit (arrives Turn ${physical.arrivalTurn}). Consider rolling the hedge.`,
                        '⚠️'
                    );
                    console.log(`[HEDGE WARNING] Futures ${futures.id} expiring while physical ${physical.id} still in transit`);
                }
            }
        });
    },

    /**
     * Check and trigger scenario events for the current turn
     * Events are fetched from ScenarioLoader and displayed as notifications
     * Each event only triggers once (tracked in localStorage)
     */
    checkScenarioEvents() {
        if (!window.ScenarioLoader) {
            console.log('[EVENTS] ScenarioLoader not available');
            return;
        }

        const events = ScenarioLoader.getEvents();
        if (!events || events.length === 0) {
            console.log('[EVENTS] No scenario events to check');
            return;
        }

        const currentTurn = TimeManager.currentTurn;
        console.log(`[EVENTS] Checking events for turn ${currentTurn}...`);

        events.forEach(event => {
            // Check if event triggers on current turn
            if (event.startPeriod !== currentTurn) return;

            // Check if already triggered (prevents duplicates on page refresh)
            if (NotificationManager.isEventTriggered(event.id)) {
                console.log(`[EVENTS] Event "${event.name}" already triggered, skipping`);
                return;
            }

            // Determine notification icon based on event type
            let icon = '📰';  // Default news icon
            if (event.type === 'event') {
                icon = '⚠️';  // Major event icon
            }
            // Check affects to customize icon
            if (event.affects) {
                const hasPrice = event.affects.some(a => ['lme', 'comex', 'futures_1m', 'futures_3m', 'futures_6m'].includes(a.target));
                const hasSupply = event.affects.some(a => a.target.includes('tonnage') || a.target.includes('premium'));
                const hasShipping = event.affects.some(a => ['fob_rate', 'cif_rate', 'travel_time'].includes(a.target));

                if (hasShipping) icon = '🚢';
                else if (hasSupply) icon = '⛏️';
                else if (hasPrice) icon = '📊';
            }

            // Add notification
            NotificationManager.add(
                event.type || 'news',
                event.name || 'Market News',
                event.text || event.description || 'A market event has occurred.',
                icon
            );

            // Mark as triggered so it doesn't fire again on refresh
            NotificationManager.markEventTriggered(event.id);

            console.log(`[EVENTS] Triggered event: "${event.name}" (${event.type})`);
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
        html += '<tr><th>Exchange</th><th>Spot</th><th>1M</th><th>3M</th><th>6M</th></tr>';

        const lme = data.PRICING.LME;
        const comex = data.PRICING.COMEX;

        html += `
            <tr>
                <td>LME</td>
                <td>$${lme.SPOT_AVG}</td>
                <td>$${lme.FUTURES_1M}</td>
                <td>$${lme.FUTURES_3M}</td>
                <td>$${lme.FUTURES_6M}</td>
            </tr>
            <tr>
                <td>COMEX</td>
                <td>$${comex.SPOT_AVG}</td>
                <td>$${comex.FUTURES_1M}</td>
                <td>$${comex.FUTURES_3M}</td>
                <td>$${comex.FUTURES_6M}</td>
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
     * Render the positions widget - Physical positions only
     */
    render() {
        const container = document.getElementById('content2');
        if (!container) return;

        // Check active tab
        const activeTab = container.closest('.panel').querySelector('.tab.active');
        if (activeTab && activeTab.dataset.widget !== 'Positions') return;

        let html = '';

        // Physical positions - show ALL including SOLD (until QP settles)
        html += '<div class="positions-container">';

        // Show all positions - open positions first, then sold/settled
        const allPositions = GAME_STATE.physicalPositions;
        const openPositions = allPositions.filter(p => p.status !== 'SOLD');
        const soldPositions = allPositions.filter(p => p.status === 'SOLD');

        if (allPositions.length === 0) {
            html += '<div class="empty-state">No physical positions</div>';
        } else {
            // Render open positions first
            openPositions.forEach(pos => {
                html += this.renderPositionCard(pos);
            });
            // Then sold positions
            soldPositions.forEach(pos => {
                html += this.renderPositionCard(pos);
            });
        }
        html += '</div>';

        container.innerHTML = html;
    },

    /**
     * Render a single position card with timeline layout
     */
    renderPositionCard(pos) {
        const isInTransit = pos.status === 'IN_TRANSIT';
        const isArrived = pos.status === 'ARRIVED';
        const isSold = pos.status === 'SOLD';
        const currentTurn = TimeManager.currentTurn;

        // Get timing info
        const purchaseInfo = TimeManager.getMonthPeriod(pos.purchaseTurn);
        const sailedTurn = pos.purchaseTurn + 1;
        const sailedInfo = TimeManager.getMonthPeriod(sailedTurn);
        const arrivalInfo = TimeManager.getMonthPeriod(pos.arrivalTurn);

        // QP timing - qpMonthIndex is the month AFTER sailing (M+1)
        const qpMonthIndex = pos.qpMonthIndex !== undefined ? pos.qpMonthIndex : (TimeManager.MONTHS.indexOf(pos.purchaseMonth) + 1);
        const revealMonthIndex = qpMonthIndex + 1;
        const qpMonth = TimeManager.MONTHS[qpMonthIndex] || 'N/A';
        const revealMonth = TimeManager.MONTHS[revealMonthIndex] || 'N/A';

        // Determine timeline stage - only mark completed when actually completed
        const hasSailed = currentTurn >= sailedTurn;
        const hasArrived = isArrived || isSold || currentTurn >= pos.arrivalTurn;
        const qpSettled = pos.qpRevealed === true;

        // Find linked sale record for sold positions
        let saleRecord = null;
        let saleQpSettled = false;
        let isFullyClosed = false;
        if (isSold) {
            // Check salesPendingQP and salesCompleted for this position
            saleRecord = (GAME_STATE.salesPendingQP || []).find(s => s.positionId === pos.id) ||
                         (GAME_STATE.salesCompleted || []).find(s => s.positionId === pos.id);
            if (saleRecord) {
                saleQpSettled = saleRecord.qpRevealed === true;
            }
            // Position is fully closed when both purchase and sale QP have settled
            isFullyClosed = qpSettled && saleQpSettled;
        }

        // Timeline dot states - only fill when stage is actually completed
        // No 'current' state for unfilled dots - they should be empty until completed
        const purchaseDot = 'completed'; // Purchase is always completed (position exists)
        const sailedDot = hasSailed ? 'completed' : '';
        const arrivalDot = hasArrived ? 'completed' : '';
        const qpDot = qpSettled ? 'completed' : '';

        // Labels
        const sailedLabel = hasSailed ? 'Sailed' : 'Sails';
        const arrivalLabel = hasArrived ? 'Arrived' : 'ETA';
        const qpLabel = qpSettled ? 'QP Settled' : 'QP Settles';

        // Cost info
        const basePrice = pos.qpRevealed ? (pos.actualBasePrice || pos.provisionalBasePrice) : (pos.provisionalBasePrice || pos.pricePerMT);
        const premium = pos.premium || 0;
        const freight = pos.freight || 0;
        const pricePerMT = pos.qpRevealed ? (pos.actualPricePerMT || pos.pricePerMT) : pos.pricePerMT;
        const totalCost = pos.qpRevealed ? (pos.actualTotalCost || pos.totalCost) : pos.totalCost;
        const costLabel = pos.qpRevealed ? 'Locked' : 'Provisional';

        // Determine card class
        let cardClass = '';
        if (isSold) {
            cardClass = isFullyClosed ? 'sold closed' : 'sold';
        } else if (isInTransit) {
            cardClass = 'in-transit';
        } else {
            cardClass = 'arrived';
        }

        // Status badge
        let statusBadgeClass = '';
        let statusBadgeText = '';
        if (isSold) {
            if (isFullyClosed) {
                statusBadgeClass = 'closed';
                statusBadgeText = 'CLOSED';
            } else {
                statusBadgeClass = 'sold';
                statusBadgeText = 'SOLD - PENDING';
            }
        } else if (isInTransit) {
            statusBadgeClass = 'transit';
            statusBadgeText = 'IN TRANSIT';
        } else {
            statusBadgeClass = 'arrived';
            statusBadgeText = 'ARRIVED';
        }

        // Location badge (only for arrived, not sold)
        const locationHtml = (isArrived && !isSold) ? `
            <div class="location-row">
                <span class="icon">[LOC]</span>
                <span class="text">At ${pos.currentPortName || pos.destinationPortName || pos.destination}</span>
            </div>
        ` : '';

        // QP reveal info
        let qpRevealHtml = '';
        if (qpSettled) {
            const settledPrice = pos.actualBasePrice || basePrice;
            qpRevealHtml = `<span class="qp-reveal settled">[OK] Settled @ $${settledPrice?.toLocaleString()}/MT</span>`;
        } else {
            qpRevealHtml = `<span class="qp-reveal pending">[..] Reveals ${revealMonth} Early</span>`;
        }

        // Sale section for sold positions
        let saleSectionHtml = '';
        if (isSold && saleRecord) {
            const saleRevenue = saleQpSettled ?
                (saleRecord.actualRevenue || saleRecord.estimatedRevenue) :
                saleRecord.estimatedRevenue;
            const saleProfit = saleQpSettled ?
                (saleRecord.actualProfit || saleRecord.estimatedProfit) :
                saleRecord.estimatedProfit;
            const profitClass = saleProfit >= 0 ? 'profit' : 'loss';
            const saleLabel = saleQpSettled ? 'Final' : 'Est.';

            saleSectionHtml = `
                <div class="sale-section ${saleQpSettled ? 'settled' : ''}">
                    <div class="sale-header">${saleLabel} Sale P&L</div>
                    <div class="sale-details">
                        <span class="sale-buyer">Sold to ${saleRecord.buyer}</span>
                        <span class="sale-revenue">Rev: $${saleRevenue?.toLocaleString() || '0'}</span>
                        <span class="sale-profit ${profitClass}">P&L: ${saleProfit >= 0 ? '+' : ''}$${saleProfit?.toLocaleString() || '0'}</span>
                    </div>
                    ${!saleQpSettled ? `<div class="sale-qp-pending">[..] Sale QP pending</div>` : ''}
                </div>
            `;
        }

        return `
            <div class="position-card ${cardClass}">
                <div class="card-header">
                    <div class="route">
                        ${pos.originPort}<span class="arrow">-></span><span class="dest">${pos.destinationPortName || pos.destination}</span>
                    </div>
                    <div class="header-right">
                        <span class="tonnage">${pos.tonnage} MT</span>
                        <span class="status-badge ${statusBadgeClass}">${statusBadgeText}</span>
                    </div>
                </div>

                <div class="card-subheader">
                    <span class="position-id">${pos.id}</span>
                    <span class="region">${pos.destinationRegion || ''}</span>
                </div>

                ${locationHtml}

                <div class="timeline-section">
                    <div class="timeline">
                        <div class="timeline-point">
                            <span class="point-label">Purchased</span>
                            <div class="point-dot ${purchaseDot}"></div>
                            <span class="point-date">${purchaseInfo.monthName.substring(0,3)} ${purchaseInfo.periodName}</span>
                        </div>
                        <div class="timeline-point">
                            <span class="point-label ${!hasSailed ? 'active' : ''}">${sailedLabel}</span>
                            <div class="point-dot ${sailedDot}"></div>
                            <span class="point-date">${sailedInfo.monthName.substring(0,3)} ${sailedInfo.periodName}</span>
                        </div>
                        <div class="timeline-point">
                            <span class="point-label ${hasSailed && !hasArrived ? 'active' : ''}">${arrivalLabel}</span>
                            <div class="point-dot ${arrivalDot}"></div>
                            <span class="point-date">${arrivalInfo.monthName.substring(0,3)} ${arrivalInfo.periodName}</span>
                        </div>
                        <div class="timeline-point">
                            <span class="point-label qp">${qpLabel}</span>
                            <div class="point-dot qp ${qpDot}"></div>
                            <span class="point-date">${revealMonth.substring(0,3)} Early</span>
                        </div>
                    </div>
                </div>

                <div class="details-section">
                    <div class="details-grid">
                        <div class="detail-cell">
                            <div class="detail-label">SUPPLIER</div>
                            <div class="detail-value">${pos.supplier}</div>
                            <div class="detail-value small">${pos.originPort}</div>
                        </div>
                        <div class="detail-cell">
                            <div class="detail-label">TERMS</div>
                            <div class="detail-value">${pos.shippingTerms || 'CIF'} | ${pos.exchange || 'LME'}</div>
                        </div>
                    </div>
                </div>

                <div class="cost-section">
                    <div class="cost-header ${pos.qpRevealed ? 'locked' : 'provisional'}">${costLabel} Cost</div>
                    <div class="cost-breakdown">
                        <span class="val">$${basePrice?.toLocaleString() || '0'}</span> base
                        <span class="op">+</span>
                        <span class="val">$${premium?.toLocaleString() || '0'}</span> prem
                        <span class="op">+</span>
                        <span class="val">$${freight?.toLocaleString() || '0'}</span> frt
                    </div>
                    <div class="cost-total">
                        <span class="permt">$${pricePerMT?.toLocaleString() || '0'}/MT</span>
                        <span class="total">$${totalCost?.toLocaleString() || '0'} total</span>
                    </div>
                </div>

                <div class="qp-section ${qpSettled ? 'settled' : ''}">
                    <span class="qp-info">QP: <span class="month">${qpMonth}</span> avg</span>
                    ${qpRevealHtml}
                </div>

                ${saleSectionHtml}
            </div>
        `;
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
        'FUTURES_6M': '6M'
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

        ['SPOT_AVG', 'FUTURES_1M', 'FUTURES_3M', 'FUTURES_6M'].forEach(contract => {
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

        ['SPOT_AVG', 'FUTURES_1M', 'FUTURES_3M', 'FUTURES_6M'].forEach(contract => {
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
     * Update calculation (flat $25 fee per contract, no margin)
     */
    updateCalc() {
        const contracts = parseInt(document.getElementById('futuresContracts').value) || 1;
        const fees = contracts * 25;

        document.getElementById('futuresFees').textContent = '$' + fees.toLocaleString();
        document.getElementById('futuresTotal').textContent = '$' + fees.toLocaleString();
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
    /**
     * Render the analytics widget - 4-card live trading dashboard
     */
    render() {
        const container = document.getElementById('analyticsContainer');
        if (!container) return;

        // Render the 4-card layout - Bloomberg minimal style
        container.innerHTML = `
            <div class="analytics-widget-content">
                <!-- Top Row -->
                <div class="analytics-row">
                    <!-- P&L BREAKDOWN Card -->
                    <div class="analytics-card" id="pnlCard">
                        <div class="analytics-card-title">P&L BREAKDOWN</div>
                        <div class="analytics-pnl-section">
                            <div class="analytics-pnl-row">
                                <span class="analytics-pnl-label">Realized</span>
                                <span class="analytics-pnl-value" id="realizedPnL">+$0</span>
                            </div>
                            <div class="analytics-pnl-sublabel">Settled trades</div>
                        </div>
                        <div class="analytics-pnl-section">
                            <div class="analytics-pnl-row">
                                <span class="analytics-pnl-label">Unrealized</span>
                                <span class="analytics-pnl-value" id="unrealizedPnL">+$0 <span class="est-tag">(est)</span></span>
                            </div>
                            <div class="analytics-pnl-sublabel">At current spot</div>
                        </div>
                        <div class="analytics-pnl-divider"></div>
                        <div class="analytics-pnl-section total">
                            <div class="analytics-pnl-row">
                                <span class="analytics-pnl-label">Total</span>
                                <span class="analytics-pnl-value" id="totalPnL">+$0</span>
                            </div>
                        </div>
                    </div>

                    <!-- SPREAD Card -->
                    <div class="analytics-card" id="spreadCard">
                        <div class="analytics-card-title">SPREAD</div>
                        <div class="analytics-spread-main" id="spreadHigher">COMEX vs LME</div>
                        <div class="analytics-spread-value" id="spreadValue">+$0/MT</div>
                        <div class="analytics-spread-hint" id="spreadHint">COMEX higher</div>
                    </div>
                </div>

                <!-- Bottom Row -->
                <div class="analytics-row">
                    <!-- POSITION STATUS Card -->
                    <div class="analytics-card" id="statusCard">
                        <div class="analytics-card-title">POSITION STATUS</div>
                        <div class="analytics-bars" id="positionBars">
                            <!-- Generated by JavaScript -->
                        </div>
                    </div>

                    <!-- SETTLEMENT TIMING Card -->
                    <div class="analytics-card" id="settlementCard">
                        <div class="analytics-card-title">SETTLEMENT TIMING</div>
                        <div class="analytics-bars" id="settlementBars">
                            <!-- Generated by JavaScript -->
                        </div>
                        <div class="analytics-card-footer" id="nextSettlement">
                            Next: 0 settling
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Update all cards with current data
        this.updatePnL();
        this.updateSpread();
        this.updatePositionStatus();
        this.updateSettlementTiming();
    },

    // ═══════════════════════════════════════════════════════════
    // CARD 1: P&L BREAKDOWN
    // ═══════════════════════════════════════════════════════════

    updatePnL() {
        const pnl = this.calculatePnL();

        const realizedEl = document.getElementById('realizedPnL');
        const unrealizedEl = document.getElementById('unrealizedPnL');
        const totalEl = document.getElementById('totalPnL');

        if (realizedEl) {
            realizedEl.textContent = this.formatCurrency(pnl.realized);
            realizedEl.classList.toggle('negative', pnl.realized < 0);
        }

        if (unrealizedEl) {
            unrealizedEl.innerHTML = `${this.formatCurrency(pnl.unrealized)} <span class="est-tag">(est.)</span>`;
            unrealizedEl.classList.toggle('negative', pnl.unrealized < 0);
        }

        if (totalEl) {
            totalEl.textContent = this.formatCurrency(pnl.total);
            totalEl.classList.toggle('negative', pnl.total < 0);
        }
    },

    calculatePnL() {
        const positions = GAME_STATE.physicalPositions || [];
        const currentTurn = TimeManager.currentTurn || 1;
        const monthData = GAME_STATE.currentMonthData;

        let realizedPnL = 0;
        let unrealizedPnL = 0;

        // Check completed purchases (QP revealed)
        const completedPurchases = GAME_STATE.purchasesCompleted || [];
        completedPurchases.forEach(purchase => {
            if (purchase.costAdjustment) {
                // QP adjustment - negative adjustment = savings, positive = extra cost
                realizedPnL -= purchase.costAdjustment;
            }
        });

        // Check completed sales (QP revealed)
        const completedSales = GAME_STATE.salesCompleted || [];
        completedSales.forEach(sale => {
            // Use actual profit directly (already calculated as actualRevenue - costBasis)
            // Field names: actualRevenue, actualProfit, costBasis (NOT actualTotalRevenue, originalCost)
            const profit = sale.actualProfit || (sale.actualRevenue - sale.costBasis) || 0;
            realizedPnL += profit;
        });

        // Check pending sales (not yet QP revealed)
        const pendingSales = GAME_STATE.salesPendingQP || [];
        pendingSales.forEach(sale => {
            if (!monthData || !monthData.PRICING) return;

            // Estimate revenue at current spot
            const exchange = sale.exchange || 'LME';
            const currentSpot = exchange === 'COMEX'
                ? (monthData.PRICING.COMEX?.SPOT_AVG || 0)
                : (monthData.PRICING.LME?.SPOT_AVG || 0);

            // Use correct field names from sale record: 'premium' not 'regionalPremium'
            const salePremium = sale.premium || 0;
            const estimatedPrice = currentSpot + salePremium;
            const estimatedRevenue = (sale.tonnage || 0) * estimatedPrice;
            // Use correct field names: 'costBasis' and 'pricePerMT' not 'originalCost' and 'costPerMT'
            const cost = sale.costBasis || (sale.tonnage * (sale.pricePerMT || 0));

            unrealizedPnL += (estimatedRevenue - cost);
        });

        // ========== FUTURES P&L ==========
        const futuresPositions = GAME_STATE.futuresPositions || [];
        futuresPositions.forEach(f => {
            if (f.status === 'OPEN') {
                // Open futures contribute to unrealized P&L
                unrealizedPnL += f.unrealizedPL || 0;
            } else if (f.status === 'CLOSED') {
                // Closed futures contribute to realized P&L
                realizedPnL += f.closedPL || 0;
            }
        });

        return {
            realized: Math.round(realizedPnL),
            unrealized: Math.round(unrealizedPnL),
            total: Math.round(realizedPnL + unrealizedPnL)
        };
    },

    // ═══════════════════════════════════════════════════════════
    // CARD 2: SPREAD
    // ═══════════════════════════════════════════════════════════

    updateSpread() {
        const spread = this.calculateSpread();

        const higherEl = document.getElementById('spreadHigher');
        const valueEl = document.getElementById('spreadValue');
        const hintEl = document.getElementById('spreadHint');

        if (higherEl) {
            higherEl.textContent = `${spread.higher} > ${spread.lower}`;
        }

        if (valueEl) {
            valueEl.textContent = `+$${spread.amount.toLocaleString()}/MT`;
        }

        if (hintEl) {
            hintEl.textContent = `${spread.higher} higher`;
        }
    },

    calculateSpread() {
        const monthData = GAME_STATE.currentMonthData;

        if (!monthData || !monthData.PRICING) {
            return { higher: 'N/A', lower: 'N/A', amount: 0 };
        }

        const lmeSpot = monthData.PRICING.LME?.SPOT_AVG || 0;
        const comexSpot = monthData.PRICING.COMEX?.SPOT_AVG || 0;
        const diff = comexSpot - lmeSpot;

        return {
            higher: diff >= 0 ? 'COMEX' : 'LME',
            lower: diff >= 0 ? 'LME' : 'COMEX',
            amount: Math.abs(Math.round(diff)),
            raw: diff
        };
    },

    // ═══════════════════════════════════════════════════════════
    // CARD 3: POSITION STATUS
    // ═══════════════════════════════════════════════════════════

    updatePositionStatus() {
        const status = this.calculatePositionStatus();
        const container = document.getElementById('positionBars');

        if (!container) return;

        const maxValue = Math.max(status.inTransit, status.atPort, status.sold, 1);

        container.innerHTML = `
            ${this.renderBar('IN TRANSIT', status.inTransit, maxValue, 'transit', 'MT')}
            ${this.renderBar('AT PORT', status.atPort, maxValue, 'port', 'MT')}
            ${this.renderBar('SOLD', status.sold, maxValue, 'sold', 'MT')}
        `;
    },

    calculatePositionStatus() {
        const positions = GAME_STATE.physicalPositions || [];

        const inTransit = positions
            .filter(p => p.status === 'IN_TRANSIT' && !p.sold)
            .reduce((sum, p) => sum + (p.tonnage || 0), 0);

        // AT_PORT: Positions that have arrived but not sold
        // Note: status becomes 'ARRIVED' when cargo arrives (AT_PORT is set in currentLocation)
        const atPort = positions
            .filter(p => (p.status === 'AT_PORT' || p.status === 'ARRIVED') && !p.sold)
            .reduce((sum, p) => sum + (p.tonnage || 0), 0);

        // SOLD: Positions that have been sold (status === 'SOLD' or sold === true)
        const sold = positions
            .filter(p => p.sold === true || p.status === 'SOLD')
            .reduce((sum, p) => sum + (p.tonnage || 0), 0);

        return { inTransit, atPort, sold };
    },

    // ═══════════════════════════════════════════════════════════
    // CARD 4: SETTLEMENT TIMING
    // ═══════════════════════════════════════════════════════════

    updateSettlementTiming() {
        const timing = this.calculateSettlementTiming();
        const container = document.getElementById('settlementBars');
        const footerEl = document.getElementById('nextSettlement');

        if (container) {
            if (timing.settlements.length === 0) {
                container.innerHTML = '<div class="analytics-empty">No pending settlements</div>';
            } else {
                // Fix: Math.max(...[], 1) returns -Infinity; put 1 first to ensure minimum
                const counts = timing.settlements.map(s => s.count);
                const maxCount = counts.length > 0 ? Math.max(1, ...counts) : 1;
                container.innerHTML = timing.settlements
                    .map(s => this.renderBar(s.month, s.count, maxCount, 'settlement', s.count === 1 ? 'position' : 'positions'))
                    .join('');
            }
        }

        if (footerEl) {
            footerEl.textContent = `NEXT TURN: ${timing.nextTurnCount} settling`;
        }
    },

    calculateSettlementTiming() {
        // Check pending QP sales
        const pendingSales = GAME_STATE.salesPendingQP || [];
        const currentTurn = TimeManager.currentTurn || 1;

        // Group by QP month
        const byMonth = {};
        const months = ['', 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN'];

        pendingSales.forEach(sale => {
            const qpMonth = sale.qpMonthIndex;
            if (qpMonth && qpMonth > 0) {
                // Settlement happens at start of month AFTER qpMonth
                const settlementMonth = qpMonth + 1;
                if (settlementMonth <= 6 && settlementMonth > Math.ceil(currentTurn / 2)) {
                    const monthName = months[settlementMonth] || `M${settlementMonth}`;
                    if (!byMonth[monthName]) byMonth[monthName] = { count: 0, settlementMonth };
                    byMonth[monthName].count++;
                }
            }
        });

        const settlements = Object.entries(byMonth)
            .map(([month, data]) => ({ month, count: data.count, settlementMonth: data.settlementMonth }))
            .sort((a, b) => a.settlementMonth - b.settlementMonth);

        // Next turn count
        const currentMonth = Math.ceil(currentTurn / 2);
        const nextMonth = currentMonth + 1;
        const nextMonthName = months[nextMonth] || '';
        const nextTurnCount = byMonth[nextMonthName]?.count || 0;

        return { settlements, nextTurnCount };
    },

    // ═══════════════════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════════════════

    renderBar(label, value, max, colorClass, unit) {
        const percent = max > 0 ? (value / max) * 100 : 0;
        const displayPercent = Math.max(percent, value > 0 ? 5 : 0); // Min width if value > 0

        return `
            <div class="analytics-bar-row">
                <span class="analytics-bar-label">${label}</span>
                <div class="analytics-bar-track">
                    <div class="analytics-bar-fill ${colorClass}" style="width: ${displayPercent}%"></div>
                </div>
                <span class="analytics-bar-value">${value} ${unit}</span>
            </div>
        `;
    },

    formatCurrency(value) {
        const absValue = Math.abs(value);
        let formatted;
        if (absValue >= 1000000) {
            formatted = `$${(absValue / 1000000).toFixed(2)}M`;
        } else if (absValue >= 1000) {
            formatted = `$${(absValue / 1000).toFixed(1)}K`;
        } else {
            formatted = `$${absValue.toLocaleString()}`;
        }
        return value >= 0 ? `+${formatted}` : `-${formatted}`;
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
     * Shows when the M+1 QP will be revealed
     * Trade in month X → M+1 = X+1 → Reveals at X+2 Early
     */
    updateQPWarning() {
        const timeInfo = TimeManager.getMonthPeriod();
        const qpMonthIndex = timeInfo.monthIndex + 1; // M+1 (the averaging month)
        const revealMonthIndex = qpMonthIndex + 1;    // M+2 (when the reveal happens)

        // Check if May or June (no room for M+2 reveal)
        if (timeInfo.monthIndex >= 4) {
            document.getElementById('qpWarning').style.display = 'none';
        } else {
            document.getElementById('qpWarning').style.display = 'flex';
            const qpMonth = TimeManager.MONTHS[qpMonthIndex] || 'N/A';
            const revealMonth = TimeManager.MONTHS[revealMonthIndex] || 'N/A';
            document.getElementById('qpRevealDate').textContent = `${revealMonth} Early (${qpMonth} avg)`;
        }
    },

    /**
     * Populate inventory dropdown
     * Shows ALL unsold positions - cargo can be sold while in transit (player owns Bill of Lading)
     */
    populateInventory(selectedId) {
        const select = document.getElementById('sellInventory');
        select.innerHTML = '';

        // Show ALL unsold positions regardless of transit status
        // When you buy cargo and pay, you get the Bill of Lading = ownership
        // You can sell cargo at any point: IN_TRANSIT, AT_PORT, or ARRIVED
        const unsoldPositions = GAME_STATE.physicalPositions.filter(p => !p.sold);

        if (unsoldPositions.length === 0) {
            select.innerHTML = '<option value="">No inventory available</option>';
            return;
        }

        unsoldPositions.forEach(pos => {
            const selected = pos.id === selectedId ? 'selected' : '';

            // Show status so player knows where cargo is
            let statusLabel;
            switch(pos.status) {
                case 'IN_TRANSIT': statusLabel = 'In Transit'; break;
                case 'AT_PORT': statusLabel = 'At Port'; break;
                case 'ARRIVED': statusLabel = 'Arrived'; break;
                default: statusLabel = pos.status || 'Unknown';
            }

            const location = pos.currentPortName || pos.destinationPortName || pos.destination || 'Unknown';
            const origin = pos.origin || pos.supplier || '';

            select.innerHTML += `<option value="${pos.id}" ${selected}>${pos.tonnage} MT from ${origin} - ${statusLabel} (${location})</option>`;
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
                const qpMonth = TimeManager.MONTHS[timeInfo.monthIndex + 1] || 'Next Month';
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
            case 'Analytics': {
                // Show analytics, hide hedge status
                const analyticsEl = document.getElementById('analyticsContainer');
                const hedgeStatusEl = document.getElementById('hedgeStatusContainer');
                if (analyticsEl) analyticsEl.style.display = 'block';
                if (hedgeStatusEl) hedgeStatusEl.style.display = 'none';
                AnalyticsWidget.render();
                break;
            }
            case 'HedgeStatus': {
                // Show hedge status, hide analytics
                const analyticsEl = document.getElementById('analyticsContainer');
                const hedgeStatusEl = document.getElementById('hedgeStatusContainer');
                if (analyticsEl) analyticsEl.style.display = 'none';
                if (hedgeStatusEl) hedgeStatusEl.style.display = 'block';
                HedgeStatusWidget.render();
                break;
            }
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
// SECTION 10: DEBUG PANEL
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
Month Boundary: ${TimeManager.isMonthBoundary() ? 'YES' : 'No'}
</pre>
</div>

<div class="debug-section">
<h4>💰 FINANCIAL</h4>
<pre>
Funds:     $${GAME_STATE.practiceFunds.toLocaleString()}
Total P&L: $${GAME_STATE.totalPL.toLocaleString()}
Inventory: ${GAME_STATE.inventory} MT
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
  6M:   $${data.PRICING.LME.FUTURES_6M}

COMEX:
  Spot:  $${data.PRICING.COMEX.SPOT_AVG}
  1M:    $${data.PRICING.COMEX.FUTURES_1M}
  3M:    $${data.PRICING.COMEX.FUTURES_3M}
  6M:   $${data.PRICING.COMEX.FUTURES_6M}`;
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
// SECTION 10B: HEDGE STATUS WIDGET
// ============================================================

/**
 * HedgeStatusWidget displays hedge coverage for physical positions
 * Shows which positions are hedged, exposed, or partially hedged
 */
const HedgeStatusWidget = {
    currentTab: 'hedges',
    pendingPhysicalId: null,
    pendingFuturesId: null,

    /**
     * Main render function
     */
    render() {
        const container = document.getElementById('hedgeStatusContainer');
        if (!container) return;

        container.innerHTML = `
            ${this.renderSummaryBar()}
            <div class="hedge-sub-tabs">
                <button class="hedge-sub-tab ${this.currentTab === 'hedges' ? 'active' : ''}"
                        onclick="HedgeStatusWidget.switchTab('hedges')">
                    Hedge Coverage
                </button>
                <button class="hedge-sub-tab ${this.currentTab === 'arbitrage' ? 'active' : ''}"
                        onclick="HedgeStatusWidget.switchTab('arbitrage')">
                    Arbitrage Opps
                </button>
            </div>
            <div class="hedge-content">
                ${this.currentTab === 'hedges' ? this.renderHedges() : this.renderArbitrage()}
            </div>
        `;
    },

    /**
     * Render summary bar with counts and metrics
     */
    renderSummaryBar() {
        const positions = GAME_STATE.physicalPositions.filter(p => p.status !== 'SOLD');
        const futures = GAME_STATE.futuresPositions.filter(f => f.status === 'OPEN');

        let hedged = 0, exposed = 0, partial = 0;
        let totalDeployed = 0;

        positions.forEach(pos => {
            totalDeployed += pos.totalCost || 0;
            const status = this.getHedgeStatus(pos);
            if (status.status === 'hedged') hedged++;
            else if (status.status === 'partial') partial++;
            else exposed++;
        });

        // Calculate net exposure
        const exposure = GAME_STATE.calculateNetExposure();
        const netClass = exposure.net > 0 ? 'exposed' : exposure.net < 0 ? 'hedged' : 'hedged';

        return `
            <div class="hedge-summary-bar">
                <div class="hedge-summary-item">
                    <span class="summary-label">Physical</span>
                    <span class="summary-value">${exposure.physical} MT</span>
                </div>
                <div class="hedge-summary-item">
                    <span class="summary-label">Hedged</span>
                    <span class="summary-value">${exposure.futuresShort} MT</span>
                </div>
                <div class="hedge-summary-item ${netClass}">
                    <span class="summary-label">Net Exposure</span>
                    <span class="summary-value">${exposure.net >= 0 ? '+' : ''}${exposure.net} MT</span>
                </div>
                <div class="hedge-summary-item ${exposure.hedgeRatio >= 80 ? 'hedged' : exposure.hedgeRatio >= 50 ? 'partial' : 'exposed'}">
                    <span class="summary-label">Hedge Ratio</span>
                    <span class="summary-value">${exposure.hedgeRatio}%</span>
                </div>
            </div>
        `;
    },

    /**
     * Render hedge cards for all non-sold positions
     */
    renderHedges() {
        const positions = GAME_STATE.physicalPositions.filter(p => p.status !== 'SOLD');

        if (positions.length === 0) {
            return this.renderEmptyState();
        }

        return `
            <div class="hedge-cards-container">
                ${positions.map(pos => this.renderHedgeCard(pos)).join('')}
            </div>
        `;
    },

    /**
     * Render individual hedge card
     */
    renderHedgeCard(position) {
        const hedgeStatus = this.getHedgeStatus(position);
        const linkedFutures = this.getLinkedFutures(position);
        const coverage = this.calculateCoverage(position, linkedFutures);

        const statusClass = hedgeStatus.status;

        return `
            <div class="hedge-card ${statusClass}">
                <div class="hedge-card-header">
                    <div class="hedge-position-info">
                        <span class="hedge-id">${position.id}</span>
                        <span class="hedge-route">${position.supplier} > ${position.destination}</span>
                    </div>
                    <div class="hedge-status-badge ${statusClass}">
                        ${hedgeStatus.label.toUpperCase()}
                    </div>
                </div>

                <div class="hedge-card-body">
                    <div class="hedge-metrics">
                        <div class="hedge-metric">
                            <span class="metric-label">Tonnage</span>
                            <span class="metric-value">${position.tonnage} MT</span>
                        </div>
                        <div class="hedge-metric">
                            <span class="metric-label">Value</span>
                            <span class="metric-value">$${((position.totalCost || 0)/1000).toFixed(0)}K</span>
                        </div>
                        <div class="hedge-metric">
                            <span class="metric-label">Coverage</span>
                            <span class="metric-value ${coverage >= 100 ? 'full' : coverage > 0 ? 'partial' : 'none'}">${coverage}%</span>
                        </div>
                        <div class="hedge-metric">
                            <span class="metric-label">Arrives</span>
                            <span class="metric-value">T${position.arrivalTurn}</span>
                        </div>
                    </div>

                    ${linkedFutures.length > 0 ? `
                        <div class="linked-futures">
                            <div class="linked-futures-header">Linked Futures</div>
                            ${linkedFutures.map(f => `
                                <div class="linked-future-item">
                                    <span>${f.exchange} ${f.contract}</span>
                                    <span>${f.direction} x${f.contracts}</span>
                                    <span class="futures-pl ${f.unrealizedPL >= 0 ? 'profit' : 'loss'}">
                                        $${f.unrealizedPL?.toLocaleString() || '0'}
                                    </span>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <div class="no-hedge-message">
                            <span>No hedge linked</span>
                            <button class="add-hedge-btn" onclick="HedgeStatusWidget.showAddHedgeModal('${position.id}')">
                                + Add Hedge
                            </button>
                        </div>
                    `}
                </div>
            </div>
        `;
    },

    /**
     * Get hedge status for a position
     */
    getHedgeStatus(position) {
        const linkedFutures = this.getLinkedFutures(position);
        const coverage = this.calculateCoverage(position, linkedFutures);

        if (coverage >= 100) {
            return { status: 'hedged', label: 'Fully Hedged', coverage };
        } else if (coverage > 0) {
            return { status: 'partial', label: `${coverage}% Hedged`, coverage };
        } else {
            return { status: 'exposed', label: 'Exposed', coverage };
        }
    },

    /**
     * Get futures positions linked to a physical position
     */
    getLinkedFutures(position) {
        return GAME_STATE.futuresPositions.filter(f =>
            f.status === 'OPEN' && f.linkedPhysicalId === position.id
        );
    },

    /**
     * Calculate hedge coverage percentage
     */
    calculateCoverage(position, linkedFutures) {
        if (linkedFutures.length === 0) return 0;

        const contractSize = 25; // 25 MT per contract
        const totalHedged = linkedFutures.reduce((sum, f) =>
            sum + (f.contracts * contractSize), 0
        );

        return Math.min(100, Math.round((totalHedged / position.tonnage) * 100));
    },

    /**
     * Render empty state
     */
    renderEmptyState() {
        return `
            <div class="hedge-empty-state">
                <div class="empty-icon">--</div>
                <div class="empty-title">No Physical Positions</div>
                <div class="empty-message">
                    Buy copper to start tracking hedge coverage
                </div>
            </div>
        `;
    },

    /**
     * Render arbitrage opportunities tab
     */
    renderArbitrage() {
        const data = GAME_STATE.currentMonthData;
        if (!data || !data.PRICING) {
            return '<div class="arb-empty">No pricing data available</div>';
        }

        const lme = data.PRICING.LME;
        const comex = data.PRICING.COMEX;

        const spotSpread = comex.SPOT_AVG - lme.SPOT_AVG;
        const spreadPct = ((spotSpread / lme.SPOT_AVG) * 100).toFixed(2);

        // Calculate term structure
        const lmeContango = ((lme.FUTURES_6M - lme.SPOT_AVG) / lme.SPOT_AVG * 100).toFixed(2);
        const comexContango = ((comex.FUTURES_6M - comex.SPOT_AVG) / comex.SPOT_AVG * 100).toFixed(2);

        return `
            <div class="arbitrage-panel">
                <div class="arb-section">
                    <h4>Exchange Spread</h4>
                    <div class="arb-metric">
                        <span>COMEX - LME Spot</span>
                        <span class="${spotSpread > 0 ? 'positive' : 'negative'}">
                            ${spotSpread > 0 ? '+' : ''}$${spotSpread.toFixed(0)} (${spreadPct}%)
                        </span>
                    </div>
                </div>

                <div class="arb-section">
                    <h4>Term Structure (6M)</h4>
                    <div class="arb-metric">
                        <span>LME Contango</span>
                        <span>${lmeContango}%</span>
                    </div>
                    <div class="arb-metric">
                        <span>COMEX Contango</span>
                        <span>${comexContango}%</span>
                    </div>
                </div>

                <div class="arb-section">
                    <h4>Trading Signals</h4>
                    ${spotSpread > 200 ? `
                        <div class="arb-signal positive">
                            [+] COMEX premium elevated - consider LME sourcing for COMEX delivery
                        </div>
                    ` : spotSpread < -100 ? `
                        <div class="arb-signal negative">
                            [-] COMEX discount - unusual, check market conditions
                        </div>
                    ` : `
                        <div class="arb-signal neutral">
                            [=] Exchange spreads within normal range
                        </div>
                    `}
                </div>
            </div>
        `;
    },

    /**
     * Switch between tabs
     */
    switchTab(tab) {
        this.currentTab = tab;
        this.render();
    },

    /**
     * Show modal to add hedge
     */
    showAddHedgeModal(positionId) {
        const position = GAME_STATE.physicalPositions.find(p => p.id === positionId);
        if (!position) return;

        const openFutures = GAME_STATE.futuresPositions.filter(f =>
            f.status === 'OPEN' && !f.linkedPhysicalId
        );

        if (openFutures.length === 0) {
            alert('No unlinked futures positions available.\n\nOpen a SHORT futures position in the Futures tab to hedge this physical position.');
            return;
        }

        this.pendingPhysicalId = positionId;

        // Show futures selection modal
        const modal = document.getElementById('hedgeLinkModal');
        if (modal) {
            const listContainer = document.getElementById('availableFuturesList');
            listContainer.innerHTML = openFutures.map(f => `
                <div class="futures-select-item" onclick="HedgeStatusWidget.showLinkPrompt('${positionId}', '${f.id}')">
                    <div class="futures-select-info">
                        <span class="futures-id">${f.id}</span>
                        <span class="futures-details">${f.exchange} ${f.contract} | ${f.direction} x${f.contracts}</span>
                    </div>
                    <div class="futures-select-pl ${f.unrealizedPL >= 0 ? 'profit' : 'loss'}">
                        $${f.unrealizedPL?.toLocaleString() || '0'}
                    </div>
                </div>
            `).join('');

            modal.style.display = 'flex';
        }
    },

    /**
     * Show link confirmation prompt
     */
    showLinkPrompt(physicalId, futuresId) {
        this.pendingPhysicalId = physicalId;
        this.pendingFuturesId = futuresId;

        const physical = GAME_STATE.physicalPositions.find(p => p.id === physicalId);
        const futures = GAME_STATE.futuresPositions.find(f => f.id === futuresId);

        if (confirm(`Link futures position ${futuresId} to physical position ${physicalId}?\n\nPhysical: ${physical.tonnage} MT ${physical.supplier} → ${physical.destination}\nFutures: ${futures.exchange} ${futures.contract} ${futures.direction} x${futures.contracts}`)) {
            this.confirmLink();
        }
    },

    /**
     * Confirm and execute the link
     */
    confirmLink() {
        if (!this.pendingPhysicalId || !this.pendingFuturesId) return;

        const futures = GAME_STATE.futuresPositions.find(f => f.id === this.pendingFuturesId);
        if (futures) {
            futures.linkedPhysicalId = this.pendingPhysicalId;
            console.log(`[HEDGE] Linked ${this.pendingFuturesId} to ${this.pendingPhysicalId}`);
        }

        // Close modal
        const modal = document.getElementById('hedgeLinkModal');
        if (modal) modal.style.display = 'none';

        // Reset pending IDs
        this.pendingPhysicalId = null;
        this.pendingFuturesId = null;

        // Re-render with updated exposure
        this.render();
        AnalyticsWidget.render();

        // Calculate and show new exposure in notification
        const exposure = GAME_STATE.calculateNetExposure();
        if (typeof NotificationManager !== 'undefined') {
            NotificationManager.add(
                'hedge-linked',
                'Hedge Linked',
                `Futures linked to physical. Net exposure: ${exposure.net >= 0 ? '+' : ''}${exposure.net} MT (${exposure.hedgeRatio}% hedged)`,
                '🛡️'
            );
        }
    },

    /**
     * Close the hedge link modal
     */
    closeModal() {
        const modal = document.getElementById('hedgeLinkModal');
        if (modal) modal.style.display = 'none';
        this.pendingPhysicalId = null;
        this.pendingFuturesId = null;
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

    // Initialize notification manager
    NotificationManager.init();

    // Render initial widgets
    MarketsWidget.render();
    PositionsWidget.render();
    AnalyticsWidget.render();
    HedgeStatusWidget.render();

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
