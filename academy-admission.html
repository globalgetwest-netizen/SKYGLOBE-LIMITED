/* YUNEX listing schema — the canonical shape of a marketplace listing, plus a
   light validator used to keep seed data (and, later, seller submissions) honest.

   A listing (compact seed form):
   {
     pillar:     string  // one of config/pillars VALID_PILLARS   (required)
     category:   string  // from config/pillars CATEGORIES[pillar]
     corridor:   string  // one of config/corridors VALID_CORRIDORS
     title:      string  // (required)
     description:string
     price:      number|null   // in `currency`; null = "contact for price"
     currency:   string        // ISO code, see config/currencies
     quantity:   string        // human availability, e.g. "500 tonnes"
     location:   string        // "City, Country"
     seller:     string        // public seller / company name
     country:    string
     saves:      number        // social proof
     img:        string        // primary image URL
     details: {
       brand, manufacturer, origin, condition, warranty,
       unit, min_order, sku, video_url,
       specs: [{ k: string, v: string }]
     }
   }
*/
const { VALID_PILLARS } = require('../config/pillars');

const REQUIRED = ['pillar', 'title'];

function validateListing(l) {
  const errors = [];
  if (!l || typeof l !== 'object') return ['listing must be an object'];
  for (const f of REQUIRED) if (!l[f]) errors.push(`missing required field: ${f}`);
  if (l.pillar && !VALID_PILLARS.includes(l.pillar)) errors.push(`invalid pillar: ${l.pillar}`);
  if (l.price != null && typeof l.price !== 'number') errors.push('price must be a number or null');
  if (l.details && l.details.specs && !Array.isArray(l.details.specs)) errors.push('details.specs must be an array');
  return errors;
}

// Validate an array; returns { ok, count, problems: [{ index, title, errors }] }
function validateAll(listings) {
  const problems = [];
  (listings || []).forEach((l, i) => {
    const e = validateListing(l);
    if (e.length) problems.push({ index: i, title: l && l.title, errors: e });
  });
  return { ok: problems.length === 0, count: (listings || []).length, problems };
}

module.exports = { validateListing, validateAll, REQUIRED };
