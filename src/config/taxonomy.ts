/**
 * Single source of truth for hubs, categories, subcategories and content types.
 * Routes, navigation, breadcrumbs and content validation all read from here.
 */

export interface Subcategory {
  slug: string;
  label: string;
}

export interface Category {
  slug: string;
  label: string;
  subcategories: Subcategory[];
}

export interface Hub {
  slug: string;
  label: string;
  /** One or two sentences shown under the hub H1. */
  intro: string;
  /** MVP hubs get full pages first; the rest show a "coming soon" page until they have content. */
  mvp: boolean;
  categories: Category[];
  /** Brand slugs shown in the mega-menu (brands collection arrives in T2). */
  topBrands: { slug: string; label: string }[];
}

export interface ContentType {
  /** URL segment, e.g. `best` in /best/ and /computing/best/. */
  slug: string;
  /** Frontmatter `type` value. */
  type: 'review' | 'best' | 'versus' | 'how-to' | 'news' | 'deal';
  label: string;
}

export const contentTypes: ContentType[] = [
  { slug: 'reviews', type: 'review', label: 'Reviews' },
  { slug: 'best', type: 'best', label: 'Best picks' },
  { slug: 'vs', type: 'versus', label: 'Face-offs' },
  { slug: 'how-to', type: 'how-to', label: 'How-tos' },
  { slug: 'news', type: 'news', label: 'News' },
  { slug: 'deals', type: 'deal', label: 'Deals' },
];

const sub = (label: string, slug?: string): Subcategory => ({
  label,
  slug: slug ?? slugify(label),
});

const cat = (label: string, subcategories: Subcategory[] = [], slug?: string): Category => ({
  label,
  slug: slug ?? slugify(label),
  subcategories,
});

export const hubs: Hub[] = [
  {
    slug: 'computing',
    label: 'Computing',
    intro:
      'Laptops, desktops, tablets, monitors and the software that runs on them, tested for how people in India actually buy and use them.',
    mvp: true,
    categories: [
      cat('Laptops', [
        sub('Gaming Laptops'),
        sub('Chromebooks'),
        sub('MacBooks'),
        sub('Ultrabooks'),
      ]),
      cat('Desktops', [sub('Gaming Desktops'), sub('Mini PCs'), sub('All-in-ones')]),
      cat('Tablets', [
        sub('iPads', 'ipads'),
        sub('Android Tablets'),
        sub('e-Readers', 'e-readers'),
      ]),
      cat('Components', [sub('CPUs', 'cpus'), sub('GPUs', 'gpus'), sub('Storage')]),
      cat('Peripherals', [
        sub('Monitors'),
        sub('Keyboards'),
        sub('Mice'),
        sub('Webcams'),
        sub('Printers'),
      ]),
      cat('Networking', [sub('Routers'), sub('Mesh Wi-Fi', 'mesh-wifi'), sub('NAS', 'nas')]),
      cat('Software', [sub('Windows'), sub('macOS', 'macos'), sub('Linux'), sub('Apps')]),
      cat('Security', [sub('Antivirus'), sub('Password Managers'), sub('VPNs', 'vpns')]),
      cat('AI', [sub('AI Tools', 'ai-tools'), sub('AI PCs', 'ai-pcs')], 'ai'),
    ],
    topBrands: [
      { slug: 'lenovo', label: 'Lenovo' },
      { slug: 'hp', label: 'HP' },
      { slug: 'dell', label: 'Dell' },
      { slug: 'asus', label: 'Asus' },
      { slug: 'acer', label: 'Acer' },
      { slug: 'apple', label: 'Apple' },
    ],
  },
  {
    slug: 'phones',
    label: 'Phones',
    intro:
      'Android phones, iPhones and the accessories that go with them, with real-world battery, camera and value verdicts at Indian prices.',
    mvp: true,
    categories: [cat('Android Phones'), cat('iPhones', [], 'iphones'), cat('Phone Accessories')],
    topBrands: [
      { slug: 'samsung', label: 'Samsung' },
      { slug: 'apple', label: 'Apple' },
      { slug: 'oneplus', label: 'OnePlus' },
      { slug: 'xiaomi', label: 'Xiaomi' },
      { slug: 'google', label: 'Google' },
      { slug: 'motorola', label: 'Motorola' },
    ],
  },
  {
    slug: 'audio',
    label: 'Audio',
    intro: 'Headphones, earbuds and speakers, judged by ear and by spec sheet.',
    mvp: false,
    categories: [cat('Headphones'), cat('Earbuds'), cat('Speakers')],
    topBrands: [
      { slug: 'sony', label: 'Sony' },
      { slug: 'jbl', label: 'JBL' },
      { slug: 'boat', label: 'boAt' },
    ],
  },
  {
    slug: 'wearables-home',
    label: 'Wearables & Home',
    intro: 'Smartwatches, fitness trackers and smart home gear that is worth living with.',
    mvp: false,
    categories: [cat('Smartwatches'), cat('Fitness Trackers'), cat('Smart Home')],
    topBrands: [
      { slug: 'apple', label: 'Apple' },
      { slug: 'samsung', label: 'Samsung' },
      { slug: 'amazfit', label: 'Amazfit' },
    ],
  },
  {
    slug: 'gaming',
    label: 'Gaming',
    intro: 'Consoles and the accessories that make them better.',
    mvp: false,
    categories: [cat('Consoles'), cat('Gaming Accessories')],
    topBrands: [
      { slug: 'sony', label: 'Sony' },
      { slug: 'microsoft', label: 'Microsoft' },
      { slug: 'nintendo', label: 'Nintendo' },
    ],
  },
];

/** Lowercase, hyphenated, ASCII-only slug. */
export function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const hubPath = (hub: Pick<Hub, 'slug'>) => `/${hub.slug}/`;
export const categoryPath = (hub: Pick<Hub, 'slug'>, category: Pick<Category, 'slug'>) =>
  `/${hub.slug}/${category.slug}/`;
export const subcategoryPath = (
  hub: Pick<Hub, 'slug'>,
  category: Pick<Category, 'slug'>,
  subcategory: Pick<Subcategory, 'slug'>,
) => `/${hub.slug}/${category.slug}/${subcategory.slug}/`;
export const contentTypePath = (type: Pick<ContentType, 'slug'>, hub?: Pick<Hub, 'slug'>) =>
  hub ? `/${hub.slug}/${type.slug}/` : `/${type.slug}/`;

export function getHub(slug: string): Hub | undefined {
  return hubs.find((hub) => hub.slug === slug);
}

/** Where a subcategory (or a category without subcategories) lives in the tree. */
export interface TopicLocation {
  hub: Hub;
  category: Category;
  subcategory?: Subcategory;
}

/**
 * Find a topic by its slug: subcategory slugs are unique site-wide, as are category slugs that
 * have no subcategories (those act as their own leaf, e.g. Phones › Android Phones).
 */
export function findTopic(slug: string): TopicLocation | undefined {
  for (const hub of hubs) {
    for (const category of hub.categories) {
      const subcategory = category.subcategories.find((s) => s.slug === slug);
      if (subcategory) return { hub, category, subcategory };
      if (category.subcategories.length === 0 && category.slug === slug) return { hub, category };
    }
  }
  return undefined;
}

/** Every leaf topic an article can be filed under. */
export function leafTopics(): TopicLocation[] {
  return hubs.flatMap((hub) =>
    hub.categories.flatMap((category) =>
      category.subcategories.length
        ? category.subcategories.map((subcategory) => ({ hub, category, subcategory }))
        : [{ hub, category }],
    ),
  );
}
