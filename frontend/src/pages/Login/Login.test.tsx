import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import Login from './Login'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('../../api/authApi', () => ({
  authApi: {
    login: vi.fn(),
  },
}))

vi.mock('../../store/authStore', () => ({
  useAuthStore: vi.fn(() => vi.fn()),
}))

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render login form', () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    )

    expect(screen.getByLabelText(/用户名/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/密码/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /登录/i })).toBeInTheDocument()
  })

  it('should show error when username is empty', async () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    )

    const submitButton = screen.getByRole('button', { name: /登录/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('请输入用户名')
    })
  })

  it('should show error when password is empty', async () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    )

    const usernameInput = screen.getByLabelText(/用户名/i)
    fireEvent.change(usernameInput, { target: { value: 'testuser' } })

    const submitButton = screen.getByRole('button', { name: /登录/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('请输入密码')
    })
  })

  it('should toggle password visibility', () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    )

    const passwordInput = screen.getByLabelText(/密码/i)
    const toggleButton = screen.getByLabelText(/显示密码/i)

    expect(passwordInput).toHaveAttribute('type', 'password')

    fireEvent.click(toggleButton)
    expect(passwordInput).toHaveAttribute('type', 'text')
    expect(screen.getByLabelText(/隐藏密码/i)).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText(/隐藏密码/i))
    expect(passwordInput).toHaveAttribute('type', 'password')
  })
})
