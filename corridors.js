# YUNEX — data, config & services

Modular source for the YUNEX marketplace catalogue and its shared configuration.
The live app is served by the root `server.js` (Express) and the `yunex*.html`
front-ends; this package holds the **data and domain logic** in a clean,
maintainable structure rather than one flat file.

```
yunex/
├── README.md
└── src/
    ├── index.js                  # single import surface (data + config + schema + services)
    ├── data/
    │   ├── listings/
    │   │   ├── consumer.js        # marketplace products
    │   │   ├── trade.js           # raw materials, agriculture, industrial
    │   │   ├── investment.js      # verified projects seeking capital
    │   │   ├── assets.js          # land, property, machinery, vehicles
    │   │   ├── services.js        # professional services
    │   │   ├── business.js        # wholesale / distribution / manufacturing
    │   │   └── finance.js         # trade finance, insurance
    │   ├── rfqs.js                # sourcing requests (Deals › RFQs)
    │   ├── events.js              # community events / webinars / tenders
    │   ├── posts.js               # community feed
    │   └── companies.js           # verified company storefronts
    ├── config/
    │   ├── pillars.js             # PILLARS + CATEGORIES + VALID_PILLARS
    │   ├── corridors.js           # trade corridors + VALID_CORRIDORS
    │   └── currencies.js          # symbols, zero-decimal set, default
    ├── schemas/
    │   └── listing.schema.js      # canonical listing shape + validator
    └── services/
        ├── terra.service.js       # TERRA Trust Authority — verification refs & records
        ├── search.service.js      # pure pillar/corridor/text filtering
        └── currency.service.js    # pure format & convert helpers
```

## Usage

```js
const yunex = require('./yunex/src');

yunex.listings;                       // all showcase listings (every pillar)
yunex.listingsByPillar.trade;         // just one pillar
yunex.rfqs / yunex.events / yunex.posts / yunex.companies;

yunex.config.PILLARS;                 // { trade, investment, ... }
yunex.config.CORRIDORS;               // [ { key, label, flag, blurb } ]

yunex.schema.validateAll(yunex.listings);   // { ok, count, problems }

yunex.services.terra.buildVerification(company, { sample: true });
yunex.services.search.filterListings(yunex.listings, { pillar: 'investment' });
yunex.services.currency.format(1500, 'USD');
```

`../yunex-showcase.js` remains as a thin backward-compatible re-export
(`{ listings, rfqs, events, posts, companies }`) so existing server code keeps
working unchanged.

## Notes

- The **showcase** data is served only while the live database has no listings of
  its own; real seller data always takes precedence.
- Showcase companies' verification facts are **sample** values, flagged as such by
  `terra.service` so the UI never presents them as real registrations.
