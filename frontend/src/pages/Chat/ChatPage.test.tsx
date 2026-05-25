import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import ChatPage from './ChatPage'

vi.mock('../../api/chatApi', () => ({
  chatApi: {
    listSessions: vi.fn().mockResolvedValue({ data: [] }),
    createSession: vi.fn(),
    listMessages: vi.fn().mockResolvedValue({ data: [] }),
    sendMessage: vi.fn(),
    streamChat: vi.fn(),
  },
}))

vi.mock('../../api/workspaceApi', () => ({
  workspaceApi: {
    uploadFile: vi.fn(),
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
  it('should render chat page', async () => {
    render(
      <BrowserRouter>
        <ChatPage />
      </BrowserRouter>
    )

    expect(await screen.findByText(/开始和 AI 助手对话/i)).toBeInTheDocument()
  })
})
