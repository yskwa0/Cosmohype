export type Profile = {
  id: string
  username: string
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  website: string | null
  style_tags: string[]
  style_id: string | null
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
  comments_count: number
  created_at: string
  updated_at: string
  profiles?: Profile
  post_images?: PostImage[]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
