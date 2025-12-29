'use client';

import React, { useState, useEffect } from 'react';
import { XMarkIcon, PencilIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';

interface MarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
  onClose: () => void;
}

export default function MarkdownEditor({ content, onChange, onClose }: MarkdownEditorProps) {
  const [editorContent, setEditorContent] = useState(content);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

  useEffect(() => {
    setEditorContent(content);
  }, [content]);

  const handleChange = (value: string) => {
    setEditorContent(value);
    onChange(value);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      >
        {/* 编辑器主容器 */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="flex flex-col w-full max-w-5xl mx-auto my-4 rounded-2xl shadow-2xl bg-white dark:bg-gray-800 h-[50vh] sm:h-[60vh] md:h-[70vh]"
        >
          {/* 顶部工具栏 */}
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="bg-white dark:bg-gray-800 rounded-t-2xl shadow-2xl border-b border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-2">
                <PencilIcon className="w-5 h-5 text-primary-600" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Markdown 编辑器</h2>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Tab navigation */}
                <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setActiveTab('edit')}
                    className={`px-3 py-1.5 text-sm font-medium transition-colors ${activeTab === 'edit' ? 'bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400' : 'text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400'}`}
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => setActiveTab('preview')}
                    className={`px-3 py-1.5 text-sm font-medium transition-colors ${activeTab === 'preview' ? 'bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400' : 'text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400'}`}
                  >
                    预览
                  </button>
                </div>
                
                <motion.button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <XMarkIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </motion.button>
                
                <motion.button
                  onClick={onClose}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors text-sm"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  完成
                </motion.button>
              </div>
            </div>
          </motion.div>
          
          {/* 内容区域 */}
          <div className="flex-1 overflow-auto">
            {activeTab === 'edit' ? (
              <div className="w-full h-full">
                <textarea
                  value={editorContent}
                  onChange={(e) => handleChange(e.target.value)}
                  className="w-full h-full p-4 sm:p-6 text-gray-900 dark:text-gray-100 bg-transparent resize-none focus:outline-none font-mono text-sm sm:text-base leading-relaxed"
                  placeholder="开始输入Markdown内容..."
                  autoFocus
                />
              </div>
            ) : (
              <div className="w-full h-full p-4 sm:p-6 text-gray-900 dark:text-gray-100 overflow-auto">
                <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkBreaks]}
                    rehypePlugins={[rehypeHighlight]}
                  >
                    {editorContent}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </div>
          
          {/* 页脚 */}
          <div className="p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 rounded-b-2xl">
            <div className="flex items-center justify-center">
              <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                支持 Markdown 语法 • 实时预览
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}