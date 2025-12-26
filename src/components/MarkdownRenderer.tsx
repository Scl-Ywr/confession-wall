'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import type { HTMLAttributes } from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

type CodeProps = HTMLAttributes<HTMLElement> & {
  inline?: boolean;
};

export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  return (
    <div className={`prose prose prose-sm sm:prose-base dark:prose-invert max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          h1: ({ ...props }) => (
            <h1 className="text-2xl font-bold mt-6 mb-4 text-gray-900 dark:text-white" {...props} />
          ),
          h2: ({ ...props }) => (
            <h2 className="text-xl font-bold mt-5 mb-3 text-gray-900 dark:text-white" {...props} />
          ),
          h3: ({ ...props }) => (
            <h3 className="text-lg font-bold mt-4 mb-2 text-gray-900 dark:text-white" {...props} />
          ),
          p: ({ ...props }) => (
            <p className="mb-4 leading-relaxed text-gray-800 dark:text-gray-200" {...props} />
          ),
          a: ({ ...props }) => (
            <a className="text-blue-600 dark:text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />
          ),
          blockquote: ({ ...props }) => (
            <blockquote className="border-l-4 border-primary-500 pl-4 italic my-4 text-gray-700 dark:text-gray-300" {...props} />
          ),
          ul: ({ ...props }) => (
            <ul className="list-disc list-inside mb-4 space-y-2 text-gray-800 dark:text-gray-200" {...props} />
          ),
          ol: ({ ...props }) => (
            <ol className="list-decimal list-inside mb-4 space-y-2 text-gray-800 dark:text-gray-200" {...props} />
          ),
          li: ({ ...props }) => (
            <li className="ml-4" {...props} />
          ),
          code: (props: CodeProps) => {
            const { inline, ...restProps } = props;
            return (
              <code className={`bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm ${inline ? 'text-pink-600 dark:text-pink-400' : 'block p-3 my-3 text-gray-900 dark:text-white'}`} {...restProps} />
            );
          },
          pre: ({ ...props }) => (
            <pre className="bg-gray-900 dark:bg-gray-950 p-4 rounded-lg overflow-x-auto my-4" {...props} />
          ),
          strong: ({ ...props }) => (
            <strong className="font-bold text-gray-900 dark:text-white" {...props} />
          ),
          em: ({ ...props }) => (
            <em className="italic text-gray-800 dark:text-gray-200" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
