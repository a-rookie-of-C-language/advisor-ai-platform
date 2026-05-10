import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import ChatPage from './ChatPage'

vi.mock('../../api/chatApi', () => ({
  chatApi: {
    getSessions: vi.fn().mockResolvedValue([]),
    createSession: vi.fn(),
    getMessages: vi.fn().mockResolvedValue([]),
    sendMessage: vi.fn(),
  },
}))

vi.mock('../../api/ragApi', () => ({
  ragApi: {
    listKnowledgeBases: vi.fn().mockResolvedValue([]),
  },
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  }
})

describe('ChatPage', () => {
  it('should render chat page', () => {
    render(
      <BrowserRouter>
        <ChatPage />
      </BrowserRouter>
    )

    expect(screen.getByText(/会话列表|暂无会话/i)).toBeInTheDocument()
  })
})
