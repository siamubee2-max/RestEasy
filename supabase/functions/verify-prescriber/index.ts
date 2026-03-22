/**
 * RestEasy — verify-prescriber Edge Function
 *
 * Verifies a prescriber code server-side against PRESCRIBER_CODES env var.
 * The codes are never exposed in the client bundle.
 *
 * Set in Supabase dashboard: Settings > Edge Functions > Secrets
 *   PRESCRIBER_CODES=CODE1,CODE2,CODE3
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { code } = await req.json();

    if (!code || typeof code !== 'string') {
      return new Response(
        JSON.stringify({ valid: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Codes stored as a comma-separated secret — never in client code
    const rawCodes = Deno.env.get('PRESCRIBER_CODES') ?? '';
    const validCodes = rawCodes
      .split(',')
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean);

    const valid = validCodes.includes(code.trim().toUpperCase());

    return new Response(
      JSON.stringify({ valid }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch {
    return new Response(
      JSON.stringify({ valid: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
