export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          id: string
          name: string
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      event_materials: {
        Row: {
          created_at: string
          event_id: string
          id: string
          material_id: string
          quantity: number
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          material_id: string
          quantity: number
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          material_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "event_materials_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_materials_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          code: string | null
          created_at: string
          created_by: string | null
          description: string | null
          event_date: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      material_movements: {
        Row: {
          created_by: string | null
          event_id: string | null
          id: string
          material_id: string
          movement_date: string
          notes: string | null
          quantity: number
          type: string
        }
        Insert: {
          created_by?: string | null
          event_id?: string | null
          id?: string
          material_id: string
          movement_date?: string
          notes?: string | null
          quantity: number
          type: string
        }
        Update: {
          created_by?: string | null
          event_id?: string | null
          id?: string
          material_id?: string
          movement_date?: string
          notes?: string | null
          quantity?: number
          type?: string
        }
        Relationships: []
      }
      materials: {
        Row: {
          category: string | null
          code: string | null
          created_at: string
          created_by: string | null
          current_quantity: number
          description: string | null
          id: string
          image_url: string | null
          initial_quantity: number
          name: string
          responsible: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          code?: string | null
          created_at?: string
          created_by?: string | null
          current_quantity?: number
          description?: string | null
          id?: string
          image_url?: string | null
          initial_quantity?: number
          name: string
          responsible?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          code?: string | null
          created_at?: string
          created_by?: string | null
          current_quantity?: number
          description?: string | null
          id?: string
          image_url?: string | null
          initial_quantity?: number
          name?: string
          responsible?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {}
    Functions: {
      create_event_with_materials: {
        Args: {
          p_name: string
          p_event_date: string
          p_description: string
          p_created_by: string
          p_allocations: Json
        }
        Returns: {
          event_id: string
          event_code: string
        }[]
      }
    }
    Enums: {}
    CompositeTypes: {}
  }
}

// Appended: checklist types
export type EventChecklist = {
  id: string
  event_id: string
  event_material_id: string
  checked: boolean
  checked_by: string | null
  checked_at: string | null
}

// Appended: checklist types (merge manually if regenerating)
export type EventChecklistRow = {
  id: string
  event_id: string
  event_material_id: string
  checked: boolean
  checked_by: string | null
  checked_at: string | null
  updated_at: string
}
