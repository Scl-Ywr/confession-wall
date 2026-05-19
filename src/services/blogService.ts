import { supabase } from '@/lib/supabase/client';
import { BLOG_AUTHOR_EMAIL, BlogPost, BlogPostInput } from '@/types/blog';

const BLOG_SELECT = `
  id,
  author_id,
  title,
  slug,
  excerpt,
  content,
  cover_image_url,
  tags,
  status,
  featured,
  reading_time_minutes,
  created_at,
  updated_at,
  published_at
`;

const normalizeSlug = (value: string) => {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
};

export const isBlogAuthorEmail = (email?: string | null) => {
  return email?.toLowerCase() === BLOG_AUTHOR_EMAIL;
};

export const createBlogSlug = (title: string) => {
  const slug = normalizeSlug(title);
  return slug || `post-${Date.now().toString(36)}`;
};

export const calculateReadingTime = (content: string) => {
  const text = content.replace(/[#>*_`[\]()!-]/g, ' ').trim();
  const words = text ? text.split(/\s+/).length : 0;
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  return Math.max(1, Math.ceil(Math.max(words, chineseChars / 2) / 280));
};

const normalizePost = (post: BlogPost) => ({
  ...post,
  tags: Array.isArray(post.tags) ? post.tags : [],
  reading_time_minutes: Number(post.reading_time_minutes) || 1,
});

export const blogService = {
  async uploadCoverImage(file: File, userId: string): Promise<string> {
    if (!file.type.startsWith('image/')) {
      throw new Error('只能上传图片文件');
    }

    const maxSize = 8 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error('封面图不能超过 8MB');
    }

    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const safeExtension = extension.replace(/[^a-z0-9]/g, '') || 'jpg';
    const filePath = `blog-covers/${userId}/${Date.now()}-${crypto.randomUUID()}.${safeExtension}`;

    const { error } = await supabase.storage
      .from('confession_images')
      .upload(filePath, file, {
        cacheControl: '31536000',
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      throw new Error(error.message);
    }

    const { data } = supabase.storage
      .from('confession_images')
      .getPublicUrl(filePath);

    if (!data.publicUrl) {
      throw new Error('未能获取封面图地址');
    }

    return data.publicUrl;
  },

  async getPosts(includeDrafts = false): Promise<BlogPost[]> {
    let query = supabase
      .from('blog_posts')
      .select(BLOG_SELECT)
      .order('featured', { ascending: false })
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('updated_at', { ascending: false });

    if (!includeDrafts) {
      query = query.eq('status', 'published');
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(error.message);
    }

    return ((data || []) as BlogPost[]).map(normalizePost);
  },

  async getPostBySlug(slug: string): Promise<BlogPost | null> {
    const { data, error } = await supabase
      .from('blog_posts')
      .select(BLOG_SELECT)
      .eq('slug', slug)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data ? normalizePost(data as BlogPost) : null;
  },

  async getPostById(id: string): Promise<BlogPost | null> {
    const { data, error } = await supabase
      .from('blog_posts')
      .select(BLOG_SELECT)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data ? normalizePost(data as BlogPost) : null;
  },

  async savePost(input: BlogPostInput, userId: string, id?: string): Promise<BlogPost> {
    const payload = {
      ...input,
      author_id: userId,
      slug: createBlogSlug(input.slug || input.title),
      excerpt: input.excerpt.trim(),
      title: input.title.trim(),
      content: input.content.trim(),
      cover_image_url: input.cover_image_url?.trim() || null,
      tags: input.tags.map(tag => tag.trim()).filter(Boolean),
      reading_time_minutes: calculateReadingTime(input.content),
    };

    const query = id
      ? supabase.from('blog_posts').update(payload).eq('id', id).select(BLOG_SELECT).single()
      : supabase.from('blog_posts').insert(payload).select(BLOG_SELECT).single();

    const { data, error } = await query;
    if (error) {
      throw new Error(error.message);
    }

    return normalizePost(data as BlogPost);
  },

  async deletePost(id: string) {
    const { error } = await supabase.from('blog_posts').delete().eq('id', id);
    if (error) {
      throw new Error(error.message);
    }
  },
};
