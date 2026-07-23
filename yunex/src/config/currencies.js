/* YUNEX currencies — display metadata. Live FX rates come from the currency
   service / provider at runtime; this file holds the stable presentation data
   (symbols and which currencies render with zero decimals). */
const SYMBOLS = {
  USD: '$', EUR: '€', GBP: '£', CNY: '¥', JPY: '¥', KRW: '₩', INR: '₹',
  NGN: '₦', GHS: 'GH₵', KES: 'KSh', ZAR: 'R', EGP: 'E£', AED: 'د.إ',
  XOF: 'CFA', XAF: 'FCFA', BHD: 'BD', TRY: '₺', BRL: 'R$', AUD: 'A$',
  CAD: 'C$', RWF: 'FRw', ZMW: 'ZK',
};

// Currencies conventionally shown without decimal places.
const ZERO_DECIMAL = ['JPY', 'KRW', 'NGN', 'XOF', 'XAF', 'RWF'];

// The default currency a viewer sees until they choose one.
const DEFAULT_CURRENCY = 'USD';

module.exports = { SYMBOLS, ZERO_DECIMAL, DEFAULT_CURRENCY };
