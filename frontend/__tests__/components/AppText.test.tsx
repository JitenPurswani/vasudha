import React from 'react';
import { render } from '@testing-library/react-native';
import i18n from '@/i18n';
import { AppText } from '@/components/AppText';

describe('AppText', () => {
  it('uses English header font by default', () => {
    i18n.changeLanguage('en');
    const { getByText } = render(<AppText variant="header">Hello</AppText>);

    expect(getByText('Hello')).toHaveStyle({ fontFamily: 'KronaOne' });
  });

  it('switches header font based on language', () => {
    i18n.changeLanguage('hi');
    const { getByText } = render(<AppText variant="header">Hello</AppText>);

    expect(getByText('Hello')).toHaveStyle({ fontFamily: 'YatraOne' });
  });
});
