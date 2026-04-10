/**
 * React Query hooks voor alle API-data.
 * Centraal punt zodat caching consistent is.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from './api'
import { useAuthStore } from '../stores/authStore'

// ── Schedules ─────────────────────────────────────────────────

export interface ActivityStep {
  id: string
  title: string
  icon?: string | null
  sortOrder: number
  completedAt?: string | null
}

export interface Activity {
  id: string
  title: string
  icon: string
  startTime: string
  durationMinutes: number
  color: string
  notifyBefore: number[]
  sortOrder: number
  steps: ActivityStep[]
  isCurrent?: boolean
  isPast?: boolean
}

export interface Schedule {
  id: string
  userId: string
  dayOfWeek: number
  activities: Activity[]
}

export interface TodayScheduleResponse {
  schedule: Schedule | null
  activities: Activity[]
  dayOfWeek: number
  date: string
}

export function useTodaySchedule(childId?: string) {
  return useQuery({
    queryKey: ['schedule', 'today', childId],
    queryFn: () => api.get<TodayScheduleResponse>(`/api/schedules/today/${childId}`),
    enabled: !!childId,
    refetchInterval: 60_000, // elke minuut herladen
  })
}

export function useAllSchedules(childId?: string) {
  return useQuery({
    queryKey: ['schedules', childId],
    queryFn: () => api.get<{ schedules: Schedule[] }>(`/api/schedules/${childId}`),
    enabled: !!childId,
  })
}

export interface NewActivityInput {
  title: string
  icon: string
  startTime: string
  durationMinutes: number
  color?: string
  notifyBefore?: number[]
  steps?: { title: string; icon?: string }[]
}

export function useAddActivity(scheduleId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: NewActivityInput) =>
      api.post(`/api/schedules/${scheduleId}/activities`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedules'] }),
  })
}

export function useDeleteActivity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (activityId: string) => api.delete(`/api/schedules/activities/${activityId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedules'] }),
  })
}

export function useUpdateActivity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Activity> & { id: string }) =>
      api.put(`/api/schedules/activities/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedules'] }),
  })
}

// ── Tasks ─────────────────────────────────────────────────────

export interface TaskStep {
  id: string
  title: string
  icon?: string | null
  sortOrder: number
  completedAt?: string | null
}

export interface Task {
  id: string
  childId: string
  title: string
  description?: string | null
  icon?: string | null
  durationMinutes?: number | null
  scheduledFor?: string | null
  completedAt?: string | null
  sortOrder: number
  steps: TaskStep[]
  createdBy: { id: string; name: string }
}

export function useTasks(childId?: string) {
  return useQuery({
    queryKey: ['tasks', childId],
    queryFn: () => api.get<{ tasks: Task[] }>(`/api/tasks/${childId}`),
    enabled: !!childId,
  })
}

export function useCompleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (taskId: string) => api.patch(`/api/tasks/${taskId}/complete`),
    onSuccess: (_, taskId) => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export function useCompleteStep() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, stepId }: { taskId: string; stepId: string }) =>
      api.patch(`/api/tasks/${taskId}/steps/${stepId}/complete`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      childId: string
      title: string
      description?: string
      icon?: string
      durationMinutes?: number
      scheduledFor?: string
      steps?: { title: string; icon?: string }[]
    }) => api.post<Task>('/api/tasks', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (taskId: string) => api.delete(`/api/tasks/${taskId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

// ── Users / Children ──────────────────────────────────────────

export interface ChildProfile {
  id: string
  name: string
  role?: string
  avatarUrl?: string | null
  avatarId?: string | null
  gender?: string | null
  dateOfBirth?: string | null
  isActive?: boolean
  isPrimary?: boolean
}

/** Voor het PIN-inlogscherm — alle actieve kinderen */
export function useChildren() {
  return useQuery({
    queryKey: ['children'],
    queryFn: () => api.get<{ children: ChildProfile[] }>('/api/auth/children'),
  })
}

/** Voor ouder-dashboard — alleen gekoppelde kinderen */
export function useMyChildren() {
  return useQuery({
    queryKey: ['my-children'],
    queryFn: () => api.get<{ children: ChildProfile[] }>('/api/users/my-children'),
  })
}

export function useCreateChild() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      name: string
      pin: string
      gender?: string
      dateOfBirth?: string
      avatarId?: string
    }) => api.post<ChildProfile>('/api/users/children', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-children'] })
      qc.invalidateQueries({ queryKey: ['children'] })
    },
  })
}

export function useUpdateChild() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; pin?: string; gender?: string; dateOfBirth?: string; avatarId?: string; isActive?: boolean }) =>
      api.put<ChildProfile>(`/api/users/children/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-children'] })
      qc.invalidateQueries({ queryKey: ['children'] })
    },
  })
}

export function useDeleteChild() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/users/children/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-children'] })
      qc.invalidateQueries({ queryKey: ['children'] })
    },
  })
}

export function useUpdateAvatar() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { avatarId: string; gender?: string }) =>
      api.patch<{ id: string; avatarId: string; gender: string }>('/api/users/me/avatar', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile'] }),
  })
}

// ── Tokens ────────────────────────────────────────────────────

export interface TokenTransaction {
  id: string
  amount: number
  type: string
  sourceType: string
  note?: string | null
  createdAt: string
  reward?: { id: string; title: string } | null
}

export interface TokenBalanceResponse {
  balance: number
  todayEarned: number
  streak: number
  transactions: TokenTransaction[]
}

export interface Reward {
  id: string
  childId: string
  title: string
  description?: string | null
  imageUrl?: string | null
  costTokens: number
  isAvailable: boolean
  requiresApproval: boolean
  category?: string | null
  expiresAt?: string | null
  sortOrder: number
}

export function useTokenBalance(childId?: string) {
  return useQuery({
    queryKey: ['tokens', childId],
    queryFn: () => api.get<TokenBalanceResponse>(`/api/tokens/${childId}`),
    enabled: !!childId,
    refetchInterval: 30_000,
  })
}

export function useRewards(childId?: string) {
  return useQuery({
    queryKey: ['rewards', childId],
    queryFn: () => api.get<{ rewards: Reward[] }>(`/api/tokens/${childId}/rewards`),
    enabled: !!childId,
  })
}

export function useRedeemReward() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ childId, rewardId }: { childId: string; rewardId: string }) =>
      api.post<{ transaction: TokenTransaction; requiresApproval: boolean; rewardTitle: string }>(
        `/api/tokens/${childId}/redeem`,
        { rewardId }
      ),
    onSuccess: (_, { childId }) => {
      qc.invalidateQueries({ queryKey: ['tokens', childId] })
    },
  })
}

export function useGrantTokens() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ childId, amount, note }: { childId: string; amount: number; note?: string }) =>
      api.post(`/api/tokens/${childId}/grant`, { amount, note }),
    onSuccess: (_, { childId }) => {
      qc.invalidateQueries({ queryKey: ['tokens', childId] })
    },
  })
}

export function useCreateReward() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      childId,
      ...data
    }: {
      childId: string
      title: string
      description?: string
      costTokens: number
      requiresApproval?: boolean
      category?: string
    }) => api.post<Reward>(`/api/tokens/${childId}/rewards`, data),
    onSuccess: (_, { childId }) => {
      qc.invalidateQueries({ queryKey: ['rewards', childId] })
    },
  })
}

export function useUpdateReward() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Reward> & { id: string }) =>
      api.put(`/api/tokens/rewards/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rewards'] }),
  })
}

export function useDeleteReward() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (rewardId: string) => api.delete(`/api/tokens/rewards/${rewardId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rewards'] }),
  })
}
