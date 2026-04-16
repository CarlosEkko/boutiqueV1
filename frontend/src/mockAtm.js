// Mock data for Crypto ATM Network page — i18n-ready with translation keys

export const atmHeroData = {
  titleKey: 'cryptoAtm.heroTitle',
  subtitleKey: 'cryptoAtm.heroSubtitle',
  descriptionKey: 'cryptoAtm.heroDescription',
  stats: [
    { value: "50+", labelKey: "cryptoAtm.statPremiumLocations" },
    { value: "15+", labelKey: "cryptoAtm.statSupportedCurrencies" },
    { value: "24/7", labelKey: "cryptoAtm.statAvailableAccess" },
    { value: "99.9%", labelKey: "cryptoAtm.statUptimeGuarantee" }
  ]
};

export const atmFeatures = [
  {
    id: 1,
    titleKey: "cryptoAtm.feature1Title",
    descriptionKey: "cryptoAtm.feature1Desc",
    icon: "map-pin",
    image: "/images/atm-dubai.jpg"
  },
  {
    id: 2,
    titleKey: "cryptoAtm.feature2Title",
    descriptionKey: "cryptoAtm.feature2Desc",
    icon: "shield",
    image: "/images/product-custody.jpg"
  },
  {
    id: 3,
    titleKey: "cryptoAtm.feature3Title",
    descriptionKey: "cryptoAtm.feature3Desc",
    icon: "coins",
    image: "/images/atm-zurich.jpg"
  },
  {
    id: 4,
    titleKey: "cryptoAtm.feature4Title",
    descriptionKey: "cryptoAtm.feature4Desc",
    icon: "headset",
    image: "/images/atm-saopaulo.jpg"
  }
];

export const howItWorks = [
  {
    step: 1,
    titleKey: "cryptoAtm.step1Title",
    descriptionKey: "cryptoAtm.step1Desc"
  },
  {
    step: 2,
    titleKey: "cryptoAtm.step2Title",
    descriptionKey: "cryptoAtm.step2Desc"
  },
  {
    step: 3,
    titleKey: "cryptoAtm.step3Title",
    descriptionKey: "cryptoAtm.step3Desc"
  },
  {
    step: 4,
    titleKey: "cryptoAtm.step4Title",
    descriptionKey: "cryptoAtm.step4Desc"
  }
];

export const atmLocations = [
  {
    regionKey: "cryptoAtm.regionEurope",
    cities: [
      { name: "Zurich", country: "Switzerland", count: 8, vip: true },
      { name: "London", country: "United Kingdom", count: 12, vip: true },
      { name: "Paris", country: "France", count: 6, vip: false },
      { name: "Monaco", country: "Monaco", count: 4, vip: true },
      { name: "Geneva", country: "Switzerland", count: 5, vip: true }
    ]
  },
  {
    regionKey: "cryptoAtm.regionMiddleEast",
    cities: [
      { name: "Dubai", country: "UAE", count: 10, vip: true },
      { name: "Abu Dhabi", country: "UAE", count: 6, vip: true },
      { name: "Riyadh", country: "Saudi Arabia", count: 4, vip: true }
    ]
  },
  {
    regionKey: "cryptoAtm.regionBrazil",
    cities: [
      { name: "São Paulo", country: "Brazil", count: 8, vip: true },
      { name: "Rio de Janeiro", country: "Brazil", count: 5, vip: false },
      { name: "Brasília", country: "Brazil", count: 3, vip: false }
    ]
  }
];

export const atmBenefits = [
  {
    titleKey: "cryptoAtm.benefit1Title",
    descriptionKey: "cryptoAtm.benefit1Desc",
    icon: "zap"
  },
  {
    titleKey: "cryptoAtm.benefit2Title",
    descriptionKey: "cryptoAtm.benefit2Desc",
    icon: "trending-up"
  },
  {
    titleKey: "cryptoAtm.benefit3Title",
    descriptionKey: "cryptoAtm.benefit3Desc",
    icon: "bar-chart"
  },
  {
    titleKey: "cryptoAtm.benefit4Title",
    descriptionKey: "cryptoAtm.benefit4Desc",
    icon: "lock"
  },
  {
    titleKey: "cryptoAtm.benefit5Title",
    descriptionKey: "cryptoAtm.benefit5Desc",
    icon: "globe"
  },
  {
    titleKey: "cryptoAtm.benefit6Title",
    descriptionKey: "cryptoAtm.benefit6Desc",
    icon: "phone"
  }
];
