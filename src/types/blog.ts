export const BLOG_AUTHOR_EMAIL = '3131618671@qq.com';

export type BlogPostStatus = 'draft' | 'published';

export interface BlogPost {
  id: string;
  author_id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image_url: string | null;
  tags: string[];
  status: BlogPostStatus;
  featured: boolean;
  reading_time_minutes: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export interface BlogPostInput {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image_url?: string | null;
  tags: string[];
  status: BlogPostStatus;
  featured: boolean;
}
