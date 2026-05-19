'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, CalendarDays, Clock3, FileText, PenLine, Tags } from 'lucide-react';
import Navbar from '@/components/Navbar';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import PageLoader from '@/components/PageLoader';
import { useAuth } from '@/context/AuthContext';
import { blogService, isBlogAuthorEmail } from '@/services/blogService';
import { BlogPost } from '@/types/blog';

const formatDate = (value?: string | null) => {
  if (!value) return '未发布';
  return new Date(value).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const extractHeadings = (content: string) => {
  return content
    .split('\n')
    .map(line => line.match(/^(#{2,3})\s+(.+)$/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map(match => ({
      level: match[1].length,
      text: match[2].replace(/[*_`#]/g, '').trim(),
    }))
    .slice(0, 12);
};

export default function BlogPostClient({ slug }: { slug: string }) {
  const { user, loading: authLoading } = useAuth();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canEdit = isBlogAuthorEmail(user?.email);
  const headings = useMemo(() => extractHeadings(post?.content || ''), [post?.content]);

  useEffect(() => {
    let cancelled = false;
    const loadPost = async () => {
      try {
        setLoading(true);
        setError(null);
        const nextPost = await blogService.getPostBySlug(slug);
        if (!cancelled) setPost(nextPost);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : '文章加载失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (!authLoading) {
      loadPost();
    }

    return () => {
      cancelled = true;
    };
  }, [authLoading, slug]);

  if (authLoading || loading) {
    return <PageLoader type="spinner" message="正在打开文章..." fullscreen showNavbar />;
  }

  return (
    <div className="cw-page min-h-screen overflow-x-hidden pb-16 text-slate-900 dark:text-white">
      <div className="theme-scene-backdrop fixed inset-0 -z-20" />
      <div className="cw-decor-grid -z-10" />
      <Navbar />

      <main className="relative z-10 mx-auto w-full max-w-7xl px-4 py-8 sm:px-8 lg:px-10">
        <Link href="/blog" className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/75 px-4 py-2 text-sm font-bold text-slate-600 shadow-sm backdrop-blur-xl transition hover:text-cyan-600 dark:border-white/10 dark:bg-white/10 dark:text-slate-200">
          <ArrowLeft className="h-4 w-4" />
          返回博客
        </Link>

        {error || !post ? (
          <div className="mt-8 rounded-[2rem] border border-white/70 bg-white/80 p-10 text-center shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
            <h1 className="text-2xl font-black">没有找到这篇文章</h1>
            <p className="mt-3 text-slate-500 dark:text-slate-300">{error || '它可能还是草稿，或已经被移除。'}</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
            <motion.article initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="min-w-0 overflow-hidden rounded-[2rem] border border-white/70 bg-white/86 shadow-[0_24px_90px_rgba(15,23,42,.10)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/10">
              <header className="p-6 sm:p-10">
                <div className="flex flex-wrap gap-2">
                  {post.tags.map(tag => (
                    <span key={tag} className="rounded-full border border-cyan-200 bg-cyan-50/80 px-3 py-1 text-xs font-bold text-cyan-700 dark:border-cyan-300/20 dark:bg-cyan-300/10 dark:text-cyan-200">#{tag}</span>
                  ))}
                </div>
                <h1 className="mt-5 max-w-4xl text-4xl font-black leading-tight tracking-normal text-slate-950 dark:text-white sm:text-6xl">{post.title}</h1>
                <p className="mt-5 max-w-3xl text-lg font-medium leading-8 text-slate-600 dark:text-slate-300">{post.excerpt || '这篇文章还没有摘要。'}</p>
                <div className="mt-6 flex flex-wrap items-center gap-4 text-sm font-bold text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4" />{formatDate(post.published_at || post.updated_at)}</span>
                  <span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4" />{post.reading_time_minutes} 分钟阅读</span>
                  <span>{post.status === 'published' ? '公开文章' : '草稿'}</span>
                </div>
                {canEdit && (
                  <Link href={`/blog/editor?id=${post.id}`} className="mt-6 inline-flex w-fit items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950">
                    <PenLine className="h-4 w-4" />
                    编辑文章
                  </Link>
                )}
              </header>

              {post.cover_image_url && (
                <div className="px-6 sm:px-10">
                  <div className="overflow-hidden rounded-[1.75rem] bg-slate-950 shadow-[0_24px_80px_rgba(15,23,42,.16)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={post.cover_image_url} alt={post.title} className="max-h-[520px] w-full object-cover" />
                  </div>
                </div>
              )}

              <div className="p-6 sm:p-10">
                <MarkdownRenderer content={post.content} className="blog-markdown" />
              </div>
            </motion.article>

            <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur-2xl dark:border-white/10 dark:bg-white/10">
                <FileText className="h-6 w-6 text-cyan-600 dark:text-cyan-200" />
                <h2 className="mt-3 text-lg font-black">文章目录</h2>
                {headings.length === 0 ? (
                  <p className="mt-3 text-sm font-medium text-slate-500 dark:text-slate-300">这篇文章暂无二级标题。</p>
                ) : (
                  <nav className="mt-3 space-y-2">
                    {headings.map((heading, index) => (
                      <div key={`${heading.text}-${index}`} className={`rounded-2xl px-3 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 ${heading.level === 3 ? 'ml-4' : ''}`}>
                        {heading.text}
                      </div>
                    ))}
                  </nav>
                )}
              </div>

              <div className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur-2xl dark:border-white/10 dark:bg-white/10">
                <h2 className="flex items-center gap-2 text-lg font-black"><Tags className="h-5 w-5 text-cyan-600" />标签</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {post.tags.length === 0 ? (
                    <span className="text-sm text-slate-500">暂无标签</span>
                  ) : post.tags.map(tag => (
                    <Link href="/blog" key={tag} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-cyan-100 hover:text-cyan-700 dark:bg-white/10 dark:text-slate-300">
                      #{tag}
                    </Link>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
