/* YUNEX trade corridors — the global trade lanes inside YUNEX Trade. */
const CORRIDORS = [
  { key: 'china',   label: 'China Corridor',   flag: '🇨🇳', blurb: 'Verified suppliers, sourcing & settlement with China.' },
  { key: 'gulf',    label: 'Gulf Corridor',    flag: '🌙', blurb: 'Trade with the Gulf & Middle East markets.' },
  { key: 'europe',  label: 'Europe Corridor',  flag: '🇪🇺', blurb: 'Sourcing and export with European partners.' },
  { key: 'america', label: 'America Corridor',  flag: '🌎', blurb: 'North & South American trade lanes.' },
  { key: 'oceania', label: 'Oceania Corridor', flag: '🌏', blurb: 'Australia, New Zealand & the Pacific.' },
  { key: 'africa',  label: 'Africa Corridor',  flag: '🌍', blurb: 'The continent trading with itself — AfCFTA, the mission.' },
];

const VALID_CORRIDORS = CORRIDORS.map(c => c.key);

module.exports = { CORRIDORS, VALID_CORRIDORS };
