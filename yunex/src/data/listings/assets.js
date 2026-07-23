/* YUNEX listings — Assets · land, property, machinery, vehicles (6 items) */
const IMG = id => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=70`;

module.exports = [
  {
    pillar: "assets",
    category: "Commercial Property",
    corridor: "gulf",
    title: "Grade-A Logistics Warehouse — Jebel Ali (For Sale)",
    description: "12,000 m² bonded logistics warehouse in JAFZA, Dubai. 12m clear height, 20 loading docks, office block. Freehold. Tenanted, 8% net yield.",
    price: 18500000,
    currency: "AED",
    quantity: "1 available",
    location: "Jebel Ali, Dubai",
    seller: "Emirates Industrial Realty",
    country: "United Arab Emirates",
    saves: 47,
    img: IMG('1586528116311-ad8dd3c8310d'),
    details: {
      condition: "N/A",
      specs: [
        {
          k: "Area",
          v: "12,000 m²"
        },
        {
          k: "Yield",
          v: "8% net"
        },
        {
          k: "Tenure",
          v: "Freehold"
        }
      ]
    }
  },
  {
    pillar: "assets",
    category: "Land",
    corridor: "africa",
    title: "50 Acres Titled Commercial Land — Nairobi Bypass",
    description: "Prime 50-acre parcel along the Eastern Bypass, ready title deed, road frontage, water & power nearby. Ideal for mixed-use or industrial park.",
    price: 420000000,
    currency: "KES",
    quantity: "50 acres",
    location: "Ruiru, Kenya",
    seller: "Acacia Land Holdings",
    country: "Kenya",
    saves: 38,
    img: IMG('1500382017468-9049fed747ef'),
    details: {
      specs: [
        {
          k: "Size",
          v: "50 acres"
        },
        {
          k: "Title",
          v: "Freehold deed"
        },
        {
          k: "Zoning",
          v: "Commercial"
        }
      ]
    }
  },
  {
    pillar: "assets",
    category: "Heavy Machinery",
    corridor: "europe",
    title: "CAT 320 Hydraulic Excavator (2021, 3,200h)",
    description: "Caterpillar 320 excavator, 2021, 3,200 hours, full service history. Inspected and export-crated. Ships from Rotterdam.",
    price: 98000,
    currency: "EUR",
    quantity: "3 units",
    location: "Rotterdam, Netherlands",
    seller: "EuroPlant Machinery BV",
    country: "Netherlands",
    saves: 33,
    img: IMG('1581093588401-fbb62a02f120'),
    details: {
      brand: "Caterpillar",
      condition: "Used - Good",
      warranty: "3 months",
      specs: [
        {
          k: "Year",
          v: "2021"
        },
        {
          k: "Hours",
          v: "3,200"
        }
      ]
    }
  },
  {
    pillar: "assets",
    category: "Farms",
    corridor: "africa",
    title: "1,200-Hectare Irrigated Farm Estate (Zambia)",
    description: "Fully operational commercial farm with centre-pivot irrigation, dam, grain storage and staff housing. Maize, soy, wheat rotation. Freehold title.",
    price: 4200000,
    currency: "USD",
    quantity: "1 estate",
    location: "Mkushi, Zambia",
    seller: "Copperbelt AgriEstates",
    country: "Zambia",
    saves: 61,
    img: IMG('1625246333195-78d9c38ad449'),
    details: {
      specs: [
        {
          k: "Size",
          v: "1,200 ha"
        },
        {
          k: "Irrigation",
          v: "Centre-pivot"
        },
        {
          k: "Title",
          v: "Freehold"
        }
      ]
    }
  },
  {
    pillar: "assets",
    category: "Vehicles",
    corridor: "oceania",
    title: "Toyota Land Cruiser 300 GR-S (Fleet of 5)",
    description: "Brand-new Land Cruiser 300 GR-Sport, export spec. Fleet of 5 for mining/NGO buyers. RHD/LHD available. Ships from Brisbane.",
    price: 135000,
    currency: "USD",
    quantity: "5 units",
    location: "Brisbane, Australia",
    seller: "Pacific Auto Exporters",
    country: "Australia",
    saves: 54,
    img: IMG('1503376780353-7e6692767b70'),
    details: {
      brand: "Toyota",
      condition: "New",
      warranty: "24 months",
      min_order: "1 unit",
      specs: [
        {
          k: "Model",
          v: "LC300 GR-S"
        },
        {
          k: "Fuel",
          v: "Diesel V6 TT"
        }
      ]
    }
  },
  {
    pillar: "assets",
    category: "Residential Property",
    corridor: "europe",
    title: "Istanbul Sea-View Apartments (Citizenship-Eligible)",
    description: "New 2–3 bed apartments in Istanbul, eligible for Turkish citizenship-by-investment. Rental-managed. Title & escrow via TERRA.",
    price: 320000,
    currency: "USD",
    quantity: "18 units",
    location: "Istanbul, Türkiye",
    seller: "Bosphorus Estates",
    country: "Türkiye",
    saves: 58,
    img: IMG('1512917774080-9991f1c4c750'),
    details: {
      specs: [
        {
          k: "Bedrooms",
          v: "2–3"
        },
        {
          k: "Programme",
          v: "CBI eligible"
        },
        {
          k: "Yield",
          v: "6% rental"
        }
      ]
    }
  }
];
