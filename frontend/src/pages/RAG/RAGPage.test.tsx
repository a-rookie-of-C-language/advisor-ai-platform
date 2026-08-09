import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import RAGPage from './RAGPage'

vi.mock('../../api/ragApi', () => ({
  ragApi: {
    listKnowledgeBases: vi.fn().mockResolvedValue({ data: [] }),
    createKnowledgeBase: vi.fn(),
    deleteKnowledgeBase: vi.fn(),
    listDocuments: vi.fn().mockResolvedValue({ data: [] }),
    uploadDocument: vi.fn(),
    deleteDocument: vi.fn(),
  },
}))

describe('RAGPage', () => {
  it('should render rag page', async () => {
    render(
      <BrowserRouter>
        <RAGPage />
      </BrowserRouter>
    )

    expect(await screen.findByRole('heading', { name: '知识库管理' })).toBeInTheDocument()
  })
})
