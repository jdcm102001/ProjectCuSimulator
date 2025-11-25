/**
 * Perseverance Trading Simulator
 * Bare-bones Functional Version
 *
 * All code in one file for maximum traceability.
 * When you change something, you'll see the result immediately.
 */

// ============================================================
// SECTION 1: GAME STATE
// ============================================================

const GAME_STATE = {
    // Current period
    currentTurn: 1,
    currentMonth: 'January',
    currentMonthData: null,

    // Finances
    practiceFunds: 200000,
    lineOfCredit: 200000,
    locUsed: 0,

    // Positions
    physicalPositions: [],
    futuresPositions: [],

    // Tracking
    totalPL: 0,
    inventory: 0,

    // Month data array
    allMonthData: [],

    /**
     * Initialize the game state
     */
    init() {
        console.log('[GAME] Initializing...');

        // Load all month data (from global variables set by data files)
        this.allMonthData = [
            window.JANUARY_DATA,
            window.FEBRUARY_DATA,
            window.MARCH_DATA,
            window.APRIL_DATA,
            window.MAY_DATA,
            window.JUNE_DATA
        ];

        // Set current month data
        this.currentMonthData = this.allMonthData[0];
        console.log('[GAME] Current month:', this.currentMonthData.MONTH);

        // Update header display
        this.updateHeader();
    },

    /**
     * Update header displays
     */
    updateHeader() {
        // Period
        const turn = this.currentTurn;
        const monthShort = this.currentMonth.substring(0, 3).toUpperCase();
        const period = turn <= 4 ? 'Early' : turn <= 8 ? 'Mid' : 'Late';
        document.getElementById('headerPeriod').textContent = `${monthShort} - ${period} (${turn}/12)`;

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

        // Advance turn counter
        this.currentTurn++;

        // Check if we need to advance month (every 12 turns = 1 month)
        if (this.currentTurn > 12) {
            this.currentTurn = 1;
            const monthIndex = this.allMonthData.indexOf(this.currentMonthData);
            if (monthIndex < this.allMonthData.length - 1) {
                this.currentMonthData = this.allMonthData[monthIndex + 1];
                this.currentMonth = this.currentMonthData.MONTH;
                console.log('[GAME] New month:', this.currentMonth);
            } else {
                alert('Game Over! You have completed all 6 months.');
                return;
            }
        }

        // Mark futures positions for settlement
        this.settleFutures();

        // Update header
        this.updateHeader();

        // Re-render widgets
        MarketsWidget.render();
        PositionsWidget.render();
        FuturesWidget.render();
        AnalyticsWidget.render();

        console.log('[GAME] Now on turn', this.currentTurn, 'of', this.currentMonth);
    },

    /**
     * Update physical position statuses
     */
    updatePositionStatuses() {
        this.physicalPositions.forEach(pos => {
            if (pos.status === 'IN_TRANSIT') {
                // Check if arrived
                if (this.currentTurn >= pos.arrivalTurn) {
                    pos.status = 'ARRIVED';
                    this.inventory += pos.tonnage;
                    console.log('[GAME] Position arrived:', pos.id);
                }
            }
        });
    },

    /**
     * Purchase copper
     */
    purchaseCopper(supplier, tonnage, destination, exchange, shippingTerms) {
        console.log('[TRADE] Purchasing', tonnage, 'MT from', supplier);

        const data = this.currentMonthData;
        const supplierData = data.SUPPLIERS[supplier];
        const destData = data.LOGISTICS.FREIGHT_RATES[supplier][destination];

        // Calculate costs
        const basePrice = exchange === 'LME' ? data.EXCHANGE_PRICES.LME.CASH : data.EXCHANGE_PRICES.COMEX.NEARBY;
        const premium = supplierData.CURRENT_PRICE.PREMIUM;
        const freight = shippingTerms === 'CIF' ? destData.CIF_RATE_USD_PER_TONNE : destData.FOB_RATE_USD_PER_TONNE;

        const pricePerMT = basePrice + premium + freight;
        const totalCost = pricePerMT * tonnage;

        // Check funds
        const availableFunds = this.practiceFunds + (this.lineOfCredit - this.locUsed);
        if (totalCost > availableFunds) {
            alert('Insufficient funds!');
            return false;
        }

        // Deduct funds
        if (totalCost <= this.practiceFunds) {
            this.practiceFunds -= totalCost;
        } else {
            const fromLOC = totalCost - this.practiceFunds;
            this.practiceFunds = 0;
            this.locUsed += fromLOC;
        }

        // Calculate travel time
        const travelDays = destData.TRAVEL_TIME_DAYS;
        const turnsToArrive = Math.ceil(travelDays / 2.5); // ~2.5 days per turn

        // Create position
        const position = {
            id: 'PHYS_' + Date.now(),
            type: 'BUY',
            supplier: supplier,
            originPort: supplierData.PORT,
            destination: destination,
            destinationPort: destData.PORT_NAME + ', ' + destData.COUNTRY,
            tonnage: tonnage,
            exchange: exchange,
            shippingTerms: shippingTerms,
            pricePerMT: pricePerMT,
            totalCost: totalCost,
            purchaseTurn: this.currentTurn,
            purchaseMonth: this.currentMonth,
            arrivalTurn: this.currentTurn + turnsToArrive,
            travelTimeDays: travelDays,
            distanceNM: destData.DISTANCE_NM,
            status: 'IN_TRANSIT'
        };

        this.physicalPositions.push(position);

        // Update display
        this.updateHeader();
        PositionsWidget.render();
        MapWidget.addShipment(position);

        console.log('[TRADE] Position created:', position.id);
        return true;
    },

    /**
     * Sell copper
     */
    sellCopper(positionId, buyerKey, tonnage) {
        console.log('[TRADE] Selling', tonnage, 'MT to', buyerKey);

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
        const buyerData = data.BUYERS[buyerKey];

        // Calculate sale price
        const basePrice = position.exchange === 'LME' ?
            data.EXCHANGE_PRICES.LME.CASH : data.EXCHANGE_PRICES.COMEX.NEARBY;
        const premium = buyerData.PREMIUM;
        const salePrice = basePrice + premium;
        const revenue = salePrice * tonnage;

        // Calculate profit
        const costBasis = position.pricePerMT * tonnage;
        const profit = revenue - costBasis;

        // Update funds
        this.practiceFunds += revenue;
        this.totalPL += profit;
        this.inventory -= tonnage;

        // Update position
        if (tonnage === position.tonnage) {
            position.status = 'SOLD';
        } else {
            position.tonnage -= tonnage;
        }

        // Update display
        this.updateHeader();
        PositionsWidget.render();

        console.log('[TRADE] Sold for profit:', profit);
        return profit;
    },

    /**
     * Open futures position
     */
    openFutures(exchange, contract, direction, contracts) {
        console.log('[FUTURES] Opening', direction, contracts, 'contracts on', exchange, contract);

        const data = this.currentMonthData;
        const price = exchange === 'LME' ?
            data.EXCHANGE_PRICES.LME[contract] : data.EXCHANGE_PRICES.COMEX[contract];

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
            openTurn: this.currentTurn,
            openMonth: this.currentMonth,
            status: 'OPEN',
            unrealizedPL: 0
        };

        this.futuresPositions.push(position);

        // Update display
        this.updateHeader();
        FuturesWidget.render();

        console.log('[FUTURES] Position opened:', position.id);
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
            data.EXCHANGE_PRICES.LME[position.contract] :
            data.EXCHANGE_PRICES.COMEX[position.contract];

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
                data.EXCHANGE_PRICES.LME[pos.contract] :
                data.EXCHANGE_PRICES.COMEX[pos.contract];

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
     * Render the markets widget
     */
    render() {
        const container = document.getElementById('content1');
        if (!container) return;

        const data = GAME_STATE.currentMonthData;
        if (!data) {
            container.innerHTML = '<div class="empty-state">No data loaded</div>';
            return;
        }

        let html = '';

        // Suppliers section
        html += '<div class="markets-section">';
        html += '<h4>SUPPLIERS (Buy From)</h4>';
        html += '<table class="market-table">';
        html += '<tr><th>Name</th><th>Port</th><th>Premium</th><th>Range</th><th></th></tr>';

        for (const [key, supplier] of Object.entries(data.SUPPLIERS)) {
            const premium = supplier.CURRENT_PRICE.PREMIUM;
            const premiumSign = premium >= 0 ? '+' : '';
            html += `
                <tr>
                    <td>${supplier.NAME}</td>
                    <td>${supplier.PORT}</td>
                    <td>${premiumSign}$${premium}/MT</td>
                    <td>${supplier.CURRENT_PRICE.TONNAGE_RANGE_MT[0]}-${supplier.CURRENT_PRICE.TONNAGE_RANGE_MT[1]} MT</td>
                    <td><button class="trade-btn" onclick="TradePanel.openBuy('${key}')">BUY</button></td>
                </tr>
            `;
        }
        html += '</table></div>';

        // Buyers section
        html += '<div class="markets-section">';
        html += '<h4>BUYERS (Sell To)</h4>';
        html += '<table class="market-table">';
        html += '<tr><th>Region</th><th>Destination</th><th>Premium</th><th>Range</th><th></th></tr>';

        for (const [key, buyer] of Object.entries(data.BUYERS)) {
            const premium = buyer.PREMIUM;
            const premiumSign = premium >= 0 ? '+' : '';
            html += `
                <tr>
                    <td>${buyer.NAME}</td>
                    <td>${buyer.DESTINATION}</td>
                    <td>${premiumSign}$${premium}/MT</td>
                    <td>${buyer.TONNAGE_RANGE_MT[0]}-${buyer.TONNAGE_RANGE_MT[1]} MT</td>
                    <td><button class="trade-btn sell" onclick="TradePanel.openSell('${key}')">SELL</button></td>
                </tr>
            `;
        }
        html += '</table></div>';

        // Exchange prices
        html += '<div class="markets-section">';
        html += '<h4>EXCHANGE PRICES</h4>';
        html += '<table class="market-table">';
        html += '<tr><th>Exchange</th><th>Cash/Spot</th><th>M+1</th><th>M+2</th><th>M+3</th></tr>';

        const lme = data.EXCHANGE_PRICES.LME;
        const comex = data.EXCHANGE_PRICES.COMEX;

        html += `
            <tr>
                <td>LME</td>
                <td>$${lme.CASH}</td>
                <td>$${lme['M+1']}</td>
                <td>$${lme['M+2']}</td>
                <td>$${lme['M+3']}</td>
            </tr>
            <tr>
                <td>COMEX</td>
                <td>$${comex.NEARBY}</td>
                <td>$${comex['M+1']}</td>
                <td>$${comex['M+2']}</td>
                <td>$${comex['M+3']}</td>
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
            html += '<table class="positions-table">';
            html += '<tr><th>Route</th><th>Tonnage</th><th>Cost</th><th>Status</th><th></th></tr>';

            physPositions.forEach(pos => {
                const statusClass = pos.status === 'IN_TRANSIT' ? 'transit' : 'arrived';
                html += `
                    <tr>
                        <td>${pos.supplier} → ${pos.destination}</td>
                        <td>${pos.tonnage} MT</td>
                        <td>$${pos.totalCost.toLocaleString()}</td>
                        <td><span class="status-badge ${statusClass}">${pos.status}</span></td>
                        <td>${pos.status === 'ARRIVED' ?
                            `<button class="trade-btn sell" onclick="TradePanel.openSellFromPosition('${pos.id}')">SELL</button>` :
                            ''}</td>
                    </tr>
                `;
            });
            html += '</table>';
        }
        html += '</div>';

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
    }
};


// ============================================================
// SECTION 4: FUTURES WIDGET
// ============================================================

const FuturesWidget = {
    selectedExchange: 'LME',
    selectedContract: 'M+1',
    selectedDirection: 'LONG',

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
        if (!data) return;

        let html = '';

        // LME Section
        html += '<div class="futures-section">';
        html += '<h4>LME COPPER</h4>';
        html += '<div class="futures-grid">';

        ['CASH', 'M+1', 'M+2', 'M+3'].forEach(contract => {
            const price = data.EXCHANGE_PRICES.LME[contract];
            html += `
                <div class="futures-card">
                    <div class="contract">${contract}</div>
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

        ['NEARBY', 'M+1', 'M+2', 'M+3'].forEach(contract => {
            const price = data.EXCHANGE_PRICES.COMEX[contract];
            html += `
                <div class="futures-card">
                    <div class="contract">${contract}</div>
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
            data.EXCHANGE_PRICES.LME[contract] :
            data.EXCHANGE_PRICES.COMEX[contract];

        document.getElementById('futuresExchange').textContent = exchange;
        document.getElementById('futuresContract').textContent = contract;
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

        GAME_STATE.allMonthData.forEach(data => {
            if (data) {
                labels.push(data.MONTH.substring(0, 3));
                lmeData.push(data.EXCHANGE_PRICES.LME.CASH);
                comexData.push(data.EXCHANGE_PRICES.COMEX.NEARBY);
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
                        label: 'LME Cash',
                        data: lmeData,
                        borderColor: '#3b82f6',
                        backgroundColor: 'transparent',
                        tension: 0.3
                    },
                    {
                        label: 'COMEX Nearby',
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

    /**
     * Open buy panel
     */
    openBuy(supplierKey) {
        this.currentSupplier = supplierKey;

        const data = GAME_STATE.currentMonthData;
        const supplier = data.SUPPLIERS[supplierKey];

        // Populate panel
        document.getElementById('buySupplier').textContent = supplier.NAME;
        document.getElementById('buyPort').textContent = supplier.PORT;
        document.getElementById('buyPremium').textContent =
            (supplier.CURRENT_PRICE.PREMIUM >= 0 ? '+' : '') + '$' + supplier.CURRENT_PRICE.PREMIUM + '/MT';

        const range = supplier.CURRENT_PRICE.TONNAGE_RANGE_MT;
        document.getElementById('buyTonnage').min = range[0];
        document.getElementById('buyTonnage').max = range[1];
        document.getElementById('buyTonnage').value = range[0];
        document.getElementById('buyRange').textContent = `Range: ${range[0]}-${range[1]} MT`;

        // Populate destinations
        const destSelect = document.getElementById('buyDestination');
        destSelect.innerHTML = '<option value="">Select destination...</option>';

        const freightData = data.LOGISTICS.FREIGHT_RATES[supplierKey];
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

        const supplier = data.SUPPLIERS[this.currentSupplier];
        const tonnage = parseInt(document.getElementById('buyTonnage').value) || 0;
        const exchange = document.getElementById('buyExchange').value;
        const destKey = document.getElementById('buyDestination').value;
        const shipping = document.getElementById('buyShipping').value;

        // Base price
        const basePrice = exchange === 'LME' ?
            data.EXCHANGE_PRICES.LME.CASH : data.EXCHANGE_PRICES.COMEX.NEARBY;
        document.getElementById('buyBasePrice').textContent = '$' + basePrice + '/MT';

        // Premium
        const premium = supplier.CURRENT_PRICE.PREMIUM;
        document.getElementById('buyPremiumCost').textContent =
            (premium >= 0 ? '+' : '') + '$' + premium + '/MT';

        // Freight
        let freight = 0;
        if (destKey) {
            const dest = data.LOGISTICS.FREIGHT_RATES[this.currentSupplier][destKey];
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
    openSell(buyerKey) {
        this.currentBuyer = buyerKey;

        const data = GAME_STATE.currentMonthData;
        const buyer = data.BUYERS[buyerKey];

        document.getElementById('sellBuyer').textContent = buyer.NAME;
        document.getElementById('sellDest').textContent = buyer.DESTINATION;
        document.getElementById('sellPremiumInfo').textContent =
            (buyer.PREMIUM >= 0 ? '+' : '') + '$' + buyer.PREMIUM + '/MT';

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

        // Find a buyer (use first available)
        const data = GAME_STATE.currentMonthData;
        const buyerKey = Object.keys(data.BUYERS)[0];
        this.currentBuyer = buyerKey;

        const buyer = data.BUYERS[buyerKey];
        document.getElementById('sellBuyer').textContent = buyer.NAME;
        document.getElementById('sellDest').textContent = buyer.DESTINATION;
        document.getElementById('sellPremiumInfo').textContent =
            (buyer.PREMIUM >= 0 ? '+' : '') + '$' + buyer.PREMIUM + '/MT';

        // Populate inventory with this position selected
        this.populateInventory(positionId);

        document.getElementById('sellPanel').style.display = 'block';
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
            select.innerHTML += `<option value="${pos.id}" ${selected}>${pos.tonnage} MT from ${pos.supplier}</option>`;
        });

        this.updateSellCalc();
    },

    /**
     * Update sell calculation
     */
    updateSellCalc() {
        const data = GAME_STATE.currentMonthData;
        if (!this.currentBuyer || !data) return;

        const buyer = data.BUYERS[this.currentBuyer];
        const positionId = document.getElementById('sellInventory').value;
        const position = GAME_STATE.physicalPositions.find(p => p.id === positionId);
        const tonnage = parseInt(document.getElementById('sellTonnage').value) || 0;

        // Sale price
        let basePrice = data.EXCHANGE_PRICES.LME.CASH; // Default
        if (position) {
            basePrice = position.exchange === 'LME' ?
                data.EXCHANGE_PRICES.LME.CASH : data.EXCHANGE_PRICES.COMEX.NEARBY;
        }
        const salePrice = basePrice + buyer.PREMIUM;
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

        // Profit
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

        const profit = GAME_STATE.sellCopper(positionId, this.currentBuyer, tonnage);

        if (profit !== false) {
            this.close();
            alert(`Sale complete! Profit: $${profit.toLocaleString()}`);
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
// SECTION 10: INITIALIZATION
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

    // Render initial widgets
    MarketsWidget.render();
    PositionsWidget.render();
    AnalyticsWidget.render();

    // Initialize map
    MapWidget.init();

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
