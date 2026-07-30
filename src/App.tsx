import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute, GuestRoute } from '@/components/RouteGuards'
import { AppLayout } from '@/components/layout/AppLayout'
import { Toaster } from '@/components/ui/sonner'
import Login from '@/pages/auth/Login'
import Register from '@/pages/auth/Register'
import Dashboard from '@/pages/Dashboard'
import Categories from '@/pages/Categories'
import Transactions from '@/pages/Transactions'
import Debts from '@/pages/Debts'
import Subscriptions from '@/pages/Subscriptions'
import Settings from '@/pages/Settings'
import More from '@/pages/More'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      refetchOnWindowFocus: false,
      networkMode: 'offlineFirst',
    },
  },
})

const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'misgastos-query-cache',
})

export default function App() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24, buster: 'v1' }}
    >
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route element={<GuestRoute />}>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/transactions" element={<Transactions />} />
                <Route path="/categories" element={<Categories />} />
                <Route path="/debts" element={<Debts />} />
                <Route path="/subscriptions" element={<Subscriptions />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/more" element={<More />} />
              </Route>
            </Route>
          </Routes>
          <Toaster />
        </AuthProvider>
      </BrowserRouter>
    </PersistQueryClientProvider>
  )
}
