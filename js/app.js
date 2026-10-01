const PlannerApp = (() => {
  const state = {
    viewMode: '3days',
    selectedDate: PlannerDates.getTodayISO(),
    categoryFilter: '__all_categories__',
    composer: null,
    pendingDeleteId: null
  };
  let savedEditorRange = null;

  function seedDataIfNeeded() {
    if (localStorage.getItem('weeklyPlannerNotes') === null) {
      PlannerStorage.saveNotes(PlannerNotes.getSampleNotes());
    }
    PlannerStorage.getCategories();
  }

  function init() {
    const savedTheme = localStorage.getItem('weeklyPlannerTheme');
    document.documentElement.dataset.theme = savedTheme === 'dark' ? 'dark' : 'light';
    seedDataIfNeeded();
    bindEvents();
    render();
  }

  function render() {
    PlannerUI.renderApp(state);
    bindEditorActions();
  }

  function renderComposerPreservingDraft() {
    const currentComposer = $('.note-composer').first();
    if (!currentComposer.length) {
      render();
      return;
    }

    const draft = {
      title: currentComposer.find('input[name="title"]').val(),
      description: currentComposer.find('.editor-content').html() || '',
      category: currentComposer.find('select[name="category"]').val(),
      priority: currentComposer.find('select[name="priority"]').val(),
      date: currentComposer.find('input[name="date"]').val(),
      time: currentComposer.find('input[name="time"]').val(),
      tagColor: currentComposer.find('[data-role="tag-color"]').val()
    };

    render();

    const nextComposer = $('.note-composer').first();
    nextComposer.find('input[name="title"]').val(draft.title);
    nextComposer.find('.editor-content').html(PlannerUI.sanitizeEditorHtml(draft.description));
    nextComposer.find('select[name="category"]').val(draft.category);
    nextComposer.find('select[name="priority"]').val(draft.priority);
    nextComposer.find('input[name="date"]').val(draft.date);
    nextComposer.find('input[name="time"]').val(draft.time);
    nextComposer.find('[data-role="tag-color"]').val(draft.tagColor);
  }

  function exportJsonData() {
    const file = new Blob([JSON.stringify(PlannerStorage.exportData(), null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(file);
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = `weekly-planner-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function bindEvents() {
    $(document).on('click', '[data-action="export-json"]', exportJsonData);

    $(document).on('click', '[data-action="toggle-theme"]', function () {
      const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = theme;
      localStorage.setItem('weeklyPlannerTheme', theme);
      $(this)
        .attr('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode')
        .attr('title', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode')
        .attr('aria-pressed', theme === 'dark');
    });

    $(document).on('click', '[data-action="filter-category"]', function () {
      state.categoryFilter = $(this).attr('data-category-filter');
      if (state.composer) renderComposerPreservingDraft();
      else render();
    });

    $(document).on('click', '[data-action="set-view"]', function () {
      state.viewMode = $(this).data('view');
      state.composer = null;
      render();
    });

    $(document).on('click', '[data-action="navigate-date"]', function () {
      const direction = Number($(this).data('direction')) || 1;
      const delta = state.viewMode === 'today' ? direction : state.viewMode === '3days' ? direction * 3 : direction * 7;
      state.selectedDate = PlannerDates.addDays(state.selectedDate, delta);
      state.composer = null;
      render();
    });

    $(document).on('click', '[data-action="clone-week-next"]', function () {
      const notes = PlannerStorage.getNotes();
      const clones = PlannerNotes.cloneWeekNotesToNextWeek(state.selectedDate, notes);
      if (!clones.length) {
        window.alert('There are no notes to clone from this week.');
        return;
      }

      const sourceStart = PlannerDates.getStartOfWeek(state.selectedDate);
      const nextWeekStart = PlannerDates.addDays(sourceStart, 7);
      const sourceRange = PlannerDates.formatWeekHeader(state.selectedDate);
      const targetRange = PlannerDates.formatWeekHeader(nextWeekStart);
      const confirmed = window.confirm(
        `Clone ${clones.length} notes from ${sourceRange} to ${targetRange}? Existing notes in the next week will be kept.`
      );
      if (!confirmed) return;

      PlannerStorage.saveNotes([...notes, ...clones]);
      state.selectedDate = nextWeekStart;
      state.composer = null;
      state.pendingDeleteId = null;
      render();
    });

    $(document).on('click', '[data-action="today"]', function () {
      state.selectedDate = PlannerDates.getTodayISO();
      state.composer = null;
      render();
    });

    $(document).on('click', '[data-action="add-note"]', function () {
      const date = $(this).data('date') || state.selectedDate;
      const type = $(this).data('type') || 'day';
      state.composer = {
        date,
        type,
        time: '',
        title: '',
        tags: [],
        tagColor: '#6d8cff',
        priority: 'medium',
        category: PlannerStorage.getCategories()[0]?.name || 'General'
      };
      render();
      setTimeout(() => {
        const titleInput = $('.note-composer input[name="title"]:first');
        titleInput.focus();
        titleInput.select();
      }, 0);
    });

    $(document).on('click', '[data-action="edit-note"]', function () {
      const id = $(this).data('id');
      const note = PlannerNotes.getNoteById(id, PlannerStorage.getNotes());
      if (!note) return;
      state.composer = {
        noteId: note.id,
        date: note.date,
        time: note.time || '',
        type: note.type || 'day',
        title: note.title,
        tags: note.tags || [],
        tagColor: note.tags && note.tags[0] ? note.tags[0].color : '#6d8cff',
        priority: note.priority || 'medium',
        category: note.category && note.category.name ? note.category.name : 'General'
      };
      render();
      setTimeout(() => {
        const titleInput = $('.note-composer input[name="title"]:first');
        if (titleInput.length) {
          titleInput.focus();
          titleInput.select();
        }
      }, 0);
    });

    $(document).on('click', '[data-action="clone-note"]', function () {
      const id = $(this).data('id');
      const note = PlannerNotes.getNoteById(id, PlannerStorage.getNotes());
      if (!note) return;

      const clone = PlannerNotes.createNote({
        title: `${note.title || 'Untitled note'} (copy)`,
        description: note.description,
        tags: (note.tags || []).map((tag) => typeof tag === 'object' ? { ...tag } : tag),
        category: note.category && typeof note.category === 'object' ? { ...note.category } : note.category,
        priority: note.priority,
        date: note.date,
        time: note.time,
        type: note.type,
        week: note.week
      });

      PlannerStorage.addNote(clone);
      state.selectedDate = clone.date;
      state.composer = null;
      state.pendingDeleteId = null;
      render();
    });

    $(document).on('click', '[data-action="delete-note"]', function () {
      const id = $(this).data('id');
      state.pendingDeleteId = id;
      render();
    });

    $(document).on('click', '[data-action="cancel-delete"]', function () {
      state.pendingDeleteId = null;
      render();
    });

    $(document).on('click', '[data-action="cancel-composer"]', function () {
      state.composer = null;
      render();
    });

    $(document).on('click', '[data-action="save-note"]', function () {
      saveCurrentComposer();
    });

    $(document).on('click', '[data-action="add-tag"]', function () {
      const composerEl = $(this).closest('.note-composer');
      const tagInput = composerEl.find('[data-role="tag-input"]');
      const tagName = (tagInput.val() || '').trim();
      if (!tagName) return;
      const color = composerEl.find('[data-role="tag-color"]').val() || '#6d8cff';
      const nextTags = [...(state.composer?.tags || [])];
      const savedTag = PlannerStorage.rememberTag({ name: tagName, color });
      const existingIndex = nextTags.findIndex((tag) => tag.name.toLowerCase() === tagName.toLowerCase());
      if (existingIndex === -1) nextTags.push(savedTag);
      else nextTags[existingIndex] = savedTag;
      state.composer = {
        ...(state.composer || {}),
        tags: nextTags,
        tagColor: color
      };
      tagInput.val('');
      renderComposerPreservingDraft();
    });

    $(document).on('click', '[data-action="reuse-tag"]', function () {
      const name = $(this).data('tag-name');
      const color = $(this).data('tag-color') || '#6d8cff';
      const nextTags = [...(state.composer?.tags || [])];
      if (!nextTags.some((tag) => tag.name.toLowerCase() === name.toLowerCase())) {
        nextTags.push({ name, color });
      }
      state.composer = {
        ...(state.composer || {}),
        tags: nextTags,
        tagColor: color
      };
      renderComposerPreservingDraft();
    });

    $(document).on('click', '[data-action="delete-saved-tag"]', function () {
      PlannerStorage.deleteSavedTag($(this).data('tag-name'));
      renderComposerPreservingDraft();
    });

    $(document).on('click', '[data-action="remove-tag"]', function () {
      const tagName = $(this).data('tag-name');
      const tags = (state.composer?.tags || []).filter((tag) => tag.name !== tagName);
      state.composer = {
        ...(state.composer || {}),
        tags
      };
      renderComposerPreservingDraft();
    });

    $(document).on('click', '[data-action="select-tag-color"]', function () {
      const color = $(this).data('tag-color');
      if (!state.composer) return;
      state.composer.tagColor = color;
      const composerEl = $(this).closest('.note-composer');
      composerEl.find('[data-role="tag-color"]').val(color);
      composerEl.find('.tag-color-option').removeClass('active');
      $(this).addClass('active');
    });

    $(document).on('keydown', '.note-composer input[name="title"]', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        saveCurrentComposer();
      }
      if (event.key === 'Escape') {
        state.composer = null;
        render();
      }
    });

    $(document).on('keydown', '.note-composer', function (event) {
      if (event.key === 'Escape') {
        state.composer = null;
        render();
      }
    });

    $(document).on('click', '[data-action="confirm-delete"]', function () {
      if (!state.pendingDeleteId) return;
      PlannerStorage.deleteNote(state.pendingDeleteId);
      state.pendingDeleteId = null;
      state.composer = null;
      render();
    });
  }

  function saveCurrentComposer() {
    if (!state.composer) return;

    const composerEl = $('.note-composer').first();
    if (!composerEl.length) return;

    const title = composerEl.find('input[name="title"]').val().trim();
    const date = composerEl.find('input[name="date"]').val() || PlannerDates.getTodayISO();
    const time = composerEl.find('input[name="time"]').val() || '';
    const noteType = composerEl.find('select[name="type"]').val() || 'day';
    const categoryName = composerEl.find('select[name="category"]').val() || 'General';
    const priority = composerEl.find('select[name="priority"]').val() || 'medium';
    const descriptionEditor = composerEl.find('.editor-content');
    const descriptionValue = descriptionEditor.html() || '';
    const rawDescription = PlannerUI.sanitizeEditorHtml(descriptionValue);
    const descriptionText = descriptionEditor.text().replace(/\u00a0/g, ' ').trim();
    const tags = state.composer?.tags || [];
    const categories = PlannerStorage.getCategories();
    const category = categories.find((item) => item.name === categoryName) || { name: categoryName, color: '#6d8cff' };
    const noteId = state.composer.noteId;

    if (!title && !descriptionText) {
      return;
    }

    const nextNote = {
      id: noteId || `note_${Date.now()}`,
      title: title || 'Untitled note',
      description: rawDescription,
      tags,
      category,
      priority,
      createdAt: noteId ? undefined : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      date,
      time,
      type: noteType,
      week: PlannerDates.getWeekKey(date)
    };

    const finalNote = PlannerNotes.createNote(nextNote);

    if (noteId) {
      const existing = PlannerNotes.getNoteById(noteId, PlannerStorage.getNotes());
      if (existing) {
        finalNote.createdAt = existing.createdAt;
        PlannerStorage.updateNote(noteId, finalNote);
      }
    } else {
      PlannerStorage.addNote(finalNote);
    }

    state.composer = null;
    state.pendingDeleteId = null;
    render();
  }

  function bindEditorActions() {
    const editorButtons = $('.editor-button');
    if (!editorButtons.length) return;

    editorButtons.off('mousedown').on('mousedown', function (event) {
      event.preventDefault();
    });

    editorButtons.off('click').on('click', function () {
      const command = $(this).data('command');
      const editor = $(this).closest('.rich-editor').find('.editor-content');
      if (!editor.length) return;

      if (command === 'link') {
        saveEditorSelection(editor.get(0));
        const linkForm = $(this).closest('.rich-editor').find('.editor-link-form');
        linkForm.prop('hidden', false);
        linkForm.find('[data-role="editor-link-url"]').val('').trigger('focus');
        return;
      }

      if (command === 'clear') {
        editor.empty();
        editor.trigger('focus');
        return;
      }

      editor.trigger('focus');
      const execCommand = command === 'quote' ? 'formatBlock' : command;
      const value = command === 'quote' ? 'blockquote' : null;
      document.execCommand(execCommand, false, value);
      editor.trigger('focus');
    });

    $('.editor-link-apply').off('click').on('click', function () {
      const richEditor = $(this).closest('.rich-editor');
      const editor = richEditor.find('.editor-content').get(0);
      const url = (richEditor.find('[data-role="editor-link-url"]').val() || '').trim();
      if (!editor || (!/^https?:\/\//i.test(url) && !/^mailto:/i.test(url))) return;

      restoreEditorSelection(editor);
      const selection = window.getSelection();
      if (savedEditorRange && !savedEditorRange.collapsed) {
        document.execCommand('createLink', false, url);
      } else if (selection && selection.rangeCount) {
        const range = selection.getRangeAt(0);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.textContent = url;
        range.insertNode(anchor);
        range.setStartAfter(anchor);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }

      richEditor.find('.editor-link-form').prop('hidden', true);
      $(editor).trigger('focus');
      savedEditorRange = null;
    });

    $('.editor-link-cancel').off('click').on('click', function () {
      const richEditor = $(this).closest('.rich-editor');
      richEditor.find('.editor-link-form').prop('hidden', true);
      richEditor.find('.editor-content').trigger('focus');
      savedEditorRange = null;
    });
  }

  function saveEditorSelection(editor) {
    const selection = window.getSelection();
    if (selection && selection.rangeCount && editor.contains(selection.anchorNode)) {
      savedEditorRange = selection.getRangeAt(0).cloneRange();
    } else {
      savedEditorRange = null;
    }
  }

  function restoreEditorSelection(editor) {
    if (!savedEditorRange) {
      editor.focus();
      return;
    }

    const selection = window.getSelection();
    if (!selection) return;
    editor.focus();
    selection.removeAllRanges();
    selection.addRange(savedEditorRange);
  }

  return {
    init,
    state
  };
})();

$(function () {
  PlannerApp.init();
});
