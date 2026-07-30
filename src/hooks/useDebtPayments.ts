import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { DebtPayment } from '@/types/database'

export function useDebtPayments(debtId: string) {
  return useQuery({
    queryKey: ['debt-payments', debtId],
    queryFn: async (): Promise<DebtPayment[]> => {
      const { data, error } = await supabase
        .from('debt_payments')
        .select('*')
        .eq('debt_id', debtId)
        .order('payment_date', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!debtId,
  })
}

interface NewDebtPayment {
  debtId: string
  amount: number
  paymentDate: string
  notes?: string | null
  isBonus: boolean
}

export function useCreateDebtPayment() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ debtId, amount, paymentDate, notes, isBonus }: NewDebtPayment) => {
      const { data: debt, error: debtError } = await supabase
        .from('debts')
        .select('current_balance')
        .eq('id', debtId)
        .single()
      if (debtError) throw debtError

      const { error: paymentError } = await supabase.from('debt_payments').insert({
        debt_id: debtId,
        amount,
        payment_date: paymentDate,
        notes,
        is_bonus: isBonus,
      })
      if (paymentError) throw paymentError

      const newBalance = Math.max(0, debt.current_balance - amount)
      const { error: updateError } = await supabase
        .from('debts')
        .update({
          current_balance: newBalance,
          status: newBalance <= 0 ? 'paid' : 'active',
        })
        .eq('id', debtId)
      if (updateError) throw updateError
    },
    onSuccess: (_data, { debtId }) => {
      queryClient.invalidateQueries({ queryKey: ['debts', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['debt-payments', debtId] })
      toast.success('Abono registrado')
    },
    onError: () => toast.error('No pudimos registrar el abono'),
  })
}

interface DeleteDebtPayment {
  id: string
  debtId: string
}

export function useDeleteDebtPayment() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, debtId }: DeleteDebtPayment) => {
      const { data: payment, error: paymentError } = await supabase
        .from('debt_payments')
        .select('amount')
        .eq('id', id)
        .single()
      if (paymentError) throw paymentError

      const { data: debt, error: debtError } = await supabase
        .from('debts')
        .select('current_balance, total_amount')
        .eq('id', debtId)
        .single()
      if (debtError) throw debtError

      const { error: deleteError } = await supabase.from('debt_payments').delete().eq('id', id)
      if (deleteError) throw deleteError

      const newBalance = Math.min(debt.total_amount, debt.current_balance + payment.amount)
      const { error: updateError } = await supabase
        .from('debts')
        .update({
          current_balance: newBalance,
          status: newBalance <= 0 ? 'paid' : 'active',
        })
        .eq('id', debtId)
      if (updateError) throw updateError
    },
    onSuccess: (_data, { debtId }) => {
      queryClient.invalidateQueries({ queryKey: ['debts', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['debt-payments', debtId] })
      toast.success('Abono eliminado')
    },
    onError: () => toast.error('No pudimos eliminar el abono'),
  })
}
