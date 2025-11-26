/**
 * SCENARIO LOADER
 * Bridge between admin-saved scenarios and the game simulator
 *
 * This module:
 * 1. Loads scenario data from localStorage (custom) or default data files
 * 2. Transforms admin format into game-compatible MONTH_DATA structures
 * 3. Provides a unified API for the game to access scenario data
 */

const ScenarioLoader = {
    STORAGE_PREFIX: 'simulation_slot_',
    SELECTED_SLOT_KEY: 'selected_scenario_slot',

    // Month names for reference
    MONTHS: ['January', 'February', 'March', 'April', 'May', 'June'],

    // Port name mappings
    PORT_MAPPINGS: {
        'CALLAO': 'Callao',
        'ANTOFAGASTA': 'Antofagasta'
    },

    // Destination port mappings (from admin format to game format)
    DESTINATION_MAPPINGS: {
        'Shanghai': 'SHANGHAI',
        'New Orleans': 'NEW_ORLEANS',
        'New Orleans, LA': 'NEW_ORLEANS',
        'Rotterdam': 'ROTTERDAM',
        'Busan': 'BUSAN',
        'Ningbo': 'NINGBO',
        'Singapore': 'SINGAPORE',
        'Valencia': 'VALENCIA',
        'Hamburg': 'HAMBURG',
        'Antwerp': 'ANTWERP',
        'Houston': 'HOUSTON',
        'Newark': 'NEWARK',
        'Montreal': 'MONTREAL'
    },

    // Currently loaded scenario
    loadedScenario: null,
    transformedMonthData: [],

    /**
     * Initialize the loader
     */
    init() {
        console.log('[ScenarioLoader] Initializing...');
    },

    /**
     * Set which scenario slot to use for the game
     */
    selectScenario(slotNumber) {
        localStorage.setItem(this.SELECTED_SLOT_KEY, slotNumber.toString());
        console.log('[ScenarioLoader] Selected scenario slot:', slotNumber);
    },

    /**
     * Get currently selected scenario slot
     */
    getSelectedSlot() {
        const slot = localStorage.getItem(this.SELECTED_SLOT_KEY);
        return slot !== null ? parseInt(slot, 10) : 0;
    },

    /**
     * Load scenario from localStorage
     */
    loadScenarioFromSlot(slotNumber) {
        console.log('[ScenarioLoader] Loading scenario from slot:', slotNumber);

        if (slotNumber === 0) {
            console.log('[ScenarioLoader] Slot 0 = use default data files');
            return null; // Signal to use default data
        }

        const key = `${this.STORAGE_PREFIX}${slotNumber}`;
        const saved = localStorage.getItem(key);

        if (!saved) {
            console.log('[ScenarioLoader] No scenario found in slot', slotNumber);
            return null;
        }

        try {
            const scenario = JSON.parse(saved);
            console.log('[ScenarioLoader] Loaded scenario:', scenario.metadata?.name);
            return scenario;
        } catch (e) {
            console.error('[ScenarioLoader] Error parsing scenario:', e);
            return null;
        }
    },

    /**
     * Get list of available scenarios
     */
    getAvailableScenarios() {
        const scenarios = [];

        // Slot 0 = Default
        scenarios.push({
            slot: 0,
            name: 'Default Training Scenario',
            description: 'Standard 6-month simulation with default market conditions.',
            isEmpty: false,
            isDefault: true
        });

        // Slots 1-3 = Custom
        for (let i = 1; i <= 3; i++) {
            const key = `${this.STORAGE_PREFIX}${i}`;
            const saved = localStorage.getItem(key);

            if (saved) {
                try {
                    const scenario = JSON.parse(saved);
                    scenarios.push({
                        slot: i,
                        name: scenario.metadata?.name || `Scenario ${i}`,
                        description: scenario.metadata?.description || '',
                        difficulty: scenario.metadata?.difficulty || 'Medium',
                        modifiedAt: scenario.metadata?.modifiedAt,
                        eventCount: scenario.events?.length || 0,
                        isEmpty: false,
                        isDefault: false
                    });
                } catch (e) {
                    scenarios.push({
                        slot: i,
                        name: `Slot ${i}`,
                        description: 'Corrupted data',
                        isEmpty: true,
                        isDefault: false
                    });
                }
            } else {
                scenarios.push({
                    slot: i,
                    name: `Empty Slot ${i}`,
                    description: 'No scenario saved',
                    isEmpty: true,
                    isDefault: false
                });
            }
        }

        return scenarios;
    },

    /**
     * Load and prepare the selected scenario for game use
     * Returns true if custom scenario loaded, false if using defaults
     */
    loadSelectedScenario() {
        const slot = this.getSelectedSlot();
        console.log('[ScenarioLoader] Loading selected scenario from slot:', slot);

        const scenario = this.loadScenarioFromSlot(slot);

        if (!scenario) {
            // Use default data files
            console.log('[ScenarioLoader] Using default data files');
            this.loadedScenario = null;
            this.transformedMonthData = [];
            return false;
        }

        // Transform and store
        this.loadedScenario = scenario;
        this.transformedMonthData = this.transformScenarioToMonthData(scenario);

        console.log('[ScenarioLoader] Transformed', this.transformedMonthData.length, 'months of data');
        return true;
    },

    /**
     * Transform admin-format scenario to game-format MONTH_DATA structures
     */
    transformScenarioToMonthData(scenario) {
        const monthData = [];

        for (let monthIndex = 0; monthIndex < 6; monthIndex++) {
            const monthNum = monthIndex + 1;
            const monthName = this.MONTHS[monthIndex];

            // Get base pricing for this month
            const lmePricing = scenario.pricing?.lme?.[monthNum] || { average: 9000 };
            const comexPricing = scenario.pricing?.comex?.[monthNum] || { average: 9500 };

            // Get supply config for this month
            const supplyConfig = scenario.supply?.[monthNum] || {
                supplier: 'CALLAO',
                minMT: 5,
                maxMT: 25,
                premium: 15
            };

            // Get demand config for this month
            const demandConfig = scenario.demand?.[monthNum] || {
                buyer: 'ASIA',
                minMT: 40,
                maxMT: 85,
                premium: 120
            };

            // Get the base month data template (from default files if available)
            const baseData = this.getBaseMonthData(monthIndex);

            // Create transformed month data
            const transformed = this.createMonthData(
                monthNum,
                monthName,
                lmePricing,
                comexPricing,
                supplyConfig,
                demandConfig,
                scenario.settings || {},
                baseData
            );

            monthData.push(transformed);
        }

        // Apply events to all month data
        if (scenario.events && scenario.events.length > 0) {
            this.applyEventsToMonthData(monthData, scenario.events);
        }

        return monthData;
    },

    /**
     * Get base month data from default files (for logistics data etc.)
     */
    getBaseMonthData(monthIndex) {
        const windowKeys = [
            'JANUARY_DATA',
            'FEBRUARY_DATA',
            'MARCH_DATA',
            'APRIL_DATA',
            'MAY_DATA',
            'JUNE_DATA'
        ];

        const key = windowKeys[monthIndex];
        return window[key] || null;
    },

    /**
     * Create a month data structure from admin format
     */
    createMonthData(monthNum, monthName, lmePricing, comexPricing, supplyConfig, demandConfig, settings, baseData) {
        // Use base data logistics if available, otherwise use defaults
        const logistics = baseData?.LOGISTICS || this.getDefaultLogistics();

        // Determine which supplier is primary
        const isPeru = supplyConfig.supplier === 'CALLAO';
        const isChile = supplyConfig.supplier === 'ANTOFAGASTA';

        return {
            TURN: monthNum,
            MONTH: monthName,
            MARKET_DEPTH: {
                SUPPLY: {
                    PERUVIAN: {
                        LTA_FIXED_MT: 5,
                        MAX_OPTIONAL_SPOT_MT: isPeru ? supplyConfig.maxMT - 5 : 17,
                        TOTAL_MAX_AVAILABLE_MT: isPeru ? supplyConfig.maxMT : 22,
                        ORIGIN_PORT: 'Callao',
                        SUPPLIER_PREMIUM_USD: isPeru ? supplyConfig.premium : 15,
                        IS_PRIMARY: isPeru
                    },
                    CHILEAN: {
                        MIN_AVAILABLE_MT: isChile ? supplyConfig.minMT : 20,
                        MAX_AVAILABLE_MT: isChile ? supplyConfig.maxMT : 75,
                        ORIGIN_PORT: 'Antofagasta',
                        SUPPLIER_PREMIUM_USD: isChile ? supplyConfig.premium : 0,
                        IS_PRIMARY: isChile
                    },
                    TOTAL_MARKET_DEPTH_MT: isPeru ? supplyConfig.maxMT + 75 : supplyConfig.maxMT + 22
                },
                DEMAND: {
                    AMERICAS: {
                        DEMAND_MT: demandConfig.buyer === 'AMERICAS' ? demandConfig.maxMT : 70
                    },
                    ASIA: {
                        DEMAND_MT: demandConfig.buyer === 'ASIA' ? demandConfig.maxMT : 95
                    },
                    EUROPE: {
                        DEMAND_MT: demandConfig.buyer === 'EUROPE' ? demandConfig.maxMT : 85
                    },
                    TOTAL_DEMAND_MT: 250
                }
            },
            PRICING: {
                LME: {
                    SPOT_AVG: lmePricing.average,
                    FUTURES_1M: Math.round(lmePricing.average * 1.01),
                    FUTURES_3M: Math.round(lmePricing.average * 1.03),
                    FUTURES_12M: Math.round(lmePricing.average * 1.07),
                    CURVE_STRUCTURE: 'Contango'
                },
                COMEX: {
                    SPOT_AVG: comexPricing.average,
                    FUTURES_1M: Math.round(comexPricing.average * 1.01),
                    FUTURES_3M: Math.round(comexPricing.average * 1.03),
                    FUTURES_12M: Math.round(comexPricing.average * 1.07),
                    CURVE_STRUCTURE: 'Contango'
                },
                M_PLUS_1: {
                    LME_AVG: Math.round(lmePricing.average * 1.036),
                    COMEX_AVG: Math.round(comexPricing.average * 1.075),
                    DESCRIPTION: 'M+1 average prices for supplier purchase and client sale pricing'
                }
            },
            LOGISTICS: logistics,
            FIXED_RULES: baseData?.FIXED_RULES || this.getDefaultFixedRules(settings),
            CLIENTS: {
                OPPORTUNITIES: this.createClientOpportunities(demandConfig, baseData)
            }
        };
    },

    /**
     * Create client opportunities from demand config
     */
    createClientOpportunities(demandConfig, baseData) {
        // Use base opportunities as template
        const baseOpps = baseData?.CLIENTS?.OPPORTUNITIES || [];

        // Map buyer to region
        const primaryRegion = demandConfig.buyer;

        const opportunities = [
            {
                REGION: 'AMERICAS',
                MIN_QUANTITY_MT: primaryRegion === 'AMERICAS' ? demandConfig.minMT : 45,
                MAX_QUANTITY_MT: primaryRegion === 'AMERICAS' ? demandConfig.maxMT : 70,
                PORT_OF_DISCHARGE: 'New Orleans, USA',
                REFERENCE_EXCHANGE: 'COMEX',
                PORT_TYPE: 'Hub',
                REGIONAL_PREMIUM_USD: primaryRegion === 'AMERICAS' ? demandConfig.premium : 50,
                IS_PRIMARY: primaryRegion === 'AMERICAS'
            },
            {
                REGION: 'ASIA',
                MIN_QUANTITY_MT: primaryRegion === 'ASIA' ? demandConfig.minMT : 10,
                MAX_QUANTITY_MT: primaryRegion === 'ASIA' ? demandConfig.maxMT : 95,
                PORT_OF_DISCHARGE: 'Shanghai, China',
                REFERENCE_EXCHANGE: 'LME',
                PORT_TYPE: 'Hub',
                REGIONAL_PREMIUM_USD: primaryRegion === 'ASIA' ? demandConfig.premium : 120,
                IS_PRIMARY: primaryRegion === 'ASIA'
            },
            {
                REGION: 'EUROPE',
                MIN_QUANTITY_MT: primaryRegion === 'EUROPE' ? demandConfig.minMT : 20,
                MAX_QUANTITY_MT: primaryRegion === 'EUROPE' ? demandConfig.maxMT : 85,
                PORT_OF_DISCHARGE: 'Rotterdam, Netherlands',
                REFERENCE_EXCHANGE: 'LME',
                PORT_TYPE: 'Hub',
                REGIONAL_PREMIUM_USD: primaryRegion === 'EUROPE' ? demandConfig.premium : 90,
                IS_PRIMARY: primaryRegion === 'EUROPE'
            }
        ];

        return opportunities;
    },

    /**
     * Get default logistics structure
     */
    getDefaultLogistics() {
        return {
            FREIGHT_RATES: {
                CALLAO: {
                    SHANGHAI: { PORT_NAME: 'Shanghai', COUNTRY: 'China', CIF_RATE_USD_PER_TONNE: 63, FOB_RATE_USD_PER_TONNE: 64, TRAVEL_TIME_DAYS: 28.3 },
                    NEW_ORLEANS: { PORT_NAME: 'New Orleans', COUNTRY: 'USA', CIF_RATE_USD_PER_TONNE: 95, FOB_RATE_USD_PER_TONNE: 112, TRAVEL_TIME_DAYS: 9.2 },
                    ROTTERDAM: { PORT_NAME: 'Rotterdam', COUNTRY: 'Netherlands', CIF_RATE_USD_PER_TONNE: 82, FOB_RATE_USD_PER_TONNE: 86, TRAVEL_TIME_DAYS: 20.2 }
                },
                ANTOFAGASTA: {
                    SHANGHAI: { PORT_NAME: 'Shanghai', COUNTRY: 'China', CIF_RATE_USD_PER_TONNE: 65.5, FOB_RATE_USD_PER_TONNE: 64, TRAVEL_TIME_DAYS: 31.3 },
                    NEW_ORLEANS: { PORT_NAME: 'New Orleans', COUNTRY: 'USA', CIF_RATE_USD_PER_TONNE: 105, FOB_RATE_USD_PER_TONNE: 112, TRAVEL_TIME_DAYS: 12.2 },
                    ROTTERDAM: { PORT_NAME: 'Rotterdam', COUNTRY: 'Netherlands', CIF_RATE_USD_PER_TONNE: 86, FOB_RATE_USD_PER_TONNE: 86, TRAVEL_TIME_DAYS: 23.2 }
                }
            }
        };
    },

    /**
     * Get default fixed rules
     */
    getDefaultFixedRules(settings) {
        return {
            COST_OF_CARRY: {
                MONTHLY_RATE: 0.0046,
                SOFR_1M_PERCENT: settings.interestRate || 4.32,
                FINANCING_PERIOD_MONTHS: 2,
                DESCRIPTION: 'Financing cost for capital tied up between purchase and sale settlement.'
            },
            SUPPLIER_RULES: [
                { SUPPLIER_TYPE: 'Peruvian (LTA)', RELATIONSHIP: 'Mandatory LTA', PURCHASE_BASIS: 'LME M+1', TONNAGE_RANGE: '5 MT Fixed', SUPPLIER_PREMIUM_USD: 10, ORIGIN_PORT: 'Callao (Peru)' },
                { SUPPLIER_TYPE: 'Peruvian (Spot)', RELATIONSHIP: 'Optional Spot', PURCHASE_BASIS: 'LME M+1 or COMEX M+1', TONNAGE_RANGE: '5-15 MT', SUPPLIER_PREMIUM_USD: 15, ORIGIN_PORT: 'Callao (Peru)' },
                { SUPPLIER_TYPE: 'Chilean (Spot)', RELATIONSHIP: 'Optional Spot', PURCHASE_BASIS: 'LME M+1 or COMEX M+1', TONNAGE_RANGE: '20-100 MT', SUPPLIER_PREMIUM_USD: 0, ORIGIN_PORT: 'Antofagasta (Chile)' }
            ]
        };
    },

    /**
     * Apply events to month data
     */
    applyEventsToMonthData(monthData, events) {
        console.log('[ScenarioLoader] Applying', events.length, 'events to month data');

        events.forEach(event => {
            if (!event.startPeriod || !event.endPeriod) return;

            // Convert period to month index (periods 1-2 = month 0, 3-4 = month 1, etc.)
            const startMonth = Math.ceil(event.startPeriod / 2) - 1;
            const endMonth = Math.ceil(event.endPeriod / 2) - 1;

            // Apply effects based on event tracks
            if (event.tracks) {
                this.applyTrackEffects(monthData, event, startMonth, endMonth);
            }

            // Legacy event format (type, sentiment, severity)
            if (event.type === 'price' && event.sentiment) {
                this.applyLegacyPriceEvent(monthData, event, startMonth, endMonth);
            }
        });
    },

    /**
     * Apply track-based effects (new event format)
     */
    applyTrackEffects(monthData, event, startMonth, endMonth) {
        const tracks = event.tracks;

        for (let m = startMonth; m <= endMonth && m < 6; m++) {
            const data = monthData[m];
            if (!data) continue;

            // Price track effects
            if (tracks.price?.effects) {
                const priceEffects = tracks.price.effects;
                if (priceEffects.lme) {
                    const change = data.PRICING.LME.SPOT_AVG * (priceEffects.lme / 100);
                    data.PRICING.LME.SPOT_AVG += change;
                    data.PRICING.LME.FUTURES_1M += change;
                    data.PRICING.LME.FUTURES_3M += change * 0.9;
                    data.PRICING.LME.FUTURES_12M += change * 0.7;
                    data.PRICING.M_PLUS_1.LME_AVG += change;
                }
                if (priceEffects.comex) {
                    const change = data.PRICING.COMEX.SPOT_AVG * (priceEffects.comex / 100);
                    data.PRICING.COMEX.SPOT_AVG += change;
                    data.PRICING.COMEX.FUTURES_1M += change;
                    data.PRICING.COMEX.FUTURES_3M += change * 0.9;
                    data.PRICING.COMEX.FUTURES_12M += change * 0.7;
                    data.PRICING.M_PLUS_1.COMEX_AVG += change;
                }
            }

            // Supply track effects
            if (tracks.supply?.effects) {
                const supplyEffects = tracks.supply.effects;
                if (supplyEffects.tonnage) {
                    const multiplier = 1 + (supplyEffects.tonnage / 100);
                    data.MARKET_DEPTH.SUPPLY.PERUVIAN.TOTAL_MAX_AVAILABLE_MT =
                        Math.round(data.MARKET_DEPTH.SUPPLY.PERUVIAN.TOTAL_MAX_AVAILABLE_MT * multiplier);
                    data.MARKET_DEPTH.SUPPLY.CHILEAN.MAX_AVAILABLE_MT =
                        Math.round(data.MARKET_DEPTH.SUPPLY.CHILEAN.MAX_AVAILABLE_MT * multiplier);
                }
                if (supplyEffects.premium) {
                    data.MARKET_DEPTH.SUPPLY.PERUVIAN.SUPPLIER_PREMIUM_USD += supplyEffects.premium;
                    data.MARKET_DEPTH.SUPPLY.CHILEAN.SUPPLIER_PREMIUM_USD += supplyEffects.premium;
                }
            }

            // Demand track effects
            if (tracks.demand?.effects) {
                const demandEffects = tracks.demand.effects;
                if (demandEffects.tonnage) {
                    const multiplier = 1 + (demandEffects.tonnage / 100);
                    data.CLIENTS.OPPORTUNITIES.forEach(opp => {
                        opp.MIN_QUANTITY_MT = Math.round(opp.MIN_QUANTITY_MT * multiplier);
                        opp.MAX_QUANTITY_MT = Math.round(opp.MAX_QUANTITY_MT * multiplier);
                    });
                }
                if (demandEffects.premium) {
                    data.CLIENTS.OPPORTUNITIES.forEach(opp => {
                        opp.REGIONAL_PREMIUM_USD += demandEffects.premium;
                    });
                }
            }

            // Logistics track effects
            if (tracks.logistics?.effects) {
                const logEffects = tracks.logistics.effects;
                if (logEffects.fobRate) {
                    // Adjust all FOB rates
                    Object.values(data.LOGISTICS.FREIGHT_RATES).forEach(origin => {
                        Object.values(origin).forEach(dest => {
                            if (dest.FOB_RATE_USD_PER_TONNE) {
                                dest.FOB_RATE_USD_PER_TONNE += logEffects.fobRate;
                            }
                        });
                    });
                }
                if (logEffects.travelTime) {
                    // Adjust all travel times
                    Object.values(data.LOGISTICS.FREIGHT_RATES).forEach(origin => {
                        Object.values(origin).forEach(dest => {
                            if (dest.TRAVEL_TIME_DAYS) {
                                dest.TRAVEL_TIME_DAYS += logEffects.travelTime;
                            }
                        });
                    });
                }
            }

            // Financial track effects
            if (tracks.financial?.effects) {
                const finEffects = tracks.financial.effects;
                if (finEffects.interestRate) {
                    data.FIXED_RULES.COST_OF_CARRY.SOFR_1M_PERCENT += finEffects.interestRate;
                }
            }
        }
    },

    /**
     * Apply legacy price events (sentiment/severity based)
     */
    applyLegacyPriceEvent(monthData, event, startMonth, endMonth) {
        const severityMultipliers = {
            minor: 0.05,
            medium: 0.10,
            high: 0.15,
            significant: 0.25
        };

        const multiplier = severityMultipliers[event.severity] || 0.10;
        const direction = event.sentiment === 'bullish' ? 1 : event.sentiment === 'bearish' ? -1 : 0;

        for (let m = startMonth; m <= endMonth && m < 6; m++) {
            const data = monthData[m];
            if (!data) continue;

            const lmeChange = data.PRICING.LME.SPOT_AVG * multiplier * direction;
            const comexChange = data.PRICING.COMEX.SPOT_AVG * multiplier * direction;

            data.PRICING.LME.SPOT_AVG += lmeChange;
            data.PRICING.LME.FUTURES_1M += lmeChange;
            data.PRICING.LME.FUTURES_3M += lmeChange * 0.9;
            data.PRICING.LME.FUTURES_12M += lmeChange * 0.7;
            data.PRICING.M_PLUS_1.LME_AVG += lmeChange;

            data.PRICING.COMEX.SPOT_AVG += comexChange;
            data.PRICING.COMEX.FUTURES_1M += comexChange;
            data.PRICING.COMEX.FUTURES_3M += comexChange * 0.9;
            data.PRICING.COMEX.FUTURES_12M += comexChange * 0.7;
            data.PRICING.M_PLUS_1.COMEX_AVG += comexChange;
        }
    },

    /**
     * Get month data for game use
     * Main API for the game to access scenario data
     */
    getMonthData(monthIndex) {
        // If custom scenario loaded, use transformed data
        if (this.transformedMonthData.length > 0) {
            return this.transformedMonthData[monthIndex] || null;
        }

        // Otherwise, return default data from global variables
        const windowKeys = [
            'JANUARY_DATA',
            'FEBRUARY_DATA',
            'MARCH_DATA',
            'APRIL_DATA',
            'MAY_DATA',
            'JUNE_DATA'
        ];

        return window[windowKeys[monthIndex]] || null;
    },

    /**
     * Get all month data as an array
     */
    getAllMonthData() {
        if (this.transformedMonthData.length > 0) {
            return this.transformedMonthData;
        }

        // Return default data
        return [
            window.JANUARY_DATA,
            window.FEBRUARY_DATA,
            window.MARCH_DATA,
            window.APRIL_DATA,
            window.MAY_DATA,
            window.JUNE_DATA
        ].filter(Boolean);
    },

    /**
     * Get scenario settings (starting funds, LOC limit, etc.)
     */
    getSettings() {
        if (this.loadedScenario?.settings) {
            return this.loadedScenario.settings;
        }

        // Default settings
        return {
            startingFunds: 200000,
            locLimit: 200000,
            interestRate: 4.32,
            marginRequirement: 100000,
            timerMinutes: 10
        };
    },

    /**
     * Get scenario events (for news/timeline display)
     */
    getEvents() {
        return this.loadedScenario?.events || [];
    },

    /**
     * Get scenario metadata
     */
    getMetadata() {
        if (this.loadedScenario?.metadata) {
            return this.loadedScenario.metadata;
        }

        return {
            name: 'Default Training Scenario',
            description: 'Standard 6-month simulation with default market conditions.',
            difficulty: 'Medium'
        };
    },

    /**
     * Check if using custom scenario
     */
    isCustomScenario() {
        return this.loadedScenario !== null;
    },

    /**
     * Debug: Print current scenario state
     */
    debug() {
        console.log('═══════════════════════════════════════');
        console.log('SCENARIO LOADER DEBUG');
        console.log('═══════════════════════════════════════');
        console.log('Selected slot:', this.getSelectedSlot());
        console.log('Is custom:', this.isCustomScenario());
        console.log('Loaded scenario:', this.loadedScenario?.metadata?.name || 'None');
        console.log('Transformed months:', this.transformedMonthData.length);

        if (this.transformedMonthData.length > 0) {
            console.log('\nMonth 1 (January) sample:');
            console.log('  LME SPOT:', this.transformedMonthData[0]?.PRICING?.LME?.SPOT_AVG);
            console.log('  COMEX SPOT:', this.transformedMonthData[0]?.PRICING?.COMEX?.SPOT_AVG);
            console.log('  Peruvian Max:', this.transformedMonthData[0]?.MARKET_DEPTH?.SUPPLY?.PERUVIAN?.TOTAL_MAX_AVAILABLE_MT);
        }

        console.log('═══════════════════════════════════════');
    }
};

// Initialize
ScenarioLoader.init();

// Export
window.ScenarioLoader = ScenarioLoader;
