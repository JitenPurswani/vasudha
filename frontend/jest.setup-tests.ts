// Global Jest setup: filter noisy logs from i18n and optional test helpers

const originalLog = console.log;
const originalWarn = console.warn;

beforeAll(() => {
  // Suppress i18n initialization chatter
  console.log = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].startsWith('[i18n]')) {
      return;
    }
    originalLog(...args as Parameters<typeof console.log>);
  };

  // Suppress static i18n missing-keys warnings (they are already enforced by tests if needed)
  console.warn = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Locale ') && args[0].includes(' keys compared to en.json'))
    ) {
      return;
    }
    originalWarn(...args as Parameters<typeof console.warn>);
  };
});

afterAll(() => {
  console.log = originalLog;
  console.warn = originalWarn;
});
