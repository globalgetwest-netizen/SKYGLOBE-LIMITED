/* YUNEX listings — Trade · raw materials, agriculture, industrial (11 items) */
const IMG = id => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=70`;

module.exports = [
  {
    pillar: "trade",
    category: "Agriculture & Produce",
    corridor: "africa",
    title: "Ethiopian Yirgacheffe Green Coffee — Grade 1",
    description: "Washed Grade-1 Arabica, floral and citrus notes, 2024 harvest. FOB Djibouti. Full traceability to washing station. Sold per 60kg bag.",
    price: 5.9,
    currency: "USD",
    quantity: "12 containers",
    location: "Yirgacheffe, Ethiopia",
    seller: "Abyssinia Coffee Exporters",
    country: "Ethiopia",
    saves: 188,
    img: IMG('1447933601403-0c6688de566e'),
    details: {
      condition: "New",
      origin: "Ethiopia",
      min_order: "1 container (19.2 t)",
      unit: "kg",
      specs: [
        {
          k: "Grade",
          v: "G1"
        },
        {
          k: "Process",
          v: "Washed"
        },
        {
          k: "Screen",
          v: "15+"
        }
      ]
    }
  },
  {
    pillar: "trade",
    category: "Agriculture & Produce",
    corridor: "africa",
    title: "Premium Cocoa Beans — Fermented (2024)",
    description: "Ghana Cocoa Board–graded fermented dry beans, 6–7% moisture. Ideal for premium chocolate makers. Ships FOB Tema.",
    price: 8200,
    currency: "USD",
    quantity: "50 tonnes",
    location: "Kumasi, Ghana",
    seller: "Ashanti Cocoa Union",
    country: "Ghana",
    saves: 132,
    img: IMG('1610450949065-1f2841536c88'),
    details: {
      condition: "New",
      origin: "Ghana",
      min_order: "25 t",
      unit: "tonne",
      specs: [
        {
          k: "Moisture",
          v: "6–7%"
        },
        {
          k: "Bean count",
          v: "~100/100g"
        }
      ]
    }
  },
  {
    pillar: "trade",
    category: "Agriculture & Produce",
    corridor: "africa",
    title: "Raw Cashew Nuts (RCN) — Outturn 48+",
    description: "Sun-dried raw cashew nuts, KOR 48–52 lbs. New crop from Côte d'Ivoire. FOB Abidjan. Bagged 80kg.",
    price: 1150,
    currency: "USD",
    quantity: "20 containers",
    location: "Abidjan, Côte d'Ivoire",
    seller: "West Africa Nuts SARL",
    country: "Côte d'Ivoire",
    saves: 76,
    img: IMG('1508747703725-719777637510'),
    details: {
      condition: "New",
      origin: "Côte d'Ivoire",
      min_order: "1 container",
      unit: "tonne",
      specs: [
        {
          k: "Outturn",
          v: "48+ lbs"
        },
        {
          k: "Nut count",
          v: "~200/kg"
        }
      ]
    }
  },
  {
    pillar: "trade",
    category: "Renewable Energy",
    corridor: "china",
    title: "Monocrystalline Solar Panels 550W (Pallet)",
    description: "Tier-1 550W mono PERC panels, 21%+ efficiency, 25-year performance warranty. IEC & TÜV certified. Container pricing.",
    price: 88,
    currency: "USD",
    quantity: "40,000 panels",
    location: "Hefei, China",
    seller: "SunPeak New Energy",
    country: "China",
    saves: 203,
    img: IMG('1509391366360-2e959784a276'),
    details: {
      brand: "SunPeak",
      condition: "New",
      origin: "China",
      min_order: "1 pallet (31 pcs)",
      warranty: "25 years",
      specs: [
        {
          k: "Power",
          v: "550 W"
        },
        {
          k: "Efficiency",
          v: "21.3%"
        },
        {
          k: "Cells",
          v: "Mono PERC"
        }
      ]
    }
  },
  {
    pillar: "trade",
    category: "Food Ingredients",
    corridor: "africa",
    title: "Natural Sesame Seeds — 99.95% Purity",
    description: "Sortex-cleaned white sesame seeds, sun-dried, 2024 crop. Oil content 50%+. Export packing 50kg PP bags.",
    price: 1450,
    currency: "USD",
    quantity: "30 containers",
    location: "Gedaref, Sudan",
    seller: "Nile Agro Exports",
    country: "Sudan",
    saves: 44,
    img: IMG('1574323347407-f5e1ad6d020b'),
    details: {
      condition: "New",
      origin: "Sudan",
      min_order: "20 t",
      unit: "tonne",
      specs: [
        {
          k: "Purity",
          v: "99.95%"
        },
        {
          k: "Oil",
          v: "50%+"
        }
      ]
    }
  },
  {
    pillar: "trade",
    category: "Construction Materials",
    corridor: "gulf",
    title: "Ordinary Portland Cement 42.5N (Bulk)",
    description: "OPC 42.5N in 50kg bags or bulk. EN 197-1 certified. Ready for export across the Gulf and East Africa. FOB Jebel Ali.",
    price: 52,
    currency: "USD",
    quantity: "100,000 tonnes/yr",
    location: "Dubai, UAE",
    seller: "Gulf Cement Industries",
    country: "United Arab Emirates",
    saves: 39,
    img: IMG('1590247813693-5541d1c609fd'),
    details: {
      condition: "New",
      min_order: "1,000 t",
      unit: "tonne",
      specs: [
        {
          k: "Grade",
          v: "42.5N"
        },
        {
          k: "Standard",
          v: "EN 197-1"
        }
      ]
    }
  },
  {
    pillar: "trade",
    category: "Machinery",
    corridor: "europe",
    title: "CNC Vertical Machining Centre (German)",
    description: "Precision 3-axis CNC VMC, Siemens control, refurbished & inspected. Ideal for metal fabrication workshops. EU export.",
    price: 64500,
    currency: "EUR",
    quantity: "6 units",
    location: "Stuttgart, Germany",
    seller: "Rheinland Machine Tools",
    country: "Germany",
    saves: 29,
    img: IMG('1581091226825-a6a2a5aee158'),
    details: {
      condition: "Refurbished",
      origin: "Germany",
      warranty: "12 months",
      min_order: "1 unit",
      specs: [
        {
          k: "Axes",
          v: "3"
        },
        {
          k: "Control",
          v: "Siemens 840D"
        }
      ]
    }
  },
  {
    pillar: "trade",
    category: "Agriculture & Produce",
    corridor: "america",
    title: "IP Non-GMO Soybeans — Bulk (FOB Santos)",
    description: "Identity-preserved non-GMO soybeans, protein 36%+. Brazilian origin, food-grade. Container or vessel lots.",
    price: 520,
    currency: "USD",
    quantity: "Vessel lots",
    location: "Mato Grosso, Brazil",
    seller: "Cerrado Grains SA",
    country: "Brazil",
    saves: 51,
    img: IMG('1500937386664-56d1dfef3854'),
    details: {
      condition: "New",
      origin: "Brazil",
      min_order: "25 t",
      unit: "tonne",
      specs: [
        {
          k: "Protein",
          v: "36%+"
        },
        {
          k: "Type",
          v: "Non-GMO IP"
        }
      ]
    }
  },
  {
    pillar: "trade",
    category: "Agriculture & Produce",
    corridor: "oceania",
    title: "Premium Wheat & Barley — Bulk (FOB Fremantle)",
    description: "Australian Prime Hard wheat and malting barley, new season. Protein 13%+. Vessel and container lots.",
    price: 395,
    currency: "USD",
    quantity: "Vessel lots",
    location: "Perth, Australia",
    seller: "Westgrain Australia",
    country: "Australia",
    saves: 26,
    img: IMG('1574323347407-f5e1ad6d020b'),
    details: {
      condition: "New",
      origin: "Australia",
      min_order: "25 t",
      unit: "tonne",
      specs: [
        {
          k: "Protein",
          v: "13%+"
        },
        {
          k: "Grade",
          v: "APH"
        }
      ]
    }
  },
  {
    pillar: "trade",
    category: "Metals & Minerals",
    corridor: "africa",
    title: "Copper Cathodes 99.99% (Grade A LME)",
    description: "LME-registered Grade A copper cathodes from the Copperbelt. SGS-inspected. FOB Dar es Salaam / Durban.",
    price: 9200,
    currency: "USD",
    quantity: "500 tonnes/month",
    location: "Lubumbashi, DR Congo",
    seller: "Katanga Metals SARL",
    country: "DR Congo",
    saves: 71,
    img: IMG('1605557202138-1f4b8b6f0f8a'),
    details: {
      condition: "New",
      origin: "DR Congo",
      min_order: "25 t",
      unit: "tonne",
      specs: [
        {
          k: "Purity",
          v: "99.99%"
        },
        {
          k: "Standard",
          v: "LME Grade A"
        }
      ]
    }
  },
  {
    pillar: "trade",
    category: "Textiles & Fabrics",
    corridor: "china",
    title: "100% Cotton Jersey Fabric — Rolls (OEM)",
    description: "Combed cotton single jersey, 180gsm, reactive-dyed colourfast. Ideal for apparel factories. Custom GSM/colours.",
    price: 4.2,
    currency: "USD",
    quantity: "50,000 kg",
    location: "Shaoxing, China",
    seller: "Textrade Mills",
    country: "China",
    saves: 22,
    img: IMG('1620799140408-edc6dcb6d633'),
    details: {
      condition: "New",
      min_order: "500 kg",
      unit: "kg",
      specs: [
        {
          k: "GSM",
          v: "180"
        },
        {
          k: "Composition",
          v: "100% cotton"
        }
      ]
    }
  }
];
