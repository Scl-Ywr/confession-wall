export interface Theme {
  id: string;
  name: string;
  description: string;
  emoji: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
  };
  gradients: {
    primary: string;
    secondary: string;
    background: string;
  };
  effects: {
    shadow: string;
    glow: string;
  };
}

export const themes: Theme[] = [
  {
    id: 'default',
    name: '默认主题',
    description: '清新简洁的默认风格',
    emoji: '✨',
    colors: {
      primary: '#3b82f6',
      secondary: '#8b5cf6',
      accent: '#f59e0b',
      background: '#e5e7eb',
      surface: '#ffffff',
      text: '#1f2937',
      textSecondary: '#4b5563',
      border: '#d1d5db',
    },
    gradients: {
      primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      secondary: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      background: 'linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%)',
    },
    effects: {
      shadow: '0 4px 6px -1px rgba(59, 130, 246, 0.2)',
      glow: '0 0 20px rgba(59, 130, 246, 0.4)',
    },
  },
  {
    id: 'christmas',
    name: '圣诞节',
    description: '温馨浪漫的圣诞风格',
    emoji: '🎄',
    colors: {
      primary: '#c41e3a',
      secondary: '#2d6a4f',
      accent: '#ffd700',
      background: '#1e3a8a',
      surface: '#0f172a',
      text: '#ffffff',
      textSecondary: '#94a3b8',
      border: '#4a5568',
    },
    gradients: {
      primary: 'linear-gradient(135deg, #c41e3a 0%, #8b0000 100%)',
      secondary: 'linear-gradient(135deg, #228b22 0%, #006400 100%)',
      background: 'linear-gradient(135deg, #1e3a8a 0%, #0f0f23 100%)',
    },
    effects: {
      shadow: '0 4px 6px -1px rgba(196, 30, 58, 0.3)',
      glow: '0 0 20px rgba(196, 30, 58, 0.5)',
    },
  },
  {
    id: 'spring',
    name: '春天',
    description: '生机勃勃的春日风格',
    emoji: '🌸',
    colors: {
      primary: '#ec4899',
      secondary: '#f472b6',
      accent: '#10b981',
      background: '#fce7f3',
      surface: '#ffffff',
      text: '#1f2937',
      textSecondary: '#4b5563',
      border: '#f9a8d4',
    },
    gradients: {
      primary: 'linear-gradient(135deg, #ec4899 0%, #f472b6 100%)',
      secondary: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      background: 'linear-gradient(135deg, #fce7f3 0%, #fde68a 100%)',
    },
    effects: {
      shadow: '0 4px 6px -1px rgba(236, 72, 153, 0.25)',
      glow: '0 0 20px rgba(236, 72, 153, 0.45)',
    },
  },
  {
    id: 'ocean',
    name: '海洋',
    description: '宁静深邃的海洋风格',
    emoji: '🌊',
    colors: {
      primary: '#0ea5e9',
      secondary: '#0284c7',
      accent: '#00d4ff',
      background: '#e0f2fe',
      surface: '#ffffff',
      text: '#1f2937',
      textSecondary: '#4b5563',
      border: '#7dd3fc',
    },
    gradients: {
      primary: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
      secondary: 'linear-gradient(135deg, #00d4ff 0%, #0099ff 100%)',
      background: 'linear-gradient(135deg, #e0f2fe 0%, #bde0fe 100%)',
    },
    effects: {
      shadow: '0 4px 6px -1px rgba(14, 165, 233, 0.25)',
      glow: '0 0 20px rgba(14, 165, 233, 0.45)',
    },
  },
  {
    id: 'sunset',
    name: '日落',
    description: '温暖绚丽的日落风格',
    emoji: '🌅',
    colors: {
      primary: '#f97316',
      secondary: '#f59e0b',
      accent: '#fbbf24',
      background: '#fef3c7',
      surface: '#ffffff',
      text: '#1f2937',
      textSecondary: '#4b5563',
      border: '#fdba74',
    },
    gradients: {
      primary: 'linear-gradient(135deg, #f97316 0%, #f59e0b 100%)',
      secondary: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
      background: 'linear-gradient(135deg, #fef3c7 0%, #ffe4e6 100%)',
    },
    effects: {
      shadow: '0 4px 6px -1px rgba(249, 115, 22, 0.25)',
      glow: '0 0 20px rgba(249, 115, 22, 0.45)',
    },
  },
  {
    id: 'midnight',
    name: '午夜',
    description: '神秘优雅的午夜风格',
    emoji: '🌙',
    colors: {
      primary: '#6366f1',
      secondary: '#4f46e5',
      accent: '#a855f7',
      background: '#1e1b4b',
      surface: '#0f172a',
      text: '#f8fafc',
      textSecondary: '#94a3b8',
      border: '#374151',
    },
    gradients: {
      primary: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
      secondary: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
      background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)',
    },
    effects: {
      shadow: '0 4px 6px -1px rgba(99, 102, 241, 0.3)',
      glow: '0 0 20px rgba(99, 102, 241, 0.5)',
    },
  },
  {
    id: 'cherry',
    name: '樱花',
    description: '浪漫唯美的樱花风格',
    emoji: '🌸',
    colors: {
      primary: '#f472b6',
      secondary: '#fb7185',
      accent: '#fbbf24',
      background: '#fce7f3',
      surface: '#ffffff',
      text: '#1f2937',
      textSecondary: '#4b5563',
      border: '#f472b6',
    },
    gradients: {
      primary: 'linear-gradient(135deg, #f472b6 0%, #fb7185 100%)',
      secondary: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
      background: 'linear-gradient(135deg, #fce7f3 0%, #fce7f3 100%)',
    },
    effects: {
      shadow: '0 4px 6px -1px rgba(244, 114, 182, 0.25)',
      glow: '0 0 20px rgba(244, 114, 182, 0.45)',
    },
  },
  {
    id: 'forest',
    name: '森林',
    description: '自然清新的森林风格',
    emoji: '🌲',
    colors: {
      primary: '#059669',
      secondary: '#10b981',
      accent: '#34d399',
      background: '#d1fae5',
      surface: '#ffffff',
      text: '#1f2937',
      textSecondary: '#4b5563',
      border: '#6ee7b7',
    },
    gradients: {
      primary: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
      secondary: 'linear-gradient(135deg, #34d399 0%, #059669 100%)',
      background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
    },
    effects: {
      shadow: '0 4px 6px -1px rgba(5, 150, 105, 0.25)',
      glow: '0 0 20px rgba(5, 150, 105, 0.45)',
    },
  },
  {
    id: 'candy',
    name: '糖果',
    description: '活泼可爱的糖果风格',
    emoji: '🍬',
    colors: {
      primary: '#f59e0b',
      secondary: '#ec4899',
      accent: '#fbbf24',
      background: '#fef9c3',
      surface: '#ffffff',
      text: '#1f2937',
      textSecondary: '#4b5563',
      border: '#fbbf24',
    },
    gradients: {
      primary: 'linear-gradient(135deg, #f59e0b 0%, #ec4899 100%)',
      secondary: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
      background: 'linear-gradient(135deg, #fef9c3 0%, #fef3c7 100%)',
    },
    effects: {
      shadow: '0 4px 6px -1px rgba(245, 158, 11, 0.25)',
      glow: '0 0 20px rgba(245, 158, 11, 0.45)',
    },
  },
];
