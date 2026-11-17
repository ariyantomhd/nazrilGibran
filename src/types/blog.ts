// src/types/blog.ts
export interface BlogCategoryRecord {
  id: number;
  name: string;
  slug: string;
  badge_color: string;
}

export interface BlogArticleFilter {
  status?: 'PUBLISHED' | 'DRAFT';
  category_id?: string;
  category?: string;
  search?: string;
}

export interface CreateCommentInput {
  article_id: number;
  author_name: string;
  content: string;
  user_id?: string | null;
}

export interface BlogCommentRecord {
  id: number;
  article_id: number;
  user_id?: string | null;
  author_name: string;
  content: string;
  created_at: string;
}

export interface BlogArticleRecord {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string | null;
  status: string;
  category_id: number | null;
  category: string;
  category_name: string;
  badge_color: string;
  tag: string;
  cover_image: string;
  read_time: string;
  views_count: number;
  likes_count: number;
  shares_count: number;
  author_name: string;
  author_avatar: string;
  author_role: string;
  lead_location: string;
  paragraphs: string[];
  subheading: string;
  sub_paragraph: string;
  bullet_points: string[];
  published_at: string | null;
  created_at: string;
  comments?: BlogCommentRecord[];
}