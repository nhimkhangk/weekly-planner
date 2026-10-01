const PlannerUI = (() => {
  const TAG_COLORS = ['#6d8cff', '#5bb8a0', '#f4b04e', '#ff8a6b', '#d96c6c', '#b68af8', '#7da6d8', '#8b8f99'];

  function escapeHtml(value = '') {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function sanitizeEditorHtml(value = '', openLinksInNewTab = false) {
    const html = value || '';
    if (!html) return '';
    const container = document.createElement('div');
    container.innerHTML = html;
    const allowedTags = new Set([
      'P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'UL', 'OL', 'LI', 'A', 'BLOCKQUOTE', 'SPAN', 'DIV', 'S',
      'TABLE', 'THEAD', 'TBODY', 'TFOOT', 'TR', 'TH', 'TD', 'CAPTION', 'COLGROUP', 'COL'
    ]);

    const sanitizeNode = (node) => {
      if (!node || node.nodeType !== 1) return;

      const tagName = node.tagName && node.tagName.toUpperCase();
      if (!allowedTags.has(tagName)) {
        const fragment = document.createDocumentFragment();
        while (node.firstChild) {
          const child = node.firstChild;
          sanitizeNode(child);
          fragment.appendChild(child);
        }
        if (node.parentNode) {
          node.parentNode.replaceChild(fragment, node);
        }
        return;
      }

      Array.from(node.attributes).forEach((attr) => {
        if (tagName === 'A' && attr.name === 'href') {
          const url = attr.value.trim();
          if (!/^https?:\/\//i.test(url) && !/^mailto:/i.test(url)) {
            node.removeAttribute(attr.name);
          }
        } else {
          node.removeAttribute(attr.name);
        }
      });

      Array.from(node.childNodes).forEach((child) => sanitizeNode(child));

      if (tagName === 'A' && openLinksInNewTab && node.hasAttribute('href')) {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
      }
    };

    Array.from(container.childNodes).forEach((child) => sanitizeNode(child));
    return container.innerHTML;
  }

  function prepareDescriptionForEditor(value = '') {
    const description = String(value || '');
    if (!description) return '';
    return /<\/?[a-z][^>]*>/i.test(description)
      ? sanitizeEditorHtml(description)
      : renderMarkdown(description);
  }

  function stripHtml(value = '') {
    const html = value || '';
    const div = document.createElement('div');
    div.innerHTML = html;
    return (div.textContent || div.innerText || '').replace(/\s+/g, ' ').trim();
  }

  function truncateText(value, maxLength = 100) {
    const text = stripHtml(value);
    if (!text) return 'No description';
    return text.length > maxLength ? `${text.slice(0, maxLength).trim()}...` : text;
  }

  function renderInlineMarkdown(value) {
    return escapeHtml(value)
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/gi, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.+?)__/g, '<u>$1</u>')
      .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')
      .replace(/&lt;u&gt;(.*?)&lt;\/u&gt;/gi, '<u>$1</u>');
  }

  function renderMarkdown(value) {
    const lines = String(value || '').replace(/\r\n?/g, '\n').split('\n');
    const output = [];
    let listType = '';

    const closeList = () => {
      if (listType) output.push(`</${listType}>`);
      listType = '';
    };

    lines.forEach((line) => {
      const unordered = line.match(/^\s*[-*]\s+(.+)$/);
      const ordered = line.match(/^\s*\d+\.\s+(.+)$/);
      const listMatch = unordered || ordered;

      if (listMatch) {
        const nextType = unordered ? 'ul' : 'ol';
        if (listType !== nextType) {
          closeList();
          output.push(`<${nextType}>`);
          listType = nextType;
        }
        output.push(`<li>${renderInlineMarkdown(listMatch[1])}</li>`);
        return;
      }

      closeList();
      const quote = line.match(/^\s*&gt;\s?(.*)$/);
      if (quote) {
        output.push(`<blockquote>${renderInlineMarkdown(quote[1])}</blockquote>`);
      } else {
        output.push(`${renderInlineMarkdown(line) || '&nbsp;'}<br>`);
      }
    });

    closeList();
    return output.join('').replace(/<br>$/, '');
  }

  function truncateHtml(value, maxLength) {
    const container = document.createElement('div');
    container.innerHTML = value;
    let textLength = 0;

    const removeFollowingSiblings = (node) => {
      while (node.nextSibling) node.parentNode.removeChild(node.nextSibling);
    };

    const trimNode = (node) => {
      const children = Array.from(node.childNodes);
      for (const child of children) {
        if (child.nodeType === 3) {
          const text = child.textContent || '';
          const remaining = maxLength - textLength;
          if (text.length > remaining) {
            child.textContent = `${text.slice(0, remaining)}...`;
            removeFollowingSiblings(child);
            return false;
          }
          textLength += text.length;
        } else if (!trimNode(child)) {
          removeFollowingSiblings(child);
          return false;
        }
      }
      return true;
    };

    trimNode(container);
    return container.innerHTML;
  }

  function renderNoteDescription(value, maxLength) {
    const description = String(value || '').trim();
    if (!description) return 'No description';

    const isLegacyHtml = /<\/?[a-z][^>]*>/i.test(description);
    const rendered = isLegacyHtml ? sanitizeEditorHtml(description, true) : renderMarkdown(description);
    const text = stripHtml(rendered);
    if (!text) return 'No description';
    return maxLength === null || text.length <= maxLength ? rendered : truncateHtml(rendered, maxLength);
  }

  function renderApp(state) {
    const allNotes = PlannerStorage.getNotes();
    const categories = PlannerStorage.getCategories();
    const filterCategories = categories.slice();
    allNotes.forEach((note) => {
      const name = (note.category && note.category.name) || 'General';
      if (!filterCategories.some((category) => category.name.toLowerCase() === name.toLowerCase())) {
        filterCategories.push({
          name,
          color: note.category && note.category.color ? note.category.color : '#8da0ff'
        });
      }
    });
    const selectedCategory = state.categoryFilter || '__all_categories__';
    if (selectedCategory !== '__all_categories__' && !filterCategories.some((category) => (
      category.name.toLowerCase() === selectedCategory.toLowerCase()
    ))) {
      state.categoryFilter = '__all_categories__';
    }
    const notes = state.categoryFilter === '__all_categories__'
      ? allNotes
      : allNotes.filter((note) => (
        ((note.category && note.category.name) || 'General').toLowerCase() === state.categoryFilter.toLowerCase()
      ));
    const selectedDate = state.selectedDate || PlannerDates.getTodayISO();
    const currentDay = PlannerDates.getTodayISO();
    const isDarkTheme = document.documentElement.dataset.theme === 'dark';

    const viewHtml = (() => {
      switch (state.viewMode) {
        case '3days':
          return renderThreeDayView(selectedDate, currentDay, notes, categories, state);
        case 'week':
          return renderWeekView(selectedDate, currentDay, notes, categories, state);
        default:
          return renderTodayView(selectedDate, currentDay, notes, categories, state);
      }
    })();

    $('#app').html(`
      <div class="planner-shell">
        <header class="app-header">
          <div class="app-header-left">
            <h1 class="app-title">Weekly Planner</h1>
            <div class="app-subtitle">${PlannerDates.formatLongDate(selectedDate)}</div>
          </div>

          <div class="view-switch" role="tablist" aria-label="Planner view switcher">
            <button class="view-btn ${state.viewMode === 'today' ? 'active' : ''}" data-action="set-view" data-view="today">Today</button>
            <button class="view-btn ${state.viewMode === '3days' ? 'active' : ''}" data-action="set-view" data-view="3days">3 Days</button>
            <button class="view-btn ${state.viewMode === 'week' ? 'active' : ''}" data-action="set-view" data-view="week">Week</button>
          </div>

          <div class="top-actions">
            <button class="secondary-btn theme-toggle-btn" data-action="toggle-theme" aria-label="${isDarkTheme ? 'Switch to light mode' : 'Switch to dark mode'}" title="${isDarkTheme ? 'Switch to light mode' : 'Switch to dark mode'}" aria-pressed="${isDarkTheme}">
              <svg class="theme-icon theme-icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.2 15.4A8.5 8.5 0 0 1 8.6 3.8 8.5 8.5 0 1 0 20.2 15.4Z"/></svg>
              <svg class="theme-icon theme-icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></svg>
            </button>
            <button class="secondary-btn export-btn" data-action="export-json" aria-label="Export JSON" title="Export JSON">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 17v3h14v-3"/></svg>
              <span>Export JSON</span>
            </button>
            <button class="secondary-btn export-btn" data-action="import-json" aria-label="Import JSON" title="Import JSON">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V3"/><path d="m7 8 5-5 5 5"/><path d="M5 17v3h14v-3"/></svg>
              <span>Import JSON</span>
            </button>
            <input type="file" accept=".json,application/json" data-role="import-json-file" aria-label="Choose planner JSON backup" hidden>
            <button class="primary-btn add-note-icon-btn" data-action="add-note" data-date="${selectedDate}" data-type="day" aria-label="Add note" title="Add note">
              <span aria-hidden="true">+</span>
            </button>
          </div>
        </header>

        <div class="date-nav">
          <div class="nav-group">
            <button data-action="navigate-date" data-direction="-1" aria-label="Previous period">
              <i class="bi bi-chevron-left"></i> Previous
            </button>
            <button class="primary" data-action="today">Today</button>
            <button data-action="navigate-date" data-direction="1" aria-label="Next period">
              Next <i class="bi bi-chevron-right"></i>
            </button>
          </div>
        </div>

        <main class="planner-main">
          ${renderCategoryFilters(filterCategories, allNotes, state.categoryFilter)}
          ${viewHtml}
        </main>
      </div>
    `);
  }

  function renderCategoryFilters(categories, notes, selectedCategory) {
    const allFilter = '__all_categories__';
    const allButton = `
      <button type="button" class="category-filter-chip ${selectedCategory === allFilter ? 'active' : ''}" data-action="filter-category" data-category-filter="${allFilter}" aria-pressed="${selectedCategory === allFilter}">
        <span>All</span>
        <span class="category-filter-count">${notes.length}</span>
      </button>
    `;
    const categoryButtons = categories.map((category) => {
      const name = String(category.name || 'General');
      const color = /^#[\da-f]{6}$/i.test(category.color || '') ? category.color : '#8da0ff';
      const count = notes.filter((note) => (
        ((note.category && note.category.name) || 'General').toLowerCase() === name.toLowerCase()
      )).length;
      const active = selectedCategory.toLowerCase() === name.toLowerCase();

      return `
        <button type="button" class="category-filter-chip ${active ? 'active' : ''}" data-action="filter-category" data-category-filter="${escapeHtml(name)}" aria-pressed="${active}">
          <span class="category-filter-dot" style="--filter-color:${color};"></span>
          <span>${escapeHtml(name)}</span>
          <span class="category-filter-count">${count}</span>
        </button>
      `;
    }).join('');

    return `
      <div class="category-filter-bar" role="group" aria-label="Filter notes by category">
        <span class="category-filter-label">Category</span>
        <div class="category-filter-options">${allButton}${categoryButtons}</div>
      </div>
    `;
  }

  function renderTodayView(selectedDate, currentDay, notes, categories, state) {
    const dayNotes = PlannerNotes.getNotesForDate(selectedDate, notes);
    const weeklyNotes = PlannerNotes.getWeeklyNotesForDate(selectedDate, notes);

    return `
      <section class="today-board">
        ${renderWeeklyNotesSection(selectedDate, weeklyNotes, 'day', state)}
        <div class="board-shell">
          ${renderDayColumn({
            date: selectedDate,
            notes: dayNotes,
            isToday: selectedDate === currentDay,
            mode: 'today',
            state,
            categories,
            showHeader: true,
            allowWeeklyNotes: true
          })}
        </div>
      </section>
    `;
  }

  function renderThreeDayView(selectedDate, currentDay, notes, categories, state) {
    const dates = PlannerDates.getThreeDayDates(selectedDate);
    const weeklyNotes = PlannerNotes.getWeeklyNotesForDate(selectedDate, notes);

    return `
      <section class="three-day-board">
        ${renderWeeklyNotesSection(selectedDate, weeklyNotes, '3days', state)}
        <div class="board-shell">
          ${dates.map((date) => renderDayColumn({
            date,
            notes: PlannerNotes.getNotesForDate(date, notes),
            isToday: date === currentDay,
            mode: '3days',
            state,
            categories,
            showHeader: true
          })).join('')}
        </div>
      </section>
    `;
  }

  function renderWeekView(selectedDate, currentDay, notes, categories, state) {
    const weekDates = PlannerDates.getWeekDates(selectedDate);
    const weeklyNotes = PlannerNotes.getWeeklyNotesForDate(selectedDate, notes);
    const weekNumber = PlannerDates.getWeekNumber(selectedDate);
    const weekRange = PlannerDates.formatWeekHeader(selectedDate);

    return `
      <section class="week-board">
        <div class="week-header">
          <div>
            <div class="week-title">Week ${weekNumber}</div>
          </div>
          <div class="week-header-actions">
            <div class="week-range">${weekRange}</div>
            <button class="secondary-btn" data-action="clone-week-next" title="Clone all notes to the next week">Clone to next week</button>
          </div>
        </div>
        ${renderWeeklyNotesSection(selectedDate, weeklyNotes, 'week', state)}
        <div class="week-day-grid">
          ${weekDates.map((date) => renderDayColumn({
            date,
            notes: PlannerNotes.getNotesForDate(date, notes),
            isToday: date === currentDay,
            mode: 'week',
            state,
            categories,
            showHeader: true
          })).join('')}
        </div>
      </section>
    `;
  }

  function renderWeeklyNotesSection(date, weeklyNotes, mode, state) {
    const notes = weeklyNotes || [];
    const sectionTitle = mode === 'week' ? 'Weekly Notes' : 'This Week';

    return `
      <div class="weekly-section">
        <div class="board-header">
          <h3 class="section-title">${sectionTitle}</h3>
        </div>
        <div class="weekly-list">
          ${notes.length ? notes.map((note) => renderNoteCard(note, state.pendingDeleteId)).join('') : `
            <div class="empty-state">
              <div class="message">No weekly notes</div>
              <button class="add-note-link" data-action="add-note" data-date="${date}" data-type="weekly" aria-label="Add weekly note" title="Add weekly note">
                <span aria-hidden="true">+</span>
              </button>
            </div>
          `}
          ${notes.length ? `
            <button class="add-note-link" data-action="add-note" data-date="${date}" data-type="weekly" aria-label="Add weekly note" title="Add weekly note">
              <span aria-hidden="true">+</span>
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  function renderDayColumn({ date, notes, isToday, mode, state, categories, showHeader }) {
    const header = `
      <div class="day-column-header ${isToday ? 'today' : ''}">
        <div class="day-column-topline">
          <span class="day-name">${PlannerDates.formatDayName(date)}</span>
          ${isToday ? '<span class="today-badge">Today</span>' : ''}
        </div>
        <div class="day-date">${PlannerDates.formatMonthDay(date)}</div>
        <div class="day-meta">
          <span>${PlannerDates.formatLongDate(date).split(', ')[0]}</span>
          <span class="note-count">${notes.length}</span>
        </div>
      </div>
    `;

    const composer = state.composer && state.composer.date === date && state.composer.type === 'day'
      ? renderNoteComposer(state.composer, categories)
      : '';

    const weeklyComposer = state.composer && state.composer.date === date && state.composer.type === 'weekly'
      ? renderNoteComposer(state.composer, categories)
      : '';

    const addButtonHtml = `
      <button class="add-note-link" data-action="add-note" data-date="${date}" data-type="${mode === 'week' ? 'day' : 'day'}" aria-label="Add note" title="Add note">
        <span aria-hidden="true">+</span>
      </button>
    `;

    const noteCards = notes.length ? notes.map((note) => renderNoteCard(note, state.pendingDeleteId)).join('') : `
      <div class="empty-state">
        <div class="message">No notes for this day</div>
        <button class="add-note-link" data-action="add-note" data-date="${date}" data-type="day" aria-label="Add note" title="Add note">
          <span aria-hidden="true">+</span>
        </button>
      </div>
    `;

    return `
      <div class="day-column ${isToday ? 'today' : ''}" data-date="${date}">
        ${header}
        <div class="day-body">
          ${composer || weeklyComposer || noteCards}
          ${!composer && !weeklyComposer ? addButtonHtml : ''}
        </div>
      </div>
    `;
  }

  function formatTimeLabel(value) {
    const match = String(value || '').match(/^(\d{2}):(\d{2})$/);
    if (!match) return 'Any time';
    const hour = Number(match[1]);
    const minute = match[2];
    if (hour > 23 || Number(minute) > 59) return 'Any time';
    const period = hour >= 12 ? 'PM' : 'AM';
    return `${hour % 12 || 12}:${minute} ${period}`;
  }

  function renderNoteCard(note, pendingDeleteId = null) {
    const categoryColor = note.category && note.category.color ? note.category.color : '#8da0ff';
    const timeLabel = formatTimeLabel(note.time);
    const summary = renderNoteDescription(note.description, null);
    const title = escapeHtml(note.title || 'Untitled note');
    const tagsHtml = (note.tags || []).map((tag) => `
      <span class="tag-badge" style="background:${hexToRGBA(tag.color || '#6d8cff', 0.12)}; border-color:${hexToRGBA(tag.color || '#6d8cff', 0.2)}; color:${tag.color || '#3d4e66'};">
        #${escapeHtml(tag.name || 'tag')}
      </span>
    `).join('');

    if (pendingDeleteId === note.id) {
      return `
        <div class="quick-confirm" data-note-id="${note.id}">
          <p>Delete this note?</p>
          <div class="footer-actions">
            <button class="secondary-btn" data-action="cancel-delete">Cancel</button>
            <button class="primary-btn" data-action="confirm-delete">Delete</button>
          </div>
        </div>
      `;
    }

    return `
      <article class="note-card priority-${note.priority || 'medium'}" data-note-id="${note.id}">
        <div class="note-top">
          <div class="note-heading">
            <h4 class="note-title">${title}</h4>
          </div>
          <time class="note-time ${note.time ? '' : 'is-unscheduled'}" datetime="${escapeHtml(note.time || '')}">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
            <span>${timeLabel}</span>
          </time>
        </div>

        <div class="note-content">${summary}</div>

        <div class="note-tags">${tagsHtml || '<span class="tag-badge" style="opacity:0.5;">#untagged</span>'}</div>

        <div class="note-footer">
          <span class="note-category-label">
            <span class="note-category-dot" style="background:${categoryColor};"></span>
            ${escapeHtml((note.category && note.category.name) || 'General')}
          </span>
          <div class="note-actions">
            <button class="note-action-btn" data-action="edit-note" data-id="${note.id}" aria-label="Edit note"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg></button>
            <button class="note-action-btn" data-action="clone-note" data-id="${note.id}" aria-label="Clone note" title="Clone note"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg></button>
            <button class="note-action-btn" data-action="delete-note" data-id="${note.id}" aria-label="Delete note"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="m19 6-1 14H6L5 6"/><path d="M10 11v5M14 11v5"/></svg></button>
          </div>
        </div>
      </article>
    `;
  }

  function renderNoteComposer(composer, categories = []) {
    const categoriesHtml = categories.map((category) => `
      <option value="${escapeHtml(category.name)}" ${composer.category === category.name ? 'selected' : ''}>${escapeHtml(category.name)}</option>
    `).join('');

    const note = composer.noteId ? PlannerNotes.getNoteById(composer.noteId) : null;
    const currentTags = composer.tags || note?.tags || [];
    const savedTags = PlannerStorage.getSavedTags();
    const tagList = currentTags.map((tag) => `
      <span class="tag-chip">
        <span class="color-swatch" style="background:${tag.color || '#6d8cff'};"></span>
        ${escapeHtml(tag.name)}
        <button type="button" data-action="remove-tag" data-tag-name="${escapeHtml(tag.name)}">×</button>
      </span>
    `).join('');

    const savedTagOptions = savedTags.map((tag) => `
      <span class="saved-tag-item">
        <button type="button" class="saved-tag-option" data-action="reuse-tag" data-tag-name="${escapeHtml(tag.name)}" data-tag-color="${tag.color}" title="Reuse ${escapeHtml(tag.name)}">
          <span class="saved-tag-dot" style="background:${tag.color};"></span>
          ${escapeHtml(tag.name)}
        </button>
        <button type="button" class="saved-tag-remove" data-action="delete-saved-tag" data-tag-name="${escapeHtml(tag.name)}" aria-label="Delete saved tag ${escapeHtml(tag.name)}" title="Delete saved tag">×</button>
      </span>
    `).join('');

    const tagColorOptions = TAG_COLORS.map((color) => `
      <button type="button" class="tag-color-option ${composer.tagColor === color ? 'active' : ''}" data-action="select-tag-color" data-tag-color="${color}" style="background:${color};"></button>
    `).join('');

    const titleValue = escapeHtml((note && note.title) || composer.title || '');
    const dateValue = composer.date || note?.date || PlannerDates.getTodayISO();
    const timeValue = note?.time || composer.time || '';
    const typeValue = composer.type || note?.type || 'day';
    const priorityValue = note?.priority || composer.priority || 'medium';
    const descriptionHtml = note ? prepareDescriptionForEditor(note.description) : '';

    return `
      <div class="note-composer" data-composer-date="${dateValue}" data-composer-type="${typeValue}" data-note-id="${note ? note.id : ''}">
        <div class="form-grid">
          <div>
            <label class="form-label">Title</label>
            <input type="text" name="title" value="${titleValue}" placeholder="Title..." autofocus />
          </div>

          <div>
            <label class="form-label">Description</label>
            <div class="rich-editor">
              <div class="editor-toolbar">
                <button type="button" class="editor-button" data-command="bold" aria-label="Bold" title="Bold"><strong>B</strong></button>
                <button type="button" class="editor-button" data-command="italic" aria-label="Italic" title="Italic"><em>I</em></button>
                <button type="button" class="editor-button" data-command="underline" aria-label="Underline" title="Underline"><span style="text-decoration: underline;">U</span></button>
                <button type="button" class="editor-button" data-command="insertUnorderedList" aria-label="Bulleted list" title="Bulleted list">• List</button>
                <button type="button" class="editor-button" data-command="insertOrderedList" aria-label="Numbered list" title="Numbered list">1. List</button>
                <button type="button" class="editor-button" data-command="quote" aria-label="Quote" title="Quote">Quote</button>
                <button type="button" class="editor-button" data-command="link" aria-label="Insert link" title="Insert link">Link</button>
                <button type="button" class="editor-button" data-command="clear" aria-label="Clear description" title="Clear description">Clear</button>
              </div>
              <div class="editor-link-form" hidden>
                <input type="text" data-role="editor-link-url" placeholder="https://example.com" aria-label="Link URL" />
                <button type="button" class="mini-btn editor-link-apply">Insert link</button>
                <button type="button" class="secondary-btn editor-link-cancel">Cancel</button>
              </div>
              <div name="description" class="editor-content" contenteditable="true" role="textbox" aria-label="Description" aria-multiline="true" data-placeholder="Write a quick note...">${descriptionHtml}</div>
            </div>
          </div>

          <div class="row-fields">
            <div>
              <label class="form-label">Category</label>
              <select name="category">
                ${categoriesHtml}
              </select>
            </div>
            <div>
              <label class="form-label">Priority</label>
              <select name="priority">
                <option value="low" ${priorityValue === 'low' ? 'selected' : ''}>Low</option>
                <option value="medium" ${priorityValue === 'medium' ? 'selected' : ''}>Medium</option>
                <option value="high" ${priorityValue === 'high' ? 'selected' : ''}>High</option>
                <option value="urgent" ${priorityValue === 'urgent' ? 'selected' : ''}>Urgent</option>
              </select>
            </div>
          </div>

          <div class="row-fields three-fields">
            <div>
              <label class="form-label">Date</label>
              <input type="date" name="date" value="${dateValue}" />
            </div>
            <div>
              <label class="form-label">Time</label>
              <input type="time" name="time" value="${escapeHtml(timeValue)}" />
            </div>
            <div>
              <label class="form-label">Type</label>
              <select name="type">
                <option value="day" ${typeValue === 'day' ? 'selected' : ''}>Day</option>
                <option value="weekly" ${typeValue === 'weekly' ? 'selected' : ''}>Weekly</option>
              </select>
            </div>
          </div>

          <div>
            <label class="form-label">Tags</label>
            <div class="tag-list">${tagList || '<span class="tag-chip" style="opacity:0.5;">No tags</span>'}</div>
            <div class="tag-input-wrap" style="margin-top: 8px;">
              <input class="tag-input" type="text" data-role="tag-input" placeholder="Add tag" />
              <input type="color" data-role="tag-color" value="${composer.tagColor || '#6d8cff'}" aria-label="Tag color" />
              <button type="button" class="mini-btn" data-action="add-tag">Add</button>
            </div>
            <div class="tag-color-picker">${tagColorOptions}</div>
            ${savedTagOptions ? `<div class="saved-tag-picker"><span>Saved tags</span><div class="saved-tag-list">${savedTagOptions}</div></div>` : ''}
          </div>

          <div class="controls">
            <div></div>
            <div class="footer-actions">
              <button type="button" class="secondary-btn" data-action="cancel-composer">Cancel</button>
              <button type="button" class="primary-btn" data-action="save-note">Save</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function hexToRGBA(hex, alpha) {
    const val = hex.replace('#', '');
    const full = val.length === 3 ? val.split('').map((char) => char + char).join('') : val;
    const num = parseInt(full, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function capitalize(value = '') {
    return String(value).charAt(0).toUpperCase() + String(value).slice(1);
  }

  return {
    renderApp,
    renderNoteComposer,
    renderNoteCard,
    renderWeeklyNotesSection,
    escapeHtml,
    stripHtml,
    truncateText,
    sanitizeEditorHtml,
    prepareDescriptionForEditor,
    TAG_COLORS
  };
})();
