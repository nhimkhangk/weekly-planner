# Weekly Planner Notes

A lightweight weekly planner built with HTML, CSS, and jQuery. It stores notes in browser localStorage and lets users move between Today, 3 Days, and Week views without a backend.

## Run the project

1. Open the folder in a browser.
2. Double-click `index.html` or open it with any static file server.
3. The app starts immediately and saves note data to your browser.

## Project structure

- `index.html` — app shell and dependencies
- `css/style.css` — app layout and visual styling
- `js/dates.js` — date and week utilities
- `js/storage.js` — localStorage access and category defaults
- `js/notes.js` — note model and demo seed data
- `js/ui.js` — rendering and note card/composer templates
- `js/app.js` — app state and event handling

## Data model

Each note contains:

- `id`
- `title`
- `description`
- `tags`
- `category`
- `priority`
- `createdAt`
- `updatedAt`
- `date`
- `time`
- `type`

Notes are stored under the `weeklyPlannerNotes` key in localStorage. Categories are stored under `weeklyPlannerCategories`, and reusable tag names/colors under `weeklyPlannerTags`.

Use **Export JSON** in the header to download a backup containing notes, categories, saved tags, the schema version, and export timestamp. Use **Import JSON** to restore a backup created by the planner; importing replaces the current notes, categories, and saved tags after confirmation. **Refresh** replaces them with `data.json` after confirmation. Refresh requires the app to be served over HTTP, since browsers block loading local files from pages opened with `file://`. Daily changes continue to save to localStorage.

## How localStorage works

The app reads and writes to browser localStorage on every add, edit, or delete action. If no notes are present, the app seeds demo notes automatically so the planner is useful immediately.

## View modes

- Today: shows one day and the weekly notes for that week
- 3 Days: shows yesterday, today, and tomorrow
- Week: shows Monday through Sunday and a dedicated weekly notes area

## Add, edit, and delete notes

- Use the Add Note button in any day column
- Click a note card to edit it inline
- Use the trash icon to delete a note
- Confirm before deletion to avoid accidental removal

## Notes and editor details

- Description uses a lightweight built-in editor for bold, italic, underline, lists, quotes, and links
- Formatted descriptions are sanitized and stored as HTML in the note JSON in browser localStorage
- Tags can be added and removed in the inline composer
- Priority, category, date, and note type are editable from the same form
- Changes are saved instantly and persist after refresh
