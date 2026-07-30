import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Category, Subscription, SubscriptionInsert } from '@/types/database'

export type SubscriptionWithCategory = Subscription & { category: Category | null }

type NewSubscription = Omit<SubscriptionInsert, 'user_id'>
type SubscriptionUpdate = Partial<NewSubscription> & { id: string }

export function useSubscriptions() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['subscriptions', user?.id],
    queryFn: async (): Promise<SubscriptionWithCategory[]> => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*, category:categories(*)')
        .eq('user_id', user!.id)
        .order('next_payment_date', { ascending: true })
      if (error) throw error
      return data as SubscriptionWithCategory[]
    },
    enabled: !!user,
  })
}

export function useCreateSubscription() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: NewSubscription) => {
      const { error } = await supabase
        .from('subscriptions')
        .insert({ ...input, user_id: user!.id })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions', user?.id] })
      toast.success('Suscripción creada')
    },
    onError: () => toast.error('No pudimos crear la suscripción'),
  })
}

export function useUpdateSubscription() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: SubscriptionUpdate) => {
      const { error } = await supabase.from('subscriptions').update(updates).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions', user?.id] })
      toast.success('Suscripción actualizada')
    },
    onError: () => toast.error('No pudimos actualizar la suscripción'),
  })
}

export function useDeleteSubscription() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('subscriptions').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions', user?.id] })
      toast.success('Suscripción eliminada')
    },
    onError: () => toast.error('No pudimos eliminar la suscripción'),
  })
}

export function useToggleSubscriptionActive() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('subscriptions')
        .update({ is_active: isActive })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions', user?.id] })
    },
    onError: () => toast.error('No pudimos actualizar la suscripción'),
  })
}
