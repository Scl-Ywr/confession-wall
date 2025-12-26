'use client';

import React, { useState, useEffect } from 'react';
import { XMarkIcon, PencilIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

interface MarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
  onClose: () => void;
}

export default function MarkdownEditor({ content, onChange, onClose }: MarkdownEditorProps) {
  const [editorContent, setEditorContent] = useState(content);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    setEditorContent(content);
  }, [content]);

  const handleChange = (value: string) => {
    setEditorContent(value);
    onChange(value);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`fixed inset-0 z-50 flex items-center justify-center ${isFullscreen ? 'bg-black' : 'bg-black/50 backdrop-blur-sm'}`}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className={`bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-5xl ${isFullscreen ? 'h-screen' : 'max-h-[90vh]'} flex flex-col`}
        >
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <PencilIcon className="w-5 h-5 text-primary-600" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Markdown 编辑器</h2>
            </div>
            <div className="flex items-center gap-2">
              <motion.button
                onClick={toggleFullscreen}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h16m0 0v16M4 20h16M4 4h16m0 0v16" />
                </svg>
              </motion.button>
              <motion.button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <XMarkIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </motion.button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <textarea
              value={editorContent}
              onChange={(e) => handleChange(e.target.value)}
              className="w-full h-full p-6 text-gray-900 dark:text-gray-100 bg-transparent resize-none focus:outline-none font-mono text-base"
              placeholder="开始输入Markdown内容..."
              autoFocus
            />
          </div>

          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                支持 Markdown 语法 • 实时预览
              </div>
              <motion.button
                onClick={onClose}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                完成
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
