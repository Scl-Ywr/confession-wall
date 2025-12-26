'use client';

import React, { useState, useRef, useEffect } from 'react';
import { XMarkIcon, HashtagIcon } from '@heroicons/react/24/outline';

interface HashtagInputProps {
  hashtags: string[];
  onChange: (hashtags: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function HashtagInput({ 
  hashtags, 
  onChange, 
  placeholder = "添加话题标签...", 
  className = "" 
}: HashtagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    // 常见标签建议
    const commonHashtags = [
      '#情感', '#校园', '#生活', '#感谢', '#道歉', '#祝福',
      '#友谊', '#爱情', '#暗恋', '#表白', '#回忆', '#梦想'
    ];
    
    if (value.startsWith('#')) {
      const filtered = commonHashtags.filter(tag => 
        tag.toLowerCase().includes(value.toLowerCase()) && 
        !hashtags.includes(tag)
      );
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      addHashtag();
    } else if (e.key === 'Backspace' && !inputValue && hashtags.length > 0) {
      // 删除最后一个标签
      onChange(hashtags.slice(0, -1));
    }
  };

  const addHashtag = (tag?: string) => {
    const tagToAdd = tag || inputValue.trim();
    
    if (tagToAdd && tagToAdd.startsWith('#') && !hashtags.includes(tagToAdd)) {
      onChange([...hashtags, tagToAdd]);
      setInputValue('');
      setShowSuggestions(false);
    }
  };

  const removeHashtag = (indexToRemove: number) => {
    onChange(hashtags.filter((_, index) => index !== indexToRemove));
  };

  const handleSuggestionClick = (suggestion: string) => {
    addHashtag(suggestion);
  };

  const handleClickOutside = (e: MouseEvent) => {
    if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
      setShowSuggestions(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div className="flex flex-wrap items-center gap-2 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent transition-all duration-200">
        {hashtags.map((tag, index) => (
          <div
            key={index}
            className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-sm"
          >
            <span>{tag}</span>
            <button
              type="button"
              onClick={() => removeHashtag(index)}
              className="text-primary-500 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-200"
            >
              <XMarkIcon className="h-3 w-3" />
            </button>
          </div>
        ))}
        
        <div className="relative flex-1 min-w-[120px]">
          <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
            <HashtagIcon className="h-4 w-4 text-gray-400" />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={hashtags.length === 0 ? placeholder : ''}
            className="w-full pl-7 pr-2 py-1 bg-transparent border-0 outline-none text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
          />
        </div>
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-40 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSuggestionClick(suggestion)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150 text-gray-700 dark:text-gray-300"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}