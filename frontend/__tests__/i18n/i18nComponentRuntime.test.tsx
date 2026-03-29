import React from 'react';
import { render } from '@testing-library/react-native';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n';
import { AppText } from '@/components/AppText';

function TestWelcome() {
  return (
    <I18nextProvider i18n={i18n}>
      <AppText>
        {i18n.t('login.welcome')}
      </AppText>
    </I18nextProvider>
  );
}

describe('Runtime i18n rendering', () => {
  it('renders English login welcome text by default', () => {
    i18n.changeLanguage('en');
    const { getByText } = render(<TestWelcome />);
    expect(getByText('Welcome to Vasudha')).toBeTruthy();
  });

  it('changes rendered text when language is switched (if translation exists)', () => {
    i18n.changeLanguage('hi');
    const hiText = i18n.t('login.welcome');
    expect(typeof hiText).toBe('string');
    expect(hiText.length).toBeGreaterThan(0);

    const { getByText } = render(<TestWelcome />);
    expect(getByText(hiText)).toBeTruthy();
  });
});
