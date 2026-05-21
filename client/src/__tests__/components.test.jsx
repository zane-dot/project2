import { describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatusBadge from '../components/StatusBadge.jsx';
import StatsCard from '../components/StatsCard.jsx';

describe('StatusBadge', () => {
  test.each(['Applied', 'Interview', 'Offer', 'Rejected'])('renders %s', (status) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByTestId('status-badge')).toHaveTextContent(status);
  });

  test('handles unknown status with default styling', () => {
    render(<StatusBadge status="Pending" />);
    expect(screen.getByTestId('status-badge')).toHaveTextContent('Pending');
  });
});

describe('StatsCard', () => {
  test('renders label and value', () => {
    render(<StatsCard label="Total" value={7} />);
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });
});
