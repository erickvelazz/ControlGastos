import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Category, CategoryInsert } from '@/types/database'

type NewCategory = Omit<CategoryInsert, 'user_id' | 'is_default'>
type CategoryUpdate = Partial<NewCategory> & { id: string }

export function useCategories() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['categories', user?.id],
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user!.id)
        .order('type', { ascending: true })
        .order('name', { ascending: true })
      if (error) throw error
      return data
    },
    enabled: !!user,
  })
}

export function useCreateCategory() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: NewCategory) => {
      const { error } = await supabase
        .from('categories')
        .insert({ ...input, user_id: user!.id })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', user?.id] })
      toast.success('Categoría creada')
    },
    onError: () => toast.error('No pudimos crear la categoría'),
  })
}

export function useUpdateCategory() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: CategoryUpdate) => {
      const { error } = await supabase.from('categories').update(updates).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', user?.id] })
      toast.success('Categoría actualizada')
    },
    onError: () => toast.error('No pudimos actualizar la categoría'),
  })
}

export function useDeleteCategory() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('categories').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', user?.id] })
      toast.success('Categoría eliminada')
    },
    onError: () => toast.error('No pudimos eliminar la categoría'),
  })
}
