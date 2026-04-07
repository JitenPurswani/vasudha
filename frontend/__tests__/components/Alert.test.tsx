import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import Alert from '@/components/Alert';

describe('Alert component', () => {
  it('renders title and description and handles press', () => {
    const onPress = jest.fn();

    const { getByTestId, getByText } = render(
      <Alert
        title="Test Alert"
        description="Something happened"
        severity="warning"
        onPress={onPress}
      />
    );

    expect(getByText('Test Alert')).toBeTruthy();
    expect(getByText('Something happened')).toBeTruthy();

    fireEvent.press(getByTestId('alert-card'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss when close icon is pressed', () => {
    const onDismiss = jest.fn();

    const { getByTestId } = render(
      <Alert
        title="Dismiss Me"
        description="Body"
        onDismiss={onDismiss}
      />
    );

    fireEvent.press(getByTestId('alert-dismiss'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
