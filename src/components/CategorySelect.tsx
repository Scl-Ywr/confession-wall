'use client';

import { useState, useEffect, useCallback } from 'react';
import { ConfessionCategory } from '@/types/confession';
import { confessionService } from '@/services/confessionService';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

interface CategorySelectProps {
  value?: string;
  onChange: (categoryId: string | undefined) => void;
  placeholder?: string;
  className?: string;
}

export function CategorySelect({ 
  value, 
  onChange, 
  placeholder = "选择分类...", 
  className = "" 
}: CategorySelectProps) {
  const [categories, setCategories] = useState<ConfessionCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await confessionService.getCategories();
        setCategories(data);
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const selectedCategory = categories.find(cat => cat.id === value);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleSelect = (categoryId: string) => {
    console.log('CategorySelect: Selected category ID:', categoryId, 'Type:', typeof categoryId);
    onChange(categoryId);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange(undefined);
    setIsOpen(false);
  };

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (isOpen && !(e.target as Element).closest('.category-select')) {
      setIsOpen(false);
    }
  }, [isOpen]);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, handleClickOutside]);

  return (
    <div className={`relative category-select ${className}`}>
      <button
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center justify-between p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 text-left"
      >
        <div className="flex items-center gap-2">
          {selectedCategory ? (
            <>
              <span className="text-lg">{selectedCategory.icon || '📝'}</span>
              <span className="text-gray-900 dark:text-gray-100">{selectedCategory.name}</span>
            </>
          ) : (
            <span className="text-gray-500 dark:text-gray-400">{placeholder}</span>
          )}
        </div>
        <ChevronDownIcon 
          className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {loading ? (
            <div className="p-3 text-center">
              <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={handleClear}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150 text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700"
              >
                不选择分类
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => handleSelect(category.id)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150 text-gray-700 dark:text-gray-300 flex items-center gap-2"
                >
                  <span className="text-lg">{category.icon || '📝'}</span>
                  <span>{category.name}</span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}