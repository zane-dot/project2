import { describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import JobForm from '../components/JobForm.jsx';
import JobList from '../components/JobList.jsx';

describe('JobForm', () => {
  test('submits cleaned payload then resets', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<JobForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('company'), { target: { value: 'HSBC' } });
    fireEvent.change(screen.getByLabelText('role'), { target: { value: 'SWE' } });
    fireEvent.change(screen.getByLabelText('salary_min'), { target: { value: '30000' } });
    fireEvent.click(screen.getByRole('button', { name: /add application/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        company: 'HSBC',
        role: 'SWE',
        salary_min: 30000,
        salary_max: null,
        status: 'Applied',
      }),
    );
    // form was reset
    expect(screen.getByLabelText('company').value).toBe('');
  });

  test('shows server error message', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('boom'));
    render(<JobForm onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('company'), { target: { value: 'X' } });
    fireEvent.change(screen.getByLabelText('role'), { target: { value: 'Y' } });
    fireEvent.click(screen.getByRole('button', { name: /add application/i }));
    expect(await screen.findByText('boom')).toBeInTheDocument();
  });
});

describe('JobList', () => {
  const sample = [
    {
      id: 1,
      company: 'HSBC',
      role: 'Backend Engineer',
      location: 'Hong Kong',
      salary_min: 30000,
      salary_max: 45000,
      status: 'Interview',
      applied_at: '2026-01-01T00:00:00',
      notes: 'second round',
    },
  ];

  test('renders empty state', () => {
    render(<JobList jobs={[]} onStatusChange={vi.fn()} onDelete={vi.fn()} onAdvice={vi.fn()} />);
    expect(screen.getByText(/no applications yet/i)).toBeInTheDocument();
  });

  test('triggers callbacks for status, delete, advice', async () => {
    const onStatusChange = vi.fn();
    const onDelete = vi.fn();
    const onAdvice = vi.fn().mockResolvedValue(undefined);

    render(
      <JobList
        jobs={sample}
        onStatusChange={onStatusChange}
        onDelete={onDelete}
        onAdvice={onAdvice}
      />,
    );

    expect(screen.getByText(/Backend Engineer/)).toBeInTheDocument();
    expect(screen.getByText(/HKD 30,000–45,000\/mo/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('status-for-1'), { target: { value: 'Offer' } });
    expect(onStatusChange).toHaveBeenCalledWith(1, 'Offer');

    fireEvent.click(screen.getByRole('button', { name: /ai interview prep/i }));
    await waitFor(() => expect(onAdvice).toHaveBeenCalledWith(sample[0]));

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(onDelete).toHaveBeenCalledWith(1);
  });
});
