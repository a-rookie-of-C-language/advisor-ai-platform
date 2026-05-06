import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import RAGPage from './RAGPage'

vi.mock('../../api/ragApi', () => ({
  ragApi: {
    listKnowledgeBases: vi.fn().mockResolvedValue([]),
    createKnowledgeBase: vi.fn(),
    deleteKnowledgeBase: vi.fn(),
    listDocuments: vi.fn().mockResolvedValue([]),
    uploadDocument: vi.fn(),
    deleteDocument: vi.fn(),
  },
}))

describe('RAGPage', () => {
  it('should render rag page', () => {
    render(
      <BrowserRouter>
        <RAGPage />
      </BrowserRouter>
    )

    expect(screen.getByText(/知识库|RAG/i)).toBeInTheDocument()
  })
})
