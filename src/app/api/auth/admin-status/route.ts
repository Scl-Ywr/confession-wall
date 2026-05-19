import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET() {
  const supabaseServer = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabaseServer.auth.getUser();

  if (authError || !authData.user) {
    return NextResponse.json(
      { authenticated: false, isAdmin: false, reason: 'not_authenticated' },
      { status: 401 }
    );
  }

  const { data: profile, error: profileError } = await supabaseServer
    .from('profiles')
    .select('is_admin')
    .eq('id', authData.user.id)
    .maybeSingle();

  if (profileError) {
    console.error('Admin status profile check failed:', profileError);
    return NextResponse.json(
      { authenticated: true, isAdmin: false, reason: 'profile_check_failed' },
      { status: 500 }
    );
  }

  if (profile?.is_admin) {
    return NextResponse.json({ authenticated: true, isAdmin: true });
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { data: userRoles, error: userRolesError } = await supabaseAdmin
    .from('user_roles')
    .select('role_id')
    .eq('user_id', authData.user.id);

  if (userRolesError || !userRoles || userRoles.length === 0) {
    return NextResponse.json(
      { authenticated: true, isAdmin: false, reason: 'no_admin_role' },
      { status: 403 }
    );
  }

  const roleIds = userRoles.map((role) => role.role_id);
  const { data: roles, error: rolesError } = await supabaseAdmin
    .from('roles')
    .select('name')
    .in('id', roleIds);

  if (rolesError) {
    return NextResponse.json(
      { authenticated: true, isAdmin: false, reason: 'role_check_failed' },
      { status: 500 }
    );
  }

  const roleNames = roles?.map((role) => role.name) || [];
  const isAdmin = ['super_admin', 'admin', 'moderator'].some((roleName) => roleNames.includes(roleName));

  if (!isAdmin) {
    return NextResponse.json(
      { authenticated: true, isAdmin: false, reason: 'insufficient_role' },
      { status: 403 }
    );
  }

  return NextResponse.json({ authenticated: true, isAdmin: true });
}
