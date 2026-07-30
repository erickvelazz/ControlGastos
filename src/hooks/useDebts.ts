import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Debt, DebtInsert } from '@/types/database'

type NewDebt = Omit<DebtInsert, 'user_id' | 'status'>
type DebtUpdate = Partial<NewDebt> & { id: string }

export function useDebts() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['debts', user?.id],
    queryFn: async (): Promise<Debt[]> => {
      const { data, error } = await supabase
        .from('debts')
        .select('*')
        .eq('user_id', user!.id)
        .order('status', { ascending: true })
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!user,
  })
}

export function useCreateDebt() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: NewDebt) => {
      const { error } = await supabase.from('debts').insert({ ...input, user_id: user!.id })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts', user?.id] })
      toast.success('Deuda creada')
    },
    onError: () => toast.error('No pudimos crear la deuda'),
  })
}

export function useUpdateDebt() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: DebtUpdate) => {
      const { error } = await supabase.from('debts').update(updates).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts', user?.id] })
      toast.success('Deuda actualizada')
    },
    onError: () => toast.error('No pudimos actualizar la deuda'),
  })
}

export function useDeleteDebt() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('debts').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts', user?.id] })
      toast.success('Deuda eliminada')
    },
    onError: () => toast.error('No pudimos eliminar la deuda'),
  })
}

export function useMarkDebtPaid() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('debts')
        .update({ status: 'paid', current_balance: 0 })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts', user?.id] })
      toast.success('Deuda marcada como pagada')
    },
    onError: () => toast.error('No pudimos actualizar la deuda'),
  })
}
