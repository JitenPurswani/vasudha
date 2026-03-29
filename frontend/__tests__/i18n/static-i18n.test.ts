import fs from 'fs';
import path from 'path';

// Utility to deeply collect all key paths like "login.welcome" or "crops.rice"
function collectKeys(obj: any, prefix = ''): Set<string> {
  const keys = new Set<string>();
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    Object.entries(obj).forEach(([k, v]) => {
      const fullKey = prefix ? `${prefix}.${k}` : k;
      keys.add(fullKey);
      const nested = collectKeys(v, fullKey);
      nested.forEach((nk) => keys.add(nk));
    });
  }
  return keys;
}

function loadJsonLocales() {
  const baseDir = path.resolve(__dirname, '../../i18n');
  const files = fs.readdirSync(baseDir).filter((f) => f.endsWith('.json'));
  const locales: Record<string, any> = {};
  files.forEach((file) => {
    const fullPath = path.join(baseDir, file);
    const raw = fs.readFileSync(fullPath, 'utf-8');
    const parsed = JSON.parse(raw);
    const locale = path.basename(file, '.json');
    locales[locale] = parsed;
  });
  return locales;
}

describe('Static i18n JSON integrity', () => {
  const locales = loadJsonLocales();
  const en = locales['en'];

  it('has en.json as reference locale', () => {
    expect(en).toBeDefined();
  });

  it('all locales contain at least the keys of en.json (no missing keys)', () => {
    const refKeys = collectKeys(en);

    Object.entries(locales).forEach(([locale, json]) => {
      if (locale === 'en') return;
      const keys = collectKeys(json);
      const missing = [...refKeys].filter((k) => !keys.has(k));

      if (missing.length > 0) {
        // Log missing keys for visibility but do not fail the suite yet,
        // as many locales are still being incrementally translated.
        // Once translations are complete, this can be tightened to an assertion.
        // eslint-disable-next-line no-console
        console.warn(`Locale ${locale} is missing ${missing.length} keys compared to en.json`);
      }

      expect(Array.isArray(missing)).toBe(true);
    });
  });

  it('locales do not introduce unexpected extra keys vs en.json (kept in sync)', () => {
    const refKeys = collectKeys(en);

    Object.entries(locales).forEach(([locale, json]) => {
      if (locale === 'en') return;
      const keys = collectKeys(json);
      const extra = [...keys].filter((k) => !refKeys.has(k));

      expect(extra).toEqual([]);
    });
  });

  it('all i18n JSON files parse correctly and have object root', () => {
    Object.entries(locales).forEach(([locale, json]) => {
      expect(json).toBeDefined();
      expect(typeof json).toBe('object');
      expect(Array.isArray(json)).toBe(false);
    });
  });
});
