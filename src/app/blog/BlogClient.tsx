'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BookOpenText,
  CalendarDays,
  Clock3,
  Feather,
  PenLine,
  Search,
  Sparkles,
  Tags,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import PageLoader from '@/components/PageLoader';
import { useAuth } from '@/context/AuthContext';
import { blogService, isBlogAuthorEmail } from '@/services/blogService';
import { BlogPost } from '@/types/blog';

const formatDate = (value?: string | null, short = false) => {
  if (!value) return '未发布';
  return new Date(value).toLocaleDateString('zh-CN', {
    year: short ? undefined : 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

const normalize = (value: string) => value.trim().toLowerCase();

const BlogCard = ({ post, index, canEdit }: { post: BlogPost; index: number; canEdit: boolean }) => (
  <motion.article
    initial={{ opacity: 0, y: 14 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35, delay: index * 0.04 }}
    className="group grid overflow-hidden rounded-3xl border border-white/70 bg-white/82 shadow-[0_18px_60px_rgba(15,23,42,.09)] backdrop-blur-2xl transition duration-300 hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-[0_22px_75px_rgba(15,23,42,.14)] dark:border-white/10 dark:bg-white/10 md:grid-cols-[240px_1fr]"
  >
    <Link href={`/blog/${post.slug}`} className="relative min-h-56 overflow-hidden bg-slate-950 md:min-h-full" aria-label={post.title}>
      {post.cover_image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.cover_image_url} alt={post.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
      ) : (
        <div className="flex h-full min-h-56 items-center justify-center bg-[radial-gradient(circle_at_25%_25%,rgba(34,211,238,.28),transparent_32%),linear-gradient(135deg,#020617,#1e293b)] text-white">
          <Feather className="h-10 w-10" />
        </div>
      )}
      <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-black text-slate-700 shadow-sm backdrop-blur-xl dark:bg-slate-950/70 dark:text-white">
        {post.status === 'published' ? '文章' : '草稿'}
      </div>
    </Link>

    <div className="flex min-w-0 flex-col p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{formatDate(post.published_at || post.updated_at)}</span>
        <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{post.reading_time_minutes} 分钟</span>
      </div>

      <Link href={`/blog/${post.slug}`} className="mt-3">
        <h2 className="line-clamp-2 text-2xl font-black tracking-normal text-slate-950 transition group-hover:text-cyan-700 dark:text-white dark:group-hover:text-cyan-200">
          {post.title}
        </h2>
      </Link>
      <p className="mt-3 line-clamp-3 text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">
        {post.excerpt || '这篇文章还没有摘要。'}
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {post.tags.slice(0, 4).map(tag => (
          <span key={tag} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-white/10 dark:bg-white/10 dark:text-slate-300">
            #{tag}
          </span>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <Link href={`/blog/${post.slug}`} className="inline-flex items-center gap-2 text-sm font-black text-cyan-700 transition hover:text-cyan-900 dark:text-cyan-200">
          继续阅读 <ArrowRight className="h-4 w-4" />
        </Link>
        {canEdit && (
          <Link href={`/blog/editor?id=${post.id}`} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-700 shadow-sm transition hover:border-cyan-300 hover:text-cyan-600 dark:border-white/10 dark:bg-white/10 dark:text-white" aria-label="编辑文章">
            <PenLine className="h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  </motion.article>
);

export default function BlogClient() {
  const { user, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [activeTag, setActiveTag] = useState('全部');
  const canEdit = isBlogAuthorEmail(user?.email);

  useEffect(() => {
    let cancelled = false;
    const loadPosts = async () => {
      try {
        setLoading(true);
        setError(null);
        const nextPosts = await blogService.getPosts(canEdit);
        if (!cancelled) setPosts(nextPosts);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : '博客加载失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (!authLoading) {
      loadPosts();
    }

    return () => {
      cancelled = true;
    };
  }, [authLoading, canEdit]);

  const publishedPosts = useMemo(() => posts.filter(post => post.status === 'published'), [posts]);
  const allTags = useMemo(() => {
    const tags = new Map<string, number>();
    posts.forEach(post => post.tags.forEach(tag => tags.set(tag, (tags.get(tag) || 0) + 1)));
    return Array.from(tags.entries()).sort((a, b) => b[1] - a[1]);
  }, [posts]);

  const filteredPosts = useMemo(() => {
    const keyword = normalize(searchText);
    return posts.filter(post => {
      const matchesTag = activeTag === '全部' || post.tags.includes(activeTag);
      const matchesSearch = !keyword
        || normalize(post.title).includes(keyword)
        || normalize(post.excerpt).includes(keyword)
        || normalize(post.content).includes(keyword)
        || post.tags.some(tag => normalize(tag).includes(keyword));
      return matchesTag && matchesSearch;
    });
  }, [activeTag, posts, searchText]);

  const featured = useMemo(() => filteredPosts.find(post => post.featured) || filteredPosts[0], [filteredPosts]);
  const listPosts = featured ? filteredPosts.filter(post => post.id !== featured.id) : filteredPosts;
  const recentPosts = posts.slice(0, 5);

  if (authLoading || loading) {
    return <PageLoader type="spinner" message="正在加载博客..." fullscreen showNavbar />;
  }

  return (
    <div className="cw-page min-h-screen overflow-x-hidden pb-16 text-slate-900 dark:text-white">
      <div className="theme-scene-backdrop fixed inset-0 -z-20" />
      <div className="cw-decor-grid -z-10" />
      <Navbar />

      <main className="relative z-10 mx-auto w-full max-w-7xl px-4 py-8 sm:px-8 lg:px-10">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/78 p-6 shadow-[0_24px_90px_rgba(15,23,42,.10)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/10 sm:p-8">
          <div className="absolute right-0 top-0 h-52 w-52 rounded-full bg-cyan-300/20 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50/80 px-4 py-2 text-sm font-bold text-cyan-700 shadow-sm dark:border-cyan-300/20 dark:bg-cyan-300/10 dark:text-cyan-200">
                <Sparkles className="h-4 w-4" />
                Personal Blog
              </div>
              <h1 className="mt-5 text-4xl font-black leading-tight tracking-normal text-slate-950 dark:text-white sm:text-6xl">
                技术手记与日常记录
              </h1>
              <p className="mt-4 text-base font-medium leading-7 text-slate-600 dark:text-slate-300">
                按常规博客结构整理文章、标签和归档，让阅读、检索和写作都更直接。
              </p>
            </div>
            {canEdit && (
              <Link href="/blog/editor" className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:bg-slate-800 dark:bg-white dark:text-slate-950">
                <PenLine className="h-4 w-4" />
                写新文章
              </Link>
            )}
          </div>
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="min-w-0">
            <div className="mb-5 rounded-3xl border border-white/70 bg-white/78 p-4 shadow-sm backdrop-blur-2xl dark:border-white/10 dark:bg-white/10">
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white/85 pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100 dark:border-white/10 dark:bg-white/10"
                    placeholder="搜索标题、正文或标签"
                  />
                </div>
                <select
                  value={activeTag}
                  onChange={(event) => setActiveTag(event.target.value)}
                  className="h-12 rounded-2xl border border-slate-200 bg-white/85 px-4 text-sm font-bold outline-none transition focus:border-cyan-300 dark:border-white/10 dark:bg-slate-900"
                >
                  <option value="全部">全部标签</option>
                  {allTags.map(([tag]) => <option key={tag} value={tag}>{tag}</option>)}
                </select>
              </div>
            </div>

            {error ? (
              <div className="rounded-3xl border border-red-200 bg-red-50/90 p-6 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">{error}</div>
            ) : filteredPosts.length === 0 ? (
              <div className="rounded-[2rem] border border-white/70 bg-white/75 p-12 text-center text-slate-500 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-white/10 dark:text-slate-300">
                没有找到匹配的文章。
              </div>
            ) : (
              <div className="space-y-5">
                {featured && <BlogCard post={featured} index={0} canEdit={canEdit} />}
                {listPosts.map((post, index) => <BlogCard key={post.id} post={post} index={index + 1} canEdit={canEdit} />)}
              </div>
            )}
          </section>

          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl border border-white/70 bg-white/78 p-5 shadow-sm backdrop-blur-2xl dark:border-white/10 dark:bg-white/10">
              <BookOpenText className="h-7 w-7 text-cyan-600 dark:text-cyan-200" />
              <h2 className="mt-4 text-xl font-black">关于博客</h2>
              <p className="mt-3 text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">
                这里收纳项目记录、技术实践和一些更完整的想法。文章按发布时间展示，支持标签筛选和关键词搜索。
              </p>
              <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-2xl bg-slate-100 p-3 dark:bg-white/10"><div className="text-xl font-black">{posts.length}</div><div className="text-xs text-slate-500">全部</div></div>
                <div className="rounded-2xl bg-slate-100 p-3 dark:bg-white/10"><div className="text-xl font-black">{publishedPosts.length}</div><div className="text-xs text-slate-500">公开</div></div>
                <div className="rounded-2xl bg-slate-100 p-3 dark:bg-white/10"><div className="text-xl font-black">{allTags.length}</div><div className="text-xs text-slate-500">标签</div></div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/70 bg-white/78 p-5 shadow-sm backdrop-blur-2xl dark:border-white/10 dark:bg-white/10">
              <h2 className="flex items-center gap-2 text-lg font-black"><Tags className="h-5 w-5 text-cyan-600" />标签云</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={() => setActiveTag('全部')} className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${activeTag === '全部' ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950' : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'}`}>全部</button>
                {allTags.map(([tag, count]) => (
                  <button key={tag} onClick={() => setActiveTag(tag)} className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${activeTag === tag ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950' : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'}`}>
                    {tag} {count}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/70 bg-white/78 p-5 shadow-sm backdrop-blur-2xl dark:border-white/10 dark:bg-white/10">
              <h2 className="text-lg font-black">最近文章</h2>
              <div className="mt-4 space-y-3">
                {recentPosts.length === 0 ? (
                  <p className="text-sm text-slate-500">暂无文章</p>
                ) : recentPosts.map(post => (
                  <Link key={post.id} href={`/blog/${post.slug}`} className="block rounded-2xl p-3 transition hover:bg-slate-100 dark:hover:bg-white/10">
                    <div className="line-clamp-2 text-sm font-black text-slate-800 dark:text-white">{post.title}</div>
                    <div className="mt-1 text-xs font-semibold text-slate-500">{formatDate(post.published_at || post.updated_at, true)}</div>
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
