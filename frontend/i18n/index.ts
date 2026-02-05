import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import bn from './bn.json';
import en from './en.json';
import gu from './gu.json';
import hi from './hi.json';
import kn from './kn.json';
import ml from './ml.json';
import mr from './mr.json';
import pa from './pa.json';
import ta from './ta.json';
import te from './te.json';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hi: { translation: hi },
    mr: { translation: mr },
    ta: { translation: ta },
    gu: { translation: gu },
    bn: { translation: bn },
    ml: { translation: ml },
    te: { translation: te },
    kn: { translation: kn },
    pa: { translation: pa },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false, 
  },
});

// Log language initialization
console.log('[i18n] Initialized with language:', i18n.language);
console.log('[i18n] Available languages:', Object.keys(i18n.options.resources || {}));

// Listen for language changes
i18n.on('languageChanged', (lng) => {
  console.log('[i18n] 🌍 LANGUAGE CHANGED TO:', lng);
  console.log('[i18n] Translation keys will now use', lng, 'language files');
});

export default i18n;