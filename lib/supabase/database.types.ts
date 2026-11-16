export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      activities: {
        Row: {
          actor_id: string | null;
          contact_id: string;
          created_at: string;
          id: string;
          payload: NonNullable<Json>;
          type: Database['public']['Enums']['activity_type'];
        };
        ComputedFields: never;
        Insert: {
          actor_id?: string | null;
          contact_id: string;
          created_at?: string;
          id?: string;
          payload?: NonNullable<Json>;
          type: Database['public']['Enums']['activity_type'];
        };
        Update: {
          actor_id?: string | null;
          contact_id?: string;
          created_at?: string;
          id?: string;
          payload?: NonNullable<Json>;
          type?: Database['public']['Enums']['activity_type'];
        };
        Relationships: [
          {
            foreignKeyName: 'activities_actor_id_fkey';
            columns: ['actor_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'activities_contact_id_fkey';
            columns: ['contact_id'];
            isOneToOne: false;
            referencedRelation: 'contacts';
            referencedColumns: ['id'];
          },
        ];
      };
      contacts: {
        Row: {
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          email: string | null;
          follow_up_on: string | null;
          full_name: string;
          id: string;
          matter_type: Database['public']['Enums']['matter_type'];
          phone: string | null;
          phone_digits: string | null;
          referral_source:
            Database['public']['Enums']['referral_source'] | null;
          status: Database['public']['Enums']['contact_status'];
          summary: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          email?: string | null;
          follow_up_on?: string | null;
          full_name: string;
          id?: string;
          matter_type: Database['public']['Enums']['matter_type'];
          phone?: string | null;
          phone_digits?: never;
          referral_source?:
            Database['public']['Enums']['referral_source'] | null;
          status?: Database['public']['Enums']['contact_status'];
          summary?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          email?: string | null;
          follow_up_on?: string | null;
          full_name?: string;
          id?: string;
          matter_type?: Database['public']['Enums']['matter_type'];
          phone?: string | null;
          phone_digits?: never;
          referral_source?:
            Database['public']['Enums']['referral_source'] | null;
          status?: Database['public']['Enums']['contact_status'];
          summary?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'contacts_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'contacts_updated_by_fkey';
            columns: ['updated_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['user_id'];
          },
        ];
      };
      notes: {
        Row: {
          author_id: string;
          body: string;
          contact_id: string;
          created_at: string;
          id: string;
        };
        ComputedFields: never;
        Insert: {
          author_id: string;
          body: string;
          contact_id: string;
          created_at?: string;
          id?: string;
        };
        Update: {
          author_id?: string;
          body?: string;
          contact_id?: string;
          created_at?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notes_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'notes_contact_id_fkey';
            columns: ['contact_id'];
            isOneToOne: false;
            referencedRelation: 'contacts';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          display_name: string;
          role: Database['public']['Enums']['app_role'];
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          display_name: string;
          role: Database['public']['Enums']['app_role'];
          user_id: string;
        };
        Update: {
          display_name?: string;
          role?: Database['public']['Enums']['app_role'];
          user_id?: string;
        };
        Relationships: [];
      };
      role_permissions: {
        Row: {
          permission: Database['public']['Enums']['app_permission'];
          role: Database['public']['Enums']['app_role'];
        };
        ComputedFields: never;
        Insert: {
          permission: Database['public']['Enums']['app_permission'];
          role: Database['public']['Enums']['app_role'];
        };
        Update: {
          permission?: Database['public']['Enums']['app_permission'];
          role?: Database['public']['Enums']['app_role'];
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      contact_facets: { Args: { f: Json; tz?: string }; Returns: Json };
      contact_matches: {
        Args: {
          c: Omit<
            Database['public']['Tables']['contacts']['Row'],
            Database['public']['Tables']['contacts']['ComputedFields']
          >;
          f: Json;
          skip?: string;
          today: string;
          tz: string;
        };
        Returns: boolean;
      };
      follow_up_hit: {
        Args: {
          c: Omit<
            Database['public']['Tables']['contacts']['Row'],
            Database['public']['Tables']['contacts']['ComputedFields']
          >;
          hi: string;
          k: string;
          lo: string;
          today: string;
        };
        Returns: boolean;
      };
      has_permission: {
        Args: { p: Database['public']['Enums']['app_permission'] };
        Returns: boolean;
      };
      in_set: { Args: { arr: Json; v: string }; Returns: boolean };
      norm_filters: { Args: { f: Json }; Returns: Json };
      ping: { Args: Record<PropertyKey, never>; Returns: boolean };
      safe_date: { Args: { s: string }; Returns: string };
      safe_tz: { Args: { tz: string }; Returns: string };
      search_contacts: {
        Args: {
          dir?: string;
          f: Json;
          page?: number;
          page_size?: number;
          sort?: string;
          tz?: string;
        };
        Returns: Json;
      };
      seed_firm: { Args: { actor?: string; n?: number }; Returns: undefined };
      seed_insert_contact: { Args: { c: Json }; Returns: string };
    };
    Enums: {
      activity_type:
        | 'created'
        | 'updated'
        | 'status_changed'
        | 'follow_up_changed'
        | 'note_added'
        | 'deleted'
        | 'restored';
      app_permission:
        'contacts.read' | 'contacts.write' | 'contacts.delete' | 'notes.write';
      app_role: 'admin' | 'viewer';
      contact_status: 'lead' | 'active' | 'closed';
      matter_type:
        | 'personal_injury'
        | 'family'
        | 'immigration'
        | 'employment'
        | 'estate_planning'
        | 'criminal_defense';
      referral_source:
        | 'google_search'
        | 'past_client'
        | 'attorney_referral'
        | 'bar_referral'
        | 'website_form';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  'public'
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      activity_type: [
        'created',
        'updated',
        'status_changed',
        'follow_up_changed',
        'note_added',
        'deleted',
        'restored',
      ],
      app_permission: [
        'contacts.read',
        'contacts.write',
        'contacts.delete',
        'notes.write',
      ],
      app_role: ['admin', 'viewer'],
      contact_status: ['lead', 'active', 'closed'],
      matter_type: [
        'personal_injury',
        'family',
        'immigration',
        'employment',
        'estate_planning',
        'criminal_defense',
      ],
      referral_source: [
        'google_search',
        'past_client',
        'attorney_referral',
        'bar_referral',
        'website_form',
      ],
    },
  },
} as const;
