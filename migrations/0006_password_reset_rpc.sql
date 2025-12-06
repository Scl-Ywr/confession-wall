-- 创建生成密码重置令牌的RPC函数
CREATE OR REPLACE FUNCTION generate_password_reset_token(
    p_email VARCHAR(255)
)
RETURNS VARCHAR(255)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    v_token VARCHAR(255);
    v_expires_at TIMESTAMP;
BEGIN
    -- 生成随机令牌
    v_token := gen_random_uuid()::VARCHAR;
    
    -- 设置过期时间为1小时后
    v_expires_at := NOW() + INTERVAL '1 hour';
    
    -- 删除该用户之前的所有令牌
    DELETE FROM password_reset_tokens WHERE email = p_email;
    
    -- 插入新令牌
    INSERT INTO password_reset_tokens (email, token, verified, expires_at)
    VALUES (p_email, v_token, FALSE, v_expires_at);
    
    RETURN v_token;
END;
$$;

-- 创建验证密码重置令牌的RPC函数
CREATE OR REPLACE FUNCTION verify_password_reset_token(
    p_token VARCHAR(255)
)
RETURNS BOOLEAN
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
    -- 更新令牌状态为已验证
    UPDATE password_reset_tokens
    SET verified = TRUE
    WHERE token = p_token
    AND expires_at > NOW()
    AND verified = FALSE;
    
    -- 返回更新是否成功
    RETURN FOUND;
END;
$$;

-- 创建检查密码重置令牌状态的RPC函数
CREATE OR REPLACE FUNCTION check_password_reset_token_status(
    p_token VARCHAR(255)
)
RETURNS TABLE(
    email VARCHAR(255),
    verified BOOLEAN,
    expires_at TIMESTAMP
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT email, verified, expires_at
    FROM password_reset_tokens
    WHERE token = p_token
    AND expires_at > NOW();
END;
$$;

-- 创建清除过期令牌的RPC函数
CREATE OR REPLACE FUNCTION cleanup_expired_password_reset_tokens()
RETURNS INTEGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    -- 删除所有过期的令牌
    DELETE FROM password_reset_tokens
    WHERE expires_at < NOW();
    
    -- 返回删除的记录数
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    RETURN v_deleted_count;
END;
$$;

-- 添加注释
COMMENT ON FUNCTION generate_password_reset_token(p_email VARCHAR) IS '生成密码重置令牌';
COMMENT ON FUNCTION verify_password_reset_token(p_token VARCHAR) IS '验证密码重置令牌';
COMMENT ON FUNCTION check_password_reset_token_status(p_token VARCHAR) IS '检查密码重置令牌状态';
COMMENT ON FUNCTION cleanup_expired_password_reset_tokens() IS '清除过期的密码重置令牌';