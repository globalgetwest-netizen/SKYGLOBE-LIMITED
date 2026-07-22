/* Search service — pure filtering over listings (pillar / corridor / free text).
   No I/O; the server layer decides when to use it (e.g. as a fallback when the
   live database has no rows yet). */
const { VALID_PILLARS } = require('../config/pillars');
const { VALID_CORRIDORS } = require('../config/corridors');

function filterListings(listings, { pillar, corridor, q } = {}) {
  let rows = listings || [];
  if (pillar && VALID_PILLARS.includes(pillar)) rows = rows.filter(l => l.pillar === pillar);
  if (corridor && VALID_CORRIDORS.includes(corridor)) rows = rows.filter(l => l.corridor === corridor);
  if (q) {
    const s = String(q).toLowerCase();
    rows = rows.filter(l => `${l.title} ${l.description} ${l.category} ${l.location}`.toLowerCase().includes(s));
  }
  return rows;
}

module.exports = { filterListings };
