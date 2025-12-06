-- 创建密码重置令牌表，用于跨设备密码重置
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    
    -- 添加索引以提高查询性能
    CONSTRAINT unique_email_token UNIQUE (email, token),
    INDEX idx_email (email),
    INDEX idx_token (token)
);

-- 添加注释
COMMENT ON TABLE password_reset_tokens IS '用于跨设备密码重置的令牌表';
COMMENT ON COLUMN password_reset_tokens.id IS '唯一标识符';
COMMENT ON COLUMN password_reset_tokens.email IS '用户邮箱';
COMMENT ON COLUMN password_reset_tokens.token IS '重置令牌';
COMMENT ON COLUMN password_reset_tokens.verified IS '是否已验证';
COMMENT ON COLUMN password_reset_tokens.created_at IS '创建时间';
COMMENT ON COLUMN password_reset_tokens.expires_at IS '过期时间';