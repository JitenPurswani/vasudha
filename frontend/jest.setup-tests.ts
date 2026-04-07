// Global Jest setup: filter noisy logs, provide globals, and mock heavy native modules

// Mock @expo/vector-icons to avoid internal async state updates that trigger act() warnings
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');

  const createIconComponent = (name: string) => (props: any) =>
    React.createElement(Text, props, name);

  return {
    Ionicons: createIconComponent('Ionicons'),
    MaterialCommunityIcons: createIconComponent('MaterialCommunityIcons'),
    Feather: createIconComponent('Feather'),
  };
});

const originalLog = console.log;
const originalWarn = console.warn;

beforeAll(() => {
  // Provide a default global alert so tests can spy on it safely
  if (!(global as any).alert) {
    (global as any).alert = () => {};
  }

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
