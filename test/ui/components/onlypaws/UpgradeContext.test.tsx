import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UpgradeProvider, useUpgrade } from '@/components/onlypaws/UpgradeContext';

describe('UpgradeContext', () => {
  it('provides openUpgrade function to children', () => {
    const openUpgradeMock = vi.fn();

    function TestComponent() {
      const context = useUpgrade();
      return (
        <button onClick={() => context?.openUpgrade?.()}>
          Open Upgrade
        </button>
      );
    }

    render(
      <UpgradeProvider openUpgrade={openUpgradeMock}>
        <TestComponent />
      </UpgradeProvider>,
    );

    expect(screen.getByText('Open Upgrade')).toBeInTheDocument();
  });

  it('calls openUpgrade when button is clicked', () => {
    const openUpgradeMock = vi.fn();

    function TestComponent() {
      const context = useUpgrade();
      return (
        <button onClick={() => context?.openUpgrade?.()}>
          Upgrade
        </button>
      );
    }

    const { getByText } = render(
      <UpgradeProvider openUpgrade={openUpgradeMock}>
        <TestComponent />
      </UpgradeProvider>,
    );

    const button = getByText('Upgrade');
    button.click();

    expect(openUpgradeMock).toHaveBeenCalled();
  });

  it('returns null when useUpgrade is used outside provider', () => {
    function TestComponent() {
      const context = useUpgrade();
      return <div>{context === null ? 'No context' : 'Has context'}</div>;
    }

    render(<TestComponent />);

    expect(screen.getByText('No context')).toBeInTheDocument();
  });

  it('handles multiple calls to openUpgrade', () => {
    const openUpgradeMock = vi.fn();

    function TestComponent() {
      const context = useUpgrade();
      return (
        <button onClick={() => {
          context?.openUpgrade?.();
          context?.openUpgrade?.();
        }}>
          Click me
        </button>
      );
    }

    const { getByText } = render(
      <UpgradeProvider openUpgrade={openUpgradeMock}>
        <TestComponent />
      </UpgradeProvider>,
    );

    getByText('Click me').click();

    expect(openUpgradeMock).toHaveBeenCalledTimes(2);
  });
});

