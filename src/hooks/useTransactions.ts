import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Category, Transaction, TransactionFilters, TransactionInsert } from '@/types/database'

export type TransactionWithCategory = Transaction & { category: Category | null }

type NewTransaction = Omit<TransactionInsert, 'user_id'>
type TransactionUpdate = Partial<NewTransaction> & { id: string }

export function useTransactions(filters: TransactionFilters = {}) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['transactions', user?.id, filters],
    queryFn: async (): Promise<TransactionWithCategory[]> => {
      let query = supabase
        .from('transactions')
        .select('*, category:categories(*)')
        .eq('user_id', user!.id)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })

      if (filters.startDate) query = query.gte('date', filters.startDate)
      if (filters.endDate) query = query.lte('date', filters.endDate)
      if (filters.type) query = query.eq('type', filters.type)
      if (filters.categoryId) query = query.eq('category_id', filters.categoryId)

      const { data, error } = await query
      if (error) throw error
      return data as TransactionWithCategory[]
    },
    enabled: !!user,
  })
}

export function useCreateTransaction() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: NewTransaction) => {
      const { error } = await supabase
        .from('transactions')
        .insert({ ...input, user_id: user!.id })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', user?.id] })
      toast.success('Movimiento registrado')
    },
    onError: () => toast.error('No pudimos guardar el movimiento'),
  })
}

export function useUpdateTransaction() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: TransactionUpdate) => {
      const { error } = await supabase.from('transactions').update(updates).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', user?.id] })
      toast.success('Movimiento actualizado')
    },
    onError: () => toast.error('No pudimos actualizar el movimiento'),
  })
}

export function useDeleteTransaction() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('transactions').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', user?.id] })
      toast.success('Movimiento eliminado')
    },
    onError: () => toast.error('No pudimos eliminar el movimiento'),
  })
}
