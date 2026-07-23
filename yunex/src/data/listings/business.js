/* YUNEX listings — Business · wholesale, distribution, manufacturing (2 items) */
const IMG = id => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=70`;

module.exports = [
  {
    pillar: "business",
    category: "Private Label",
    corridor: "china",
    title: "Private-Label Cosmetics Manufacturing (MOQ 500)",
    description: "Your own skincare & cosmetics brand: formulation, filling, labelling and boxing. GMP-certified factory. Serums, creams, soaps. Low MOQ for new brands.",
    price: 2.4,
    currency: "USD",
    quantity: "MOQ 500 units",
    location: "Yiwu, China",
    seller: "GlowLab Contract Mfg",
    country: "China",
    saves: 69,
    img: IMG('1596462502278-27bfdc403348'),
    details: {
      min_order: "500 units",
      unit: "unit",
      specs: [
        {
          k: "Certification",
          v: "GMP · ISO 22716"
        },
        {
          k: "Lead time",
          v: "20–30 days"
        }
      ]
    }
  },
  {
    pillar: "business",
    category: "Wholesale",
    corridor: "gulf",
    title: "Wholesale FMCG Distribution — MENA Reach",
    description: "Distribute food, beverage and household brands across the Gulf & Levant. Bonded warehousing, retail placement and merchandising. Onboarding for exporters.",
    price: 0,
    currency: "USD",
    quantity: "Partnership",
    location: "Dubai, UAE",
    seller: "Levant Distribution Co",
    country: "United Arab Emirates",
    saves: 24,
    img: IMG('1553413077-190dd305871c'),
    details: {
      specs: [
        {
          k: "Coverage",
          v: "GCC · Levant"
        },
        {
          k: "Model",
          v: "Distributor"
        }
      ]
    }
  }
];
