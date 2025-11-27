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

        // Check if there's a last-loaded slot to restore
        const lastSlot = localStorage.getItem('admin_last_loaded_slot');
        const slotToLoad = lastSlot ? parseInt(lastSlot, 10) : 0;

        console.log('[AdminPanel] Opening panel, loading slot:', slotToLoad);

        // Load the last-used slot or default
        this.currentSimulation = AdminStorage.loadSimulation(slotToLoad) || AdminStorage.getDefaultSimulation();
        this.selectedSlot = slotToLoad === 0 ? 1 : slotToLoad;

        // Show panel
        const panel = document.getElementById('adminPanel');
        if (panel) {
            panel.style.display = 'flex';
        }

        // Initialize sub-modules
        this.initializeModules();

        // Update slot selector
        const slotSelect = document.getElementById('saveSlotSelect');
        if (slotSelect) {
            slotSelect.value = this.selectedSlot;
        }

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
        console.log('[AdminPanel] ═══════════════════════════════════════');
        console.log('[AdminPanel] initializeModules() called');
        console.log('[AdminPanel] currentSimulation:', this.currentSimulation);
        console.log('[AdminPanel] currentSimulation.pricing:', this.currentSimulation?.pricing);
        console.log('[AdminPanel] currentSimulation.supply:', this.currentSimulation?.supply);
        console.log('[AdminPanel] currentSimulation.demand:', this.currentSimulation?.demand);

        // Initialize pricing graph
        console.log('[AdminPanel] Calling AdminPricing.init()...');
        AdminPricing.init(this.currentSimulation);

        // Initialize timeline editor system
        if (window.TimelineEditor) {
            console.log('[AdminPanel] Calling TimelineEditor.init()...');
            TimelineEditor.init();
            // Load events from current simulation
            if (this.currentSimulation?.events) {
                console.log('[AdminPanel] Loading', this.currentSimulation.events.length, 'events');
                TimelineEditor.loadEvents(this.currentSimulation.events);
            }
        }

        // Populate supply/demand forms
        console.log('[AdminPanel] Calling populateSupplyForms()...');
        this.populateSupplyForms();
        console.log('[AdminPanel] Calling populateDemandForms()...');
        this.populateDemandForms();
        console.log('[AdminPanel] Calling populateSettingsForms()...');
        this.populateSettingsForms();
        console.log('[AdminPanel] ═══════════════════════════════════════');
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
        if (!container) {
            console.error('[AdminPanel] supplyConfig container NOT FOUND');
            return;
        }

        console.log('[AdminPanel] populateSupplyForms - container found');

        const months = ['January', 'February', 'March', 'April', 'May', 'June'];
        let html = '';

        months.forEach((monthName, idx) => {
            const month = idx + 1;
            const supply = this.currentSimulation?.supply?.[month] || AdminStorage.DEFAULT_SIMULATION.supply[month];
            console.log(`[AdminPanel] Supply month ${month}:`, supply);

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
        console.log('[AdminPanel] populateSupplyForms - HTML inserted, verifying...');

        // Verify the values were set correctly
        const firstSupplier = document.querySelector('.supply-supplier[data-month="1"]');
        const firstMax = document.querySelector('.supply-max[data-month="1"]');
        console.log('[AdminPanel] Month 1 supplier select value:', firstSupplier?.value);
        console.log('[AdminPanel] Month 1 max tonnage value:', firstMax?.value);
    },

    /**
     * Populate demand configuration forms
     */
    populateDemandForms() {
        const container = document.getElementById('demandConfig');
        if (!container) {
            console.error('[AdminPanel] demandConfig container NOT FOUND');
            return;
        }

        console.log('[AdminPanel] populateDemandForms - container found');

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
        console.log('[AdminPanel] populateDemandForms - HTML inserted, verifying...');

        // Verify the values were set correctly
        const firstBuyer = document.querySelector('.demand-buyer[data-month="1"]');
        const firstMax = document.querySelector('.demand-max[data-month="1"]');
        console.log('[AdminPanel] Month 1 buyer select value:', firstBuyer?.value);
        console.log('[AdminPanel] Month 1 max tonnage value:', firstMax?.value);
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
        console.log('[AdminPanel] populateSettingsForms called');
        const settings = this.currentSimulation?.settings || AdminStorage.DEFAULT_SIMULATION.settings;
        const metadata = this.currentSimulation?.metadata || AdminStorage.DEFAULT_SIMULATION.metadata;

        console.log('[AdminPanel] Settings to apply:', settings);
        console.log('[AdminPanel] Metadata to apply:', metadata);

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

        // Verify values were set
        console.log('[AdminPanel] Settings applied:');
        console.log('[AdminPanel]   simName:', nameInput?.value, '(element exists:', !!nameInput, ')');
        console.log('[AdminPanel]   startingFunds:', fundsInput?.value, '(element exists:', !!fundsInput, ')');
        console.log('[AdminPanel]   locLimit:', locInput?.value, '(element exists:', !!locInput, ')');
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
            events: window.TimelineEditor ? TimelineEditor.getEventsForSave() : [],
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
            // Remember this slot for auto-load on page refresh
            localStorage.setItem('admin_last_loaded_slot', this.selectedSlot.toString());
            console.log('[AdminPanel] Saved to slot', this.selectedSlot, '- will auto-load on refresh');

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
        if (!simData.events || simData.events.length === 0) {
            eventsList.innerHTML = '<li>No events configured</li>';
        } else {
            let eventsHtml = '';
            simData.events.forEach(e => {
                const startMonth = Math.ceil(e.startPeriod / 2);
                const endMonth = Math.ceil(e.endPeriod / 2);
                const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
                const startName = months[startMonth] || `M${startMonth}`;
                const endName = months[endMonth] || `M${endMonth}`;
                const period = startMonth === endMonth ? startName : `${startName}-${endName}`;
                const trackCount = e.tracks ? Object.keys(e.tracks).length : 0;
                const trackIcons = e.tracks ? Object.keys(e.tracks).map(t => {
                    const icons = { price: '💵', supply: '📦', demand: '🏭', logistics: '🚢', financial: '🏦', news: '📰' };
                    return icons[t] || '📌';
                }).join('') : '';
                eventsHtml += `<li>${trackIcons} "${e.name}" (${period}) - ${trackCount} track${trackCount !== 1 ? 's' : ''}</li>`;
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
        console.log('[AdminPanel] Loading simulation from slot:', slotNumber);

        const sim = AdminStorage.loadSimulation(slotNumber);
        if (!sim) {
            alert(`No simulation found in Slot ${slotNumber}`);
            return;
        }

        console.log('[AdminPanel] Loaded data:', sim);
        console.log('[AdminPanel] Metadata:', sim.metadata);
        console.log('[AdminPanel] Pricing LME month 1:', sim.pricing?.lme?.[1]);
        console.log('[AdminPanel] Supply month 1:', sim.supply?.[1]);
        console.log('[AdminPanel] Demand month 1:', sim.demand?.[1]);
        console.log('[AdminPanel] Settings:', sim.settings);
        console.log('[AdminPanel] Events count:', sim.events?.length || 0);

        this.currentSimulation = sim;

        // Remember this slot for auto-load on page refresh
        localStorage.setItem('admin_last_loaded_slot', slotNumber.toString());
        console.log('[AdminPanel] Remembering slot', slotNumber, 'for auto-load on refresh');

        // Re-initialize all modules with new data
        console.log('[AdminPanel] Calling initializeModules()...');
        this.initializeModules();

        this.selectedSlot = slotNumber === 0 ? 1 : slotNumber;
        document.getElementById('saveSlotSelect').value = this.selectedSlot;

        // Verify forms were populated
        console.log('[AdminPanel] Verifying form population...');
        console.log('[AdminPanel] simName value:', document.getElementById('simName')?.value);
        console.log('[AdminPanel] startingFunds value:', document.getElementById('startingFunds')?.value);
        console.log('[AdminPanel] Supply selector month 1:', document.querySelector('.supply-supplier[data-month="1"]')?.value);
        console.log('[AdminPanel] Demand selector month 1:', document.querySelector('.demand-buyer[data-month="1"]')?.value);

        alert(`Loaded "${sim.metadata?.name || 'Unnamed'}" from Slot ${slotNumber}`);
    }
};

/**
 * Scenario Selection Module
 * Handles the scenario selection screen before game start
 */
const ScenarioSelection = {
    selectedSlot: 0,
    hasStartedGame: false,

    /**
     * Show scenario selection screen
     */
    show() {
        console.log('[ScenarioSelection] Showing scenario selection screen');
        this.renderScenarioList();
        const element = document.getElementById('scenarioSelection');
        if (element) {
            element.style.display = 'flex';
        } else {
            console.error('[ScenarioSelection] scenarioSelection element not found');
        }
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
        console.log('[ScenarioSelection] selectSlot called with:', slot, 'type:', typeof slot);
        this.selectedSlot = slot;
        console.log('[ScenarioSelection] selectedSlot is now:', this.selectedSlot);
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
     * Reloads index.html with the correct URL parameter so ScenarioLoader picks it up
     * Uses autostart=true to skip showing the scenario selection screen again
     */
    startGame() {
        console.log('[ScenarioSelection] startGame called, selectedSlot:', this.selectedSlot, 'type:', typeof this.selectedSlot);

        const sim = AdminStorage.loadSimulation(this.selectedSlot);
        console.log('[ScenarioSelection] Loaded sim for slot', this.selectedSlot, ':', sim ? 'found' : 'null');

        if (!sim && this.selectedSlot !== 0) {
            alert('Selected scenario is empty. Please select a valid scenario or create one in the Admin Panel.');
            return;
        }

        // Navigate to index.html with URL parameter
        // autostart=true skips the scenario selection screen
        // This ensures ScenarioLoader will correctly load the selected slot
        const scenarioParam = this.selectedSlot === 0 ? 'default' : `slot_${this.selectedSlot}`;
        const url = `index.html?scenario=${scenarioParam}&newgame=true&autostart=true`;
        console.log('[ScenarioSelection] Navigating to:', url);
        window.location.href = url;
    },

    /**
     * Apply simulation data to game state
     */
    applySimulationToGame(sim) {
        console.log('[ScenarioSelection] Applying simulation to game:', sim?.metadata?.name);

        if (typeof GAME_STATE === 'undefined') {
            console.warn('[ScenarioSelection] GAME_STATE not defined');
            return;
        }

        // Apply financial settings
        if (sim.settings) {
            GAME_STATE.practiceFunds = sim.settings.startingFunds || 200000;
            GAME_STATE.locLimit = sim.settings.locLimit || 200000;
            GAME_STATE.locUsed = 0;
            console.log('[ScenarioSelection] Applied financial settings - Funds:', GAME_STATE.practiceFunds, 'LOC:', GAME_STATE.locLimit);
        }

        // Apply pricing to month data
        if (sim.pricing) {
            this.applyPricingToMonths(sim.pricing, sim.events);
        }

        // Apply supply to month data
        if (sim.supply) {
            this.applySupplyToMonths(sim.supply);
        }

        // Apply demand to month data
        if (sim.demand) {
            this.applyDemandToMonths(sim.demand);
        }

        // Store events for event triggers during game
        if (sim.events) {
            this.applyEventsToMonths(sim.events);
        }

        // Store simulation data for other modules to access
        GAME_STATE.currentSimulation = sim;

        console.log('[ScenarioSelection] Applied simulation settings to GAME_STATE');
    },

    /**
     * Apply pricing to month data files
     */
    applyPricingToMonths(pricing, events) {
        // Calculate effective prices (baseline + event impacts)
        const effectivePricing = AdminStorage.calculateEffectivePrices(pricing, events);

        // Map month numbers to data objects
        const months = [
            { num: 1, data: window.JANUARY_DATA },
            { num: 2, data: window.FEBRUARY_DATA },
            { num: 3, data: window.MARCH_DATA },
            { num: 4, data: window.APRIL_DATA },
            { num: 5, data: window.MAY_DATA },
            { num: 6, data: window.JUNE_DATA }
        ];

        months.forEach(month => {
            if (!month.data || !month.data.PRICING) {
                console.warn(`[ScenarioSelection] Month ${month.num} data not found`);
                return;
            }

            const effLme = effectivePricing.lme[month.num];
            const effComex = effectivePricing.comex[month.num];

            if (effLme) {
                // Only SPOT_AVG exists in the actual data structure
                month.data.PRICING.LME.SPOT_AVG = Math.round(effLme.average);
                // Update futures based on same percentage change
                const lmeRatio = effLme.average / (pricing.lme[month.num]?.average || effLme.average);
                if (month.data.PRICING.LME.FUTURES_1M) {
                    month.data.PRICING.LME.FUTURES_1M = Math.round(month.data.PRICING.LME.FUTURES_1M * lmeRatio);
                }
                if (month.data.PRICING.LME.FUTURES_3M) {
                    month.data.PRICING.LME.FUTURES_3M = Math.round(month.data.PRICING.LME.FUTURES_3M * lmeRatio);
                }
            }

            if (effComex) {
                month.data.PRICING.COMEX.SPOT_AVG = Math.round(effComex.average);
                const comexRatio = effComex.average / (pricing.comex[month.num]?.average || effComex.average);
                if (month.data.PRICING.COMEX.FUTURES_1M) {
                    month.data.PRICING.COMEX.FUTURES_1M = Math.round(month.data.PRICING.COMEX.FUTURES_1M * comexRatio);
                }
                if (month.data.PRICING.COMEX.FUTURES_3M) {
                    month.data.PRICING.COMEX.FUTURES_3M = Math.round(month.data.PRICING.COMEX.FUTURES_3M * comexRatio);
                }
            }

            // Update M+1 pricing if it exists
            if (month.data.PRICING.M_PLUS_1 && effLme && effComex) {
                month.data.PRICING.M_PLUS_1.LME_AVG = Math.round(effLme.average * 1.02);
                month.data.PRICING.M_PLUS_1.COMEX_AVG = Math.round(effComex.average * 1.02);
            }

            console.log(`[ScenarioSelection] Month ${month.num} pricing - LME: $${effLme?.average}, COMEX: $${effComex?.average}`);
        });
    },

    /**
     * Apply supply configuration to month data files
     * Writes to MARKET_DEPTH.SUPPLY.PERUVIAN and MARKET_DEPTH.SUPPLY.CHILEAN
     */
    applySupplyToMonths(supply) {
        const months = [
            { num: 1, data: window.JANUARY_DATA },
            { num: 2, data: window.FEBRUARY_DATA },
            { num: 3, data: window.MARCH_DATA },
            { num: 4, data: window.APRIL_DATA },
            { num: 5, data: window.MAY_DATA },
            { num: 6, data: window.JUNE_DATA }
        ];

        months.forEach(month => {
            if (!month.data || !month.data.MARKET_DEPTH || !month.data.MARKET_DEPTH.SUPPLY) {
                console.warn(`[ScenarioSelection] Month ${month.num} MARKET_DEPTH.SUPPLY not found`);
                return;
            }

            const sup = supply[month.num];
            if (!sup) return;

            const supplyData = month.data.MARKET_DEPTH.SUPPLY;

            // Map admin supplier names to data structure keys
            if (sup.supplier === 'CALLAO') {
                // Enable Peruvian (Callao), disable Chilean
                if (supplyData.PERUVIAN) {
                    supplyData.PERUVIAN.IS_PRIMARY = true;
                    supplyData.PERUVIAN.LTA_FIXED_MT = Math.min(sup.minMT, 5);
                    supplyData.PERUVIAN.MAX_OPTIONAL_SPOT_MT = sup.maxMT - supplyData.PERUVIAN.LTA_FIXED_MT;
                    supplyData.PERUVIAN.TOTAL_MAX_AVAILABLE_MT = sup.maxMT;
                    supplyData.PERUVIAN.SUPPLIER_PREMIUM_USD = sup.premium;
                }
                if (supplyData.CHILEAN) {
                    supplyData.CHILEAN.IS_PRIMARY = false;
                    supplyData.CHILEAN.MIN_AVAILABLE_MT = 0;
                    supplyData.CHILEAN.MAX_AVAILABLE_MT = 0;
                }
            } else if (sup.supplier === 'ANTOFAGASTA') {
                // Enable Chilean (Antofagasta), disable Peruvian
                if (supplyData.CHILEAN) {
                    supplyData.CHILEAN.IS_PRIMARY = true;
                    supplyData.CHILEAN.MIN_AVAILABLE_MT = sup.minMT;
                    supplyData.CHILEAN.MAX_AVAILABLE_MT = sup.maxMT;
                    supplyData.CHILEAN.SUPPLIER_PREMIUM_USD = sup.premium;
                }
                if (supplyData.PERUVIAN) {
                    supplyData.PERUVIAN.IS_PRIMARY = false;
                    supplyData.PERUVIAN.LTA_FIXED_MT = 0;
                    supplyData.PERUVIAN.MAX_OPTIONAL_SPOT_MT = 0;
                    supplyData.PERUVIAN.TOTAL_MAX_AVAILABLE_MT = 0;
                }
            }

            // Update total market depth
            const peruvianTotal = supplyData.PERUVIAN?.TOTAL_MAX_AVAILABLE_MT || 0;
            const chileanTotal = supplyData.CHILEAN?.MAX_AVAILABLE_MT || 0;
            supplyData.TOTAL_MARKET_DEPTH_MT = peruvianTotal + chileanTotal;

            console.log(`[ScenarioSelection] Month ${month.num} supply - ${sup.supplier}: ${sup.minMT}-${sup.maxMT} MT, premium: $${sup.premium}`);
        });
    },

    /**
     * Apply demand configuration to month data files
     * Writes to CLIENTS.OPPORTUNITIES array
     */
    applyDemandToMonths(demand) {
        const months = [
            { num: 1, data: window.JANUARY_DATA },
            { num: 2, data: window.FEBRUARY_DATA },
            { num: 3, data: window.MARCH_DATA },
            { num: 4, data: window.APRIL_DATA },
            { num: 5, data: window.MAY_DATA },
            { num: 6, data: window.JUNE_DATA }
        ];

        months.forEach(month => {
            if (!month.data || !month.data.CLIENTS || !month.data.CLIENTS.OPPORTUNITIES) {
                console.warn(`[ScenarioSelection] Month ${month.num} CLIENTS.OPPORTUNITIES not found`);
                return;
            }

            const dem = demand[month.num];
            if (!dem) return;

            const opportunities = month.data.CLIENTS.OPPORTUNITIES;

            // Find and update the matching buyer region, or set as primary
            opportunities.forEach((opp, index) => {
                if (opp.REGION === dem.buyer) {
                    // This is our primary buyer for this month
                    opp.IS_PRIMARY = true;
                    opp.MIN_QUANTITY_MT = dem.minMT;
                    opp.MAX_QUANTITY_MT = dem.maxMT;
                    opp.REGIONAL_PREMIUM_USD = dem.premium;
                    opp.REFERENCE_EXCHANGE = dem.exchange;
                    if (dem.port) {
                        opp.PORT_OF_DISCHARGE = dem.port;
                    }
                } else {
                    // Not the primary buyer this month
                    opp.IS_PRIMARY = false;
                }
            });

            // Also update MARKET_DEPTH.DEMAND if it exists
            if (month.data.MARKET_DEPTH && month.data.MARKET_DEPTH.DEMAND) {
                const demandData = month.data.MARKET_DEPTH.DEMAND;
                if (demandData[dem.buyer]) {
                    demandData[dem.buyer].DEMAND_MT = dem.maxMT;
                }
            }

            console.log(`[ScenarioSelection] Month ${month.num} demand - ${dem.buyer}: ${dem.minMT}-${dem.maxMT} MT, premium: $${dem.premium}`);
        });
    },

    /**
     * Apply events to month data for triggers
     */
    applyEventsToMonths(events) {
        // Store events globally for the event trigger system
        window.SIMULATION_EVENTS = events || [];

        // Also organize by period for easy lookup
        window.EVENTS_BY_PERIOD = {};
        events.forEach(event => {
            for (let period = event.startPeriod; period <= event.endPeriod; period++) {
                if (!window.EVENTS_BY_PERIOD[period]) {
                    window.EVENTS_BY_PERIOD[period] = [];
                }
                window.EVENTS_BY_PERIOD[period].push(event);
            }
        });

        console.log(`[ScenarioSelection] Applied ${events.length} events to game`);
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

// Export to window for global access
window.AdminPanel = AdminPanel;
window.ScenarioSelection = ScenarioSelection;

// Initialize when DOM is ready
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        AdminPanel.init();
        ScenarioSelection.init();

        // Show scenario selection on page load
        // Skip if:
        // - quickstart=true (legacy)
        // - autostart=true (from ScenarioSelection.startGame)
        // - scenario= param is present (coming from startGame or scenario-select.html)
        const url = new URL(window.location.href);
        const hasQuickstart = url.searchParams.get('quickstart') === 'true';
        const hasAutostart = url.searchParams.get('autostart') === 'true';
        const hasScenarioParam = url.searchParams.get('scenario') !== null;

        if (!hasQuickstart && !hasAutostart && !hasScenarioParam) {
            ScenarioSelection.show();
        } else {
            console.log('[Admin] Skipping scenario selection - autostart or scenario param present');
        }

        console.log('[Admin] Module initialization complete');
    });
}
