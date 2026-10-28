
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// "YYYY-MM-DD" ko India ke midnight instant mein convert karta hai.
const parseBookingDate = (value) => {
  if (typeof value !== "string") return null;

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const [, y, m, d] = match;
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);

  const calendarDate = new Date(Date.UTC(year, month - 1, day));

  if (
    calendarDate.getUTCFullYear() !== year ||
    calendarDate.getUTCMonth() !== month - 1 ||
    calendarDate.getUTCDate() !== day
  ) {
    return null;
  }

  return new Date(
    Date.UTC(year, month - 1, day) - IST_OFFSET_MS
  );
};

// India ki current calendar date ka midnight instant.
const getTodayIST = () => {
  const now = new Date();
  const indiaNow = new Date(now.getTime() + IST_OFFSET_MS);

  return new Date(
    Date.UTC(
      indiaNow.getUTCFullYear(),
      indiaNow.getUTCMonth(),
      indiaNow.getUTCDate()
    ) - IST_OFFSET_MS
  );
};

module.exports = { parseBookingDate, getTodayIST };
