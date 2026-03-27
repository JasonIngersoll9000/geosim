import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { GameLayout } from '@/components/layout/GameLayout'

describe('GameLayout', () => {
  it('renders map and panel content side by side', () => {
    render(
      <GameLayout mapContent={<div>map</div>} panelContent={<div>panel</div>} />
    )
    expect(screen.getByText('map')).toBeTruthy()
    expect(screen.getByText('panel')).toBeTruthy()
  })

  it('hides map when collapse button is clicked', () => {
    render(
      <GameLayout mapContent={<div>map</div>} panelContent={<div>panel</div>} />
    )
    const collapseBtn = screen.getByTitle('Collapse map')
    fireEvent.click(collapseBtn)
    expect(screen.queryByText('map')).toBeNull()
  })

  it('shows expand button after map is collapsed', () => {
    render(
      <GameLayout mapContent={<div>map</div>} panelContent={<div>panel</div>} />
    )
    fireEvent.click(screen.getByTitle('Collapse map'))
    expect(screen.getByText('› Show Map')).toBeTruthy()
  })

  it('restores map when expand button is clicked', () => {
    render(
      <GameLayout mapContent={<div>map</div>} panelContent={<div>panel</div>} />
    )
    fireEvent.click(screen.getByTitle('Collapse map'))
    fireEvent.click(screen.getByText('› Show Map'))
    expect(screen.getByText('map')).toBeTruthy()
  })
})
