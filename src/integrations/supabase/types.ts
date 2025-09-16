export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          clinic_id: string | null
          created_at: string
          created_by: string | null
          ends_at: string
          id: string
          notes: string | null
          overbook: boolean
          patient_id: string
          provider_id: string | null
          queue_order: number | null
          room_id: string | null
          starts_at: string
          status: Database["public"]["Enums"]["appointment_status_enum"]
          updated_at: string
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string
          created_by?: string | null
          ends_at: string
          id?: string
          notes?: string | null
          overbook?: boolean
          patient_id: string
          provider_id?: string | null
          queue_order?: number | null
          room_id?: string | null
          starts_at: string
          status?: Database["public"]["Enums"]["appointment_status_enum"]
          updated_at?: string
        }
        Update: {
          clinic_id?: string | null
          created_at?: string
          created_by?: string | null
          ends_at?: string
          id?: string
          notes?: string | null
          overbook?: boolean
          patient_id?: string
          provider_id?: string | null
          queue_order?: number | null
          room_id?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["appointment_status_enum"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: number
          new_data: Json | null
          old_data: Json | null
          operation: string
          row_pk: string | null
          table_name: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: never
          new_data?: Json | null
          old_data?: Json | null
          operation: string
          row_pk?: string | null
          table_name: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: never
          new_data?: Json | null
          old_data?: Json | null
          operation?: string
          row_pk?: string | null
          table_name?: string
        }
        Relationships: []
      }
      clinic_settings: {
        Row: {
          availability: Json | null
          clinic_id: string
          created_at: string
          id: string
          slot_minutes: number | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          availability?: Json | null
          clinic_id: string
          created_at?: string
          id?: string
          slot_minutes?: number | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          availability?: Json | null
          clinic_id?: string
          created_at?: string
          id?: string
          slot_minutes?: number | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_settings_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: true
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinics: {
        Row: {
          address: string | null
          created_at: string
          id: string
          name: string
          phone: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          name: string
          phone?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      diagnoses: {
        Row: {
          active: boolean
          code: string | null
          created_at: string
          id: string
          name_ar: string | null
          name_en: string
        }
        Insert: {
          active?: boolean
          code?: string | null
          created_at?: string
          id?: string
          name_ar?: string | null
          name_en: string
        }
        Update: {
          active?: boolean
          code?: string | null
          created_at?: string
          id?: string
          name_ar?: string | null
          name_en?: string
        }
        Relationships: []
      }
      diagnosis_allowed_treatments: {
        Row: {
          diagnosis_id: string
          treatment_id: string
        }
        Insert: {
          diagnosis_id: string
          treatment_id: string
        }
        Update: {
          diagnosis_id?: string
          treatment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diagnosis_allowed_treatments_diagnosis_id_fkey"
            columns: ["diagnosis_id"]
            isOneToOne: false
            referencedRelation: "diagnoses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnosis_allowed_treatments_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "treatments"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnosis_rules: {
        Row: {
          default_treatment_id: string | null
          diagnosis_id: string
          requires_tooth: boolean
          xray_required: boolean
        }
        Insert: {
          default_treatment_id?: string | null
          diagnosis_id: string
          requires_tooth?: boolean
          xray_required?: boolean
        }
        Update: {
          default_treatment_id?: string | null
          diagnosis_id?: string
          requires_tooth?: boolean
          xray_required?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "diagnosis_rules_default_treatment_id_fkey"
            columns: ["default_treatment_id"]
            isOneToOne: false
            referencedRelation: "treatments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnosis_rules_diagnosis_id_fkey"
            columns: ["diagnosis_id"]
            isOneToOne: true
            referencedRelation: "diagnoses"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          id: string
          is_recurring: boolean
          name: string
        }
        Insert: {
          id?: string
          is_recurring?: boolean
          name: string
        }
        Update: {
          id?: string
          is_recurring?: boolean
          name?: string
        }
        Relationships: []
      }
      expense_entries: {
        Row: {
          amount: number
          category_id: string
          clinic_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          id: string
          notes: string | null
          spent_on: string
          vendor: string | null
        }
        Insert: {
          amount: number
          category_id: string
          clinic_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          notes?: string | null
          spent_on?: string
          vendor?: string | null
        }
        Update: {
          amount?: number
          category_id?: string
          clinic_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          notes?: string | null
          spent_on?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_entries_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_entries_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      installment_items: {
        Row: {
          amount: number
          due_date: string
          id: string
          paid: boolean
          payment_id: string | null
          plan_id: string
        }
        Insert: {
          amount: number
          due_date: string
          id?: string
          paid?: boolean
          payment_id?: string | null
          plan_id: string
        }
        Update: {
          amount?: number
          due_date?: string
          id?: string
          paid?: boolean
          payment_id?: string | null
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "installment_items_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installment_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "installment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      installment_plans: {
        Row: {
          created_at: string
          id: string
          invoice_id: string
          total_amount: number
        }
        Insert: {
          created_at?: string
          id?: string
          invoice_id: string
          total_amount?: number
        }
        Update: {
          created_at?: string
          id?: string
          invoice_id?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "installment_plans_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      intake_forms: {
        Row: {
          active_signed: boolean
          answers: Json | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          patient_id: string
          signature_url: string | null
          signed_at: string | null
          updated_at: string
          version: number
        }
        Insert: {
          active_signed?: boolean
          answers?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          patient_id: string
          signature_url?: string | null
          signed_at?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          active_signed?: boolean
          answers?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          patient_id?: string
          signature_url?: string | null
          signed_at?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "intake_forms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "intake_forms_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          created_at: string
          description: string
          id: string
          invoice_id: string
          line_total: number
          procedure_row_id: string | null
          qty: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          line_total?: number
          procedure_row_id?: string | null
          qty?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          line_total?: number
          procedure_row_id?: string | null
          qty?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_procedure_row_id_fkey"
            columns: ["procedure_row_id"]
            isOneToOne: false
            referencedRelation: "procedure_plan_rows"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          clinic_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          id: string
          notes: string | null
          patient_id: string
          status: Database["public"]["Enums"]["invoice_status_enum"]
          total_amount: number
          updated_at: string
          visit_id: string | null
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          notes?: string | null
          patient_id: string
          status?: Database["public"]["Enums"]["invoice_status_enum"]
          total_amount?: number
          updated_at?: string
          visit_id?: string | null
        }
        Update: {
          clinic_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          notes?: string | null
          patient_id?: string
          status?: Database["public"]["Enums"]["invoice_status_enum"]
          total_amount?: number
          updated_at?: string
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "invoices_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          allergies: string | null
          arabic_full_name: string
          clinic_id: string | null
          created_at: string
          created_by: string | null
          current_meds: string | null
          dob: string | null
          gender: string | null
          id: string
          latin_name: string | null
          phone: string | null
          prior_surgeries: string | null
          profession: string | null
          reason_for_visit: string | null
          smoker: boolean | null
          status: Database["public"]["Enums"]["patient_status_enum"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          allergies?: string | null
          arabic_full_name: string
          clinic_id?: string | null
          created_at?: string
          created_by?: string | null
          current_meds?: string | null
          dob?: string | null
          gender?: string | null
          id?: string
          latin_name?: string | null
          phone?: string | null
          prior_surgeries?: string | null
          profession?: string | null
          reason_for_visit?: string | null
          smoker?: boolean | null
          status?: Database["public"]["Enums"]["patient_status_enum"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          allergies?: string | null
          arabic_full_name?: string
          clinic_id?: string | null
          created_at?: string
          created_by?: string | null
          current_meds?: string | null
          dob?: string | null
          gender?: string | null
          id?: string
          latin_name?: string | null
          phone?: string | null
          prior_surgeries?: string | null
          profession?: string | null
          reason_for_visit?: string | null
          smoker?: boolean | null
          status?: Database["public"]["Enums"]["patient_status_enum"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          invoice_id: string
          method: string | null
          paid_at: string
          reference: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id: string
          method?: string | null
          paid_at?: string
          reference?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string
          method?: string | null
          paid_at?: string
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      procedure_plan_rows: {
        Row: {
          comment: string | null
          created_at: string
          for_when: Database["public"]["Enums"]["for_when_enum"]
          id: string
          price: number
          status: Database["public"]["Enums"]["procedure_status_enum"]
          treatment_id: string
          updated_at: string
          visit_diagnosis_id: string | null
          visit_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          for_when?: Database["public"]["Enums"]["for_when_enum"]
          id?: string
          price?: number
          status?: Database["public"]["Enums"]["procedure_status_enum"]
          treatment_id: string
          updated_at?: string
          visit_diagnosis_id?: string | null
          visit_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          for_when?: Database["public"]["Enums"]["for_when_enum"]
          id?: string
          price?: number
          status?: Database["public"]["Enums"]["procedure_status_enum"]
          treatment_id?: string
          updated_at?: string
          visit_diagnosis_id?: string | null
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "procedure_plan_rows_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "treatments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedure_plan_rows_visit_diagnosis_id_fkey"
            columns: ["visit_diagnosis_id"]
            isOneToOne: false
            referencedRelation: "visit_diagnoses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedure_plan_rows_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          is_active: boolean
          last_password_reset_at: string | null
          must_change_password: boolean
          phone: string | null
          role: Database["public"]["Enums"]["user_role_enum"]
          staff_code: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          is_active?: boolean
          last_password_reset_at?: string | null
          must_change_password?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role_enum"]
          staff_code?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          is_active?: boolean
          last_password_reset_at?: string | null
          must_change_password?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role_enum"]
          staff_code?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      providers: {
        Row: {
          active: boolean
          created_at: string
          display_name: string
          id: string
          specialty: string | null
          user_id: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          display_name: string
          id?: string
          specialty?: string | null
          user_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          display_name?: string
          id?: string
          specialty?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "providers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      recurring_expenses: {
        Row: {
          active: boolean
          amount: number
          category_id: string
          clinic_id: string | null
          created_at: string
          frequency: Database["public"]["Enums"]["expense_frequency_enum"]
          id: string
          next_run_date: string
        }
        Insert: {
          active?: boolean
          amount: number
          category_id: string
          clinic_id?: string | null
          created_at?: string
          frequency?: Database["public"]["Enums"]["expense_frequency_enum"]
          id?: string
          next_run_date: string
        }
        Update: {
          active?: boolean
          amount?: number
          category_id?: string
          clinic_id?: string | null
          created_at?: string
          frequency?: Database["public"]["Enums"]["expense_frequency_enum"]
          id?: string
          next_run_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_expenses_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          clinic_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_clinics: {
        Row: {
          clinic_id: string
          id: string
          user_id: string
        }
        Insert: {
          clinic_id: string
          id?: string
          user_id: string
        }
        Update: {
          clinic_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_clinics_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_clinics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      treatments: {
        Row: {
          active: boolean
          code: string | null
          created_at: string
          id: string
          name_ar: string | null
          name_en: string
        }
        Insert: {
          active?: boolean
          code?: string | null
          created_at?: string
          id?: string
          name_ar?: string | null
          name_en: string
        }
        Update: {
          active?: boolean
          code?: string | null
          created_at?: string
          id?: string
          name_ar?: string | null
          name_en?: string
        }
        Relationships: []
      }
      visit_diagnoses: {
        Row: {
          created_at: string
          created_by: string | null
          diagnosis_id: string
          id: string
          notes: string | null
          quadrant: Database["public"]["Enums"]["quadrant_enum"] | null
          tooth_number: number | null
          tooth_set: Database["public"]["Enums"]["tooth_set_enum"]
          visit_id: string
          xray_flag: boolean
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          diagnosis_id: string
          id?: string
          notes?: string | null
          quadrant?: Database["public"]["Enums"]["quadrant_enum"] | null
          tooth_number?: number | null
          tooth_set?: Database["public"]["Enums"]["tooth_set_enum"]
          visit_id: string
          xray_flag?: boolean
        }
        Update: {
          created_at?: string
          created_by?: string | null
          diagnosis_id?: string
          id?: string
          notes?: string | null
          quadrant?: Database["public"]["Enums"]["quadrant_enum"] | null
          tooth_number?: number | null
          tooth_set?: Database["public"]["Enums"]["tooth_set_enum"]
          visit_id?: string
          xray_flag?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "visit_diagnoses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "visit_diagnoses_diagnosis_id_fkey"
            columns: ["diagnosis_id"]
            isOneToOne: false
            referencedRelation: "diagnoses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_diagnoses_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      visit_diagnosis_files: {
        Row: {
          created_at: string
          file_url: string
          id: string
          visit_diagnosis_id: string
        }
        Insert: {
          created_at?: string
          file_url: string
          id?: string
          visit_diagnosis_id: string
        }
        Update: {
          created_at?: string
          file_url?: string
          id?: string
          visit_diagnosis_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visit_diagnosis_files_visit_diagnosis_id_fkey"
            columns: ["visit_diagnosis_id"]
            isOneToOne: false
            referencedRelation: "visit_diagnoses"
            referencedColumns: ["id"]
          },
        ]
      }
      visits: {
        Row: {
          appointment_id: string | null
          clinic_id: string | null
          created_at: string
          created_by: string | null
          ended_at: string | null
          id: string
          patient_id: string
          provider_id: string | null
          room_id: string | null
          started_at: string
          status: Database["public"]["Enums"]["visit_status_enum"]
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          clinic_id?: string | null
          created_at?: string
          created_by?: string | null
          ended_at?: string | null
          id?: string
          patient_id: string
          provider_id?: string | null
          room_id?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["visit_status_enum"]
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          clinic_id?: string | null
          created_at?: string
          created_by?: string | null
          ended_at?: string | null
          id?: string
          patient_id?: string
          provider_id?: string | null
          room_id?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["visit_status_enum"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "visits_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "visits_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
    }
    Enums: {
      appointment_status_enum:
        | "planned"
        | "confirmed"
        | "arrived"
        | "ready"
        | "in_chair"
        | "completed"
        | "no_show"
        | "cancelled"
      expense_frequency_enum: "none" | "weekly" | "monthly" | "yearly"
      for_when_enum: "today" | "next"
      invoice_status_enum: "draft" | "open" | "partial" | "paid" | "void"
      patient_status_enum:
        | "planned"
        | "arrived"
        | "ready"
        | "in_chair"
        | "completed"
        | "discharged"
        | "no_show"
        | "cancelled"
      procedure_status_enum:
        | "planned"
        | "in_progress"
        | "complete"
        | "cancelled"
      quadrant_enum: "UL" | "UR" | "LL" | "LR"
      tooth_set_enum: "none" | "primary" | "permanent"
      user_role_enum:
        | "admin"
        | "doctor"
        | "assistant"
        | "receptionist"
        | "intake"
      visit_status_enum: "in_chair" | "completed" | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      appointment_status_enum: [
        "planned",
        "confirmed",
        "arrived",
        "ready",
        "in_chair",
        "completed",
        "no_show",
        "cancelled",
      ],
      expense_frequency_enum: ["none", "weekly", "monthly", "yearly"],
      for_when_enum: ["today", "next"],
      invoice_status_enum: ["draft", "open", "partial", "paid", "void"],
      patient_status_enum: [
        "planned",
        "arrived",
        "ready",
        "in_chair",
        "completed",
        "discharged",
        "no_show",
        "cancelled",
      ],
      procedure_status_enum: [
        "planned",
        "in_progress",
        "complete",
        "cancelled",
      ],
      quadrant_enum: ["UL", "UR", "LL", "LR"],
      tooth_set_enum: ["none", "primary", "permanent"],
      user_role_enum: [
        "admin",
        "doctor",
        "assistant",
        "receptionist",
        "intake",
      ],
      visit_status_enum: ["in_chair", "completed", "cancelled"],
    },
  },
} as const
