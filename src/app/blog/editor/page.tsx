'use client';

import { FormEvent, Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { ArrowLeft, Eye, FileText, ImagePlus, Loader2, Save, Send, Trash2, X } from 'lucide-react';
import Navbar from '@/components/Navbar';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import PageLoader from '@/components/PageLoader';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useAuth } from '@/context/AuthContext';
import { blogService, createBlogSlug, isBlogAuthorEmail } from '@/services/blogService';
import { BlogPost, BlogPostInput, BlogPostStatus } from '@/types/blog';

const emptyForm: BlogPostInput = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  cover_image_url: '',
  tags: [],
  status: 'draft',
  featured: false,
};

const splitTags = (value: string) => {
  return value
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean)
    .slice(0, 8);
};

function BlogEditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editingId = searchParams.get('id');
  const { user, loading: authLoading } = useAuth();
  const [form, setForm] = useState<BlogPostInput>(emptyForm);
  const [tagInput, setTagInput] = useState('');
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
  const [loading, setLoading] = useState(Boolean(editingId));
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [post, setPost] = useState<BlogPost | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const canEdit = isBlogAuthorEmail(user?.email);

  useEffect(() => {
    if (!editingId || !canEdit) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const loadPost = async () => {
      try {
        setLoading(true);
        const nextPost = await blogService.getPostById(editingId);
        if (!nextPost) {
          toast.error('文章不存在或无权访问');
          router.push('/blog');
          return;
        }
        if (!cancelled) {
          setPost(nextPost);
          setForm({
            title: nextPost.title,
            slug: nextPost.slug,
            excerpt: nextPost.excerpt,
            content: nextPost.content,
            cover_image_url: nextPost.cover_image_url || '',
            tags: nextPost.tags,
            status: nextPost.status,
            featured: nextPost.featured,
          });
          setTagInput(nextPost.tags.join(', '));
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '加载文章失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadPost();
    return () => {
      cancelled = true;
    };
  }, [canEdit, editingId, router]);

  const previewPost = useMemo(() => ({
    ...form,
    slug: form.slug || createBlogSlug(form.title),
    tags: splitTags(tagInput),
  }), [form, tagInput]);
  const writingStats = useMemo(() => {
    const text = form.content.trim();
    const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const readingMinutes = Math.max(1, Math.ceil(Math.max(words, chineseChars / 2) / 280));

    return {
      chars: form.content.length,
      words,
      readingMinutes,
    };
  }, [form.content]);

  const updateField = <K extends keyof BlogPostInput>(key: K, value: BlogPostInput[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const save = async (status: BlogPostStatus) => {
    if (!user || !canEdit) {
      toast.error('当前账号没有博客发布权限');
      return;
    }
    if (!form.title.trim()) {
      toast.error('请填写标题');
      return;
    }
    if (!form.content.trim()) {
      toast.error('请填写正文');
      return;
    }

    try {
      setSaving(true);
      const savedPost = await blogService.savePost(
        {
          ...form,
          slug: form.slug || createBlogSlug(form.title),
          tags: splitTags(tagInput),
          status,
        },
        user.id,
        editingId || undefined
      );
      setPost(savedPost);
      setForm(prev => ({ ...prev, status: savedPost.status, slug: savedPost.slug }));
      toast.success(status === 'published' ? '文章已发布' : '草稿已保存');
      router.replace(`/blog/editor?id=${savedPost.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    save(form.status);
  };

  const handleCoverUpload = async (file?: File) => {
    if (!file) return;
    if (!user || !canEdit) {
      toast.error('当前账号没有上传权限');
      return;
    }

    try {
      setUploadingCover(true);
      const url = await blogService.uploadCoverImage(file, user.id);
      updateField('cover_image_url', url);
      toast.success('封面图已上传');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '封面图上传失败');
    } finally {
      setUploadingCover(false);
    }
  };

  const deletePost = async () => {
    if (!post) return;
    try {
      setSaving(true);
      await blogService.deletePost(post.id);
      toast.success('文章已删除');
      router.push('/blog');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '删除失败');
    } finally {
      setSaving(false);
      setShowDeleteConfirm(false);
    }
  };

  if (authLoading || loading) {
    return <PageLoader type="spinner" message="正在打开写作台..." fullscreen showNavbar />;
  }

  if (!canEdit) {
    return (
      <div className="cw-page min-h-screen overflow-x-hidden pb-16 text-slate-900 dark:text-white">
        <div className="theme-scene-backdrop fixed inset-0 -z-20" />
        <div className="cw-decor-grid -z-10" />
        <Navbar />
        <main className="relative z-10 mx-auto flex min-h-[calc(100vh-96px)] w-full max-w-3xl items-center justify-center px-4">
          <div className="rounded-[2rem] border border-white/70 bg-white/80 p-8 text-center shadow-[0_24px_90px_rgba(15,23,42,.12)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/10">
            <FileText className="mx-auto h-12 w-12 text-cyan-500" />
            <h1 className="mt-5 text-3xl font-black">这里是作者写作台</h1>
            <p className="mt-3 text-slate-500 dark:text-slate-300">只有 3131618671@qq.com 登录后可以编辑和发布博客，其它用户只能访问公开文章。</p>
            <Link href="/blog" className="mt-6 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white dark:bg-white dark:text-slate-950">
              返回博客
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="cw-page min-h-screen overflow-x-hidden pb-16 text-slate-900 dark:text-white">
      <div className="theme-scene-backdrop fixed inset-0 -z-20" />
      <div className="cw-decor-grid -z-10" />
      <Navbar />

      <main className="relative z-10 mx-auto w-full max-w-7xl px-4 py-8 sm:px-8 lg:px-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link href="/blog" className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/75 px-4 py-2 text-sm font-bold text-slate-600 shadow-sm backdrop-blur-xl transition hover:text-cyan-600 dark:border-white/10 dark:bg-white/10 dark:text-slate-200">
            <ArrowLeft className="h-4 w-4" />
            返回博客
          </Link>
          <div className="flex gap-2">
            {post && (
              <button type="button" onClick={() => setShowDeleteConfirm(true)} disabled={saving} className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-100 disabled:opacity-60 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
                <Trash2 className="h-4 w-4" />
                删除
              </button>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[.92fr_1.08fr]">
          <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-[2rem] border border-white/70 bg-white/78 p-5 shadow-[0_24px_90px_rgba(15,23,42,.10)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/10 sm:p-6">
            <h1 className="text-3xl font-black">博客写作台</h1>
            <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-300">支持 Markdown、草稿、发布、封面图和标签。</p>

            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-2xl bg-slate-100 p-3 text-center dark:bg-white/10">
                  <div className="text-xl font-black">{writingStats.chars}</div>
                  <div className="text-xs font-semibold text-slate-500">字符</div>
                </div>
                <div className="rounded-2xl bg-slate-100 p-3 text-center dark:bg-white/10">
                  <div className="text-xl font-black">{writingStats.words}</div>
                  <div className="text-xs font-semibold text-slate-500">词数</div>
                </div>
                <div className="rounded-2xl bg-slate-100 p-3 text-center dark:bg-white/10">
                  <div className="text-xl font-black">{writingStats.readingMinutes}</div>
                  <div className="text-xs font-semibold text-slate-500">分钟</div>
                </div>
              </div>

              <label className="block">
                <span className="text-sm font-bold text-slate-600 dark:text-slate-200">标题</span>
                <input value={form.title} onChange={(event) => updateField('title', event.target.value)} onBlur={() => !form.slug && updateField('slug', createBlogSlug(form.title))} className="mt-2 h-13 w-full rounded-2xl border border-slate-200 bg-white/80 px-4 text-base font-bold outline-none transition focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100 dark:border-white/10 dark:bg-white/10" placeholder="写一个让人想点开的标题" />
              </label>

              <label className="block">
                <span className="text-sm font-bold text-slate-600 dark:text-slate-200">Slug</span>
                <input value={form.slug} onChange={(event) => updateField('slug', createBlogSlug(event.target.value))} className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white/80 px-4 font-mono text-sm outline-none transition focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100 dark:border-white/10 dark:bg-white/10" placeholder="my-first-post" />
              </label>

              <label className="block">
                <span className="text-sm font-bold text-slate-600 dark:text-slate-200">摘要</span>
                <textarea value={form.excerpt} onChange={(event) => updateField('excerpt', event.target.value)} maxLength={320} className="mt-2 min-h-24 w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm outline-none transition focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100 dark:border-white/10 dark:bg-white/10" placeholder="这篇文章主要讲什么..." />
              </label>

              <div className="block">
                <span className="text-sm font-bold text-slate-600 dark:text-slate-200">封面图</span>
                <div className="mt-2 overflow-hidden rounded-3xl border border-slate-200 bg-white/70 p-3 dark:border-white/10 dark:bg-white/10">
                  {form.cover_image_url ? (
                    <div className="relative overflow-hidden rounded-2xl bg-slate-950">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={form.cover_image_url} alt="文章封面预览" className="aspect-video w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => updateField('cover_image_url', '')}
                        className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-black/75"
                        aria-label="移除封面图"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex aspect-video cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-cyan-300 bg-cyan-50/70 text-center transition hover:bg-cyan-100/80 dark:border-cyan-300/25 dark:bg-cyan-300/10">
                      {uploadingCover ? (
                        <Loader2 className="h-8 w-8 animate-spin text-cyan-600 dark:text-cyan-200" />
                      ) : (
                        <ImagePlus className="h-9 w-9 text-cyan-600 dark:text-cyan-200" />
                      )}
                      <span className="mt-3 text-sm font-black text-slate-700 dark:text-slate-100">
                        {uploadingCover ? '正在上传封面...' : '点击上传封面图'}
                      </span>
                      <span className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-300">支持 JPG / PNG / WebP，最大 8MB</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        disabled={uploadingCover}
                        onChange={(event) => {
                          handleCoverUpload(event.target.files?.[0]);
                          event.currentTarget.value = '';
                        }}
                      />
                    </label>
                  )}

                  <div className="mt-3 flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-300">或手动填写图片 URL</label>
                    <input
                      value={form.cover_image_url || ''}
                      onChange={(event) => updateField('cover_image_url', event.target.value)}
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-white/80 px-4 text-sm outline-none transition focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100 dark:border-white/10 dark:bg-white/10"
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </div>

              <label className="block">
                <span className="text-sm font-bold text-slate-600 dark:text-slate-200">标签，用英文逗号分隔</span>
                <input value={tagInput} onChange={(event) => setTagInput(event.target.value)} className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white/80 px-4 text-sm outline-none transition focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100 dark:border-white/10 dark:bg-white/10" placeholder="Next.js, Supabase, Design" />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm font-bold dark:border-white/10 dark:bg-white/10">
                  精选文章
                  <input type="checkbox" checked={form.featured} onChange={(event) => updateField('featured', event.target.checked)} className="h-5 w-5 accent-cyan-500" />
                </label>
                <label className="block">
                  <span className="sr-only">状态</span>
                  <select value={form.status} onChange={(event) => updateField('status', event.target.value as BlogPostStatus)} className="cw-select h-full min-h-12 w-full">
                    <option value="draft">草稿</option>
                    <option value="published">发布</option>
                  </select>
                </label>
              </div>
            </div>
          </motion.section>

          <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="min-w-0 rounded-[2rem] border border-white/70 bg-white/78 shadow-[0_24px_90px_rgba(15,23,42,.10)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/10">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 p-4 dark:border-white/10">
              <div className="inline-flex rounded-full bg-slate-100 p-1 dark:bg-white/10">
                <button type="button" onClick={() => setActiveTab('write')} className={`rounded-full px-4 py-2 text-sm font-bold transition ${activeTab === 'write' ? 'bg-white text-slate-950 shadow-sm dark:bg-slate-950 dark:text-white' : 'text-slate-500 dark:text-slate-300'}`}>编辑</button>
                <button type="button" onClick={() => setActiveTab('preview')} className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${activeTab === 'preview' ? 'bg-white text-slate-950 shadow-sm dark:bg-slate-950 dark:text-white' : 'text-slate-500 dark:text-slate-300'}`}><Eye className="h-4 w-4" />预览</button>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => save('draft')} disabled={saving} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-cyan-300 hover:text-cyan-600 disabled:opacity-60 dark:border-white/10 dark:bg-white/10 dark:text-white">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  存草稿
                </button>
                <button type="button" onClick={() => save('published')} disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white shadow-lg transition hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-950">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  发布
                </button>
              </div>
            </div>

            {activeTab === 'write' ? (
              <textarea value={form.content} onChange={(event) => updateField('content', event.target.value)} className="min-h-[620px] w-full resize-y bg-transparent p-5 font-mono text-sm leading-7 outline-none sm:p-6" placeholder={`# 文章标题\n\n用一段话交代背景。\n\n## 小节标题\n\n正文支持 Markdown、列表、引用、代码块和链接。`} />
            ) : (
              <div className="min-h-[620px] p-5 sm:p-6">
                <h1 className="mb-3 text-4xl font-black">{previewPost.title || '未命名文章'}</h1>
                <p className="mb-6 text-slate-500 dark:text-slate-300">{previewPost.excerpt || '暂无摘要'}</p>
                <MarkdownRenderer content={previewPost.content || '开始输入正文后，这里会显示预览。'} className="blog-markdown" />
              </div>
            )}
          </motion.section>
        </form>
      </main>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={deletePost}
        title="删除文章"
        message="确定要删除这篇博客吗？此操作不可恢复。"
        confirmText="删除"
        confirmColor="red"
      />
    </div>
  );
}

export default function BlogEditorPage() {
  return (
    <Suspense fallback={<PageLoader type="spinner" message="正在打开写作台..." fullscreen showNavbar />}>
      <BlogEditorContent />
    </Suspense>
  );
}
