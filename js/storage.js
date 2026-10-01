const PlannerStorage = (() => {
  const NOTES_KEY = 'weeklyPlannerNotes';
  const CATEGORIES_KEY = 'weeklyPlannerCategories';
  const TAGS_KEY = 'weeklyPlannerTags';

  function getNotes() {
    const stored = localStorage.getItem(NOTES_KEY);
    if (!stored) return [];
    try {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn('Failed to parse notes from localStorage', error);
      return [];
    }
  }

  function saveNotes(notes) {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  }

  function addNote(note) {
    const notes = getNotes();
    notes.push(note);
    saveNotes(notes);
    return note;
  }

  function updateNote(id, nextNote) {
    const notes = getNotes();
    const index = notes.findIndex((note) => note.id === id);
    if (index === -1) return null;
    notes[index] = { ...notes[index], ...nextNote, updatedAt: new Date().toISOString() };
    saveNotes(notes);
    return notes[index];
  }

  function deleteNote(id) {
    const notes = getNotes().filter((note) => note.id !== id);
    saveNotes(notes);
  }

  function getCategories() {
    const stored = localStorage.getItem(CATEGORIES_KEY);
    if (!stored) {
      return defaultCategories();
    }
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length) return parsed;
      return defaultCategories();
    } catch (error) {
      console.warn('Failed to parse categories from localStorage', error);
      return defaultCategories();
    }
  }

  function saveCategories(categories) {
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
  }

  function getSavedTags() {
    const stored = localStorage.getItem(TAGS_KEY);
    if (!stored) return [];
    try {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed.filter((tag) => (
        tag && typeof tag.name === 'string' && tag.name.trim() && /^#[\da-f]{6}$/i.test(tag.color || '')
      )) : [];
    } catch (error) {
      console.warn('Failed to parse saved tags from localStorage', error);
      return [];
    }
  }

  function rememberTag(tag) {
    const name = String((tag && tag.name) || '').trim();
    if (!name) return null;

    const savedTags = getSavedTags();
    const normalizedTag = {
      name,
      color: /^#[\da-f]{6}$/i.test((tag && tag.color) || '') ? tag.color : '#6d8cff'
    };
    const existingIndex = savedTags.findIndex((savedTag) => savedTag.name.toLowerCase() === name.toLowerCase());

    if (existingIndex === -1) {
      savedTags.push(normalizedTag);
    } else {
      savedTags[existingIndex] = normalizedTag;
    }

    localStorage.setItem(TAGS_KEY, JSON.stringify(savedTags));
    return normalizedTag;
  }

  function deleteSavedTag(name) {
    const normalizedName = String(name || '').trim().toLowerCase();
    if (!normalizedName) return;
    const savedTags = getSavedTags().filter((tag) => tag.name.toLowerCase() !== normalizedName);
    localStorage.setItem(TAGS_KEY, JSON.stringify(savedTags));
  }

  function exportData() {
    return {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      notes: getNotes(),
      categories: getCategories(),
      tags: getSavedTags()
    };
  }

  function defaultCategories() {
    const categories = [
      { name: 'Teky', color: '#6d8cff' },
      { name: 'THCS Mỹ Phước', color: '#5bb8a0' },
      { name: 'THCS Mỹ Thạnh', color: '#f4b04e' },
      { name: 'All', color: '#ff8a6b' }
    ];
    saveCategories(categories);
    return categories;
  }

  return {
    getNotes,
    saveNotes,
    addNote,
    updateNote,
    deleteNote,
    getCategories,
    saveCategories,
    getSavedTags,
    rememberTag,
    deleteSavedTag,
    exportData,
    defaultCategories
  };
})();
