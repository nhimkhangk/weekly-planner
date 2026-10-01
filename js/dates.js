const PlannerDates = (() => {
  function toISODate(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function parseISODate(dateString) {
    return new Date(`${dateString}T00:00:00`);
  }

  function addDays(dateString, days) {
    const date = parseISODate(dateString);
    date.setDate(date.getDate() + days);
    return toISODate(date);
  }

  function getStartOfWeek(dateString) {
    const date = parseISODate(dateString);
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    date.setDate(date.getDate() + diff);
    return toISODate(date);
  }

  function getEndOfWeek(dateString) {
    const start = parseISODate(getStartOfWeek(dateString));
    start.setDate(start.getDate() + 6);
    return toISODate(start);
  }

  function getWeekKey(dateString) {
    const date = parseISODate(dateString);
    const target = new Date(date.valueOf());
    const dayNr = (date.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = new Date(target.getFullYear(), 0, 4);
    const firstThursdayDay = (firstThursday.getDay() + 6) % 7;
    firstThursday.setDate(firstThursday.getDate() - firstThursdayDay + 3);
    const week = 1 + Math.round((target - firstThursday) / 604800000);
    return `${target.getFullYear()}-W${String(week).padStart(2, '0')}`;
  }

  function getWeekDates(dateString) {
    const start = parseISODate(getStartOfWeek(dateString));
    const dates = [];
    for (let i = 0; i < 7; i += 1) {
      const next = new Date(start);
      next.setDate(start.getDate() + i);
      dates.push(toISODate(next));
    }
    return dates;
  }

  function getThreeDayDates(dateString) {
    const current = parseISODate(dateString);
    const dates = [];
    for (let i = -1; i <= 1; i += 1) {
      const date = new Date(current);
      date.setDate(current.getDate() + i);
      dates.push(toISODate(date));
    }
    return dates;
  }

  function isSameDay(a, b) {
    return toISODate(parseISODate(a)) === toISODate(parseISODate(b));
  }

  function getTodayISO() {
    return toISODate(new Date());
  }

  function formatLongDate(dateString) {
    const date = parseISODate(dateString);
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  }

  function formatMonthDay(dateString) {
    const date = parseISODate(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric'
    }).format(date);
  }

  function formatDayName(dateString) {
    const date = parseISODate(dateString);
    return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date);
  }

  function formatWeekHeader(dateString) {
    const start = parseISODate(getStartOfWeek(dateString));
    const end = parseISODate(getEndOfWeek(dateString));
    const startText = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(start);
    const endText = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(end);
    return `${startText} — ${endText}`;
  }

  function getWeekNumber(dateString) {
    const weekKey = getWeekKey(dateString);
    return Number(weekKey.split('-W')[1]);
  }

  function getDisplayDate(dateString) {
    const date = parseISODate(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  }

  function getFriendlyDate(dateString) {
    const date = parseISODate(dateString);
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  }

  return {
    toISODate,
    parseISODate,
    addDays,
    getStartOfWeek,
    getEndOfWeek,
    getWeekKey,
    getWeekDates,
    getThreeDayDates,
    isSameDay,
    getTodayISO,
    formatLongDate,
    formatMonthDay,
    formatDayName,
    formatWeekHeader,
    getWeekNumber,
    getDisplayDate,
    getFriendlyDate,
    getCurrentDateLabel: () => new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(new Date())
  };
})();
