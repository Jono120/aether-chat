import i18n from './instance.js';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, normalizeLocale } from './countryLocaleMap.js';
import { detectLocale, getBootstrapLocale } from './detectLocale.js';

const LOCALE_LOADERS = {
  'en-NZ': async () => {
    const [common, legal] = await Promise.all([
      import('./locales/en-NZ.json'),
      import('./locales/legal.en-NZ.json'),
    ]);
    return { translation: common.default, legal: legal.default };
  },
  es: async () => {
    const [common, legal] = await Promise.all([
      import('./locales/es.json'),
      import('./locales/legal.es.json'),
    ]);
    return { translation: common.default, legal: legal.default };
  },
  fr: async () => {
    const [common, legal] = await Promise.all([
      import('./locales/fr.json'),
      import('./locales/legal.fr.json'),
    ]);
    return { translation: common.default, legal: legal.default };
  },
};

async function loadLocaleBundles(locale) {
  const loader = LOCALE_LOADERS[locale] ?? LOCALE_LOADERS[DEFAULT_LOCALE];
  return loader();
}

export function applyDocumentLang(locale) {
  const normalised = normalizeLocale(locale);
  document.documentElement.lang = normalised;
}

let initPromise = null;

export async function initI18n() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const bootstrapLocale = getBootstrapLocale();
    const bundles = await loadLocaleBundles(bootstrapLocale);

    await i18n.init({
      lng: bootstrapLocale,
      fallbackLng: DEFAULT_LOCALE,
      supportedLngs: SUPPORTED_LOCALES,
      ns: ['translation', 'legal'],
      defaultNS: 'translation',
      resources: {
        [bootstrapLocale]: bundles,
      },
      interpolation: { escapeValue: false },
      react: { useSuspense: false },
    });

    applyDocumentLang(bootstrapLocale);

    void detectLocale().then(async ({ locale }) => {
      const next = normalizeLocale(locale);
      if (next === i18n.language) return;
      const nextBundles = await loadLocaleBundles(next);
      for (const [ns, data] of Object.entries(nextBundles)) {
        i18n.addResourceBundle(next, ns, data, true, true);
      }
      await i18n.changeLanguage(next);
      applyDocumentLang(next);
    });
  })();

  return initPromise;
}

export { i18n };
export { useTranslation } from 'react-i18next';
