/* YUNEX listings — Investment · verified projects seeking capital (5 items) */
const IMG = id => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=70`;

module.exports = [
  {
    pillar: "investment",
    category: "Real Estate Projects",
    corridor: "africa",
    title: "Lekki Waterfront Residences — Equity Round",
    description: "80-unit premium waterfront apartment development in Lekki Phase 1, Lagos. Seeking co-investors for a $6M equity tranche. Projected 22% IRR over 4 years. Full data room and TERRA-verified developer.",
    price: 250000,
    currency: "USD",
    quantity: "12 slots left",
    location: "Lagos, Nigeria",
    seller: "Marina Heights Development",
    country: "Nigeria",
    saves: 167,
    img: IMG('1545324418-cc1a3fa10c00'),
    details: {
      min_order: "1 slot",
      specs: [
        {
          k: "Target IRR",
          v: "22%"
        },
        {
          k: "Horizon",
          v: "4 years"
        },
        {
          k: "Instrument",
          v: "Equity"
        }
      ]
    }
  },
  {
    pillar: "investment",
    category: "Energy Projects",
    corridor: "africa",
    title: "40MW Solar Farm — Naivasha, Kenya",
    description: "Utility-scale solar project with signed PPA. Raising $18M project finance / equity. Grid-connected, land secured, EPC contracted. Green-bond eligible.",
    price: 100000,
    currency: "USD",
    quantity: "Open tranche",
    location: "Naivasha, Kenya",
    seller: "RiftValley Renewables",
    country: "Kenya",
    saves: 143,
    img: IMG('1466611653911-95081537e5b7'),
    details: {
      min_order: "1 unit",
      specs: [
        {
          k: "Capacity",
          v: "40 MW"
        },
        {
          k: "PPA",
          v: "20 years"
        },
        {
          k: "Return",
          v: "14% p.a."
        }
      ]
    }
  },
  {
    pillar: "investment",
    category: "Agriculture Projects",
    corridor: "africa",
    title: "Cashew Processing Plant — Value-Add Expansion",
    description: "Established RCN processor expanding capacity to 10,000t/yr for shelled kernel export. Raising working capital + equipment finance. Off-take agreements in place.",
    price: 50000,
    currency: "USD",
    quantity: "Series A",
    location: "Bouaké, Côte d'Ivoire",
    seller: "Ivoire Kernel Industries",
    country: "Côte d'Ivoire",
    saves: 58,
    img: IMG('1625246333195-78d9c38ad449'),
    details: {
      min_order: "1 unit",
      specs: [
        {
          k: "Sector",
          v: "Agro-processing"
        },
        {
          k: "Return",
          v: "19% IRR"
        }
      ]
    }
  },
  {
    pillar: "investment",
    category: "Startups",
    corridor: "africa",
    title: "PayStack-style Fintech — SME Equity (Egypt)",
    description: "Profitable B2B payments startup processing $40M/yr GMV across MENA. Raising a $3M bridge. 3.1x revenue growth YoY. Verified financials.",
    price: 25000,
    currency: "USD",
    quantity: "Bridge round",
    location: "Cairo, Egypt",
    seller: "NilePay Technologies",
    country: "Egypt",
    saves: 112,
    img: IMG('1556740738-b6a63e27c4df'),
    details: {
      min_order: "1 unit",
      specs: [
        {
          k: "Stage",
          v: "Bridge"
        },
        {
          k: "GMV",
          v: "$40M/yr"
        },
        {
          k: "Growth",
          v: "3.1x YoY"
        }
      ]
    }
  },
  {
    pillar: "investment",
    category: "Manufacturing",
    corridor: "africa",
    title: "Tile & Sanitaryware Factory — Growth Capital",
    description: "Profitable ceramic tile manufacturer expanding a second line. Raising $4M for machinery. Import-substitution play with strong local demand.",
    price: 50000,
    currency: "USD",
    quantity: "Series B",
    location: "Kano, Nigeria",
    seller: "Sahel Ceramics Plc",
    country: "Nigeria",
    saves: 44,
    img: IMG('1581092160562-40aa08e78837'),
    details: {
      min_order: "1 unit",
      specs: [
        {
          k: "Sector",
          v: "Building materials"
        },
        {
          k: "Return",
          v: "20% IRR"
        }
      ]
    }
  }
];
