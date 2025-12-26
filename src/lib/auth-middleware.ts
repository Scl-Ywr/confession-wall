import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function requireAuth() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  return { user, supabase };
}

export async function requireAdmin() {
  const authResult = await requireAuth();
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user, supabase } = authResult;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.is_admin) {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    );
  }

  return { user, supabase, profile };
}

export async function checkPermission(
  requiredPermissions: string[]
) {
  const authResult = await requireAuth();
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user, supabase } = authResult;

  const { data: userRoles, error: rolesError } = await supabase
    .from('user_roles')
    .select(`
      role_id,
      roles (
        id,
        name,
        role_permissions (
          permission_id,
          permissions (
            id,
            name
          )
        )
      )
    `)
    .eq('user_id', user.id);

  if (rolesError) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }

  const userPermissions = new Set<string>();
  
  for (const userRole of userRoles || []) {
    const role = userRole.roles as { role_permissions?: { permissions?: { name?: string }[] }[] };
    if (role?.role_permissions) {
      for (const rp of role.role_permissions) {
        const permission = rp.permissions as { name?: string };
        if (permission?.name) {
          userPermissions.add(permission.name);
        }
      }
    }
  }

  const missingPermissions = requiredPermissions.filter(
    perm => !userPermissions.has(perm)
  );

  if (missingPermissions.length > 0) {
    return NextResponse.json(
      { 
        error: 'Forbidden',
        missingPermissions 
      },
      { status: 403 }
    );
  }

  return { user, supabase, userPermissions };
}
