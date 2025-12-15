import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    // 创建Supabase管理员客户端，用于访问内部表
    const supabase = createSupabaseAdminClient();
    
    // 获取请求数据
    const { email, code } = await request.json();
    
    // 验证请求数据
    if (!email || !code) {
      return NextResponse.json({ error: '邮箱和验证码不能为空' }, { status: 400 });
    }
    
    // 从system_settings表获取管理员验证码
    const { data: systemSetting, error: settingError } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'admin_verification_code')
      .single();
    
    if (settingError || !systemSetting) {
      console.error('Error getting admin verification code:', settingError);
      return NextResponse.json({ error: '系统设置获取失败' }, { status: 500 });
    }
    
    // 验证验证码
    if (code !== systemSetting.value) {
      return NextResponse.json({ error: '验证码错误' }, { status: 400 });
    }
    
    // 使用Supabase Auth API验证用户是否存在
    // 通过auth.admin.listUsers方法获取所有用户，然后根据邮箱过滤
    const { data: usersList, error: usersListError } = await supabase.auth.admin.listUsers();
    
    if (usersListError || !usersList?.users) {
      return NextResponse.json({ error: '获取用户列表失败' }, { status: 500 });
    }
    
    // 根据邮箱查找用户
    const authUser = usersList.users.find(user => user.email === email);
    
    if (!authUser) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }
    
    // 获取用户ID
    const userId = authUser.id;
    
    // 更新用户为管理员 - 先检查是否存在 profiles 记录
    console.log('Checking existing profile for user:', userId);
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('profiles')
      .select('*') // 选择所有字段，包括现有的is_admin值
      .eq('id', userId)
      .single();
    
    console.log('Profile check result:', { existingProfile: existingProfile, error: profileCheckError?.message });
    
    // 获取用户邮箱
    const userEmail = authUser.email || '';
    // 获取用户邮箱作为默认用户名和显示名
    const username = userEmail.split('@')[0] || 'admin';
    
    let updateError;
    if (existingProfile) {
      // 如果存在 profiles 记录，更新 is_admin 和 email 字段
      console.log('Updating existing profile, current is_admin:', existingProfile.is_admin);
      ({ error: updateError } = await supabase
        .from('profiles')
        .update({ 
          is_admin: true,
          email: userEmail
        })
        .eq('id', userId));
      
      console.log('Profile update result:', { error: updateError?.message });
    } else {
      // 如果不存在 profiles 记录，插入一条完整的新记录
      console.log('Creating new profile with is_admin=true');
      ({ error: updateError } = await supabase
        .from('profiles')
        .insert([{
          id: userId,
          username: username,
          display_name: username,
          email: userEmail,
          is_admin: true
        }]));
      
      console.log('Profile creation result:', { error: updateError?.message });
    }
    
    if (updateError) {
      return NextResponse.json({ error: '更新管理员失败' }, { status: 500 });
    }
    
    // 为管理员分配超级管理员角色
    // 先检查是否已经有角色
    const { data: existingRoles } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', userId);
    
    if (!existingRoles || existingRoles.length === 0) {
      // 分配超级管理员角色
      try {
        await supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            role_id: 'role_super_admin'
          });
      } catch (err) {
        console.error('Error assigning super admin role:', (err as Error).message);
      }
    }
    
    return NextResponse.json({ message: '管理员注册成功' });
  } catch (error) {
    console.error('管理员注册错误:', error);
    return NextResponse.json({ error: '注册失败，请重试' }, { status: 500 });
  }
}