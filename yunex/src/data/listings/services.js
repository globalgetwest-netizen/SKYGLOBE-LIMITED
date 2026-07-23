/* YUNEX listings — Services · verified professional services (6 items) */
const IMG = id => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=70`;

module.exports = [
  {
    pillar: "services",
    category: "Logistics & Freight",
    corridor: "china",
    title: "China → Africa Freight Forwarding (Door-to-Door)",
    description: "Full container & LCL sea/air freight from any China port to African ports and inland. Customs clearance, warehousing and last-mile included. Live tracking.",
    price: 1800,
    currency: "USD",
    quantity: "Per 40ft container",
    location: "Guangzhou, China",
    seller: "TransAfrik Logistics",
    country: "China",
    saves: 88,
    img: IMG('1494412574643-ff11b0a5c1c3'),
    details: {
      min_order: "1 shipment",
      specs: [
        {
          k: "Modes",
          v: "Sea · Air · Rail"
        },
        {
          k: "Transit",
          v: "25–40 days"
        }
      ]
    }
  },
  {
    pillar: "services",
    category: "Legal Services",
    corridor: "africa",
    title: "Cross-Border Contract Drafting & Review",
    description: "Trade contracts, JV agreements, escrow terms and compliance for African & international deals. Verified corporate lawyers, fixed-fee packages.",
    price: 450,
    currency: "USD",
    quantity: "Per contract",
    location: "Accra, Ghana",
    seller: "Sankofa Legal Partners",
    country: "Ghana",
    saves: 36,
    img: IMG('1589829545856-d10d557cf95f'),
    details: {
      min_order: "1 contract",
      specs: [
        {
          k: "Turnaround",
          v: "3–5 days"
        },
        {
          k: "Languages",
          v: "EN · FR"
        }
      ]
    }
  },
  {
    pillar: "services",
    category: "Software & Development",
    corridor: "africa",
    title: "Custom Web & Mobile App Development",
    description: "Full-stack product teams building marketplaces, fintech and logistics apps. TERRA-verified studio, portfolio on request. Monthly retainer or fixed scope.",
    price: 6500,
    currency: "USD",
    quantity: "Per project",
    location: "Nairobi, Kenya",
    seller: "Savannah Softworks",
    country: "Kenya",
    saves: 42,
    img: IMG('1517180102446-f3ece451e9d8'),
    details: {
      min_order: "1 project",
      specs: [
        {
          k: "Stack",
          v: "React · Node · Flutter"
        },
        {
          k: "Team",
          v: "4–8 devs"
        }
      ]
    }
  },
  {
    pillar: "services",
    category: "Engineering",
    corridor: "gulf",
    title: "Solar EPC — Design, Supply & Install (C&I)",
    description: "Turnkey commercial & industrial solar: engineering, procurement and construction. 50kW–5MW rooftop and ground-mount. O&M contracts available.",
    price: 0.55,
    currency: "USD",
    quantity: "Per watt installed",
    location: "Abu Dhabi, UAE",
    seller: "Desert Sun EPC",
    country: "United Arab Emirates",
    saves: 31,
    img: IMG('1613665813446-82a78c468a1d'),
    details: {
      min_order: "50 kW",
      unit: "watt",
      specs: [
        {
          k: "Range",
          v: "50 kW – 5 MW"
        },
        {
          k: "Warranty",
          v: "5 yr workmanship"
        }
      ]
    }
  },
  {
    pillar: "services",
    category: "Marketing & Media",
    corridor: "africa",
    title: "E-commerce Growth & Brand Studio",
    description: "Full-service growth: brand, product photography, paid ads and marketplace management for African & diaspora brands. Performance-based options.",
    price: 1200,
    currency: "USD",
    quantity: "Monthly retainer",
    location: "Johannesburg, South Africa",
    seller: "Baobab Brand Studio",
    country: "South Africa",
    saves: 27,
    img: IMG('1460925895917-afdab827c52f'),
    details: {
      min_order: "1 month",
      specs: [
        {
          k: "Services",
          v: "Brand · Ads · Content"
        }
      ]
    }
  },
  {
    pillar: "services",
    category: "Accounting & Finance",
    corridor: "africa",
    title: "Cross-Border Tax, Audit & Company Setup",
    description: "Company registration, tax and audit across 12 African markets + UAE. One partner for your pan-African expansion. Verified chartered accountants.",
    price: 900,
    currency: "USD",
    quantity: "Per engagement",
    location: "Kigali, Rwanda",
    seller: "Great Lakes Advisory",
    country: "Rwanda",
    saves: 21,
    img: IMG('1454165804606-c3d57bc86b40'),
    details: {
      min_order: "1 engagement",
      specs: [
        {
          k: "Coverage",
          v: "12 markets + UAE"
        }
      ]
    }
  }
];
