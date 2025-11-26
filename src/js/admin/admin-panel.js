/**
 * Admin Panel Module
 * Main controller for the admin panel interface
 */

const AdminPanel = {
    isAuthenticated: false,
    currentTab: 'pricing',
    currentSimulation: null,
    selectedSlot: 1,

    /**
     * Initialize admin panel
     */
    init() {
        // Check for admin access via URL
        this.checkURLAccess();

        // Set up keyboard shortcut
        this.setupKeyboardShortcut();

        // Set up event listeners
        this.setupEventListeners();

        console.log('[AdminPanel] Initialized');
    },

    /**
     * Check URL for admin access
     */
    checkURLAccess() {
        const url = new URL(window.location.href);
        if (url.pathname.includes('/admin') || url.searchParams.get('admin') === 'true') {
            this.showLoginScreen();
        }
    },

    /**
     * Set up Ctrl+Shift+A keyboard shortcut
     */
    setupKeyboardShortcut() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'A') {
                e.preventDefault();
                this.showLoginScreen();
            }
        });
    },

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Login button
        document.getElementById('adminLoginBtn')?.addEventListener('click', () => this.attemptLogin());

        // Login on Enter key
        document.getElementById('adminPassword')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.attemptLogin();
        });

        // Close button
        document.getElementById('adminClose')?.addEventListener('click', () => this.closeAdminPanel());

        // Tab buttons
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });

        // Save/Load controls
        document.getElementById('saveSlotSelect')?.addEventListener('change', (e) => {
            this.selectedSlot = parseInt(e.target.value);
        });
        document.getElementById('saveSimBtn')?.addEventListener('click', () => this.saveSimulation());
        document.getElementById('resetDefaultsBtn')?.addEventListener('click', () => this.resetToDefaults());
        document.getElementById('deleteSimBtn')?.addEventListener('click', () => this.deleteSimulation());

        // Password update
        document.getElementById('updatePasswordBtn')?.addEventListener('click', () => this.updatePassword());

        // Event modal
        document.getElementById('eventSaveBtn')?.addEventListener('click', () => AdminEvents.saveEvent());
        document.getElementById('eventDeleteBtn')?.addEventListener('click', () => {
            if (AdminEvents.editingEvent) {
                AdminEvents.deleteEvent(AdminEvents.editingEvent.id);
            }
        });
        document.getElementById('eventCancelBtn')?.addEventListener('click', () => AdminEvents.closeEventModal());
    },

    /**
     * Show login screen
     */
    showLoginScreen() {
        const loginScreen = document.getElementById('adminLogin');
        if (loginScreen) {
            loginScreen.style.display = 'flex';
            document.getElementById('adminPassword').focus();
        }
    },

    /**
     * Hide login screen
     */
    hideLoginScreen() {
        const loginScreen = document.getElementById('adminLogin');
        if (loginScreen) {
            loginScreen.style.display = 'none';
            document.getElementById('adminPassword').value = '';
            document.getElementById('adminError').style.display = 'none';
        }
    },

    /**
     * Attempt login
     */
    attemptLogin() {
        const password = document.getElementById('adminPassword').value;

        if (AdminStorage.verifyPassword(password)) {
            this.isAuthenticated = true;
            this.hideLoginScreen();
            this.openAdminPanel();
        } else {
            document.getElementById('adminError').style.display = 'block';
        }
    },

    /**
     * Open admin panel
     */
    openAdminPanel() {
        if (!this.isAuthenticated) {
            this.showLoginScreen();
            return;
        }

        // Load default or slot 1 simulation
        this.currentSimulation = AdminStorage.loadSimulation(0) || AdminStorage.getDefaultSimulation();

        // Show panel
        const panel = document.getElementById('adminPanel');
        if (panel) {
            panel.style.display = 'flex';
        }

        // Initialize sub-modules
        this.initializeModules();

        // Switch to pricing tab
        this.switchTab('pricing');
    },

    /**
     * Close admin panel
     */
    closeAdminPanel() {
        const panel = document.getElementById('adminPanel');
        if (panel) {
            panel.style.display = 'none';
        }
    },

    /**
     * Initialize sub-modules with current simulation data
     */
    initializeModules() {
        // Initialize pricing graph
        AdminPricing.init(this.currentSimulation);

        // Initialize events
        AdminEvents.init(this.currentSimulation);

        // Populate supply/demand forms
        this.populateSupplyForms();
        this.populateDemandForms();
        this.populateSettingsForms();
    },

    /**
     * Switch between tabs
     */
    switchTab(tabId) {
        this.currentTab = tabId;

        // Update tab buttons
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabId);
        });

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `tab-${tabId}`);
        });

        // Special handling for preview tab
        if (tabId === 'preview') {
            this.renderPreview();
        }
    },

    /**
     * Populate supply configuration forms
     */
    populateSupplyForms() {
        const container = document.getElementById('supplyConfig');
        if (!container) return;

        const months = ['January', 'February', 'March', 'April', 'May', 'June'];
        let html = '';

        months.forEach((monthName, idx) => {
            const month = idx + 1;
            const supply = this.currentSimulation?.supply?.[month] || AdminStorage.DEFAULT_SIMULATION.supply[month];

            html += `
                <div class="month-config" data-month="${month}">
                    <h4>${monthName}</h4>
                    <div class="config-row">
                        <label>Supplier:</label>
                        <select class="supply-supplier" data-month="${month}">
                            <option value="CALLAO" ${supply.supplier === 'CALLAO' ? 'selected' : ''}>CALLAO (Peru)</option>
                            <option value="ANTOFAGASTA" ${supply.supplier === 'ANTOFAGASTA' ? 'selected' : ''}>ANTOFAGASTA (Chile)</option>
                        </select>
                        <span class="tooltip-icon" data-tooltip="Select which supplier is available this month">?</span>
                    </div>
                    <div class="config-row">
                        <label>Min Tonnage:</label>
                        <input type="number" class="supply-min" data-month="${month}" value="${supply.minMT}" min="1">
                        <span class="unit">MT</span>
                        <span class="tooltip-icon" data-tooltip="Minimum copper available for purchase">?</span>
                    </div>
                    <div class="config-row">
                        <label>Max Tonnage:</label>
                        <input type="number" class="supply-max" data-month="${month}" value="${supply.maxMT}" min="1">
                        <span class="unit">MT</span>
                        <span class="tooltip-icon" data-tooltip="Maximum copper available for purchase">?</span>
                    </div>
                    <div class="config-row">
                        <label>Premium:</label>
                        <input type="number" class="supply-premium" data-month="${month}" value="${supply.premium}" min="0">
                        <span class="unit">$/MT</span>
                        <span class="tooltip-icon" data-tooltip="Additional cost per MT above spot price">?</span>
                    </div>
                    <div class="config-row">
                        <label>Exchange:</label>
                        <select class="supply-exchange" data-month="${month}">
                            <option value="LME" ${supply.exchange === 'LME' ? 'selected' : ''}>LME</option>
                            <option value="COMEX" ${supply.exchange === 'COMEX' ? 'selected' : ''}>COMEX</option>
                        </select>
                        <span class="tooltip-icon" data-tooltip="Which exchange prices this supplier uses">?</span>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    },

    /**
     * Populate demand configuration forms
     */
    populateDemandForms() {
        const container = document.getElementById('demandConfig');
        if (!container) return;

        const months = ['January', 'February', 'March', 'April', 'May', 'June'];
        let html = '';

        months.forEach((monthName, idx) => {
            const month = idx + 1;
            const demand = this.currentSimulation?.demand?.[month] || AdminStorage.DEFAULT_SIMULATION.demand[month];
            const buyerPreset = AdminStorage.BUYERS[demand.buyer] || AdminStorage.BUYERS.AMERICAS;

            html += `
                <div class="month-config" data-month="${month}">
                    <h4>${monthName}</h4>
                    <div class="config-row">
                        <label>Buyer:</label>
                        <select class="demand-buyer" data-month="${month}" onchange="AdminPanel.onBuyerChange(${month})">
                            <option value="AMERICAS" ${demand.buyer === 'AMERICAS' ? 'selected' : ''}>AMERICAS</option>
                            <option value="ASIA" ${demand.buyer === 'ASIA' ? 'selected' : ''}>ASIA</option>
                            <option value="EUROPE" ${demand.buyer === 'EUROPE' ? 'selected' : ''}>EUROPE</option>
                        </select>
                        <span class="tooltip-icon" data-tooltip="Select which buyer is available this month">?</span>
                    </div>
                    <div class="config-row">
                        <label>Min Tonnage:</label>
                        <input type="number" class="demand-min" data-month="${month}" value="${demand.minMT}" min="1">
                        <span class="unit">MT</span>
                    </div>
                    <div class="config-row">
                        <label>Max Tonnage:</label>
                        <input type="number" class="demand-max" data-month="${month}" value="${demand.maxMT}" min="1">
                        <span class="unit">MT</span>
                    </div>
                    <div class="config-row">
                        <label>Premium:</label>
                        <input type="number" class="demand-premium" data-month="${month}" value="${demand.premium}" min="0">
                        <span class="unit">$/MT</span>
                    </div>
                    <div class="config-row">
                        <label>Exchange:</label>
                        <input type="text" class="demand-exchange" data-month="${month}" value="${buyerPreset.exchange}" readonly>
                    </div>
                    <div class="config-row">
                        <label>Port:</label>
                        <input type="text" class="demand-port" data-month="${month}" value="${buyerPreset.port}" readonly>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    },

    /**
     * Handle buyer selection change
     */
    onBuyerChange(month) {
        const buyerSelect = document.querySelector(`.demand-buyer[data-month="${month}"]`);
        const buyer = buyerSelect?.value;
        const preset = AdminStorage.BUYERS[buyer];

        if (preset) {
            document.querySelector(`.demand-exchange[data-month="${month}"]`).value = preset.exchange;
            document.querySelector(`.demand-port[data-month="${month}"]`).value = preset.port;
            document.querySelector(`.demand-premium[data-month="${month}"]`).value = preset.defaultPremium;
        }
    },

    /**
     * Populate settings forms
     */
    populateSettingsForms() {
        const settings = this.currentSimulation?.settings || AdminStorage.DEFAULT_SIMULATION.settings;
        const metadata = this.currentSimulation?.metadata || AdminStorage.DEFAULT_SIMULATION.metadata;

        // Metadata
        const nameInput = document.getElementById('simName');
        const descInput = document.getElementById('simDescription');
        const difficultyInput = document.getElementById('simDifficulty');

        if (nameInput) nameInput.value = metadata.name || '';
        if (descInput) descInput.value = metadata.description || '';
        if (difficultyInput) difficultyInput.value = metadata.difficulty || 'Medium';

        // Financial settings
        const fundsInput = document.getElementById('startingFunds');
        const locInput = document.getElementById('locLimit');
        const interestInput = document.getElementById('interestRate');
        const marginInput = document.getElementById('marginRequirement');
        const timerInput = document.getElementById('timerMinutes');

        if (fundsInput) fundsInput.value = settings.startingFunds;
        if (locInput) locInput.value = settings.locLimit;
        if (interestInput) interestInput.value = settings.interestRate;
        if (marginInput) marginInput.value = settings.marginRequirement;
        if (timerInput) timerInput.value = settings.timerMinutes;
    },

    /**
     * Collect all form data into simulation object
     */
    collectFormData() {
        const simData = {
            version: '1.0',
            metadata: {
                name: document.getElementById('simName')?.value || 'Unnamed Simulation',
                description: document.getElementById('simDescription')?.value || '',
                difficulty: document.getElementById('simDifficulty')?.value || 'Medium',
                createdAt: this.currentSimulation?.metadata?.createdAt || null,
                modifiedAt: new Date().toISOString()
            },
            pricing: AdminPricing.getPricesData(),
            supply: {},
            demand: {},
            events: AdminEvents.getEventsData(),
            settings: {
                startingFunds: parseFloat(document.getElementById('startingFunds')?.value) || 200000,
                locLimit: parseFloat(document.getElementById('locLimit')?.value) || 200000,
                interestRate: parseFloat(document.getElementById('interestRate')?.value) || 4.32,
                marginRequirement: parseFloat(document.getElementById('marginRequirement')?.value) || 100000,
                timerMinutes: parseInt(document.getElementById('timerMinutes')?.value) || 10
            }
        };

        // Collect supply data
        for (let month = 1; month <= 6; month++) {
            simData.supply[month] = {
                supplier: document.querySelector(`.supply-supplier[data-month="${month}"]`)?.value || 'CALLAO',
                minMT: parseInt(document.querySelector(`.supply-min[data-month="${month}"]`)?.value) || 5,
                maxMT: parseInt(document.querySelector(`.supply-max[data-month="${month}"]`)?.value) || 25,
                premium: parseFloat(document.querySelector(`.supply-premium[data-month="${month}"]`)?.value) || 0,
                exchange: document.querySelector(`.supply-exchange[data-month="${month}"]`)?.value || 'LME'
            };
        }

        // Collect demand data
        for (let month = 1; month <= 6; month++) {
            const buyer = document.querySelector(`.demand-buyer[data-month="${month}"]`)?.value || 'AMERICAS';
            const preset = AdminStorage.BUYERS[buyer];

            simData.demand[month] = {
                buyer: buyer,
                minMT: parseInt(document.querySelector(`.demand-min[data-month="${month}"]`)?.value) || 15,
                maxMT: parseInt(document.querySelector(`.demand-max[data-month="${month}"]`)?.value) || 90,
                premium: parseFloat(document.querySelector(`.demand-premium[data-month="${month}"]`)?.value) || preset?.defaultPremium || 50,
                exchange: preset?.exchange || 'COMEX',
                port: preset?.port || 'New Orleans, LA'
            };
        }

        return simData;
    },

    /**
     * Save simulation to selected slot
     */
    saveSimulation() {
        const simData = this.collectFormData();
        const result = AdminStorage.saveSimulation(this.selectedSlot, simData);

        if (result.success) {
            let message = `Saved to Slot ${this.selectedSlot}!`;
            if (result.warnings && result.warnings.length > 0) {
                message += `\n\nWarnings:\n${result.warnings.join('\n')}`;
            }
            alert(message);
        } else {
            let message = 'Failed to save simulation.';
            if (result.errors && result.errors.length > 0) {
                message += `\n\nErrors:\n${result.errors.join('\n')}`;
            } else if (result.error) {
                message += `\n\n${result.error}`;
            }
            alert(message);
        }
    },

    /**
     * Reset to default values
     */
    resetToDefaults() {
        if (!confirm('Reset all values to defaults? This cannot be undone.')) return;

        this.currentSimulation = AdminStorage.getDefaultSimulation();
        this.initializeModules();
        alert('Reset to defaults complete.');
    },

    /**
     * Delete simulation from selected slot
     */
    deleteSimulation() {
        if (this.selectedSlot === 0) {
            alert('Cannot delete the default simulation.');
            return;
        }

        if (!confirm(`Delete simulation in Slot ${this.selectedSlot}?`)) return;

        const result = AdminStorage.deleteSimulation(this.selectedSlot);
        if (result.success) {
            alert(`Simulation in Slot ${this.selectedSlot} deleted.`);
        } else {
            alert(result.error || 'Failed to delete simulation.');
        }
    },

    /**
     * Update admin password
     */
    updatePassword() {
        const currentPass = document.getElementById('currentPassword')?.value;
        const newPass = document.getElementById('newPassword')?.value;
        const confirmPass = document.getElementById('confirmPassword')?.value;

        if (!currentPass || !newPass || !confirmPass) {
            alert('Please fill in all password fields.');
            return;
        }

        if (newPass !== confirmPass) {
            alert('New password and confirmation do not match.');
            return;
        }

        const result = AdminStorage.updatePassword(currentPass, newPass);
        if (result.success) {
            alert('Password updated successfully!');
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
        } else {
            alert(result.error || 'Failed to update password.');
        }
    },

    /**
     * Render preview tab
     */
    renderPreview() {
        const simData = this.collectFormData();
        const validation = AdminStorage.validateSimulation(simData);

        // Render mini price graph
        AdminPricing.renderMiniPreview('previewPriceGraph');

        // Simulation info
        document.getElementById('previewName').textContent = simData.metadata.name;
        document.getElementById('previewDescription').textContent = simData.metadata.description || 'No description';
        document.getElementById('previewDifficulty').textContent = simData.metadata.difficulty;

        // Pricing summary
        const lmePrices = Object.values(simData.pricing.lme).map(p => p.average);
        const comexPrices = Object.values(simData.pricing.comex).map(p => p.average);
        document.getElementById('previewLmeRange').textContent =
            `$${Math.min(...lmePrices).toLocaleString()} - $${Math.max(...lmePrices).toLocaleString()}`;
        document.getElementById('previewComexRange').textContent =
            `$${Math.min(...comexPrices).toLocaleString()} - $${Math.max(...comexPrices).toLocaleString()}`;

        // Supply summary
        const supplyList = document.getElementById('previewSupplyList');
        let supplyHtml = '';
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        for (let month = 1; month <= 6; month++) {
            const s = simData.supply[month];
            supplyHtml += `<li>${months[month-1]}: ${s.supplier} (${s.minMT}-${s.maxMT} MT, +$${s.premium}/MT)</li>`;
        }
        supplyList.innerHTML = supplyHtml;

        // Demand summary
        const demandList = document.getElementById('previewDemandList');
        let demandHtml = '';
        for (let month = 1; month <= 6; month++) {
            const d = simData.demand[month];
            demandHtml += `<li>${months[month-1]}: ${d.buyer} - ${d.port} (${d.minMT}-${d.maxMT} MT, +$${d.premium}/MT, ${d.exchange})</li>`;
        }
        demandList.innerHTML = demandHtml;

        // Events summary
        const eventsList = document.getElementById('previewEventsList');
        if (simData.events.length === 0) {
            eventsList.innerHTML = '<li>No events configured</li>';
        } else {
            let eventsHtml = '';
            simData.events.forEach(e => {
                const start = AdminStorage.PERIODS[e.startPeriod - 1]?.name || e.startPeriod;
                const end = AdminStorage.PERIODS[e.endPeriod - 1]?.name || e.endPeriod;
                const arrow = e.sentiment === 'bullish' ? '↑' : e.sentiment === 'bearish' ? '↓' : '→';
                eventsHtml += `<li>"${e.name}" (${start} to ${end}) - ${e.sentiment}, ${e.severity} ${arrow}</li>`;
            });
            eventsList.innerHTML = eventsHtml;
        }

        // Financial summary
        document.getElementById('previewFunds').textContent = `$${simData.settings.startingFunds.toLocaleString()}`;
        document.getElementById('previewLoc').textContent = `$${simData.settings.locLimit.toLocaleString()}`;
        document.getElementById('previewInterest').textContent =
            `${simData.settings.interestRate}% / ${(simData.settings.interestRate / 12).toFixed(2)}% monthly`;

        // Validation results
        const validationContainer = document.getElementById('validationResults');
        let validationHtml = '';

        if (validation.errors.length === 0 && validation.warnings.length === 0) {
            validationContainer.className = 'validation-results success';
            validationHtml = '<div class="validation-item success">All required fields complete</div>';
        } else {
            validationContainer.className = validation.errors.length > 0 ? 'validation-results error' : 'validation-results warning';

            validation.errors.forEach(err => {
                validationHtml += `<div class="validation-item error">Error: ${err}</div>`;
            });
            validation.warnings.forEach(warn => {
                validationHtml += `<div class="validation-item warning">Warning: ${warn}</div>`;
            });
        }
        validationContainer.innerHTML = validationHtml;
    },

    /**
     * Load a simulation into the admin panel
     */
    loadSimulationIntoPanel(slotNumber) {
        const sim = AdminStorage.loadSimulation(slotNumber);
        if (!sim) {
            alert(`No simulation found in Slot ${slotNumber}`);
            return;
        }

        this.currentSimulation = sim;
        this.initializeModules();
        this.selectedSlot = slotNumber === 0 ? 1 : slotNumber;
        document.getElementById('saveSlotSelect').value = this.selectedSlot;

        alert(`Loaded simulation from Slot ${slotNumber}`);
    }
};

/**
 * Scenario Selection Module
 * Handles the scenario selection screen before game start
 */
const ScenarioSelection = {
    selectedSlot: 0,

    /**
     * Show scenario selection screen
     */
    show() {
        this.renderScenarioList();
        document.getElementById('scenarioSelection').style.display = 'flex';
    },

    /**
     * Hide scenario selection screen
     */
    hide() {
        document.getElementById('scenarioSelection').style.display = 'none';
    },

    /**
     * Render list of available scenarios
     */
    renderScenarioList() {
        const container = document.getElementById('scenarioList');
        if (!container) return;

        const simulations = AdminStorage.getAllSimulations();
        let html = '';

        simulations.forEach(sim => {
            const isSelected = sim.slot === this.selectedSlot;
            const isEmpty = sim.isEmpty;

            if (isEmpty) {
                html += `
                    <div class="scenario-option ${isSelected ? 'selected' : ''}" onclick="ScenarioSelection.selectSlot(${sim.slot})">
                        <input type="radio" name="scenario" class="scenario-radio" ${isSelected ? 'checked' : ''}>
                        <div class="scenario-info">
                            <div class="scenario-name scenario-empty">[Empty Slot] (Slot ${sim.slot})</div>
                        </div>
                    </div>
                `;
            } else {
                const meta = sim.data.metadata;
                const isDefault = sim.slot === 0;
                html += `
                    <div class="scenario-option ${isSelected ? 'selected' : ''}" onclick="ScenarioSelection.selectSlot(${sim.slot})">
                        <input type="radio" name="scenario" class="scenario-radio" ${isSelected ? 'checked' : ''}>
                        <div class="scenario-info">
                            <div class="scenario-name">${meta.name} (Slot ${sim.slot})</div>
                            <div class="scenario-desc">${meta.description || 'No description'}</div>
                            <div class="scenario-meta">Difficulty: ${meta.difficulty}</div>
                        </div>
                        ${!isDefault ? `
                            <div class="scenario-actions">
                                <button onclick="event.stopPropagation(); ScenarioSelection.editSlot(${sim.slot})">Edit</button>
                                <button onclick="event.stopPropagation(); ScenarioSelection.deleteSlot(${sim.slot})">Delete</button>
                            </div>
                        ` : ''}
                    </div>
                `;
            }
        });

        container.innerHTML = html;
    },

    /**
     * Select a scenario slot
     */
    selectSlot(slot) {
        this.selectedSlot = slot;
        this.renderScenarioList();
    },

    /**
     * Edit a scenario (open admin panel)
     */
    editSlot(slot) {
        this.hide();
        AdminPanel.loadSimulationIntoPanel(slot);
        AdminPanel.openAdminPanel();
    },

    /**
     * Delete a scenario
     */
    deleteSlot(slot) {
        if (slot === 0) {
            alert('Cannot delete the default scenario.');
            return;
        }

        if (!confirm(`Delete scenario in Slot ${slot}?`)) return;

        AdminStorage.deleteSimulation(slot);
        if (this.selectedSlot === slot) {
            this.selectedSlot = 0;
        }
        this.renderScenarioList();
    },

    /**
     * Start game with selected scenario
     */
    startGame() {
        const sim = AdminStorage.loadSimulation(this.selectedSlot);

        if (!sim) {
            alert('Selected scenario is empty. Please select a valid scenario or create one in the Admin Panel.');
            return;
        }

        // Apply simulation to game state
        this.applySimulationToGame(sim);

        // Hide selection screen
        this.hide();

        // Initialize game
        if (typeof GAME_STATE !== 'undefined' && GAME_STATE.init) {
            GAME_STATE.init();
        }

        console.log('[ScenarioSelection] Game started with slot:', this.selectedSlot);
    },

    /**
     * Apply simulation data to game state
     */
    applySimulationToGame(sim) {
        if (typeof GAME_STATE === 'undefined') return;

        // Apply financial settings
        if (sim.settings) {
            GAME_STATE.practiceFunds = sim.settings.startingFunds || 200000;
            GAME_STATE.locLimit = sim.settings.locLimit || 200000;
            GAME_STATE.locUsed = 0;

            // Note: Interest rate and other settings would need integration
            // into the existing game logic
        }

        // Store simulation data for other modules to access
        GAME_STATE.currentSimulation = sim;

        console.log('[ScenarioSelection] Applied simulation settings to GAME_STATE');
    },

    /**
     * Initialize scenario selection
     */
    init() {
        // Start game button
        document.getElementById('startGameBtn')?.addEventListener('click', () => this.startGame());

        // Open admin panel button
        document.getElementById('openAdminBtn')?.addEventListener('click', () => {
            this.hide();
            AdminPanel.showLoginScreen();
        });

        console.log('[ScenarioSelection] Initialized');
    }
};

// Initialize when DOM is ready
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        AdminPanel.init();
        ScenarioSelection.init();

        // Optionally show scenario selection on load
        // Uncomment to enable: ScenarioSelection.show();
    });
}
