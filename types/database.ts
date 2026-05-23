export type Profile = {
  id: string
  username: string
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  website: string | null
  style_tags: string[]
  style_id: string | null
  body_type: string | null
  theme: string | null
  is_private: boolean
  followers_count: number
  following_count: number
  created_at: string
  updated_at: string
}

export type SavedPost = {
  id: string
  user_id: string
  post_id: string
  created_at: string
}

export type Follow = {
  id: string
  follower_id: string
  following_id: string
  created_at: string
}

export type Post = {
  id: string
  user_id: string
  caption: string | null
  tags: string[]
  brand_tags: string[]
  likes_count: number
  saves_count: number
  comments_count: number
  hype_theme: string | null
  is_archived: boolean
  created_at: string
  updated_at: string
  profiles?: Profile
  post_images?: PostImage[]
  post_items?: PostItem[]
}

export type Comment = {
  id: string
  user_id: string
  post_id: string
  body: string
  created_at: string
  profiles?: Profile
}

export type Like = {
  id: string
  user_id: string
  post_id: string
  created_at: string
}

export type PostImage = {
  id: string
  post_id: string
  url: string
  display_order: number
  created_at: string
}

export type PostItem = {
  id: string
  post_id: string
  item_name: string
  brand_name: string | null
  category: string | null
  color: string | null
  silhouette: string | null
  genre: string | null
  purchase_url: string | null
  display_order: number
  created_at: string
}

export type Report = {
  id: string
  reporter_id: string
  target_type: 'post' | 'user'
  target_id: string
  reason: string
  created_at: string
}

export type Block = {
  id: string
  blocker_id: string
  blocked_id: string
  created_at: string
}

export type Conversation = {
  id: string
  created_at: string
  updated_at: string
}

export type ConversationParticipant = {
  id: string
  conversation_id: string
  user_id: string
  last_read_at: string | null
  joined_at: string
  profiles?: Profile
}

export type Message = {
  id: string
  conversation_id: string
  sender_id: string
  body: string
  created_at: string
  profiles?: Profile
}

export type UserBlock = {
  id: string
  blocker_id: string
  blocked_id: string
  created_at: string
}

export type StyleDiagnosis = {
  id: string
  user_id: string
  result: string
  created_at: string
}

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          display_name: string | null
          bio: string | null
          avatar_url: string | null
          website: string | null
          style_tags: string[]
          style_id: string | null
          body_type: string | null
          theme: string | null
          is_private: boolean
          followers_count: number
          following_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          display_name?: string | null
          bio?: string | null
          avatar_url?: string | null
          website?: string | null
          style_tags?: string[]
          style_id?: string | null
          body_type?: string | null
          theme?: string | null
          is_private?: boolean
          followers_count?: number
          following_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          display_name?: string | null
          bio?: string | null
          avatar_url?: string | null
          website?: string | null
          style_tags?: string[]
          style_id?: string | null
          body_type?: string | null
          theme?: string | null
          is_private?: boolean
          followers_count?: number
          following_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          id: string
          user_id: string
          caption: string | null
          tags: string[]
          brand_tags: string[]
          likes_count: number
          saves_count: number
          hype_theme: string | null
          is_archived: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          caption?: string | null
          tags?: string[]
          brand_tags?: string[]
          likes_count?: number
          saves_count?: number
          hype_theme?: string | null
          is_archived?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          caption?: string | null
          tags?: string[]
          brand_tags?: string[]
          likes_count?: number
          hype_theme?: string | null
          is_archived?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      post_images: {
        Row: {
          id: string
          post_id: string
          url: string
          display_order: number
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          url: string
          display_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          url?: string
          display_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "post_images_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          }
        ]
      }
      post_items: {
        Row: {
          id: string
          post_id: string
          item_name: string
          brand_name: string | null
          category: string | null
          color: string | null
          silhouette: string | null
          genre: string | null
          purchase_url: string | null
          display_order: number
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          item_name: string
          brand_name?: string | null
          category?: string | null
          color?: string | null
          silhouette?: string | null
          genre?: string | null
          purchase_url?: string | null
          display_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          item_name?: string
          brand_name?: string | null
          category?: string | null
          color?: string | null
          silhouette?: string | null
          genre?: string | null
          purchase_url?: string | null
          display_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "post_items_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          }
        ]
      }
      saved_posts: {
        Row: {
          id: string
          user_id: string
          post_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          post_id: string
          created_at?: string
        }
        Update: never
        Relationships: [
          {
            foreignKeyName: "saved_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          }
        ]
      }
      comments: {
        Row: {
          id: string
          user_id: string
          post_id: string
          body: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          post_id: string
          body: string
          created_at?: string
        }
        Update: {
          id?: string
          body?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          }
        ]
      }
      follows: {
        Row: {
          id: string
          follower_id: string
          following_id: string
          created_at: string
        }
        Insert: {
          id?: string
          follower_id: string
          following_id: string
          created_at?: string
        }
        Update: {
          id?: string
          follower_id?: string
          following_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      likes: {
        Row: {
          id: string
          user_id: string
          post_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          post_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          }
        ]
      }
      reports: {
        Row: {
          id: string
          reporter_id: string
          target_type: 'post' | 'user'
          target_id: string
          reason: string
          created_at: string
        }
        Insert: {
          id?: string
          reporter_id: string
          target_type: 'post' | 'user'
          target_id: string
          reason: string
          created_at?: string
        }
        Update: never
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      blocks: {
        Row: {
          id: string
          blocker_id: string
          blocked_id: string
          created_at: string
        }
        Insert: {
          id?: string
          blocker_id: string
          blocked_id: string
          created_at?: string
        }
        Update: never
        Relationships: [
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      conversations: {
        Row: {
          id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      conversation_participants: {
        Row: {
          id: string
          conversation_id: string
          user_id: string
          last_read_at: string | null
          joined_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          user_id: string
          last_read_at?: string | null
          joined_at?: string
        }
        Update: {
          id?: string
          last_read_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          sender_id: string
          body: string
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_id: string
          body: string
          created_at?: string
        }
        Update: never
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      user_blocks: {
        Row: {
          id: string
          blocker_id: string
          blocked_id: string
          created_at: string
        }
        Insert: {
          id?: string
          blocker_id: string
          blocked_id: string
          created_at?: string
        }
        Update: never
        Relationships: [
          {
            foreignKeyName: "user_blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      style_diagnoses: {
        Row: {
          id: string
          user_id: string
          result: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          result: string
          created_at?: string
        }
        Update: never
        Relationships: [
          {
            foreignKeyName: "style_diagnoses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      username_changes: {
        Row: {
          id: string
          user_id: string
          changed_at: string
        }
        Insert: {
          id?: string
          user_id: string
          changed_at?: string
        }
        Update: never
        Relationships: [
          {
            foreignKeyName: "username_changes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_conversation_ids: {
        Args: Record<never, never>
        Returns: string[]
      }
      can_add_dm_participant: {
        Args: { conv_id: string }
        Returns: boolean
      }
      is_dm_blocked: {
        Args: { conv_id: string }
        Returns: boolean
      }
      get_unread_counts: {
        Args: Record<never, never>
        Returns: { conversation_id: string; unread_count: number }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
