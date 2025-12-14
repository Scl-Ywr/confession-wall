// 数据验证和过滤工具

// 敏感词列表（示例）
const sensitiveWords = [
  '敏感词1',
  '敏感词2',
  '敏感词3',
  '广告',
  '推广',
  '营销'
];

// 评论过滤配置
const commentFilterConfig = {
  // 最小评论长度
  minLength: 2,
  // 最大评论长度
  maxLength: 500,
  // 敏感词替换字符
  replacementChar: '*',
  // 是否启用敏感词过滤
  enableSensitiveWordFilter: true,
  // 是否启用重复评论检测
  enableDuplicateCommentCheck: true,
  // 是否启用垃圾评论检测
  enableSpamCommentCheck: true
};

/**
 * 检查内容是否包含敏感词
 * @param content 要检查的内容
 * @returns 是否包含敏感词
 */
export function containsSensitiveWords(content: string): boolean {
  if (!commentFilterConfig.enableSensitiveWordFilter || !content) {
    return false;
  }
  
  const lowercaseContent = content.toLowerCase();
  return sensitiveWords.some(word => lowercaseContent.includes(word.toLowerCase()));
}

/**
 * 过滤敏感词
 * @param content 要过滤的内容
 * @returns 过滤后的内容
 */
export function filterSensitiveWords(content: string): string {
  if (!commentFilterConfig.enableSensitiveWordFilter || !content) {
    return content;
  }
  
  let filteredContent = content;
  sensitiveWords.forEach(word => {
    const regex = new RegExp(word, 'gi');
    const replacement = commentFilterConfig.replacementChar.repeat(word.length);
    filteredContent = filteredContent.replace(regex, replacement);
  });
  
  return filteredContent;
}

/**
 * 检查评论是否为垃圾评论
 * @param content 评论内容
 * @returns 是否为垃圾评论
 */
export function isSpamComment(content: string): boolean {
  if (!commentFilterConfig.enableSpamCommentCheck || !content) {
    return false;
  }
  
  // 简单的垃圾评论检测逻辑
  const lowercaseContent = content.toLowerCase();
  
  // 检测重复字符（连续超过5个相同字符）
  if (/([a-zA-Z0-9])\1{5,}/.test(lowercaseContent)) {
    return true;
  }
  
  // 检测重复词语
  const wordCount: Record<string, number> = {};
  const words = lowercaseContent.split(/\s+/);
  
  for (const word of words) {
    if (word.length > 2) {
      wordCount[word] = (wordCount[word] || 0) + 1;
      // 如果同一个词出现超过3次，可能是垃圾评论
      if (wordCount[word] > 3) {
        return true;
      }
    }
  }
  
  // 检测广告特征
  const adPatterns = [
    /\b(微信|wx|wechat)\s*[:：]?\s*[a-zA-Z0-9_]+\b/gi,
    /\b(qq|QQ)\s*[:：]?\s*[0-9]+\b/gi,
    /\b(电话|手机)\s*[:：]?\s*[0-9]+\b/gi,
    /\b(网址|链接|url)\s*[:：]?\s*[a-zA-Z0-9._-]+\b/gi,
    /\b(广告|推广|营销|促销)\b/gi
  ];
  
  for (const pattern of adPatterns) {
    if (pattern.test(lowercaseContent)) {
      return true;
    }
  }
  
  return false;
}

/**
 * 验证评论内容
 * @param content 评论内容
 * @returns 验证结果
 */
export function validateCommentContent(content: string): {
  isValid: boolean;
  message?: string;
  filteredContent?: string;
} {
  // 检查评论长度
  if (!content || content.trim().length < commentFilterConfig.minLength) {
    return {
      isValid: false,
      message: `评论内容长度不能少于${commentFilterConfig.minLength}个字符`
    };
  }
  
  if (content.length > commentFilterConfig.maxLength) {
    return {
      isValid: false,
      message: `评论内容长度不能超过${commentFilterConfig.maxLength}个字符`
    };
  }
  
  // 过滤敏感词
  const filteredContent = filterSensitiveWords(content);
  
  // 检查是否为垃圾评论
  if (isSpamComment(content)) {
    return {
      isValid: false,
      message: '评论包含垃圾内容，请修改后重试',
      filteredContent
    };
  }
  
  return {
    isValid: true,
    filteredContent
  };
}

/**
 * 验证表白内容
 * @param content 表白内容
 * @returns 验证结果
 */
export function validateConfessionContent(content: string): {
  isValid: boolean;
  message?: string;
  filteredContent?: string;
} {
  // 检查表白长度
  if (!content || content.trim().length < 5) {
    return {
      isValid: false,
      message: '表白内容长度不能少于5个字符'
    };
  }
  
  if (content.length > 1000) {
    return {
      isValid: false,
      message: '表白内容长度不能超过1000个字符'
    };
  }
  
  // 过滤敏感词
  const filteredContent = filterSensitiveWords(content);
  
  return {
    isValid: true,
    filteredContent
  };
}

/**
 * 验证用户名
 * @param username 用户名
 * @returns 验证结果
 */
export function validateUsername(username: string): {
  isValid: boolean;
  message?: string;
} {
  if (!username || username.trim().length < 3) {
    return {
      isValid: false,
      message: '用户名长度不能少于3个字符'
    };
  }
  
  if (username.length > 20) {
    return {
      isValid: false,
      message: '用户名长度不能超过20个字符'
    };
  }
  
  // 检查用户名格式
  const usernameRegex = /^[a-zA-Z0-9_]+$/;
  if (!usernameRegex.test(username)) {
    return {
      isValid: false,
      message: '用户名只能包含字母、数字和下划线'
    };
  }
  
  return {
    isValid: true
  };
}

/**
 * 验证显示名称
 * @param displayName 显示名称
 * @returns 验证结果
 */
export function validateDisplayName(displayName: string): {
  isValid: boolean;
  message?: string;
} {
  if (!displayName || displayName.trim().length < 2) {
    return {
      isValid: false,
      message: '显示名称长度不能少于2个字符'
    };
  }
  
  if (displayName.length > 30) {
    return {
      isValid: false,
      message: '显示名称长度不能超过30个字符'
    };
  }
  
  return {
    isValid: true
  };
}

/**
 * 检测重复内容
 * @param content 当前内容
 * @param existingContents 已存在的内容列表
 * @returns 是否为重复内容
 */
export function isDuplicateContent(content: string, existingContents: string[]): boolean {
  if (!content || !existingContents || existingContents.length === 0) {
    return false;
  }
  
  const lowercaseContent = content.toLowerCase().trim();
  return existingContents.some(existingContent => {
    const lowercaseExisting = existingContent.toLowerCase().trim();
    return lowercaseExisting === lowercaseContent;
  });
}