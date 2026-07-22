/* YUNEX listings — Finance · trade finance, insurance (2 items) */
const IMG = id => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=70`;

module.exports = [
  {
    pillar: "finance",
    category: "Trade Finance",
    corridor: "gulf",
    title: "Letters of Credit & Trade Finance (up to $5M)",
    description: "LC issuance, confirmation and invoice discounting for verified importers/exporters. Fast approvals for TERRA-verified traders. Competitive rates.",
    price: 0,
    currency: "USD",
    quantity: "Facilities to $5M",
    location: "Manama, Bahrain",
    seller: "Gulf Trade Capital",
    country: "Bahrain",
    saves: 35,
    img: IMG('1554224155-6726b3ff858f'),
    details: {
      specs: [
        {
          k: "Facility",
          v: "LC · Invoice finance"
        },
        {
          k: "Limit",
          v: "$5M"
        },
        {
          k: "Approval",
          v: "48–72h"
        }
      ]
    }
  },
  {
    pillar: "finance",
    category: "Insurance",
    corridor: "africa",
    title: "Cargo & Marine Insurance — Global Cover",
    description: "All-risk cargo insurance for sea, air and inland transit. Instant certificates for YUNEX deals, claims support in 15+ countries.",
    price: 0.35,
    currency: "USD",
    quantity: "% of cargo value",
    location: "Lagos, Nigeria",
    seller: "Continental Marine Assurance",
    country: "Nigeria",
    saves: 19,
    img: IMG('1450101499163-c8848c66ca85'),
    details: {
      unit: "% value",
      specs: [
        {
          k: "Cover",
          v: "All-risk (ICC A)"
        },
        {
          k: "Territory",
          v: "Worldwide"
        }
      ]
    }
  }
];
