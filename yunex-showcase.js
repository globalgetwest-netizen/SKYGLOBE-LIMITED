/* YUNEX Showcase Catalog — backward-compatible entry point.
   The data now lives in a modular structure under ./yunex/src (listings split per
   pillar, plus rfqs / events / posts / companies, with config, schema and
   services). This file simply re-exports the shape the server already consumes,
   so nothing downstream had to change:

     const seed = require('./yunex-showcase.js');
     seed.listings / seed.rfqs / seed.events / seed.posts / seed.companies

   For the richer surface (config, schema, services) import ./yunex/src directly. */
const yunex = require('./yunex/src');

module.exports = {
  listings: yunex.listings,
  rfqs: yunex.rfqs,
  events: yunex.events,
  posts: yunex.posts,
  companies: yunex.companies,
};
