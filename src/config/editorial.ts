/**
 * Editorial standards shown on /about/, /how-we-test/ and /review-policy/. Edit here, not in
 * the pages, so the promises and test plans stay the same everywhere they are quoted.
 */

/** Minimum days a rated product is used as a daily device. */
export const minTestDays = 7;

export const promises = [
  {
    title: 'We use it before we rate it',
    text: `Every rated product is used for at least ${minTestDays} days as a daily device.`,
  },
  {
    title: 'Money never buys a score',
    text: 'Advertisers, brands and retailers have no say in ratings or rankings.',
  },
  {
    title: 'We update and correct',
    text: 'Buying guides are re-checked every month. Errors are fixed and noted on the page.',
  },
];

export const testPlans = [
  {
    category: 'Laptops',
    tests: [
      'Battery: web-browsing rundown at a fixed 200-nit brightness',
      'Display: brightness, colour gamut and colour accuracy with a colorimeter',
      'Performance: CPU, GPU and storage benchmarks, plugged in and on battery',
      'Heat and fan noise under a sustained load',
      'Two weeks as a daily work machine',
    ],
  },
  {
    category: 'Phones',
    tests: [
      'Battery: mixed-use rundown and time to a full charge',
      'Cameras: fixed scenes in daylight, low light and portrait mode',
      'Performance and heat in long gaming sessions',
      'Network and call quality on Indian carriers',
    ],
  },
  {
    category: 'Audio',
    tests: [
      'A fixed listening playlist across genres',
      'Noise cancelling on a commute and in an office',
      'Call mic quality, fit and battery claims',
    ],
  },
  {
    category: 'Wearables and home',
    tests: [
      'Step, heart-rate and GPS accuracy against reference devices',
      'Battery life in real use',
      'App quality and setup on Android and iOS',
    ],
  },
];

export const ratingScale = [
  { stars: 5, meaning: 'Outstanding. Among the best we have tested at any price.' },
  { stars: 4, meaning: 'Excellent. Easy to recommend with minor trade-offs.' },
  { stars: 3, meaning: 'Good. Worth it for some buyers, or at a lower price.' },
  { stars: 2, meaning: 'Below average. Better options exist.' },
  { stars: 1, meaning: 'Avoid.' },
];

/** Award badges and what earns them (src/components/cards/BadgeTag.astro). */
export const badgeRules = [
  { badge: 'editors-choice', rule: 'Rated 4.5 or more and the best in its class.' },
  { badge: 'recommended', rule: 'Rated 4 or more.' },
  { badge: 'best-value', rule: 'The best rating per rupee in its group.' },
] as const;
