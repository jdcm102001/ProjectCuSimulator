/**
 * SAVE/LOAD DIAGNOSTIC
 * Debug tool to identify save/load issues in the admin panel
 */

const SaveLoadDebug = {
  /**
   * Test save functionality
   */
  testSave(slotNumber = 1) {
    console.log('═══════════════════════════════════════');
    console.log('SAVE DIAGNOSTIC - Slot', slotNumber);
    console.log('═══════════════════════════════════════');

    // Step 1: Check if AdminPanel exists
    if (!window.AdminPanel) {
      console.error('❌ AdminPanel NOT FOUND');
      return;
    }
    console.log('✅ AdminPanel exists');

    // Step 2: Check if collectFormData exists
    if (typeof AdminPanel.collectFormData !== 'function') {
      console.error('❌ AdminPanel.collectFormData function NOT FOUND');
      return;
    }
    console.log('✅ AdminPanel.collectFormData function exists');

    // Step 3: Try to collect data
    let data;
    try {
      data = AdminPanel.collectFormData();
      console.log('✅ Data collected successfully');
      console.log('Data structure:', Object.keys(data));
    } catch (e) {
      console.error('❌ Error collecting data:', e);
      return;
    }

    // Step 4: Check each data section
    console.log('\n--- DATA SECTIONS ---');

    if (data.metadata) {
      console.log('✅ metadata:', data.metadata);
    } else {
      console.error('❌ metadata is MISSING');
    }

    if (data.pricing) {
      console.log('✅ pricing exists, keys:', Object.keys(data.pricing));
      console.log('   LME months:', data.pricing.lme ? Object.keys(data.pricing.lme) : 'MISSING');
    } else {
      console.error('❌ pricing is MISSING');
    }

    if (data.supply) {
      console.log('✅ supply exists, months:', Object.keys(data.supply));
    } else {
      console.warn('⚠️ supply is missing or empty');
    }

    if (data.demand) {
      console.log('✅ demand exists, months:', Object.keys(data.demand));
    } else {
      console.warn('⚠️ demand is missing or empty');
    }

    if (data.events !== undefined) {
      console.log('✅ events exists, count:', Array.isArray(data.events) ? data.events.length : 'NOT AN ARRAY');
      if (Array.isArray(data.events) && data.events.length > 0) {
        console.log('   First event:', JSON.stringify(data.events[0], null, 2));
      }
    } else {
      console.error('❌ events is MISSING');
    }

    if (data.settings) {
      console.log('✅ settings:', data.settings);
    } else {
      console.warn('⚠️ settings is missing');
    }

    // Step 5: Check TimelineEditor
    console.log('\n--- TIMELINE EDITOR CHECK ---');
    if (window.TimelineEditor) {
      console.log('✅ TimelineEditor exists');
      console.log('   Events in memory:', TimelineEditor.events?.length || 0);
      if (TimelineEditor.events?.length > 0) {
        console.log('   First event in memory:', JSON.stringify(TimelineEditor.events[0], null, 2));
      }
      if (typeof TimelineEditor.getEventsForSave === 'function') {
        console.log('✅ TimelineEditor.getEventsForSave exists');
        const eventsFromEditor = TimelineEditor.getEventsForSave();
        console.log('   getEventsForSave() returns:', eventsFromEditor?.length || 0, 'events');
      } else {
        console.error('❌ TimelineEditor.getEventsForSave NOT FOUND');
      }
    } else {
      console.error('❌ TimelineEditor NOT FOUND');
    }

    // Step 6: Try to stringify
    let jsonString;
    try {
      jsonString = JSON.stringify(data);
      console.log('\n✅ JSON stringify successful');
      console.log('JSON length:', jsonString.length, 'bytes');
    } catch (e) {
      console.error('❌ JSON stringify FAILED:', e);
      return;
    }

    // Step 7: Check AdminStorage
    console.log('\n--- ADMIN STORAGE CHECK ---');
    if (window.AdminStorage) {
      console.log('✅ AdminStorage exists');
      if (typeof AdminStorage.saveSimulation === 'function') {
        console.log('✅ AdminStorage.saveSimulation exists');
      } else {
        console.error('❌ AdminStorage.saveSimulation NOT FOUND');
      }
    } else {
      console.error('❌ AdminStorage NOT FOUND');
    }

    // Step 8: Try to save using AdminStorage
    console.log('\n--- ATTEMPTING SAVE ---');
    try {
      const result = AdminStorage.saveSimulation(slotNumber, data);
      console.log('Save result:', result);
      if (result.success) {
        console.log('✅ Save reported SUCCESS');
      } else {
        console.error('❌ Save reported FAILURE:', result.error || result.errors);
      }
    } catch (e) {
      console.error('❌ Save threw exception:', e);
    }

    // Step 9: Verify save in localStorage
    console.log('\n--- VERIFICATION ---');
    const key = `simulation_slot_${slotNumber}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      console.log('✅ Data exists in localStorage');
      console.log('   Key:', key);
      console.log('   Length:', saved.length, 'bytes');
      try {
        const parsed = JSON.parse(saved);
        console.log('   Events in saved data:', parsed.events?.length || 0);
      } catch (e) {
        console.error('   ❌ Could not parse saved data');
      }
    } else {
      console.error('❌ Data NOT found in localStorage');
      console.log('   Looking for key:', key);
      console.log('   Available keys:', Object.keys(localStorage).filter(k => k.includes('sim') || k.includes('perseverance')));
    }

    console.log('\n═══════════════════════════════════════');
    console.log('SAVE DIAGNOSTIC COMPLETE');
    console.log('═══════════════════════════════════════');

    return data;
  },

  /**
   * Test load functionality
   */
  testLoad(slotNumber = 1) {
    console.log('═══════════════════════════════════════');
    console.log('LOAD DIAGNOSTIC - Slot', slotNumber);
    console.log('═══════════════════════════════════════');

    // Step 1: Check localStorage
    const key = `simulation_slot_${slotNumber}`;
    const saved = localStorage.getItem(key);

    console.log('Looking for key:', key);
    console.log('All localStorage keys:', Object.keys(localStorage));

    if (!saved) {
      console.error('❌ No data found in localStorage for key:', key);
      return;
    }
    console.log('✅ Data found in localStorage');
    console.log('Data length:', saved.length, 'bytes');

    // Step 2: Parse JSON
    let data;
    try {
      data = JSON.parse(saved);
      console.log('✅ JSON parse successful');
      console.log('Data structure:', Object.keys(data));
    } catch (e) {
      console.error('❌ JSON parse FAILED:', e);
      console.log('Raw data (first 500 chars):', saved.substring(0, 500));
      return;
    }

    // Step 3: Check data sections
    console.log('\n--- SAVED DATA SECTIONS ---');
    console.log('metadata:', data.metadata || 'MISSING');
    console.log('pricing:', data.pricing ? 'EXISTS' : 'MISSING');
    console.log('supply:', data.supply ? `EXISTS (${Object.keys(data.supply).length} months)` : 'MISSING');
    console.log('demand:', data.demand ? `EXISTS (${Object.keys(data.demand).length} months)` : 'MISSING');
    console.log('events:', Array.isArray(data.events) ? `${data.events.length} events` : 'MISSING/INVALID');
    console.log('settings:', data.settings || 'MISSING');

    if (Array.isArray(data.events) && data.events.length > 0) {
      console.log('\n--- FIRST SAVED EVENT ---');
      console.log(JSON.stringify(data.events[0], null, 2));
    }

    // Step 4: Check TimelineEditor
    console.log('\n--- TIMELINE EDITOR CHECK ---');
    if (window.TimelineEditor) {
      console.log('✅ TimelineEditor exists');
      if (typeof TimelineEditor.loadEvents === 'function') {
        console.log('✅ TimelineEditor.loadEvents exists');
      } else {
        console.error('❌ TimelineEditor.loadEvents NOT FOUND');
      }
      console.log('Current events in editor:', TimelineEditor.events?.length || 0);
    } else {
      console.error('❌ TimelineEditor NOT FOUND');
    }

    // Step 5: Test loading events into TimelineEditor
    if (window.TimelineEditor && data.events && data.events.length > 0) {
      console.log('\n--- TESTING EVENT LOAD ---');
      try {
        TimelineEditor.loadEvents(data.events);
        console.log('✅ loadEvents called successfully');
        console.log('Events now in editor:', TimelineEditor.events?.length || 0);
      } catch (e) {
        console.error('❌ loadEvents threw exception:', e);
      }
    }

    console.log('\n═══════════════════════════════════════');
    console.log('LOAD DIAGNOSTIC COMPLETE');
    console.log('═══════════════════════════════════════');

    return data;
  },

  /**
   * List all saved simulations
   */
  listSaved() {
    console.log('═══════════════════════════════════════');
    console.log('SAVED SIMULATIONS');
    console.log('═══════════════════════════════════════');

    // Check default slot (0)
    for (let i = 0; i <= 3; i++) {
      const key = `perseverance_sim_slot_${i}`;
      const saved = localStorage.getItem(key);

      if (saved) {
        try {
          const data = JSON.parse(saved);
          console.log(`Slot ${i}: "${data.metadata?.name || 'Unnamed'}" (${saved.length} bytes)`);
          console.log(`  - Events: ${data.events?.length || 0}`);
          console.log(`  - Modified: ${data.metadata?.modifiedAt || 'Unknown'}`);
        } catch (e) {
          console.log(`Slot ${i}: CORRUPTED DATA`);
        }
      } else {
        console.log(`Slot ${i}: EMPTY`);
      }
    }

    console.log('\nAll localStorage keys:', Object.keys(localStorage));
  },

  /**
   * Clear a slot
   */
  clearSlot(slotNumber) {
    localStorage.removeItem(`perseverance_sim_slot_${slotNumber}`);
    console.log(`Slot ${slotNumber} cleared`);
  },

  /**
   * Export slot data to console (for manual backup)
   */
  exportSlot(slotNumber) {
    const saved = localStorage.getItem(`perseverance_sim_slot_${slotNumber}`);
    if (saved) {
      console.log('Copy this JSON:');
      console.log(saved);
    } else {
      console.log('Slot is empty');
    }
  },

  /**
   * Quick test: Create an event and verify it saves
   */
  quickTest() {
    console.log('═══════════════════════════════════════');
    console.log('QUICK TEST - Create event and save');
    console.log('═══════════════════════════════════════');

    if (!window.TimelineEditor) {
      console.error('❌ TimelineEditor not found');
      return;
    }

    // Create a test event directly
    const testEvent = {
      id: 'test-' + Date.now(),
      name: 'Test Event',
      colorIndex: 1,
      startPeriod: 1,
      endPeriod: 4,
      tracks: {
        price: {
          effects: { lme: 10, comex: 8 }
        }
      }
    };

    console.log('Adding test event:', testEvent);
    TimelineEditor.events.push(testEvent);
    TimelineEditor.renderAllBars();

    console.log('Events in editor:', TimelineEditor.events.length);
    console.log('getEventsForSave():', TimelineEditor.getEventsForSave());

    // Now try to save
    console.log('\nNow run: SaveLoadDebug.testSave(1) to test save');
  }
};

// Make it globally available
window.SaveLoadDebug = SaveLoadDebug;

// Usage instructions
console.log('═══════════════════════════════════════════════════════════════');
console.log('SAVE/LOAD DEBUG TOOLS LOADED');
console.log('═══════════════════════════════════════════════════════════════');
console.log('Commands:');
console.log('  SaveLoadDebug.testSave(1)   - Test saving to slot 1');
console.log('  SaveLoadDebug.testLoad(1)   - Test loading from slot 1');
console.log('  SaveLoadDebug.listSaved()   - List all saved simulations');
console.log('  SaveLoadDebug.clearSlot(1)  - Clear slot 1');
console.log('  SaveLoadDebug.exportSlot(1) - Export slot 1 data');
console.log('  SaveLoadDebug.quickTest()   - Create test event and prep for save');
console.log('═══════════════════════════════════════════════════════════════');
