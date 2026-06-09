import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function useProfile() {
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const user = (await supabase.auth.getUser()).data.user;

    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    setProfile(data);
  };

  return { profile, loadProfile };
}