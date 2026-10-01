const PlannerNotes = (() => {
  function makeId(prefix = 'note') {
    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
  }

  function compareByTime(left, right) {
    const minutes = (value) => {
      const match = String(value || '').match(/^(\d{2}):(\d{2})$/);
      if (!match) return Number.POSITIVE_INFINITY;
      const hours = Number(match[1]);
      const minute = Number(match[2]);
      return hours < 24 && minute < 60 ? hours * 60 + minute : Number.POSITIVE_INFINITY;
    };

    return minutes(left.time) - minutes(right.time);
  }

  function createNote(input = {}) {
    const date = input.date || PlannerDates.getTodayISO();
    const now = new Date().toISOString();

    return {
      id: input.id || makeId(),
      title: input.title || '',
      description: input.description || '',
      tags: Array.isArray(input.tags) ? input.tags : [],
      category: input.category || { name: 'General', color: '#8da0ff' },
      priority: ['low', 'medium', 'high', 'urgent'].includes(input.priority) ? input.priority : 'medium',
      createdAt: input.createdAt || now,
      updatedAt: input.updatedAt || now,
      date,
      time: /^\d{2}:\d{2}$/.test(input.time || '') ? input.time : '',
      type: input.type || 'day',
      week: input.week || PlannerDates.getWeekKey(date)
    };
  }

  function getNoteById(id, notes = PlannerStorage.getNotes()) {
    return notes.find((note) => note.id === id) || null;
  }

  function getNotesForDate(dateString, notes = PlannerStorage.getNotes()) {
    return notes.filter((note) => note.date === dateString && note.type === 'day').sort(compareByTime);
  }

  function getWeeklyNotesForDate(dateString, notes = PlannerStorage.getNotes()) {
    const weekKey = PlannerDates.getWeekKey(dateString);
    return notes.filter((note) => note.type === 'weekly' && note.week === weekKey).sort(compareByTime);
  }

  function getNotesForWeek(dateString, notes = PlannerStorage.getNotes()) {
    const weekDates = PlannerDates.getWeekDates(dateString);
    return notes.filter((note) => weekDates.includes(note.date) && note.type === 'day').sort(compareByTime);
  }

  function cloneWeekNotesToNextWeek(dateString, notes = PlannerStorage.getNotes()) {
    const sourceWeekKey = PlannerDates.getWeekKey(dateString);
    const sourceDates = new Set(PlannerDates.getWeekDates(dateString));

    return notes.filter((note) => (
      note && (note.type === 'weekly' ? note.week === sourceWeekKey : sourceDates.has(note.date))
    )).map((note) => {
      const date = PlannerDates.addDays(note.date, 7);
      return createNote({
        ...note,
        id: undefined,
        createdAt: undefined,
        updatedAt: undefined,
        tags: (note.tags || []).map((tag) => typeof tag === 'object' ? { ...tag } : tag),
        category: note.category && typeof note.category === 'object' ? { ...note.category } : note.category,
        date,
        week: PlannerDates.getWeekKey(date)
      });
    });
  }

  function getSampleNotes() {
    const today = PlannerDates.getTodayISO();
    const weekKey = PlannerDates.getWeekKey(today);
    return [
      createNote({
        title: 'Product strategy review',
        description: '<p>Review the product roadmap and align the release notes for this week.</p>',
        tags: [{ name: 'planning', color: '#6d8cff' }],
        category: { name: 'Product', color: '#6d8cff' },
        priority: 'high',
        date: today,
        type: 'day',
        week: weekKey
      }),
      createNote({
        title: 'Write marketing brief',
        description: '<p>Draft the fresh campaign copy and prepare the landing page messaging.</p>',
        tags: [{ name: 'marketing', color: '#5bb8a0' }],
        category: { name: 'Marketing', color: '#5bb8a0' },
        priority: 'medium',
        date: today,
        type: 'day',
        week: weekKey
      }),
      createNote({
        title: 'Customer follow-ups',
        description: '<p>Send pricing notes and schedule the final consultation with repeat clients.</p>',
        tags: [{ name: 'sales', color: '#f4b04e' }],
        category: { name: 'Sale', color: '#f4b04e' },
        priority: 'high',
        date: PlannerDates.addDays(today, 1),
        type: 'day',
        week: weekKey
      }),
      createNote({
        title: 'Weekly planning sync',
        description: '<p>Keep this week focused on priorities, blockers, and delivery milestones.</p>',
        tags: [{ name: 'team', color: '#90a9ff' }],
        category: { name: 'Meeting', color: '#90a9ff' },
        priority: 'medium',
        date: PlannerDates.addDays(today, 2),
        type: 'day',
        week: weekKey
      }),
      createNote({
        title: 'Personal admin',
        description: '<p>Check appointments, plan errands, and review calendar availability.</p>',
        tags: [{ name: 'life', color: '#8ed09d' }],
        category: { name: 'Personal', color: '#8ed09d' },
        priority: 'low',
        date: PlannerDates.addDays(today, 4),
        type: 'day',
        week: weekKey
      }),
      createNote({
        title: 'Focus for the week',
        description: '<p><strong>Priority:</strong> shipping the mobile flow, fixing onboarding friction, and improving retention.</p>',
        tags: [{ name: 'weekly', color: '#b68af8' }],
        category: { name: 'Development', color: '#5db7d1' },
        priority: 'urgent',
        date: today,
        type: 'weekly',
        week: weekKey
      })
    ];
  }

  return {
    createNote,
    getNoteById,
    getNotesForDate,
    getWeeklyNotesForDate,
    getNotesForWeek,
    cloneWeekNotesToNextWeek,
    getSampleNotes
  };
})();
