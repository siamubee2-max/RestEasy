/**
 * RestEasy — Edge Function: push-notification
 * Sends push notifications via Expo Push API.
 * Called by Supabase cron jobs or directly from the app.
 *
 * POST /functions/v1/push-notification
 * Body: { user_id?: string, type: 'morning_reminder' | 'bedtime_reminder' | 'weekly_review' }
 * Auth: Service role (no JWT required for cron jobs)
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type NotificationType = 'morning_reminder' | 'bedtime_reminder' | 'weekly_review';

const NOTIFICATION_CONTENT: Record<NotificationType, Record<string, { title: string; body: string }>> = {
  morning_reminder: {
    fr: { title: '☀️ Journal du matin', body: 'Comment s\'est passée votre nuit ? Remplissez votre journal en 60 secondes.' },
    en: { title: '☀️ Morning Journal', body: 'How was your night? Fill in your journal in 60 seconds.' },
    es: { title: '☀️ Diario matutino', body: '¿Cómo fue tu noche? Rellena tu diario en 60 segundos.' },
    de: { title: '☀️ Morgentagebuch', body: 'Wie war Ihre Nacht? Füllen Sie Ihr Tagebuch in 60 Sekunden aus.' },
  },
  bedtime_reminder: {
    fr: { title: '🌙 Heure de dormir', body: 'C\'est l\'heure de votre fenêtre de sommeil. Préparez-vous à vous coucher.' },
    en: { title: '🌙 Bedtime', body: 'It\'s time for your sleep window. Start winding down.' },
    es: { title: '🌙 Hora de dormir', body: 'Es hora de tu ventana de sueño. Empieza a relajarte.' },
    de: { title: '🌙 Schlafenszeit', body: 'Es ist Zeit für Ihr Schlaffenster. Bereiten Sie sich auf den Schlaf vor.' },
  },
  weekly_review: {
    fr: { title: '📊 Bilan de la semaine', body: 'Votre bilan hebdomadaire est prêt. Découvrez votre progression !' },
    en: { title: '📊 Weekly Review', body: 'Your weekly review is ready. See your progress!' },
    es: { title: '📊 Revisión semanal', body: '¡Tu revisión semanal está lista. ¡Mira tu progreso!' },
    de: { title: '📊 Wöchentliche Überprüfung', body: 'Ihre wöchentliche Überprüfung ist fertig. Sehen Sie Ihren Fortschritt!' },
  },
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { user_id, type }: { user_id?: string; type: NotificationType } = body;

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get users to notify
    let query = adminClient
      .from('profiles')
      .select('id, locale, push_token')
      .not('push_token', 'is', null);

    if (user_id) {
      query = query.eq('id', user_id);
    }

    const { data: profiles, error } = await query;
    if (error) throw error;
    if (!profiles?.length) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No users with push tokens' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build Expo push messages
    const messages = profiles
      .filter(p => p.push_token?.startsWith('ExponentPushToken'))
      .map(profile => {
        const locale = (profile.locale ?? 'fr').split('-')[0];
        const content = NOTIFICATION_CONTENT[type][locale] ?? NOTIFICATION_CONTENT[type]['en'];
        return {
          to: profile.push_token,
          sound: 'default',
          title: content.title,
          body: content.body,
          data: { type, user_id: profile.id },
          channelId: 'default',
        };
      });

    if (!messages.length) {
      return new Response(
        JSON.stringify({ success: true, sent: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send via Expo Push API
    const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const expoResult = await expoResponse.json();

    return new Response(
      JSON.stringify({ success: true, sent: messages.length, expo: expoResult }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('push-notification error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to send notifications' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
