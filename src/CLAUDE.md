# Perseverance Trading Simulator - Bare-Bones Rebuild

## Philosophy
Simple, functional-first UI where all core functionality works correctly.
Priority: **Traceability** - when we change code, we immediately see the result.

## File Structure

```
src/
├── index.html          # Single HTML file with static layout
├── CLAUDE.md           # This file
├── css/
│   └── style.css       # Single CSS file, no animations
├── data/
│   ├── january.js      # Month 1 market data
│   ├── february.js     # Month 2 market data
│   ├── march.js        # Month 3 market data
│   ├── april.js        # Month 4 market data
│   ├── may.js          # Month 5 market data
│   ├── june.js         # Month 6 market data
│   └── maritime_routes.json  # Ship route coordinates
└── js/
    └── app.js          # ALL application code in one file
```

## Architecture

**All code in `app.js`** for maximum traceability:
- Section 1: GAME_STATE - Core game logic
- Section 2: MarketsWidget - Suppliers & Buyers display
- Section 3: PositionsWidget - Physical & Futures positions
- Section 4: FuturesWidget - Futures trading cards
- Section 5: MapWidget - Mapbox maritime routes
- Section 6: AnalyticsWidget - Price chart
- Section 7: TradePanel - Buy/Sell modals
- Section 8: TabManager - Simple tab switching
- Section 9: SidebarManager - Widget navigation
- Section 10: Initialization

## UI Components

### Header (Static)
- Period display (e.g., "JAN - Early (1/12)")
- Funds, P&L, Buying Power
- Inventory, LOC Used
- Next Turn button

### Sidebar (Static)
- Simple list of widget names
- Click to navigate to widget

### Workspace (2x2 Grid)
- Panel 1: Markets
- Panel 2: Positions / Futures (tabbed)
- Panel 3: Active Map
- Panel 4: Analytics (Chart)

### Trade Panels (Simple Modals)
- Buy Panel: Purchase copper from suppliers
- Sell Panel: Sell copper to buyers
- Futures Panel: Open futures positions

## Styling Philosophy

- Plain bordered rectangles (`border: 1px solid #444`)
- No shadows, gradients, or hover effects (except buttons)
- No transitions or animations
- Monospace font (`Courier New`)
- Dark background (`#1a1a1a`), light text (`#e0e0e0`)
- Accent: Green (`#4CAF50`) for buy, Red (`#f44336`) for sell

## What's NOT Included

- Drag-and-drop between panels
- Collapsible/animated sidebar
- Tab overflow handling
- Widget resize functionality
- Visual polish (rounded corners, shadows, gradients)
- Multiple JS/CSS files
- Build process / bundler

## Running the App

```bash
cd src
python3 -m http.server 8000
# Open http://localhost:8000
```

## Testing Checklist

1. **Markets Widget**: Shows suppliers, buyers, exchange prices
2. **Buy Trade**: Click BUY → Fill form → Execute purchase
3. **Positions**: Shows purchased positions with status
4. **Sell Trade**: After arrival, click SELL → Execute sale
5. **Futures**: Click LONG/SHORT → Open position
6. **Map**: Shows route lines and animated ships
7. **Analytics**: Shows price chart
8. **Next Turn**: Advances time, updates positions
9. **Tab Switching**: Click tabs to switch views

## Console Logging

All actions log to console with prefixes:
- `[GAME]` - Game state changes
- `[TRADE]` - Buy/sell transactions
- `[FUTURES]` - Futures operations
- `[MAP]` - Map updates
- `[TAB]` - Tab switching
- `[APP]` - Initialization

## Modification Guide

To change something:
1. Open `js/app.js`
2. Find the relevant section (well-commented)
3. Make your change
4. Refresh browser
5. See result immediately
