/* YUNEX data + config entry point.
   Aggregates the modular data (listings split per pillar, plus rfqs / events /
   posts / companies) and re-exports the config, schema and services so the rest
   of the app has a single, clean import surface:

     const yunex = require('./yunex/src');
     yunex.listings   // all showcase listings (every pillar)
     yunex.rfqs / events / posts / companies
     yunex.config.PILLARS / CORRIDORS / currencies
     yunex.schema.validateAll(...)
     yunex.services.terra / search / currency
*/
const consumer   = require('./data/listings/consumer');
const trade      = require('./data/listings/trade');
const investment = require('./data/listings/investment');
const assets     = require('./data/listings/assets');
const services_  = require('./data/listings/services');
const business   = require('./data/listings/business');
const finance    = require('./data/listings/finance');

const listingsByPillar = { consumer, trade, investment, assets, services: services_, business, finance };
const listings = [].concat(consumer, trade, investment, assets, services_, business, finance);

const rfqs      = require('./data/rfqs');
const events    = require('./data/events');
const posts     = require('./data/posts');
const companies = require('./data/companies');

const pillars    = require('./config/pillars');
const corridors  = require('./config/corridors');
const currencies = require('./config/currencies');

const schema = require('./schemas/listing.schema');

const terra    = require('./services/terra.service');
const search   = require('./services/search.service');
const currency = require('./services/currency.service');

module.exports = {
  // data
  listings, listingsByPillar, rfqs, events, posts, companies,
  // config
  config: { PILLARS: pillars.PILLARS, CATEGORIES: pillars.CATEGORIES, CORRIDORS: corridors.CORRIDORS, currencies },
  // schema + services
  schema,
  services: { terra, search, currency },
};
