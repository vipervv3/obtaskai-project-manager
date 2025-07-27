import { supabase } from '../services/supabase';

export async function initMockUser() {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  const mockUserId = '00000000-0000-0000-0000-000000000001';
  
  try {
    // First, create the user in auth.users (using service role key)
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: 'test@example.com',
      password: 'testpassword123',
      email_confirm: true,
      user_metadata: {
        full_name: 'Test User'
      }
    });

    if (authError && authError.message !== 'User already registered') {
      console.error('Failed to create auth user:', authError);
      return;
    }

    if (authUser?.user) {
      console.log('✓ Mock auth user created/exists');
      
      // The trigger should automatically create the public.users record
      // Let's verify it exists
      const { data: publicUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', 'test@example.com')
        .single();

      if (publicUser) {
        console.log('✓ Mock public user exists');
      } else {
        console.log('ℹ Public user will be created by trigger');
      }
    }
  } catch (error) {
    console.error('Error initializing mock user:', error);
  }
}