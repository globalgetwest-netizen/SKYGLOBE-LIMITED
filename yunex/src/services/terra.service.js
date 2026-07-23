/* TERRA service — the Trust Authority helpers.
   Builds the PUBLIC verification record (verified status + facts + a checkable
   reference). Raw documents are never exposed here; they are shared only inside a
   real transaction, with the seller's consent (watermarked + access-logged). */
const crypto = require('crypto');

const CC_MAP = {
  China: 'CN', Ethiopia: 'ET', Nigeria: 'NG', Ghana: 'GH', Kenya: 'KE',
  'United Arab Emirates': 'AE', Germany: 'DE', Poland: 'PL', Spain: 'ES',
  'United States': 'US', Australia: 'AU', 'DR Congo': 'CD', 'Türkiye': 'TR',
  'South Africa': 'ZA', Rwanda: 'RW', Bahrain: 'BH', Sudan: 'SD',
  "Côte d'Ivoire": 'CI', Zambia: 'ZM', Netherlands: 'NL', Brazil: 'BR',
  Egypt: 'EG', Morocco: 'MA',
};

function countryCode(country) {
  return CC_MAP[country] || (String(country || 'XX').match(/[A-Za-z]{2}/) || ['XX'])[0].toUpperCase();
}

// A stable, checkable verification reference, e.g. TERRA-GH-26-9F41C8A
function verificationRef(country, seed) {
  const cc = countryCode(country);
  const h = crypto.createHash('sha1').update('YUNEX-TERRA-' + String(seed || '')).digest('hex').slice(0, 7).toUpperCase();
  return `TERRA-${cc}-26-${h}`;
}

// Build the public verification object from a company/verification record.
function buildVerification(c, { sample = false, verifiedDate = null } = {}) {
  return {
    verified: sample ? true : !!c.verified,
    sample,
    legal_name: c.legal_name || (c.name ? String(c.name).toUpperCase() : null),
    business_type: c.business_type || null,
    country: c.country || null,
    authority: c.authority || c.reg_authority || null,
    reg_number: c.reg_number || null,
    verified_date: verifiedDate || c.verified_date || null,
    status: (sample || c.verified) ? 'Active' : 'Unverified',
    reference: (sample || c.verified) ? verificationRef(c.country, c.handle || c.name) : null,
  };
}

module.exports = { countryCode, verificationRef, buildVerification };
