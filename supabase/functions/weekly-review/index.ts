/**
 * RestEasy — Edge Function: weekly-review
 * Called at the end of each week to:
 * 1. Calculate average sleep efficiency for the week
 * 2. Adjust the sleep window for the next week (TCC-I algorithm)
 * 3. Advance the user's program week
 * 4. Unlock the next cognitive module
 *
 * POST /functions/v1/weekly-review
 * Body: { user_id: string, current_week: number }
 * Auth: Bearer token (user's JWT)
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// TCC-I module IDs unlocked each week
const WEEK_MODULES: Record<number, string> = {
  1: 's1_sleep_education',
  2: 's2_sleep_restriction',
  3: 's3_cognitive_restructuring',
  4: 's4_stimulus_control',
  5: 's5_relaxation',
  6: 's6_relapse_prevention',
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const currentWeek: number = body.current_week ?? 1;

    if (currentWeek >= 6) {
      return new Response(
        JSON.stringify({ message: 'Program already completed', week: 6 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Get weekly sleep summary
    const { data: summary } = await supabase
      .from('weekly_sleep_summary')
      .select('avg_efficiency, entry_count')
      .eq('user_id', user.id)
      .eq('program_week', currentWeek)
      .single();

    const avgEfficiency = summary?.avg_efficiency ?? 75;
    const entryCount = summary?.entry_count ?? 0;

    // 2. Get current sleep window
    const { data: currentWindow } = await supabase
      .from('sleep_windows')
      .select('prescribed_bedtime, prescribed_wake_time')
      .eq('user_id', user.id)
      .eq('program_week', currentWeek)
      .single();

    // 3. Compute new sleep window (TCC-I algorithm)
    const bedtime = currentWindow?.prescribed_bedtime ?? '23:30';
    const wakeTime = currentWindow?.prescribed_wake_time ?? '06:00';

    const [bH, bM] = bedtime.split(':').map(Number);
    let bedtimeMinutes = bH * 60 + bM;

    let adjustment = 'maintained';
    if (avgEfficiency >= 85) {
      bedtimeMinutes = (bedtimeMinutes - 15 + 1440) % 1440; // Extend: earlier bedtime
      adjustment = 'extended';
    } else if (avgEfficiency < 80) {
      bedtimeMinutes = (bedtimeMinutes + 15) % 1440; // Restrict: later bedtime
      adjustment = 'restricted';
    }

    const formatTime = (minutes: number): string => {
      const h = Math.floor(minutes / 60) % 24;
      const m = minutes % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    const nextWeek = currentWeek + 1;
    const newBedtime = formatTime(bedtimeMinutes);

    // 4. Save new sleep window for next week
    await supabase
      .from('sleep_windows')
      .upsert({
        user_id: user.id,
        program_week: nextWeek,
        prescribed_bedtime: newBedtime,
        prescribed_wake_time: wakeTime,
        avg_sleep_efficiency: avgEfficiency,
      }, { onConflict: 'user_id,program_week' });

    // 5. Advance program week
    await supabase
      .from('profiles')
      .update({
        program_week: nextWeek,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    // 6. Unlock next week's module
    const nextModuleId = WEEK_MODULES[nextWeek];
    if (nextModuleId) {
      await supabase
        .from('module_progress')
        .upsert({
          user_id: user.id,
          module_id: nextModuleId,
          status: 'not_started',
        }, { onConflict: 'user_id,module_id' });
    }

    return new Response(
      JSON.stringify({
        success: true,
        previous_week: currentWeek,
        next_week: nextWeek,
        avg_efficiency: avgEfficiency,
        entry_count: entryCount,
        adjustment,
        new_bedtime: newBedtime,
        wake_time: wakeTime,
        unlocked_module: nextModuleId ?? null,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('weekly-review error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
