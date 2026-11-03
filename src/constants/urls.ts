import { otherAppUrl, purchaseTermsUrl, reviewUrl } from '../utils/stores';

export const SITE_BASE = 'https://graysmithlabs.com/apps';

export const URLS = {
  privacy: `${SITE_BASE}/saybright-privacy.html`,
  // Apple's standard EULA on iOS, Google Play's terms on Android
  terms: purchaseTermsUrl,
  support: `${SITE_BASE}/saybright.html#support`,
  home: `${SITE_BASE}/saybright.html`,
  // Shared text is read on any phone, so it links the site page, which offers both stores
  share: `${SITE_BASE}/saybright.html`,
  writeReview: reviewUrl(),
};

// playPackage is set once an app is live on Google Play; until then Android users do not see it.
const OTHER_APPS = [
  {
    id: 'drift',
    icon: '🌙',
    title: 'Drift',
    subtitle: 'Sleep sounds and white noise',
    appStoreId: '6758258891',
    playPackage: null as string | null,
  },
  {
    id: 'celebriday',
    icon: '🎉',
    title: 'CelebriDay',
    subtitle: "Discover today's random holidays",
    appStoreId: '6760971240',
    playPackage: null as string | null,
  },
  {
    id: 'signsnap',
    icon: '✍️',
    title: 'SignSnap',
    subtitle: 'Sign documents instantly',
    appStoreId: '6759199184',
    playPackage: null as string | null,
  },
  {
    id: 'blitztap',
    icon: '⚡',
    title: 'BlitzTap',
    subtitle: 'Test your reflexes',
    appStoreId: '6759490849',
    playPackage: null as string | null,
  },
];

export const CROSS_PROMO = OTHER_APPS.flatMap(({ appStoreId, playPackage, ...app }) => {
  const url = otherAppUrl({ appStoreId, playPackage });
  return url ? [{ ...app, url }] : [];
});
