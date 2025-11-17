import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { 
  EmptyState, 
  StatusBadge, 
  Card, 
  Button, 
  LoadingSpinner 
} from '../../src/shared/ui';

describe('Shared Components', () => {
  describe('EmptyState', () => {
    it('renders with title and subtitle', () => {
      const { getByText } = render(
        <EmptyState title="No items" subtitle="Add some items" />
      );
      expect(getByText('No items')).toBeTruthy();
      expect(getByText('Add some items')).toBeTruthy();
    });
  });

  describe('StatusBadge', () => {
    it('renders confirmed status', () => {
      const { getByText } = render(<StatusBadge status="confirmed" />);
      expect(getByText('Confirmed')).toBeTruthy();
    });
  });

  describe('Card', () => {
    it('renders children', () => {
      const { getByText } = render(
        <Card><Text>Card content</Text></Card>
      );
      expect(getByText('Card content')).toBeTruthy();
    });
  });

  describe('Button', () => {
    it('renders with title', () => {
      const { getByText } = render(
        <Button title="Click me" onPress={() => {}} />
      );
      expect(getByText('Click me')).toBeTruthy();
    });
  });

  describe('LoadingSpinner', () => {
    it('renders with text', () => {
      const { getByText } = render(
        <LoadingSpinner text="Loading..." />
      );
      expect(getByText('Loading...')).toBeTruthy();
    });
  });
});