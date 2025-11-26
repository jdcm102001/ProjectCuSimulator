/**
 * Admin Storage Module
 * Handles saving/loading simulation configurations to localStorage
 */

const AdminStorage = {
    STORAGE_PREFIX: 'simulation_slot_',
    PASSWORD_KEY: 'admin_password',
    DEFAULT_PASSWORD: 'Password123',

    // Default simulation data (matches current game)
    DEFAULT_SIMULATION: {
        version: '1.0',
        slot: 0,
        metadata: {
            name: 'Default Training Scenario',
            description: 'Standard 6-month simulation with default market conditions. Learn the basics of copper trading.',
            difficulty: 'Medium',
            createdAt: null,
            modifiedAt: null
        },
        pricing: {
            lme: {
                1: { average: 8960, early: 8960, late: 8960 },
                2: { average: 9117, early: 9100, late: 9134 },
                3: { average: 9075, early: 9050, late: 9100 },
                4: { average: 9138, early: 9120, late: 9156 },
                5: { average: 9200, early: 9180, late: 9220 },
                6: { average: 9280, early: 9260, late: 9300 }
            },
            comex: {
                1: { average: 9344, early: 9344, late: 9344 },
                2: { average: 10229, early: 10200, late: 10258 },
                3: { average: 10187, early: 10150, late: 10224 },
                4: { average: 10210, early: 10180, late: 10240 },
                5: { average: 10300, early: 10270, late: 10330 },
                6: { average: 10380, early: 10350, late: 10410 }
            }
        },
        supply: {
            1: { supplier: 'CALLAO', minMT: 5, maxMT: 25, premium: 15, exchange: 'LME' },
            2: { supplier: 'CALLAO', minMT: 5, maxMT: 25, premium: 15, exchange: 'LME' },
            3: { supplier: 'ANTOFAGASTA', minMT: 25, maxMT: 90, premium: 0, exchange: 'LME' },
            4: { supplier: 'CALLAO', minMT: 5, maxMT: 25, premium: 15, exchange: 'LME' },
            5: { supplier: 'ANTOFAGASTA', minMT: 25, maxMT: 90, premium: 0, exchange: 'LME' },
            6: { supplier: 'CALLAO', minMT: 5, maxMT: 25, premium: 15, exchange: 'LME' }
        },
        demand: {
            1: { buyer: 'ASIA', minMT: 40, maxMT: 85, premium: 120, exchange: 'LME', port: 'Shanghai' },
            2: { buyer: 'AMERICAS', minMT: 15, maxMT: 90, premium: 50, exchange: 'COMEX', port: 'New Orleans, LA' },
            3: { buyer: 'EUROPE', minMT: 25, maxMT: 55, premium: 90, exchange: 'LME', port: 'Rotterdam' },
            4: { buyer: 'ASIA', minMT: 40, maxMT: 85, premium: 120, exchange: 'LME', port: 'Shanghai' },
            5: { buyer: 'AMERICAS', minMT: 15, maxMT: 90, premium: 50, exchange: 'COMEX', port: 'New Orleans, LA' },
            6: { buyer: 'EUROPE', minMT: 25, maxMT: 55, premium: 90, exchange: 'LME', port: 'Rotterdam' }
        },
        events: [],
        settings: {
            startingFunds: 200000,
            locLimit: 200000,
            interestRate: 4.32,
            marginRequirement: 100000,
            timerMinutes: 10
        }
    },

    // Supplier presets
    SUPPLIERS: {
        CALLAO: {
            name: 'CALLAO',
            port: 'Callao, Peru',
            country: 'Peru',
            defaultPremium: 15,
            defaultExchange: 'LME'
        },
        ANTOFAGASTA: {
            name: 'ANTOFAGASTA',
            port: 'Antofagasta, Chile',
            country: 'Chile',
            defaultPremium: 0,
            defaultExchange: 'LME'
        }
    },

    // Buyer presets
    BUYERS: {
        AMERICAS: {
            name: 'AMERICAS',
            region: 'AMERICAS',
            port: 'New Orleans, LA',
            exchange: 'COMEX',
            defaultPremium: 50
        },
        ASIA: {
            name: 'ASIA',
            region: 'ASIA',
            port: 'Shanghai',
            exchange: 'LME',
            defaultPremium: 120
        },
        EUROPE: {
            name: 'EUROPE',
            region: 'EUROPE',
            port: 'Rotterdam',
            exchange: 'LME',
            defaultPremium: 90
        }
    },

    // Event types
    EVENT_TYPES: ['supply', 'demand', 'price', 'logistics', 'financial', 'news'],

    // Severity multipliers for event impacts
    SEVERITY_MULTIPLIERS: {
        minor: 0.05,
        medium: 0.10,
        high: 0.15,
        significant: 0.25
    },

    // Period mapping (for events)
    PERIODS: [
        { id: 1, name: 'Jan-E', month: 1, period: 'Early' },
        { id: 2, name: 'Jan-L', month: 1, period: 'Late' },
        { id: 3, name: 'Feb-E', month: 2, period: 'Early' },
        { id: 4, name: 'Feb-L', month: 2, period: 'Late' },
        { id: 5, name: 'Mar-E', month: 3, period: 'Early' },
        { id: 6, name: 'Mar-L', month: 3, period: 'Late' },
        { id: 7, name: 'Apr-E', month: 4, period: 'Early' },
        { id: 8, name: 'Apr-L', month: 4, period: 'Late' },
        { id: 9, name: 'May-E', month: 5, period: 'Early' },
        { id: 10, name: 'May-L', month: 5, period: 'Late' },
        { id: 11, name: 'Jun-E', month: 6, period: 'Early' },
        { id: 12, name: 'Jun-L', month: 6, period: 'Late' }
    ],

    /**
     * Initialize storage module
     */
    init() {
        // Ensure default password exists
        if (!localStorage.getItem(this.PASSWORD_KEY)) {
            localStorage.setItem(this.PASSWORD_KEY, this.DEFAULT_PASSWORD);
        }
        console.log('[AdminStorage] Initialized');
    },

    /**
     * Verify admin password
     */
    verifyPassword(password) {
        const storedPassword = localStorage.getItem(this.PASSWORD_KEY) || this.DEFAULT_PASSWORD;
        return password === storedPassword;
    },

    /**
     * Update admin password
     */
    updatePassword(currentPassword, newPassword) {
        if (!this.verifyPassword(currentPassword)) {
            return { success: false, error: 'Current password is incorrect' };
        }
        if (newPassword.length < 6) {
            return { success: false, error: 'New password must be at least 6 characters' };
        }
        localStorage.setItem(this.PASSWORD_KEY, newPassword);
        return { success: true };
    },

    /**
     * Get a deep copy of default simulation
     */
    getDefaultSimulation() {
        return JSON.parse(JSON.stringify(this.DEFAULT_SIMULATION));
    },

    /**
     * Load simulation from slot
     */
    loadSimulation(slotNumber) {
        if (slotNumber === 0) {
            return this.getDefaultSimulation();
        }

        const key = `${this.STORAGE_PREFIX}${slotNumber}`;
        const saved = localStorage.getItem(key);

        if (!saved) {
            return null;
        }

        try {
            return JSON.parse(saved);
        } catch (e) {
            console.error('[AdminStorage] Error loading simulation:', e);
            return null;
        }
    },

    /**
     * Save simulation to slot
     */
    saveSimulation(slotNumber, simData) {
        if (slotNumber === 0) {
            return { success: false, error: 'Cannot save to default slot (Slot 0)' };
        }

        // Validate
        const validation = this.validateSimulation(simData);
        if (validation.errors.length > 0) {
            return { success: false, errors: validation.errors, warnings: validation.warnings };
        }

        // Update metadata
        simData.slot = slotNumber;
        simData.version = '1.0';
        if (!simData.metadata.createdAt) {
            simData.metadata.createdAt = new Date().toISOString();
        }
        simData.metadata.modifiedAt = new Date().toISOString();

        // Save
        const key = `${this.STORAGE_PREFIX}${slotNumber}`;
        try {
            localStorage.setItem(key, JSON.stringify(simData));
            return { success: true, warnings: validation.warnings };
        } catch (e) {
            console.error('[AdminStorage] Error saving simulation:', e);
            return { success: false, error: 'Failed to save simulation' };
        }
    },

    /**
     * Delete simulation from slot
     */
    deleteSimulation(slotNumber) {
        if (slotNumber === 0) {
            return { success: false, error: 'Cannot delete default simulation' };
        }

        const key = `${this.STORAGE_PREFIX}${slotNumber}`;
        localStorage.removeItem(key);
        return { success: true };
    },

    /**
     * Get list of all saved simulations
     */
    getAllSimulations() {
        const sims = [];

        // Add default (slot 0)
        sims.push({
            slot: 0,
            data: this.getDefaultSimulation(),
            isEmpty: false
        });

        // Check slots 1-3
        for (let i = 1; i <= 3; i++) {
            const sim = this.loadSimulation(i);
            sims.push({
                slot: i,
                data: sim,
                isEmpty: sim === null
            });
        }

        return sims;
    },

    /**
     * Validate simulation data
     */
    validateSimulation(simData) {
        const errors = [];
        const warnings = [];

        // Check metadata
        if (!simData.metadata?.name || simData.metadata.name.trim() === '') {
            errors.push('Simulation name is required');
        }

        // Check pricing
        if (!simData.pricing?.lme || !simData.pricing?.comex) {
            errors.push('Pricing data is incomplete');
        } else {
            for (let month = 1; month <= 6; month++) {
                if (!simData.pricing.lme[month] || !simData.pricing.comex[month]) {
                    errors.push(`Missing pricing for month ${month}`);
                }

                // Check for reasonable prices
                const lmeAvg = simData.pricing.lme[month]?.average || 0;
                const comexAvg = simData.pricing.comex[month]?.average || 0;

                if (lmeAvg < 5000 || lmeAvg > 20000) {
                    warnings.push(`LME price for month ${month} seems unusual ($${lmeAvg})`);
                }
                if (comexAvg < 5000 || comexAvg > 20000) {
                    warnings.push(`COMEX price for month ${month} seems unusual ($${comexAvg})`);
                }
            }
        }

        // Check supply
        if (!simData.supply) {
            errors.push('Supply configuration is missing');
        } else {
            for (let month = 1; month <= 6; month++) {
                const s = simData.supply[month];
                if (!s) {
                    errors.push(`Missing supply configuration for month ${month}`);
                } else {
                    if (!s.supplier) errors.push(`No supplier selected for month ${month}`);
                    if (s.minMT <= 0) errors.push(`Invalid min tonnage for month ${month}`);
                    if (s.maxMT < s.minMT) errors.push(`Max tonnage must be >= min for month ${month}`);
                }
            }
        }

        // Check demand
        if (!simData.demand) {
            errors.push('Demand configuration is missing');
        } else {
            for (let month = 1; month <= 6; month++) {
                const d = simData.demand[month];
                if (!d) {
                    errors.push(`Missing demand configuration for month ${month}`);
                } else {
                    if (!d.buyer) errors.push(`No buyer selected for month ${month}`);
                    if (d.minMT <= 0) errors.push(`Invalid min tonnage for month ${month}`);
                    if (d.maxMT < d.minMT) errors.push(`Max tonnage must be >= min for month ${month}`);
                }
            }
        }

        // Check settings
        if (!simData.settings) {
            errors.push('Settings configuration is missing');
        } else {
            if (simData.settings.startingFunds <= 0) errors.push('Starting funds must be positive');
            if (simData.settings.locLimit < 0) errors.push('LOC limit cannot be negative');
            if (simData.settings.interestRate < 0 || simData.settings.interestRate > 100) {
                errors.push('Interest rate must be between 0 and 100%');
            }
        }

        // Check events for overlaps (warning only)
        if (simData.events && simData.events.length > 1) {
            for (let i = 0; i < simData.events.length; i++) {
                for (let j = i + 1; j < simData.events.length; j++) {
                    const e1 = simData.events[i];
                    const e2 = simData.events[j];
                    if (this.eventsOverlap(e1, e2)) {
                        warnings.push(`Events "${e1.name}" and "${e2.name}" overlap in time`);
                    }
                }
            }
        }

        return { errors, warnings };
    },

    /**
     * Check if two events overlap
     */
    eventsOverlap(e1, e2) {
        return !(e1.endPeriod < e2.startPeriod || e2.endPeriod < e1.startPeriod);
    },

    /**
     * Calculate event impacts based on sentiment and severity
     */
    calculateEventImpacts(sentiment, severity, basePrices) {
        const multiplier = this.SEVERITY_MULTIPLIERS[severity] || 0.10;
        const direction = sentiment === 'bullish' ? 1 : sentiment === 'bearish' ? -1 : 0;

        const lmeBase = basePrices?.lme || 9000;
        const comexBase = basePrices?.comex || 10000;

        return {
            lmeSpot: Math.round(lmeBase * multiplier * direction),
            comexSpot: Math.round(comexBase * multiplier * direction),
            futures1M: Math.round(lmeBase * multiplier * direction * 1.1),
            futures3M: Math.round(lmeBase * multiplier * direction * 0.9),
            futures6M: Math.round(lmeBase * multiplier * direction * 0.7)
        };
    },

    /**
     * Generate unique event ID
     */
    generateEventId() {
        return 'event-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    },

    /**
     * Export simulation as JSON file (for download)
     */
    exportSimulation(slotNumber) {
        const sim = this.loadSimulation(slotNumber);
        if (!sim) {
            return null;
        }

        const blob = new Blob([JSON.stringify(sim, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `simulation_${sim.metadata.name.replace(/[^a-z0-9]/gi, '_')}.json`;
        a.click();

        URL.revokeObjectURL(url);
        return true;
    },

    /**
     * Import simulation from JSON file
     */
    importSimulation(jsonString, targetSlot) {
        try {
            const simData = JSON.parse(jsonString);

            // Validate
            const validation = this.validateSimulation(simData);
            if (validation.errors.length > 0) {
                return { success: false, errors: validation.errors };
            }

            // Save to target slot
            return this.saveSimulation(targetSlot, simData);
        } catch (e) {
            return { success: false, error: 'Invalid JSON format' };
        }
    }
};

// Initialize on load
if (typeof window !== 'undefined') {
    AdminStorage.init();
}
