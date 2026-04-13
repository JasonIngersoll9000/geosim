import { render, screen, fireEvent } from '@testing-library/react'
import { AssetInfoPanel } from '@/components/map/AssetInfoPanel'
import type { MapAsset } from '@/lib/types/simulation'

const mockAsset: MapAsset = {
  id: 'fordow', actor_id: 'iran', asset_type: 'nuclear_facility',
  label: 'Fordow FEP', lat: 34.884, lng: 50.995,
  status: 'degraded', capacity_pct: 62,
  actor_color: '#1a8a4a', tooltip: 'Underground enrichment facility near Qom',
  is_approximate_location: false,
}

describe('AssetInfoPanel', () => {
  it('renders asset name and status', () => {
    render(<AssetInfoPanel asset={mockAsset} onClose={() => {}} />)
    expect(screen.getByText('Fordow FEP')).toBeTruthy()
    expect(screen.getByText(/DEGRADED/i)).toBeTruthy()
  })

  it('shows capacity percentage', () => {
    render(<AssetInfoPanel asset={mockAsset} onClose={() => {}} />)
    expect(screen.getByText(/62%/)).toBeTruthy()
  })

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn()
    render(<AssetInfoPanel asset={mockAsset} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalled()
  })
})
