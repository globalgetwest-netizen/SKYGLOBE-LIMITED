/* YUNEX pillars — the top-level categories of the marketplace.
   `key` is the stable identifier used in data, routes and filters. */
const PILLARS = {
  trade:      { key: 'trade',      label: 'Trade',       icon: '🔁' },
  investment: { key: 'investment', label: 'Investment',  icon: '📈' },
  assets:     { key: 'assets',     label: 'Assets',      icon: '🏝️' },
  business:   { key: 'business',   label: 'Business',    icon: '🏢' },
  finance:    { key: 'finance',    label: 'Finance',     icon: '💰' },
  services:   { key: 'services',   label: 'Services',    icon: '🛠️' },
  consumer:   { key: 'consumer',   label: 'Marketplace', icon: '🛍️' },
};

// Curated category taxonomy per pillar (premium, organised).
const CATEGORIES = {
  consumer:   ['Electronics', 'Fashion & Apparel', 'Home & Furniture', 'Health & Beauty', 'Food & Grocery', 'Sports & Outdoors', 'Baby & Kids', 'Automotive', 'Jewelry & Watches', 'Books & Media', 'Phones & Accessories', 'Computers'],
  trade:      ['Agriculture & Produce', 'Raw Materials', 'Industrial Equipment', 'Construction Materials', 'Machinery', 'Textiles & Fabrics', 'Chemicals', 'Packaging', 'Metals & Minerals', 'Renewable Energy', 'Medical Supplies', 'Food Ingredients'],
  services:   ['Consulting', 'Legal Services', 'Engineering', 'Design & Creative', 'Software & Development', 'Marketing & Media', 'Logistics & Freight', 'Translation', 'Accounting & Finance', 'Architecture', 'Training', 'Repair & Maintenance'],
  assets:     ['Land', 'Residential Property', 'Commercial Property', 'Vehicles', 'Heavy Machinery', 'Equipment', 'Farms', 'Warehouses'],
  investment: ['Startups', 'Real Estate Projects', 'Agriculture Projects', 'Franchises', 'Manufacturing', 'Energy Projects', 'SME Equity'],
  business:   ['Wholesale', 'Distribution', 'Manufacturing', 'Import / Export', 'Sourcing', 'Private Label', 'Dropshipping'],
  finance:    ['Business Loans', 'Trade Finance', 'Insurance', 'Merchant Services'],
};

const VALID_PILLARS = Object.keys(PILLARS);

module.exports = { PILLARS, CATEGORIES, VALID_PILLARS };
