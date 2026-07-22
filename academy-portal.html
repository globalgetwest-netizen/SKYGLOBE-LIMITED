/* Currency service — pure formatting & conversion helpers.
   Live rates are injected by the caller (fetched from the FX provider at
   runtime); these functions do no I/O so they are trivially testable. */
const { SYMBOLS, ZERO_DECIMAL, DEFAULT_CURRENCY } = require('../config/currencies');

function format(amount, currency) {
  const sym = SYMBOLS[currency] || '';
  const dp = ZERO_DECIMAL.includes(currency) ? 0 : 2;
  return sym + Number(amount).toLocaleString(undefined, { maximumFractionDigits: dp });
}

// Convert `amount` from `from` currency into `to`, given a { CODE: rateVsBase } map.
function convert(amount, from, to, rates) {
  if (!rates || rates[from] == null || rates[to] == null) return null;
  return (amount / rates[from]) * rates[to];
}

module.exports = { format, convert, DEFAULT_CURRENCY };
