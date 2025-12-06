-- 创建直接更新用户密码的RPC函数
CREATE OR REPLACE FUNCTION update_user_password(
    p_email VARCHAR(255),
    p_new_password VARCHAR(255)
)
RETURNS BOOLEAN
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
    -- 更新用户密码
    UPDATE auth.users
    SET encrypted_password = extensions.crypt(p_new_password, extensions.gen_salt('bf'))
    WHERE email = p_email;
    
    -- 返回更新是否成功
    RETURN FOUND;
END;
$$;

-- 添加注释
COMMENT ON FUNCTION update_user_password(p_email VARCHAR, p_new_password VARCHAR) IS '直接更新用户密码';