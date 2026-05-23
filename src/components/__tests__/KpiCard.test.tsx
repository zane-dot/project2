import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import KpiCard from '@/components/KpiCard';
import i18n from '@/i18n';

describe('<KpiCard />', () => {
  it('renders label, value and hint', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <KpiCard label="Temperature" value="24 °C" hint="12 stations" />
      </I18nextProvider>,
    );
    expect(screen.getByText('Temperature')).toBeInTheDocument();
    expect(screen.getByText('24 °C')).toBeInTheDocument();
    expect(screen.getByText('12 stations')).toBeInTheDocument();
  });
});
