/**
 * Budget Intelligence Service
 * Provides destination-aware budget ranges and realistic cost estimates.
 */

const EXCHANGE_RATES_TO_INR = Object.freeze({
  INR: 1,
  USD: 83,
  EUR: 91,
  GBP: 107,
  AED: 22.6,
  JPY: 0.56,
  SGD: 62,
  THB: 2.3,
  AUD: 55,
  CAD: 61,
});

const STYLE_RANGE_MULTIPLIERS = Object.freeze({
  solo: 1,
  couple: 1.08,
  family: 1.14,
  group: 0.95,
  adventure: 1.1,
  relaxation: 1.08,
  luxury: 1.4,
  budget: 0.92,
});

const STYLE_ACTIVITY_MULTIPLIERS = Object.freeze({
  solo: 1,
  couple: 1.04,
  family: 1.1,
  group: 0.94,
  adventure: 1.14,
  relaxation: 1.08,
  luxury: 1.35,
  budget: 0.9,
});

const COST_LEVEL_HOURLY_INR = Object.freeze({
  low: 320,
  medium: 520,
  high: 860,
  premium: 1320,
});

const CATEGORY_MULTIPLIERS = Object.freeze({
  food: 0.95,
  culture: 1,
  sightseeing: 0.92,
  nature: 0.82,
  shopping: 1.26,
  entertainment: 1.2,
  relaxation: 1.18,
  adventure: 1.42,
});

const CATEGORY_MIN_FLOOR_INR = Object.freeze({
  food: 320,
  culture: 260,
  sightseeing: 220,
  nature: 180,
  shopping: 380,
  entertainment: 420,
  relaxation: 410,
  adventure: 620,
});

const DEFAULT_DOMESTIC_PROFILE = Object.freeze({
  costLevel: 'medium',
  destinationType: 'domestic-city',
  minDailyPerPersonInr: 3200,
  comfortDailyPerPersonInr: 5600,
  premiumDailyPerPersonInr: 11000,
});

const DEFAULT_INTERNATIONAL_PROFILE = Object.freeze({
  costLevel: 'high',
  destinationType: 'international-city',
  minDailyPerPersonInr: 9000,
  comfortDailyPerPersonInr: 15000,
  premiumDailyPerPersonInr: 30000,
});

const DESTINATION_PROFILES = [
  {
    name: 'Dubai',
    aliases: ['dubai', 'uae', 'united arab emirates'],
    costLevel: 'high',
    destinationType: 'international-city',
    minDailyPerPersonInr: 10500,
    comfortDailyPerPersonInr: 17800,
    premiumDailyPerPersonInr: 36000,
  },
  {
    name: 'Paris',
    aliases: ['paris', 'france'],
    costLevel: 'high',
    destinationType: 'international-city',
    minDailyPerPersonInr: 12200,
    comfortDailyPerPersonInr: 19800,
    premiumDailyPerPersonInr: 39000,
  },
  {
    name: 'London',
    aliases: ['london', 'uk', 'united kingdom', 'england'],
    costLevel: 'premium',
    destinationType: 'international-city',
    minDailyPerPersonInr: 13800,
    comfortDailyPerPersonInr: 22800,
    premiumDailyPerPersonInr: 43000,
  },
  {
    name: 'Tokyo',
    aliases: ['tokyo', 'japan'],
    costLevel: 'high',
    destinationType: 'international-city',
    minDailyPerPersonInr: 12800,
    comfortDailyPerPersonInr: 20500,
    premiumDailyPerPersonInr: 38500,
  },
  {
    name: 'Singapore',
    aliases: ['singapore'],
    costLevel: 'high',
    destinationType: 'international-city',
    minDailyPerPersonInr: 11800,
    comfortDailyPerPersonInr: 18800,
    premiumDailyPerPersonInr: 36200,
  },
  {
    name: 'Bangkok',
    aliases: ['bangkok', 'thailand'],
    costLevel: 'medium',
    destinationType: 'international-city',
    minDailyPerPersonInr: 6200,
    comfortDailyPerPersonInr: 10400,
    premiumDailyPerPersonInr: 21200,
  },
  {
    name: 'Bali',
    aliases: ['bali', 'indonesia'],
    costLevel: 'medium',
    destinationType: 'international-island',
    minDailyPerPersonInr: 5900,
    comfortDailyPerPersonInr: 9800,
    premiumDailyPerPersonInr: 20500,
  },
  {
    name: 'New York',
    aliases: ['new york', 'nyc', 'usa', 'united states'],
    costLevel: 'premium',
    destinationType: 'international-city',
    minDailyPerPersonInr: 16200,
    comfortDailyPerPersonInr: 24800,
    premiumDailyPerPersonInr: 47000,
  },
  {
    name: 'Goa',
    aliases: ['goa'],
    costLevel: 'medium',
    destinationType: 'domestic-coastal',
    minDailyPerPersonInr: 4300,
    comfortDailyPerPersonInr: 7200,
    premiumDailyPerPersonInr: 14800,
  },
  {
    name: 'Mumbai',
    aliases: ['mumbai', 'bombay'],
    costLevel: 'medium',
    destinationType: 'domestic-metro',
    minDailyPerPersonInr: 3800,
    comfortDailyPerPersonInr: 6500,
    premiumDailyPerPersonInr: 13500,
  },
  {
    name: 'Delhi',
    aliases: ['delhi', 'new delhi'],
    costLevel: 'medium',
    destinationType: 'domestic-metro',
    minDailyPerPersonInr: 3600,
    comfortDailyPerPersonInr: 6200,
    premiumDailyPerPersonInr: 12800,
  },
  {
    name: 'Pune',
    aliases: ['pune'],
    costLevel: 'medium',
    destinationType: 'domestic-city',
    minDailyPerPersonInr: 3000,
    comfortDailyPerPersonInr: 5200,
    premiumDailyPerPersonInr: 11200,
  },
  {
    name: 'Kolhapur',
    aliases: ['kolhapur'],
    costLevel: 'low',
    destinationType: 'domestic-city',
    minDailyPerPersonInr: 2400,
    comfortDailyPerPersonInr: 4200,
    premiumDailyPerPersonInr: 9200,
  },
  {
    name: 'Raigad',
    aliases: ['raigad'],
    costLevel: 'low',
    destinationType: 'domestic-hill',
    minDailyPerPersonInr: 2600,
    comfortDailyPerPersonInr: 4500,
    premiumDailyPerPersonInr: 9800,
  },
  {
    name: 'Rajgad',
    aliases: ['rajgad'],
    costLevel: 'low',
    destinationType: 'domestic-hill',
    minDailyPerPersonInr: 2500,
    comfortDailyPerPersonInr: 4300,
    premiumDailyPerPersonInr: 9400,
  },
];

const INDIA_BOUNDS = Object.freeze({
  minLat: 6,
  maxLat: 38,
  minLon: 68,
  maxLon: 98,
});

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const normalizeDestination = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^\w\s,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

class BudgetIntelligenceService {
  normalizeCurrency(currency) {
    const normalized = String(currency || 'INR').trim().toUpperCase();
    return EXCHANGE_RATES_TO_INR[normalized] ? normalized : 'INR';
  }

  convertToInr(amount, currency = 'INR') {
    const safeAmount = Number(amount) || 0;
    const normalizedCurrency = this.normalizeCurrency(currency);
    return safeAmount * EXCHANGE_RATES_TO_INR[normalizedCurrency];
  }

  convertFromInr(amountInr, currency = 'INR') {
    const safeAmount = Number(amountInr) || 0;
    const normalizedCurrency = this.normalizeCurrency(currency);
    const rate = EXCHANGE_RATES_TO_INR[normalizedCurrency];
    return safeAmount / rate;
  }

  roundAmount(amount) {
    if (!Number.isFinite(amount)) return 0;
    if (amount < 100) return Math.round(amount);
    if (amount < 2000) return Math.round(amount / 10) * 10;
    return Math.round(amount / 50) * 50;
  }

  isInIndiaBounds(coordinates) {
    if (!coordinates) return false;
    const latitude = Number(coordinates.latitude);
    const longitude = Number(coordinates.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
    return (
      latitude >= INDIA_BOUNDS.minLat &&
      latitude <= INDIA_BOUNDS.maxLat &&
      longitude >= INDIA_BOUNDS.minLon &&
      longitude <= INDIA_BOUNDS.maxLon
    );
  }

  resolveDestinationProfile(destination, coordinates) {
    const normalized = normalizeDestination(destination);
    const matched = DESTINATION_PROFILES.find((profile) =>
      profile.aliases.some(
        (alias) =>
          normalized === alias ||
          normalized.startsWith(`${alias},`) ||
          normalized.includes(` ${alias}`) ||
          normalized.includes(`${alias} `)
      )
    );

    if (matched) {
      return {
        ...matched,
        matched: true,
      };
    }

    const isDomestic = this.isInIndiaBounds(coordinates);
    return {
      name: String(destination || 'Destination'),
      aliases: [],
      matched: false,
      ...(isDomestic ? DEFAULT_DOMESTIC_PROFILE : DEFAULT_INTERNATIONAL_PROFILE),
    };
  }

  calculateBudgetGuidance({
    destination,
    coordinates,
    days,
    travelers,
    inputBudget,
    currency = 'INR',
    travelStyle = 'solo',
  }) {
    const safeDays = clamp(Number(days) || 1, 1, 30);
    const safeTravelers = clamp(Number(travelers) || 1, 1, 20);
    const styleKey = String(travelStyle || 'solo').toLowerCase();
    const styleMultiplier = STYLE_RANGE_MULTIPLIERS[styleKey] || 1;
    const targetCurrency = this.normalizeCurrency(currency);

    const profile = this.resolveDestinationProfile(destination, coordinates);

    const minPerPersonDayInr = profile.minDailyPerPersonInr;
    const comfortPerPersonDayInr = profile.comfortDailyPerPersonInr * styleMultiplier;
    const premiumPerPersonDayInr = profile.premiumDailyPerPersonInr * Math.max(1, styleMultiplier);

    const minimumTotalInr = minPerPersonDayInr * safeDays * safeTravelers;
    const comfortableTotalInr = comfortPerPersonDayInr * safeDays * safeTravelers;
    const premiumTotalInr = premiumPerPersonDayInr * safeDays * safeTravelers;

    const requestedBudgetInr = this.convertToInr(inputBudget, targetCurrency);
    const adjustedBudgetInr = Math.max(requestedBudgetInr, minimumTotalInr);

    let budgetStatus = 'within-range';
    if (requestedBudgetInr < minimumTotalInr) {
      budgetStatus = 'below-minimum';
    } else if (requestedBudgetInr > premiumTotalInr) {
      budgetStatus = 'above-premium';
    }

    let message = 'Budget is in a realistic range for this destination.';
    if (budgetStatus === 'below-minimum') {
      message = `Input budget was too low for ${profile.name}. Plan was adjusted to the practical minimum.`;
    } else if (budgetStatus === 'above-premium') {
      message =
        'Budget is above typical premium spend. Plan includes premium options and still shows practical ranges.';
    }

    return {
      destinationProfile: {
        name: profile.name,
        costLevel: profile.costLevel,
        destinationType: profile.destinationType,
        matched: profile.matched,
      },
      currency: targetCurrency,
      days: safeDays,
      travelers: safeTravelers,
      budgetStatus,
      adjustmentApplied: adjustedBudgetInr !== requestedBudgetInr,
      adjustmentMessage: message,
      requestedBudget: this.roundAmount(
        this.convertFromInr(requestedBudgetInr, targetCurrency)
      ),
      adjustedBudget: this.roundAmount(
        this.convertFromInr(adjustedBudgetInr, targetCurrency)
      ),
      minimumRecommended: this.roundAmount(
        this.convertFromInr(minimumTotalInr, targetCurrency)
      ),
      comfortableEstimate: this.roundAmount(
        this.convertFromInr(comfortableTotalInr, targetCurrency)
      ),
      premiumEstimate: this.roundAmount(
        this.convertFromInr(premiumTotalInr, targetCurrency)
      ),
      suggestedDailyBudget: this.roundAmount(
        this.convertFromInr(comfortableTotalInr / safeDays, targetCurrency)
      ),
      perPersonDaily: {
        minimum: this.roundAmount(
          this.convertFromInr(minPerPersonDayInr, targetCurrency)
        ),
        comfortable: this.roundAmount(
          this.convertFromInr(comfortPerPersonDayInr, targetCurrency)
        ),
        premium: this.roundAmount(
          this.convertFromInr(premiumPerPersonDayInr, targetCurrency)
        ),
      },
    };
  }

  estimateActivityCost({
    category,
    durationMinutes,
    travelers = 1,
    travelStyle = 'solo',
    budgetStatus = 'within-range',
    destinationProfile,
    currency = 'INR',
  }) {
    const safeCategory = String(category || 'sightseeing').toLowerCase();
    const safeDuration = clamp(Number(durationMinutes) || 90, 45, 420);
    const safeTravelers = clamp(Number(travelers) || 1, 1, 20);
    const styleKey = String(travelStyle || 'solo').toLowerCase();
    const styleMultiplier = STYLE_ACTIVITY_MULTIPLIERS[styleKey] || 1;
    const costLevel = destinationProfile?.costLevel || 'medium';
    const baseHourly = COST_LEVEL_HOURLY_INR[costLevel] || COST_LEVEL_HOURLY_INR.medium;
    const categoryMultiplier = CATEGORY_MULTIPLIERS[safeCategory] || 1;
    const travelerMultiplier = safeTravelers === 1 ? 1 : 0.88 * safeTravelers;
    const floor = (CATEGORY_MIN_FLOOR_INR[safeCategory] || 220) * travelerMultiplier;

    let costInr =
      baseHourly * (safeDuration / 60) * categoryMultiplier * styleMultiplier * travelerMultiplier;

    if (budgetStatus === 'below-minimum') costInr *= 0.9;
    if (budgetStatus === 'above-premium') costInr *= 1.22;

    costInr = Math.max(costInr, floor);

    return this.roundAmount(this.convertFromInr(costInr, currency));
  }
}

module.exports = BudgetIntelligenceService;
