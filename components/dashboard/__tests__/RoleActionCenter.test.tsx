import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RoleActionCenter } from '../RoleActionCenter'

// Mock sub-components
vi.mock('@/components/forms/DailyWalkthrough', () => ({ DailyWalkthrough: () => <div>DailyWalkthrough</div> }))
vi.mock('@/components/forms/SecurityWalkthrough', () => ({ SecurityWalkthrough: () => <div>SecurityWalkthrough</div> }))
vi.mock('@/components/forms/MaintenanceTicketForm', () => ({ MaintenanceTicketForm: () => <div>MaintenanceTicketForm</div> }))
vi.mock('@/components/forms/IncidentReport', () => ({ IncidentReport: () => <div>IncidentReport</div> }))

describe('RoleActionCenter', () => {
  const defaultProps = {
    role: 'operations',
    profile: { full_name: 'John Doe' },
    event: { id: 1, title: 'Liturgy' },
    staffAssignments: [
      { user_id: '1', role_assigned: 'operations', profiles: { full_name: 'John Doe' } }
    ],
    summary: { recentWalkthroughs: [], openTickets: 0 }
  }

  it('should render the "No-Line" tab bar with tonnage background', () => {
    const { container } = render(<RoleActionCenter {...defaultProps} />)
    const tabNav = container.querySelector('.bg-surface-container-low')
    expect(tabNav).toBeDefined()
    expect(tabNav).not.toHaveClass('border-b')
  })

  it('should switch between tabs correctly', () => {
    render(<RoleActionCenter {...defaultProps} />)
    
    const teamTab = screen.getByText("Who's Working")
    fireEvent.click(teamTab)
    
    expect(screen.getByText('Scheduled Team')).toBeInTheDocument()
  })

  it('should show oversight section for managers', () => {
    render(<RoleActionCenter {...defaultProps} role="manager" />)
    expect(screen.getByText('Operations Oversight')).toBeInTheDocument()
  })

  it('should show "Action Center" heading for non-managers', () => {
    render(<RoleActionCenter {...defaultProps} role="operations" />)
    expect(screen.getByText('Action Center')).toBeInTheDocument()
  })
})
