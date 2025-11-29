# Perseverance Trading Simulator - Technical Architecture

**A copper commodities trading simulator for educational purposes**

This document provides comprehensive technical documentation for developers working on the ProjectCuSimulator codebase.

---

## Table of Contents

1. [High-Level Architecture](#high-level-architecture)
2. [File Structure Overview](#file-structure-overview)
3. [Entry Point: index.html](#entry-point-indexhtml)
4. [Core Application: js/app.js](#core-application-jsappjs)
5. [Styling: css/style.css](#styling-cssstylecss)
6. [Data Layer](#data-layer)
7. [Trading Mechanics](#trading-mechanics)
8. [Data Flow Diagrams](#data-flow-diagrams)
9. [External Dependencies](#external-dependencies)
10. [Running the Application](#running-the-application)

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BROWSER                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         index.html                                   │    │
│  │  (Entry Point - Loads all resources, defines UI structure)          │    │
│  └───────────────────────────────┬─────────────────────────────────────┘    │
│                                  │                                           │
│         ┌────────────────────────┼────────────────────────┐                 │
│         │                        │                        │                  │
│         ▼                        ▼                        ▼                  │
│  ┌─────────────┐    ┌───────────────────────┐    ┌─────────────────┐       │
│  │ css/        │    │ data/*.js             │    │ External CDN    │       │
│  │ style.css   │    │ (Month data files)    │    │ - Mapbox GL JS  │       │
│  │             │    │ maritime_routes.json  │    │ - Chart.js      │       │
│  └─────────────┘    └───────────────────────┘    └─────────────────┘       │
│                                  │                                           │
│                                  ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                          js/app.js                                   │    │
│  │  ┌─────────────────────────────────────────────────────────────┐    │    │
│  │  │                      GAME_STATE                              │    │    │
│  │  │  (Central state management - finances, positions, turns)     │    │    │
│  │  └───────────────────────────┬─────────────────────────────────┘    │    │
│  │                              │                                       │    │
│  │    ┌─────────────────────────┼─────────────────────────┐            │    │
│  │    │            │            │            │            │            │    │
│  │    ▼            ▼            ▼            ▼            ▼            │    │
│  │ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐             │    │
│  │ │Markets │ │Positions│ │Futures │ │  Map   │ │Analytics│             │    │
│  │ │Widget  │ │Widget  │ │Widget  │ │Widget  │ │Widget  │             │    │
│  │ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘             │    │
│  │    │            │            │            │            │            │    │
│  │    └────────────┴────────────┴────────────┴────────────┘            │    │
│  │                              │                                       │    │
│  │    ┌─────────────────────────┼─────────────────────────┐            │    │
│  │    ▼                         ▼                         ▼            │    │
│  │ ┌────────────┐    ┌─────────────────┐    ┌─────────────────┐       │    │
│  │ │ TradePanel │    │   TabManager    │    │ SidebarManager  │       │    │
│  │ │ (Buy/Sell) │    │ (Tab switching) │    │ (Navigation)    │       │    │
│  │ └────────────┘    └─────────────────┘    └─────────────────┘       │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## File Structure Overview

```
src/
├── index.html              # Entry point - UI structure and resource loading
├── CLAUDE.md               # Quick reference for AI assistants
├── ARCHITECTURE.md         # This file - comprehensive documentation
├── css/
│   └── style.css           # All styles (590 lines) - dark theme, no animations
├── data/
│   ├── january.js          # Month 1 market data (global: JANUARY_DATA)
│   ├── february.js         # Month 2 market data (global: FEBRUARY_DATA)
│   ├── march.js            # Month 3 market data (global: MARCH_DATA)
│   ├── april.js            # Month 4 market data (global: APRIL_DATA)
│   ├── may.js              # Month 5 market data (global: MAY_DATA)
│   ├── june.js             # Month 6 market data (global: JUNE_DATA)
│   └── maritime_routes.json # GeoJSON ship route coordinates
└── js/
    └── app.js              # All application logic (1334 lines)
```

**Total: 11 files**

---

## Entry Point: index.html

### Purpose
The main HTML file that bootstraps the entire application. It defines the static UI structure, loads all dependencies (CSS, external libraries, data files, and application code), and provides the DOM elements that JavaScript will manipulate.

### Resource Loading Order
```html
1. css/style.css           → Local styles
2. mapbox-gl.css (CDN)     → Map styles
3. mapbox-gl.js (CDN)      → Map library
4. chart.js (CDN)          → Charting library
5. data/january.js         → Month 1 data (sets window.JANUARY_DATA)
6. data/february.js        → Month 2 data (sets window.FEBRUARY_DATA)
7. data/march.js           → Month 3 data (sets window.MARCH_DATA)
8. data/april.js           → Month 4 data (sets window.APRIL_DATA)
9. data/may.js             → Month 5 data (sets window.MAY_DATA)
10. data/june.js           → Month 6 data (sets window.JUNE_DATA)
11. js/app.js              → Application code (runs on DOMContentLoaded)
```

### DOM Structure

| Element ID | Purpose | Updated By |
|------------|---------|------------|
| `header` | Fixed header bar with game metrics | `GAME_STATE.updateHeader()` |
| `headerPeriod` | Current period display (e.g., "JAN - Early") | `GAME_STATE.updateHeader()` |
| `headerFunds` | Available practice funds | `GAME_STATE.updateHeader()` |
| `headerPL` | Total profit/loss | `GAME_STATE.updateHeader()` |
| `headerBuyingPower` | Funds + available LOC | `GAME_STATE.updateHeader()` |
| `headerInventory` | Current copper inventory in MT | `GAME_STATE.updateHeader()` |
| `headerLOC` | Line of credit usage | `GAME_STATE.updateHeader()` |
| `nextTurnBtn` | Advances game turn | Event listener → `GAME_STATE.nextTurn()` |
| `sidebar` | Widget navigation list | `SidebarManager.init()` |
| `widgetList` | Clickable widget names | `SidebarManager.init()` |
| `workspace` | 2x2 grid of panels | Static |
| `panel1` → `content1` | Markets widget container | `MarketsWidget.render()` |
| `panel2` → `content2` | Positions/Futures widget container | `PositionsWidget.render()`, `FuturesWidget.render()` |
| `panel3` → `content3` | Map widget container | `MapWidget.init()` |
| `panel4` → `content4` | Analytics chart container | `AnalyticsWidget.render()` |
| `mapContainer` | Mapbox map target | `MapWidget.init()` |
| `futuresChart` | Chart.js canvas | `AnalyticsWidget.render()` |
| `buyPanel` | Buy trade modal | `TradePanel.openBuy()` |
| `sellPanel` | Sell trade modal | `TradePanel.openSell()` |
| `futuresPanel` | Futures trade modal | `FuturesWidget.openPanel()` |

### Trade Panel Form Elements

**Buy Panel:**
- `buySupplier`, `buyPort`, `buyPremium` - Display supplier info
- `buyTonnage` - Input: quantity to purchase
- `buyExchange` - Select: LME or COMEX
- `buyDestination` - Select: destination port (populated dynamically)
- `buyShipping` - Select: FOB or CIF terms
- `buyBasePrice`, `buyPremiumCost`, `buyFreight`, `buyTotal` - Calculation display
- `executeBuyBtn` - Triggers `TradePanel.executeBuy()`

**Sell Panel:**
- `sellBuyer`, `sellDest`, `sellPremiumInfo` - Display buyer info
- `sellInventory` - Select: available inventory positions
- `sellTonnage` - Input: quantity to sell
- `sellPrice`, `sellRevenue`, `sellCost`, `sellProfit` - Calculation display
- `executeSellBtn` - Triggers `TradePanel.executeSell()`

**Futures Panel:**
- `futuresExchange`, `futuresContract`, `futuresDirection`, `futuresPrice` - Display trade info
- `futuresContracts` - Input: number of contracts
- `futuresMargin`, `futuresFees`, `futuresTotal` - Calculation display
- `executeFuturesBtn` - Triggers `FuturesWidget.execute()`

### Dependencies
- **Depends on:** External CDN (Mapbox, Chart.js), local CSS, data files, app.js
- **Depended by:** None (this is the entry point)

### Connection to Trading Mechanics
The HTML defines the user interface through which traders interact with the simulation. Each panel corresponds to a key trading activity:
- **Markets panel**: View suppliers and buyers, initiate trades
- **Positions panel**: Track physical copper purchases and their transit status
- **Futures panel**: Speculate on price movements via futures contracts
- **Map panel**: Visualize maritime shipping routes
- **Analytics panel**: Analyze price trends

---

## Core Application: js/app.js

This single file contains all application logic, organized into 10 clearly-labeled sections.

---

### Section 1: GAME_STATE (Lines 13-385)

**Purpose:** Central state management object that holds all game data and provides methods for state mutations.

#### Properties

| Property | Type | Initial Value | Description |
|----------|------|---------------|-------------|
| `currentTurn` | Number | 1 | Current turn within the month (1-12) |
| `currentMonth` | String | 'January' | Current month name |
| `currentMonthData` | Object | null | Reference to current month's data object |
| `practiceFunds` | Number | 200000 | Available cash ($200,000) |
| `lineOfCredit` | Number | 200000 | Total line of credit ($200,000) |
| `locUsed` | Number | 0 | Amount of LOC currently borrowed |
| `physicalPositions` | Array | [] | Physical copper purchase records |
| `futuresPositions` | Array | [] | Futures contract positions |
| `totalPL` | Number | 0 | Cumulative profit/loss |
| `inventory` | Number | 0 | Arrived copper inventory in MT |
| `allMonthData` | Array | [] | Array of all 6 month data objects |

#### Methods

##### `init()`
```javascript
GAME_STATE.init()
```
- **Purpose:** Initialize game state on application startup
- **Parameters:** None
- **Returns:** Nothing
- **Side Effects:**
  - Populates `allMonthData` from global window variables
  - Sets `currentMonthData` to January data
  - Calls `updateHeader()` to sync UI
- **Called By:** DOMContentLoaded event handler

##### `updateHeader()`
```javascript
GAME_STATE.updateHeader()
```
- **Purpose:** Synchronize header UI with current state
- **Parameters:** None
- **Returns:** Nothing
- **Side Effects:** Updates DOM elements:
  - `headerPeriod` - e.g., "JAN - Early (1/12)"
  - `headerFunds` - Formatted currency
  - `headerPL` - Formatted with positive/negative class
  - `headerBuyingPower` - Funds + available LOC
  - `headerInventory` - e.g., "50 MT"
  - `headerLOC` - e.g., "$50,000 / $200K"
- **Called By:** `init()`, `nextTurn()`, `purchaseCopper()`, `sellCopper()`, `openFutures()`, `closeFutures()`

##### `formatCurrency(amount)`
```javascript
GAME_STATE.formatCurrency(1500000) // Returns "$1.50M"
GAME_STATE.formatCurrency(50000)   // Returns "$50,000"
```
- **Purpose:** Format numbers as currency strings
- **Parameters:** `amount` (Number) - Amount in dollars
- **Returns:** String - Formatted currency (e.g., "$1.50M" or "$50,000")
- **Side Effects:** None (pure function)

##### `nextTurn()`
```javascript
GAME_STATE.nextTurn()
```
- **Purpose:** Advance the game by one turn
- **Parameters:** None
- **Returns:** Nothing
- **Side Effects:**
  - Calls `updatePositionStatuses()` to check arrivals
  - Increments `currentTurn`
  - If turn > 12, advances to next month
  - Calls `settleFutures()` for mark-to-market
  - Calls `updateHeader()` and re-renders all widgets
  - Shows alert if game is over (after June)
- **Called By:** Next Turn button click event
- **Trading Mechanics:** Each turn represents ~2.5 days. Ships in transit progress toward arrival.

##### `updatePositionStatuses()`
```javascript
GAME_STATE.updatePositionStatuses()
```
- **Purpose:** Check if any in-transit shipments have arrived
- **Parameters:** None
- **Returns:** Nothing
- **Side Effects:**
  - Changes status from 'IN_TRANSIT' to 'ARRIVED'
  - Adds tonnage to `inventory` when position arrives
- **Called By:** `nextTurn()`
- **Trading Mechanics:** Shipments arrive when `currentTurn >= arrivalTurn`

##### `purchaseCopper(supplier, tonnage, destination, exchange, shippingTerms)`
```javascript
GAME_STATE.purchaseCopper('CALLAO', 10, 'SHANGHAI', 'LME', 'FOB')
```
- **Purpose:** Execute a physical copper purchase
- **Parameters:**
  - `supplier` (String) - Supplier key (e.g., 'CALLAO', 'ANTOFAGASTA')
  - `tonnage` (Number) - Metric tonnes to purchase
  - `destination` (String) - Destination port key
  - `exchange` (String) - 'LME' or 'COMEX'
  - `shippingTerms` (String) - 'FOB' or 'CIF'
- **Returns:** Boolean - true if successful, false if insufficient funds
- **Side Effects:**
  - Deducts cost from `practiceFunds` (uses LOC if needed)
  - Creates position object in `physicalPositions`
  - Calls `updateHeader()` and `PositionsWidget.render()`
  - Calls `MapWidget.addShipment()` to show route
- **Trading Mechanics:**
  - Price = Base Exchange Price + Supplier Premium + Freight
  - Travel time converted to turns (days / 2.5)
  - Position starts as 'IN_TRANSIT'

##### `sellCopper(positionId, buyerKey, tonnage)`
```javascript
GAME_STATE.sellCopper('PHYS_1234567890', 'AMERICAS', 10)
```
- **Purpose:** Sell arrived copper to a buyer
- **Parameters:**
  - `positionId` (String) - Position ID to sell from
  - `buyerKey` (String) - Buyer region key
  - `tonnage` (Number) - Metric tonnes to sell
- **Returns:** Number|false - Profit amount or false if failed
- **Side Effects:**
  - Adds revenue to `practiceFunds`
  - Updates `totalPL` with profit
  - Reduces `inventory`
  - Updates position status to 'SOLD' or reduces tonnage
  - Calls `updateHeader()` and `PositionsWidget.render()`
- **Trading Mechanics:**
  - Sale Price = Exchange Price + Buyer Regional Premium
  - Profit = Revenue - Original Cost Basis

##### `openFutures(exchange, contract, direction, contracts)`
```javascript
GAME_STATE.openFutures('LME', 'M+1', 'LONG', 2)
```
- **Purpose:** Open a futures position
- **Parameters:**
  - `exchange` (String) - 'LME' or 'COMEX'
  - `contract` (String) - 'CASH', 'M+1', 'M+2', 'M+3', or 'NEARBY'
  - `direction` (String) - 'LONG' or 'SHORT'
  - `contracts` (Number) - Number of contracts
- **Returns:** Boolean - true if successful
- **Side Effects:**
  - Deducts margin ($9,000/contract) + fees ($25/contract) from `practiceFunds`
  - Creates position in `futuresPositions`
  - Calls `updateHeader()` and `FuturesWidget.render()`
- **Trading Mechanics:**
  - Contract size: 25 MT per contract (both LME and COMEX)
  - Initial margin: $9,000 per contract
  - Opening fee: $25 per contract

##### `closeFutures(positionId)`
```javascript
GAME_STATE.closeFutures('FUT_1234567890')
```
- **Purpose:** Close an open futures position
- **Parameters:** `positionId` (String) - Futures position ID
- **Returns:** Number|false - P&L amount or false if failed
- **Side Effects:**
  - Returns margin to `practiceFunds`
  - Adds/subtracts P&L from `practiceFunds` and `totalPL`
  - Sets position status to 'CLOSED'
  - Calls `updateHeader()` and `FuturesWidget.render()`
- **Trading Mechanics:**
  - LONG P&L = (Current Price - Entry Price) × Contract Size × Contracts
  - SHORT P&L = (Entry Price - Current Price) × Contract Size × Contracts

##### `settleFutures()`
```javascript
GAME_STATE.settleFutures()
```
- **Purpose:** Mark-to-market all open futures positions
- **Parameters:** None
- **Returns:** Nothing
- **Side Effects:**
  - Updates `unrealizedPL` and `currentPrice` on each open position
- **Called By:** `nextTurn()`
- **Trading Mechanics:** Calculates unrealized P&L based on current prices

---

### Section 2: MarketsWidget (Lines 388-479)

**Purpose:** Displays suppliers, buyers, and exchange prices in a tabular format.

#### Methods

##### `render()`
```javascript
MarketsWidget.render()
```
- **Purpose:** Generate and insert markets widget HTML
- **Parameters:** None
- **Returns:** Nothing
- **Side Effects:** Updates innerHTML of `content1` element
- **Called By:** Initialization, `nextTurn()`
- **Data Dependencies:** `GAME_STATE.currentMonthData`

#### Rendered Content
1. **Suppliers Table**
   - Columns: Name, Port, Premium, Range, Action
   - Each row has a "BUY" button calling `TradePanel.openBuy(supplierKey)`

2. **Buyers Table**
   - Columns: Region, Destination, Premium, Range, Action
   - Each row has a "SELL" button calling `TradePanel.openSell(buyerKey)`

3. **Exchange Prices Table**
   - Shows LME and COMEX prices
   - Columns: Exchange, Cash/Spot, M+1, M+2, M+3

---

### Section 3: PositionsWidget (Lines 482-561)

**Purpose:** Displays physical copper positions and open futures positions.

#### Methods

##### `render()`
```javascript
PositionsWidget.render()
```
- **Purpose:** Generate and insert positions widget HTML
- **Parameters:** None
- **Returns:** Nothing
- **Side Effects:** Updates innerHTML of `content2` (when Positions tab active)
- **Called By:** Initialization, `nextTurn()`, `purchaseCopper()`, `sellCopper()`

#### Rendered Content
1. **Physical Positions Table**
   - Columns: Route, Tonnage, Cost, Status, Action
   - Status badges: "IN_TRANSIT" (blue) or "ARRIVED" (green)
   - "SELL" button appears when position is ARRIVED

2. **Futures Positions Table**
   - Columns: Contract, Direction, Quantity, Entry Price, P&L, Action
   - P&L shown with positive (green) or negative (red) styling
   - "CLOSE" button for each open position

---

### Section 4: FuturesWidget (Lines 564-695)

**Purpose:** Displays futures contract cards with pricing and trading buttons.

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `selectedExchange` | String | Currently selected exchange for trade panel |
| `selectedContract` | String | Currently selected contract |
| `selectedDirection` | String | 'LONG' or 'SHORT' |

#### Methods

##### `render()`
```javascript
FuturesWidget.render()
```
- **Purpose:** Generate futures contract cards grid
- **Parameters:** None
- **Returns:** Nothing
- **Side Effects:** Updates innerHTML of `content2` (when Futures tab active)

#### Rendered Content
- **LME Section:** Cards for CASH, M+1, M+2, M+3
- **COMEX Section:** Cards for NEARBY, M+1, M+2, M+3
- Each card shows price and has LONG/SHORT buttons

##### `openPanel(exchange, contract, direction)`
```javascript
FuturesWidget.openPanel('LME', 'M+1', 'LONG')
```
- **Purpose:** Open the futures trading modal
- **Parameters:**
  - `exchange` (String) - 'LME' or 'COMEX'
  - `contract` (String) - Contract identifier
  - `direction` (String) - 'LONG' or 'SHORT'
- **Side Effects:**
  - Sets `selectedExchange`, `selectedContract`, `selectedDirection`
  - Populates modal with trade info
  - Shows `futuresPanel`

##### `closePanel()`
- **Purpose:** Hide the futures trading modal
- **Side Effects:** Hides `futuresPanel`

##### `updateCalc()`
- **Purpose:** Update calculation display in futures panel
- **Side Effects:** Updates margin, fees, and total display elements
- **Called By:** Contract quantity input change event

##### `execute()`
- **Purpose:** Execute the futures trade
- **Side Effects:**
  - Calls `GAME_STATE.openFutures()`
  - Closes panel and shows success alert

---

### Section 5: MapWidget (Lines 698-878)

**Purpose:** Displays an interactive Mapbox map with port markers and animated ship routes.

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `map` | mapboxgl.Map | Mapbox map instance |
| `routesData` | Object | Loaded maritime routes JSON |
| `activeShipments` | Map | Active shipment data keyed by position ID |

#### Methods

##### `init()`
```javascript
await MapWidget.init()
```
- **Purpose:** Initialize the map widget
- **Parameters:** None
- **Returns:** Promise (implicit async)
- **Side Effects:**
  - Fetches `data/maritime_routes.json`
  - Creates Mapbox map in `mapContainer`
  - Adds port markers on map load
- **Called By:** Initialization

##### `addPortMarkers()`
- **Purpose:** Add colored markers for all ports
- **Side Effects:** Creates Mapbox markers with popups
- **Port Types:**
  - `seller` (yellow triangle) - Origin ports (Antofagasta, Callao)
  - `hub` (orange circle) - Major trading hubs
  - `parity` (green circle) - Destination ports

##### `addShipment(position)`
```javascript
MapWidget.addShipment(position)
```
- **Purpose:** Add a shipment route to the map
- **Parameters:** `position` (Object) - Physical position object
- **Side Effects:**
  - Adds GeoJSON line source to map
  - Creates ship marker emoji
  - Starts animation
  - Stores shipment data in `activeShipments`

##### `animateShip(positionId)`
- **Purpose:** Animate ship along route
- **Parameters:** `positionId` (String)
- **Side Effects:**
  - Uses `requestAnimationFrame` for smooth animation
  - Updates ship marker position
  - Changes route color to green when complete

---

### Section 6: AnalyticsWidget (Lines 881-957)

**Purpose:** Displays a Chart.js line chart of copper prices across months.

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `chart` | Chart | Chart.js instance |

#### Methods

##### `render()`
```javascript
AnalyticsWidget.render()
```
- **Purpose:** Create/update the price chart
- **Parameters:** None
- **Returns:** Nothing
- **Side Effects:**
  - Destroys existing chart if present
  - Creates new Chart.js line chart on `futuresChart` canvas
- **Data Displayed:**
  - LME Cash prices (blue line)
  - COMEX Nearby prices (orange line)
  - X-axis: Month abbreviations (Jan, Feb, etc.)

---

### Section 7: TradePanel (Lines 960-1207)

**Purpose:** Manages buy and sell trade modals.

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `currentSupplier` | String | Currently selected supplier key |
| `currentBuyer` | String | Currently selected buyer key |
| `currentPosition` | Object | Position being sold (when selling from position) |

#### Methods

##### `openBuy(supplierKey)`
```javascript
TradePanel.openBuy('CALLAO')
```
- **Purpose:** Open buy panel for a supplier
- **Parameters:** `supplierKey` (String)
- **Side Effects:**
  - Populates supplier info
  - Sets tonnage range constraints
  - Populates destination dropdown from freight rates
  - Shows `buyPanel`

##### `updateBuyCalc()`
- **Purpose:** Update buy panel cost calculations
- **Side Effects:** Updates display of base price, premium, freight, total
- **Called By:** Input change events

##### `executeBuy()`
- **Purpose:** Execute the purchase
- **Side Effects:**
  - Validates inputs
  - Calls `GAME_STATE.purchaseCopper()`
  - Closes panel, shows alert

##### `openSell(buyerKey)`
```javascript
TradePanel.openSell('AMERICAS')
```
- **Purpose:** Open sell panel for a buyer
- **Parameters:** `buyerKey` (String)
- **Side Effects:**
  - Populates buyer info
  - Populates inventory dropdown
  - Shows `sellPanel`

##### `openSellFromPosition(positionId)`
- **Purpose:** Open sell panel from positions widget
- **Parameters:** `positionId` (String)
- **Side Effects:** Same as `openSell` but pre-selects position

##### `populateInventory(selectedId)`
- **Purpose:** Populate inventory dropdown with arrived positions
- **Parameters:** `selectedId` (String, optional) - ID to pre-select

##### `updateSellCalc()`
- **Purpose:** Update sell panel revenue calculations
- **Side Effects:** Updates sale price, revenue, cost, profit display

##### `executeSell()`
- **Purpose:** Execute the sale
- **Side Effects:**
  - Validates inputs
  - Calls `GAME_STATE.sellCopper()`
  - Closes panel, shows profit alert

##### `close()`
- **Purpose:** Close all trade panels
- **Side Effects:** Hides buy and sell panels, clears state

---

### Section 8: TabManager (Lines 1210-1259)

**Purpose:** Handles tab switching within panels.

#### Methods

##### `init()`
```javascript
TabManager.init()
```
- **Purpose:** Attach click handlers to all tab buttons
- **Side Effects:** Adds event listeners to `.tab` elements
- **Called By:** Initialization

##### `switchTab(tabElement)`
```javascript
TabManager.switchTab(tabElement)
```
- **Purpose:** Switch to a specific tab
- **Parameters:** `tabElement` (HTMLElement) - The clicked tab
- **Side Effects:**
  - Updates active class on tabs
  - Renders appropriate widget based on `data-widget` attribute

---

### Section 9: SidebarManager (Lines 1262-1285)

**Purpose:** Handles sidebar widget navigation clicks.

#### Methods

##### `init()`
```javascript
SidebarManager.init()
```
- **Purpose:** Attach click handlers to sidebar widget list
- **Side Effects:** Adds event listeners to `#widgetList li` elements
- **Called By:** Initialization

**Behavior:** Clicking a sidebar item finds and activates the corresponding tab in the workspace.

---

### Section 10: Initialization (Lines 1288-1333)

**Purpose:** Bootstrap the application on page load.

#### DOMContentLoaded Handler

**Execution Order:**
1. `GAME_STATE.init()` - Initialize state
2. `TabManager.init()` - Setup tab handlers
3. `SidebarManager.init()` - Setup sidebar handlers
4. `MarketsWidget.render()` - Initial markets display
5. `PositionsWidget.render()` - Initial positions display
6. `AnalyticsWidget.render()` - Initial chart
7. `MapWidget.init()` - Initialize map (async)
8. Setup event listeners:
   - Next Turn button
   - Buy panel inputs
   - Sell panel inputs
   - Futures panel input

---

## Styling: css/style.css

### Purpose
Single consolidated stylesheet providing a dark theme with minimal visual complexity.

### Design Philosophy
- **No animations or transitions** - Focus on function over form
- **Monospace font** - Terminal/trading aesthetic
- **Dark theme** - `#1a1a1a` background, `#e0e0e0` text
- **Color coding:**
  - Green (`#4CAF50`) - Buy actions, positive values
  - Red (`#f44336`) - Sell actions, negative values
  - Blue (`#2196F3`) - In-transit status

### CSS Sections

| Section | Lines | Description |
|---------|-------|-------------|
| Reset | 7-12 | Box-sizing, margin/padding reset |
| Base | 14-21 | Body styles, font, background |
| Header | 23-66 | Fixed header bar, metrics, button |
| Container | 68-72 | Flex container for sidebar + workspace |
| Sidebar | 74-104 | Fixed-width navigation panel |
| Workspace | 106-115 | 2x2 CSS Grid layout |
| Panels | 117-137 | Panel containers and headers |
| Tabs | 139-159 | Tab button styles |
| Widgets | 161-346 | Market tables, futures cards, positions |
| Map | 348-420 | Mapbox container and markers |
| Trade Panels | 422-555 | Modal styles, forms, calculations |
| Utilities | 557-575 | Helper classes (.positive, .negative) |
| Scrollbar | 577-590 | Custom scrollbar styling |

### Key Classes

| Class | Usage |
|-------|-------|
| `.metric` | Header metric containers |
| `.trade-btn` | Buy/Sell action buttons |
| `.trade-btn.sell` | Red sell button variant |
| `.status-badge.transit` | Blue in-transit badge |
| `.status-badge.arrived` | Green arrived badge |
| `.futures-card` | Futures contract display |
| `.trade-panel` | Modal container |
| `.calc-section` | Cost/revenue breakdown |
| `.positive` / `.negative` | Green/red text colors |

---

## Data Layer

### Monthly Data Files (data/*.js)

Each month file exports a global variable (e.g., `window.JANUARY_DATA`) containing market conditions for that month.

#### Data Structure

```javascript
{
  "TURN": Number,           // Month number (1-6)
  "MONTH": String,          // Month name

  "MARKET_DEPTH": {
    "SUPPLY": {
      "PERUVIAN": {
        "LTA_FIXED_MT": Number,       // Long-term agreement quantity
        "MAX_OPTIONAL_SPOT_MT": Number,
        "TOTAL_MAX_AVAILABLE_MT": Number,
        "ORIGIN_PORT": String,
        "SUPPLIER_PREMIUM_USD": Number,
        "IS_PRIMARY": Boolean
      },
      "CHILEAN": {
        "MIN_AVAILABLE_MT": Number,
        "MAX_AVAILABLE_MT": Number,
        "ORIGIN_PORT": String,
        "SUPPLIER_PREMIUM_USD": Number,
        "IS_PRIMARY": Boolean
      },
      "TOTAL_MARKET_DEPTH_MT": Number
    },
    "DEMAND": {
      "AMERICAS": { "DEMAND_MT": Number },
      "ASIA": { "DEMAND_MT": Number },
      "EUROPE": { "DEMAND_MT": Number },
      "TOTAL_DEMAND_MT": Number
    }
  },

  "PRICING": {
    "LME": {
      "SPOT_AVG": Number,      // Cash price
      "FUTURES_1M": Number,    // M+1 price
      "FUTURES_3M": Number,    // M+3 price
      "FUTURES_12M": Number,   // M+12 price
      "CURVE_STRUCTURE": String // e.g., "Strong Contango"
    },
    "COMEX": {
      // Same structure as LME
    },
    "M_PLUS_1": {
      "LME_AVG": Number,
      "COMEX_AVG": Number,
      "DESCRIPTION": String
    }
  },

  "LOGISTICS": {
    "FREIGHT_RATES": {
      "CALLAO": {
        "SHANGHAI": {
          "PORT_NAME": String,
          "COUNTRY": String,
          "DISTANCE_NM": Number,        // Nautical miles
          "TRAVEL_TIME_DAYS": Number,
          "CIF_RATE_USD_PER_TONNE": Number,
          "FOB_RATE_USD_PER_TONNE": Number
        },
        // ... more destinations
      },
      "ANTOFAGASTA": {
        // ... same structure
      }
    }
  },

  "FIXED_RULES": {
    "COST_OF_CARRY": {
      "MONTHLY_RATE": Number,
      "SOFR_1M_PERCENT": Number,
      "FINANCING_PERIOD_MONTHS": Number,
      "DESCRIPTION": String
    },
    "SUPPLIER_RULES": [
      {
        "SUPPLIER_TYPE": String,
        "RELATIONSHIP": String,
        "PURCHASE_BASIS": String,
        "TONNAGE_RANGE": String,
        "SUPPLIER_PREMIUM_USD": Number,
        "ORIGIN_PORT": String
      }
    ]
  },

  "CLIENTS": {
    "OPPORTUNITIES": [
      {
        "REGION": String,
        "MIN_QUANTITY_MT": Number,
        "MAX_QUANTITY_MT": Number,
        "PORT_OF_DISCHARGE": String,
        "REFERENCE_EXCHANGE": String,
        "PORT_TYPE": String,
        "REGIONAL_PREMIUM_USD": Number,
        "IS_PRIMARY": Boolean
      }
    ]
  }
}
```

#### Transformed Properties (used by app.js)

The application accesses data through these transformed paths:

```javascript
// Suppliers (for MarketsWidget, TradePanel)
GAME_STATE.currentMonthData.SUPPLIERS = {
  "CALLAO": {
    NAME: "Peruvian Copper",
    PORT: "Callao, Peru",
    CURRENT_PRICE: {
      PREMIUM: 15,
      TONNAGE_RANGE_MT: [5, 17]
    }
  },
  "ANTOFAGASTA": {
    NAME: "Chilean Copper",
    PORT: "Antofagasta, Chile",
    CURRENT_PRICE: {
      PREMIUM: 0,
      TONNAGE_RANGE_MT: [20, 75]
    }
  }
}

// Buyers (for MarketsWidget, TradePanel)
GAME_STATE.currentMonthData.BUYERS = {
  "AMERICAS": {
    NAME: "Americas",
    DESTINATION: "New Orleans, USA",
    PREMIUM: 50,
    TONNAGE_RANGE_MT: [45, 70]
  },
  // ... ASIA, EUROPE
}

// Exchange Prices (for all trading calculations)
GAME_STATE.currentMonthData.EXCHANGE_PRICES = {
  LME: {
    CASH: 8960,
    "M+1": 9060,
    "M+2": 9210,
    "M+3": 9560
  },
  COMEX: {
    NEARBY: 9344,
    "M+1": 9444,
    "M+2": 9594,
    "M+3": 9944
  }
}

// Logistics (for TradePanel cost calculation)
GAME_STATE.currentMonthData.LOGISTICS.FREIGHT_RATES["CALLAO"]["SHANGHAI"]
```

### Maritime Routes (data/maritime_routes.json)

GeoJSON-style data defining ship routes between ports.

#### Structure

```json
{
  "generated": "ISO date string",
  "routes": {
    "antofagasta_to_neworleans": {
      "from": "antofagasta",
      "to": "neworleans",
      "coordinates": [
        [longitude, latitude],  // Origin
        [longitude, latitude],  // Waypoint
        // ... more waypoints
        [longitude, latitude]   // Destination
      ]
    },
    // ... more routes
  }
}
```

#### Available Routes
- From **Antofagasta**: To all destinations (New Orleans, Houston, Shanghai, Ningbo, Busan, Rotterdam, Antwerp, Valencia, Singapore, Newark, Montreal, Hamburg)
- From **Callao**: To all destinations

---

## Trading Mechanics

### Physical Copper Trading

#### Purchase Flow
```
1. User clicks BUY on supplier row
2. TradePanel.openBuy() populates modal with:
   - Supplier info (name, port, premium)
   - Tonnage range constraints
   - Available destinations (from freight rates)
3. User selects:
   - Tonnage amount
   - Exchange (LME or COMEX)
   - Destination port
   - Shipping terms (FOB or CIF)
4. TradePanel.updateBuyCalc() calculates:
   - Base Price = Exchange spot price
   - Premium = Supplier premium ($/MT)
   - Freight = Based on terms and route
   - Total = (Base + Premium + Freight) × Tonnage
5. User clicks PURCHASE COPPER
6. GAME_STATE.purchaseCopper() executes:
   - Validates funds
   - Deducts cost (uses LOC if needed)
   - Creates position with:
     - Unique ID (PHYS_timestamp)
     - Status: IN_TRANSIT
     - arrivalTurn = currentTurn + ceil(travelDays/2.5)
   - Updates map with shipment
```

#### Position Lifecycle
```
IN_TRANSIT → (turns pass) → ARRIVED → (sale) → SOLD
```

#### Sale Flow
```
1. User clicks SELL on buyer row OR position SELL button
2. TradePanel.openSell() populates modal with:
   - Buyer info (region, destination, premium)
   - Available arrived inventory
3. User selects inventory and tonnage
4. TradePanel.updateSellCalc() calculates:
   - Sale Price = Exchange price + Buyer premium
   - Revenue = Sale Price × Tonnage
   - Cost = Original purchase cost basis
   - Profit = Revenue - Cost
5. User clicks SELL COPPER
6. GAME_STATE.sellCopper() executes:
   - Validates position is ARRIVED
   - Adds revenue to funds
   - Updates P&L
   - Reduces inventory
   - Updates position (SOLD or reduced tonnage)
```

### Futures Trading

#### Contract Specifications
| Exchange | Contract Size | Initial Margin | Opening Fee | Closing Fee |
|----------|--------------|----------------|-------------|-------------|
| LME | 25 MT | $9,000 | $25 | $25 |
| COMEX | 25 MT | $9,000 | $25 | $25 |

#### Available Contracts
- **LME:** CASH, M+1, M+2, M+3
- **COMEX:** NEARBY, M+1, M+2, M+3

#### Open Position Flow
```
1. User clicks LONG or SHORT on futures card
2. FuturesWidget.openPanel() shows modal with:
   - Exchange, Contract, Direction, Price
   - Contract quantity input
3. FuturesWidget.updateCalc() calculates:
   - Margin = $9,000 × Contracts
   - Fees = $25 × Contracts
   - Total Deducted = Margin + Fees
4. User clicks OPEN POSITION
5. GAME_STATE.openFutures() executes:
   - Validates margin availability
   - Deducts margin + fees from funds
   - Creates position with:
     - Unique ID (FUT_timestamp)
     - Status: OPEN
     - Entry price, direction, contracts
```

#### P&L Calculation
```javascript
// On each turn advance (mark-to-market):
if (direction === 'LONG') {
  unrealizedPL = (currentPrice - entryPrice) × contractSize × contracts
} else {
  unrealizedPL = (entryPrice - currentPrice) × contractSize × contracts
}
```

#### Close Position Flow
```
1. User clicks CLOSE on position
2. GAME_STATE.closeFutures() executes:
   - Calculates final P&L
   - Returns margin to funds
   - Adds/subtracts P&L from funds and totalPL
   - Sets status to CLOSED
```

### Time Mechanics

- **12 turns per month** (Early: 1-4, Mid: 5-8, Late: 9-12)
- **~2.5 days per turn**
- **Travel time to turns:** `Math.ceil(travelDays / 2.5)`
- **6 months total** (January through June)
- **Game ends** after completing June

---

## Data Flow Diagrams

### Initialization Flow
```
Page Load
    │
    ├─→ Load CSS, external libraries
    │
    ├─→ Execute data/*.js files
    │   └─→ Sets window.JANUARY_DATA through window.JUNE_DATA
    │
    └─→ Execute js/app.js
        │
        └─→ DOMContentLoaded
            │
            ├─→ GAME_STATE.init()
            │   ├─→ Load allMonthData from window globals
            │   ├─→ Set currentMonthData to January
            │   └─→ updateHeader()
            │
            ├─→ TabManager.init() → Attach tab click handlers
            │
            ├─→ SidebarManager.init() → Attach sidebar click handlers
            │
            ├─→ MarketsWidget.render() → Display suppliers/buyers
            │
            ├─→ PositionsWidget.render() → Display positions
            │
            ├─→ AnalyticsWidget.render() → Create price chart
            │
            ├─→ MapWidget.init()
            │   ├─→ fetch('data/maritime_routes.json')
            │   ├─→ Create Mapbox map
            │   └─→ Add port markers
            │
            └─→ Attach event listeners
                ├─→ Next Turn button
                ├─→ Buy panel inputs
                ├─→ Sell panel inputs
                └─→ Futures panel input
```

### Purchase Data Flow
```
User: Click BUY
    │
    ▼
TradePanel.openBuy(supplierKey)
    │
    ├─→ Read: GAME_STATE.currentMonthData.SUPPLIERS[supplierKey]
    ├─→ Read: GAME_STATE.currentMonthData.LOGISTICS.FREIGHT_RATES
    └─→ Write: DOM elements (supplier info, destinations)

User: Modify inputs
    │
    ▼
TradePanel.updateBuyCalc()
    │
    ├─→ Read: Form inputs (tonnage, exchange, destination, shipping)
    ├─→ Read: GAME_STATE.currentMonthData.EXCHANGE_PRICES
    ├─→ Read: GAME_STATE.currentMonthData.SUPPLIERS[supplier].CURRENT_PRICE
    ├─→ Read: GAME_STATE.currentMonthData.LOGISTICS.FREIGHT_RATES
    └─→ Write: DOM elements (calculations display)

User: Click PURCHASE COPPER
    │
    ▼
TradePanel.executeBuy()
    │
    └─→ GAME_STATE.purchaseCopper(supplier, tonnage, destination, exchange, shipping)
        │
        ├─→ Read: currentMonthData (prices, supplier data, logistics)
        ├─→ Calculate: Total cost
        ├─→ Validate: Sufficient funds
        │
        ├─→ Write: GAME_STATE.practiceFunds (deduct)
        ├─→ Write: GAME_STATE.locUsed (if needed)
        ├─→ Write: GAME_STATE.physicalPositions.push(position)
        │
        ├─→ GAME_STATE.updateHeader()
        │   └─→ Write: All header DOM elements
        │
        ├─→ PositionsWidget.render()
        │   └─→ Write: content2 innerHTML
        │
        └─→ MapWidget.addShipment(position)
            ├─→ Read: routesData
            ├─→ Write: Map source/layer
            └─→ Write: Ship marker
```

### Turn Advance Data Flow
```
User: Click NEXT TURN
    │
    ▼
GAME_STATE.nextTurn()
    │
    ├─→ updatePositionStatuses()
    │   ├─→ For each position where currentTurn >= arrivalTurn:
    │   │   └─→ Write: position.status = 'ARRIVED'
    │   └─→ Write: GAME_STATE.inventory += tonnage
    │
    ├─→ Write: GAME_STATE.currentTurn++
    │
    ├─→ If turn > 12:
    │   ├─→ Write: currentTurn = 1
    │   └─→ Write: currentMonthData = next month
    │
    ├─→ settleFutures()
    │   └─→ For each open position:
    │       └─→ Write: position.unrealizedPL, position.currentPrice
    │
    ├─→ updateHeader()
    │
    └─→ Re-render all widgets
        ├─→ MarketsWidget.render()
        ├─→ PositionsWidget.render()
        ├─→ FuturesWidget.render()
        └─→ AnalyticsWidget.render()
```

---

## External Dependencies

### Mapbox GL JS v2.15.0
- **CDN:** `https://api.mapbox.com/mapbox-gl-js/v2.15.0/`
- **CSS:** mapbox-gl.css
- **JS:** mapbox-gl.js
- **API Token:** Embedded in MapWidget.init()
- **Usage:** Interactive map, markers, GeoJSON routes

### Chart.js v4.4.0
- **CDN:** `https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js`
- **Usage:** Line chart for price analytics

### No Build Process Required
The application uses no bundler, transpiler, or build tools. All code runs directly in the browser using standard ES5+ JavaScript.

---

## Running the Application

### Development Server
```bash
cd src
python3 -m http.server 8000
# Open http://localhost:8000
```

### Alternative Servers
```bash
# Node.js
npx http-server -p 8000

# PHP
php -S localhost:8000
```

### Browser Requirements
- Modern browser with ES6+ support
- JavaScript enabled
- Network access to CDN (Mapbox, Chart.js)

### Console Logging
All major operations log to the browser console with prefixes:
- `[GAME]` - State changes
- `[TRADE]` - Physical transactions
- `[FUTURES]` - Futures operations
- `[MAP]` - Map updates
- `[TAB]` - Tab switching
- `[SIDEBAR]` - Navigation
- `[APP]` - Initialization

---

## Summary

This copper trading simulator provides an educational platform for understanding physical commodity trading and futures hedging. The architecture prioritizes:

1. **Simplicity** - All code in one file for easy tracing
2. **Readability** - Clear section organization and comments
3. **No Build Process** - Direct browser execution
4. **Realistic Mechanics** - Based on actual copper trading flows

For questions or modifications, start with `js/app.js` and locate the relevant section by its numbered comment block.
