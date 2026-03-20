import { useState, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, signInAnonymously } from '../lib/supabase';
import { identifyUser } from '../lib/revenuecat';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        // Sync user ID with RevenueCat
        if (session?.user) {
          await identifyUser(session.user.id);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const startAnonymousSession = async () => {
    setLoading(true);
    try {
      await signInAnonymously();
    } catch (e) {
      console.error('Anonymous sign-in failed:', e);
    } finally {
      setLoading(false);
    }
  };

  return { user, session, loading, startAnonymousSession };
}
