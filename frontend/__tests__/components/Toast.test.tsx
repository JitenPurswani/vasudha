import React from 'react';
import { render } from '@testing-library/react-native';
import { ToastContainer, ToastData } from '@/components/Toast';

describe('ToastContainer', () => {
  const baseToast = (id: string): ToastData => ({
    id,
    type: 'info',
    title: `Toast ${id}`,
    message: `Message ${id}`,
  });

  it('renders up to 3 toasts and shows their text', () => {
    const toasts: ToastData[] = [
      baseToast('1'),
      baseToast('2'),
      baseToast('3'),
      baseToast('4'),
    ];

    const onDismiss = jest.fn();
    const { getByText, queryByText } = render(
      <ToastContainer toasts={toasts} onDismiss={onDismiss} />
    );

    expect(getByText('Toast 1')).toBeTruthy();
    expect(getByText('Toast 2')).toBeTruthy();
    expect(getByText('Toast 3')).toBeTruthy();
    expect(queryByText('Toast 4')).toBeNull();
  });
});
