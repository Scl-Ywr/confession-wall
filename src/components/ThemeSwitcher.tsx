'use client';

import { useTheme } from '../theme/ThemeContext';
import { themes } from '../theme/themes';
import { motion } from 'framer-motion';

export default function ThemeSwitcher() {
  const { theme, setTheme, isDarkMode, toggleTheme } = useTheme();

  return (
    <div className="fixed top-4 right-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-4 w-80"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            主题设置
          </h3>
          <button
            onClick={() => toggleTheme()}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title={isDarkMode ? '切换到亮色模式' : '切换到暗色模式'}
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
        </div>

        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              当前主题
            </label>
            <div className="grid grid-cols-2 gap-2">
              {themes.map((t) => (
                <motion.button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`relative p-3 rounded-xl border-2 transition-all ${
                    theme.id === t.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="text-2xl mb-1">{t.emoji}</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {t.name}
                  </div>
                  {theme.id === t.id && (
                    <div className="absolute top-2 right-2 w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            {theme.description}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
