import request from './request'

export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

export type FeedbackIssueStatus = 'OPEN' | 'CLOSED'
export type GitHubSyncStatus = 'PENDING' | 'SYNCED' | 'FAILED'

export interface IssueCommentDTO {
  id: number
  content: string
  githubSyncStatus: GitHubSyncStatus
  githubCommentId?: number
  githubCommentUrl?: string
  createdById?: number
  createdByUsername?: string
  createdByRealName?: string
  createdAt: string
}

export interface GitHubPullRequestDTO {
  number: number
  title: string
  state: string
  url: string
}

export interface IssueDTO {
  id: number
  title: string
  content: string
  status: FeedbackIssueStatus
  githubSyncStatus: GitHubSyncStatus
  githubIssueNumber?: number
  githubIssueUrl?: string
  githubState?: string
  githubLastSyncedAt?: string
  closeReason?: string
  createdById?: number
  createdByUsername?: string
  createdByRealName?: string
  closedById?: number
  closedByUsername?: string
  createdAt: string
  updatedAt: string
  closedAt?: string
  canClose: boolean
  comments?: IssueCommentDTO[]
  githubPullRequests?: GitHubPullRequestDTO[]
}

export const feedbackApi = {
  listIssues: () => request.get<unknown, ApiResponse<IssueDTO[]>>('/issues'),

  getIssue: (id: number) => request.get<unknown, ApiResponse<IssueDTO>>(`/issues/${id}`),

  createIssue: (params: { title: string; content: string }) =>
    request.post<unknown, ApiResponse<IssueDTO>>('/issues', params),

  createComment: (id: number, params: { content: string }) =>
    request.post<unknown, ApiResponse<IssueCommentDTO>>(`/issues/${id}/comments`, params),

  closeIssue: (id: number, params: { reason: string }) =>
    request.post<unknown, ApiResponse<IssueDTO>>(`/issues/${id}/close`, params),

  retryGitHubSync: (id: number) =>
    request.post<unknown, ApiResponse<IssueDTO>>(`/issues/${id}/github/retry`),
}
