import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

interface ProfileUpdate {
  fullName: string
  bio: string
}

export function useUpdateProfile() {
  return useMutation({
    mutationFn: async ({ fullName, bio }: ProfileUpdate) => {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName || null, bio: bio || null },
      })
      if (error) throw error
    },
    onSuccess: () => toast.success('Perfil actualizado'),
    onError: () => toast.error('No pudimos actualizar tu perfil'),
  })
}

export function useUpdateEmail() {
  return useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase.auth.updateUser({ email })
      if (error) throw error
    },
    onSuccess: () => toast.success('Revisá tu nuevo correo para confirmar el cambio'),
    onError: () => toast.error('No pudimos actualizar tu email'),
  })
}
