// Mock data for Crypto ATM Network page

export const atmHeroData = {
  title: "Premium Crypto ATM Network",
  subtitle: "Access Digital Assets in Exclusive Locations",
  description: "Experience seamless fiat-to-crypto conversions at our curated network of high-security ATMs, strategically placed in premium locations across Europe, Middle East, and Brazil.",
  stats: [
    { value: "50+", label: "Premium Locations" },
    { value: "15+", label: "Supported Currencies" },
    { value: "24/7", label: "Available Access" },
    { value: "99.9%", label: "Uptime Guarantee" }
  ]
};

export const atmFeatures = [
  {
    id: 1,
    title: "Prime Locations",
    description: "ATMs placed in exclusive high-end shopping districts, luxury hotels, and private banking centers. Curated environments that match the sophistication of our clientele.",
    icon: "map-pin",
    image: "https://images.unsplash.com/photo-1481437156560-3205f6a55735"
  },
  {
    id: 2,
    title: "Enhanced Privacy",
    description: "Discreet transaction booths with biometric verification. Advanced encryption and privacy protocols ensure your transactions remain confidential.",
    icon: "shield",
    image: "https://images.unsplash.com/photo-1767972464040-8bfee42d7bed"
  },
  {
    id: 3,
    title: "Multi-Currency Support",
    description: "Buy and sell Bitcoin, Ethereum, and other major cryptocurrencies. Support for multiple fiat currencies including EUR, USD, GBP, AED, and BRL.",
    icon: "coins",
    image: "https://images.unsplash.com/photo-1556741533-974f8e62a92d"
  },
  {
    id: 4,
    title: "White-Glove Service",
    description: "Dedicated concierge support available at select locations. VIP transaction assistance for large-volume conversions.",
    icon: "headset",
    image: "https://images.unsplash.com/photo-1767128465859-34e9abfb501e"
  }
];

export const howItWorks = [
  {
    step: 1,
    title: "Verify Identity",
    description: "Quick biometric verification or VIP card authentication for seamless access"
  },
  {
    step: 2,
    title: "Select Currency",
    description: "Choose your preferred cryptocurrency and fiat currency for conversion"
  },
  {
    step: 3,
    title: "Complete Transaction",
    description: "Insert cash or card, confirm transaction, and receive instant digital assets"
  },
  {
    step: 4,
    title: "Secure Transfer",
    description: "Funds transferred directly to your verified wallet with instant confirmation"
  }
];

export const atmLocations = [
  {
    region: "Europe",
    cities: [
      { name: "Zurich", country: "Switzerland", count: 8, vip: true },
      { name: "London", country: "United Kingdom", count: 12, vip: true },
      { name: "Paris", country: "France", count: 6, vip: false },
      { name: "Monaco", country: "Monaco", count: 4, vip: true },
      { name: "Geneva", country: "Switzerland", count: 5, vip: true }
    ]
  },
  {
    region: "Middle East",
    cities: [
      { name: "Dubai", country: "UAE", count: 10, vip: true },
      { name: "Abu Dhabi", country: "UAE", count: 6, vip: true },
      { name: "Riyadh", country: "Saudi Arabia", count: 4, vip: true }
    ]
  },
  {
    region: "Brazil",
    cities: [
      { name: "São Paulo", country: "Brazil", count: 8, vip: true },
      { name: "Rio de Janeiro", country: "Brazil", count: 5, vip: false },
      { name: "Brasília", country: "Brazil", count: 3, vip: false }
    ]
  }
];

export const atmBenefits = [
  {
    title: "Instant Transactions",
    description: "Real-time conversion with immediate wallet crediting",
    icon: "zap"
  },
  {
    title: "Competitive Rates",
    description: "Institutional-grade pricing with transparent fee structure",
    icon: "trending-up"
  },
  {
    title: "Maximum Limits",
    description: "Higher transaction limits for verified VIP members",
    icon: "bar-chart"
  },
  {
    title: "Bank-Level Security",
    description: "Military-grade encryption and physical security measures",
    icon: "lock"
  },
  {
    title: "Multi-Language Support",
    description: "Interface available in 12+ languages including Arabic",
    icon: "globe"
  },
  {
    title: "24/7 Support",
    description: "Dedicated phone support for all ATM-related queries",
    icon: "phone"
  }
];
