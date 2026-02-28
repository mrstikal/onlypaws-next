import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  OnlyPawsPageDataProvider,
  useOnlyPawsPageData,
  useOnlyPawsPageDataOptional,
} from '@/components/onlypaws/OnlyPawsPageDataContext';

describe('OnlyPawsPageDataContext', () => {
  const mockData = {
    tiers: [
      { id: 1n, slug: 'free' as const, name: 'Free', price_monthly: 0, description: null },
      { id: 2n, slug: 'basic' as const, name: 'Basic', price_monthly: 99, description: 'Basic tier' },
    ],
    viewerTierSlug: 'free' as const,
    isAuthed: true,
  };

  it('provides page data to children via useOnlyPawsPageData', () => {
    function TestComponent() {
      const data = useOnlyPawsPageData();
      return (
        <div>
          <div>Tier: {data.viewerTierSlug}</div>
          <div>Tiers count: {data.tiers.length}</div>
          <div>Authed: {data.isAuthed ? 'yes' : 'no'}</div>
        </div>
      );
    }

    render(
      <OnlyPawsPageDataProvider value={mockData}>
        <TestComponent />
      </OnlyPawsPageDataProvider>,
    );

    expect(screen.getByText('Tier: free')).toBeInTheDocument();
    expect(screen.getByText('Tiers count: 2')).toBeInTheDocument();
    expect(screen.getByText('Authed: yes')).toBeInTheDocument();
  });

  it('provides optional access via useOnlyPawsPageDataOptional', () => {
    function TestComponent() {
      const data = useOnlyPawsPageDataOptional();
      return <div>{data ? 'Has data' : 'No data'}</div>;
    }

    render(
      <OnlyPawsPageDataProvider value={mockData}>
        <TestComponent />
      </OnlyPawsPageDataProvider>,
    );

    expect(screen.getByText('Has data')).toBeInTheDocument();
  });

  it('throws error when useOnlyPawsPageData is used outside provider', () => {
    function TestComponent() {
      useOnlyPawsPageData();
      return <div>Test</div>;
    }

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useOnlyPawsPageData must be used within OnlyPawsPageDataProvider');

    consoleErrorSpy.mockRestore();
  });

  it('returns null when useOnlyPawsPageDataOptional is used outside provider', () => {
    function TestComponent() {
      const data = useOnlyPawsPageDataOptional();
      return <div>{data === null ? 'null' : 'has value'}</div>;
    }

    render(<TestComponent />);

    expect(screen.getByText('null')).toBeInTheDocument();
  });
});


