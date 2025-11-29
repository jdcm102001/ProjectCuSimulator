/**
 * EVENT STORAGE - Ensures events save and load properly
 * Bridge between EventBuilder and AdminStorage
 */

const EventStorage = {
  /**
   * Get events for saving to localStorage
   */
  collectEventsForSave() {
    if (!window.EventBuilder) {
      console.error('[EventStorage] EventBuilder not initialized');
      return [];
    }

    const events = EventBuilder.getEventsForSave();
    console.log('[EventStorage] Collecting events for save:', events.length, 'events');

    return events;
  },

  /**
   * Load events from saved data
   */
  loadEventsFromSave(savedEvents) {
    console.log('[EventStorage] Loading events from save:', savedEvents?.length || 0, 'events');

    if (!window.EventBuilder) {
      console.error('[EventStorage] EventBuilder not initialized');
      return;
    }

    EventBuilder.loadEvents(savedEvents);
  },

  /**
   * Validate events before saving
   */
  validateEventsForSave(events) {
    if (!events || !Array.isArray(events)) {
      return { valid: false, errors: ['Events is not an array'] };
    }

    const errors = [];

    events.forEach((event, index) => {
      if (!event.id) errors.push(`Event ${index} has no ID`);
      if (!event.type) errors.push(`Event ${index} has no type`);
      if (!event.name) errors.push(`Event ${index} has no name`);
      if (!Array.isArray(event.affects)) errors.push(`Event ${index} affects is not an array`);
    });

    return {
      valid: errors.length === 0,
      errors: errors
    };
  },

  /**
   * Convert old-format events to new format
   * For backwards compatibility with events created in the old system
   */
  migrateOldEvents(oldEvents) {
    if (!oldEvents || !Array.isArray(oldEvents)) {
      return [];
    }

    return oldEvents.map(oldEvent => {
      // Check if already in new format
      if (oldEvent.affects && Array.isArray(oldEvent.affects)) {
        return oldEvent;
      }

      // Convert from old format
      const newEvent = {
        id: oldEvent.id || 'evt-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
        type: oldEvent.types?.includes('price') ? 'event' : (oldEvent.type || 'event'),
        name: oldEvent.name || 'Unnamed Event',
        text: oldEvent.description || '',
        startPeriod: oldEvent.startPeriod || 1,
        endPeriod: oldEvent.endPeriod || 6,
        affects: [],
        chainTo: null,
        leadTime: 2
      };

      // Convert old impacts/effects to new affects format
      if (oldEvent.impacts) {
        if (oldEvent.impacts.lmeSpot && oldEvent.impacts.lmeSpot !== 0) {
          // Convert absolute price impact to percentage
          const percentChange = (oldEvent.impacts.lmeSpot / 9000) * 100;
          newEvent.affects.push({ target: 'lme', value: Math.round(percentChange) });
        }
        if (oldEvent.impacts.comexSpot && oldEvent.impacts.comexSpot !== 0) {
          const percentChange = (oldEvent.impacts.comexSpot / 10000) * 100;
          newEvent.affects.push({ target: 'comex', value: Math.round(percentChange) });
        }
      }

      // If sentiment-based event with no affects, create default
      if (newEvent.affects.length === 0 && oldEvent.sentiment) {
        const magnitude = oldEvent.severity === 'minor' ? 5 :
                         oldEvent.severity === 'medium' ? 10 :
                         oldEvent.severity === 'high' ? 15 : 25;
        const direction = oldEvent.sentiment === 'bullish' ? 1 : -1;

        newEvent.affects.push({ target: 'lme', value: magnitude * direction });
      }

      return newEvent;
    });
  },

  /**
   * Get events data for admin panel collectFormData
   */
  getEventsData() {
    return this.collectEventsForSave();
  },

  /**
   * Set events data from admin panel loadSimulation
   */
  setEventsData(events) {
    // Check if needs migration
    const needsMigration = events && events.length > 0 && !events[0].affects;

    if (needsMigration) {
      console.log('[EventStorage] Migrating old event format...');
      events = this.migrateOldEvents(events);
    }

    this.loadEventsFromSave(events);
  }
};

// Export
window.EventStorage = EventStorage;
