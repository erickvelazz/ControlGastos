export type CategoryType = 'expense' | 'income'
export type SubscriptionFrequency = 'monthly' | 'yearly' | 'weekly' | 'custom_days'
export type DebtStatus = 'active' | 'paid'

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string
          user_id: string
          name: string
          type: CategoryType
          color: string
          icon: string
          is_default: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type: CategoryType
          color: string
          icon: string
          is_default?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          type?: CategoryType
          color?: string
          icon?: string
          is_default?: boolean
          created_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          type: CategoryType
          amount: number
          description: string | null
          category_id: string | null
          date: string
          notes: string | null
          is_recurring: boolean
          recurring_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: CategoryType
          amount: number
          description?: string | null
          category_id?: string | null
          date: string
          notes?: string | null
          is_recurring?: boolean
          recurring_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: CategoryType
          amount?: number
          description?: string | null
          category_id?: string | null
          date?: string
          notes?: string | null
          is_recurring?: boolean
          recurring_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          name: string
          amount: number
          category_id: string | null
          frequency: SubscriptionFrequency
          next_payment_date: string
          start_date: string
          is_active: boolean
          notes: string | null
          alert_days_before: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          amount: number
          category_id?: string | null
          frequency: SubscriptionFrequency
          next_payment_date: string
          start_date: string
          is_active?: boolean
          notes?: string | null
          alert_days_before?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          amount?: number
          category_id?: string | null
          frequency?: SubscriptionFrequency
          next_payment_date?: string
          start_date?: string
          is_active?: boolean
          notes?: string | null
          alert_days_before?: number
          created_at?: string
        }
        Relationships: []
      }
      debts: {
        Row: {
          id: string
          user_id: string
          name: string
          total_amount: number
          current_balance: number
          interest_rate: number
          due_date: string | null
          creditor: string | null
          status: DebtStatus
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          total_amount: number
          current_balance: number
          interest_rate?: number
          due_date?: string | null
          creditor?: string | null
          status?: DebtStatus
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          total_amount?: number
          current_balance?: number
          interest_rate?: number
          due_date?: string | null
          creditor?: string | null
          status?: DebtStatus
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      debt_payments: {
        Row: {
          id: string
          debt_id: string
          amount: number
          payment_date: string
          notes: string | null
          is_bonus: boolean
          created_at: string
        }
        Insert: {
          id?: string
          debt_id: string
          amount: number
          payment_date: string
          notes?: string | null
          is_bonus?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          debt_id?: string
          amount?: number
          payment_date?: string
          notes?: string | null
          is_bonus?: boolean
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Category = Database['public']['Tables']['categories']['Row']
export type CategoryInsert = Database['public']['Tables']['categories']['Insert']

export type Transaction = Database['public']['Tables']['transactions']['Row']
export type TransactionInsert = Database['public']['Tables']['transactions']['Insert']

export type Subscription = Database['public']['Tables']['subscriptions']['Row']
export type SubscriptionInsert = Database['public']['Tables']['subscriptions']['Insert']

export type Debt = Database['public']['Tables']['debts']['Row']
export type DebtInsert = Database['public']['Tables']['debts']['Insert']

export type DebtPayment = Database['public']['Tables']['debt_payments']['Row']
export type DebtPaymentInsert = Database['public']['Tables']['debt_payments']['Insert']

export interface TransactionFilters {
  startDate?: string
  endDate?: string
  type?: CategoryType
  categoryId?: string
}
