/**
 * RestEasy — Edge Function: generate-audio
 * Generates TTS audio via ElevenLabs API and stores in Supabase Storage.
 * Called on-demand when a client requests an audio file not yet cached.
 *
 * POST /functions/v1/generate-audio
 * Body: { key: AudioKey }
 * Returns: { url: string }
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech';
const BUCKET = 'audio-guides';

// Audio scripts (subset — full list in client src/lib/audio.ts)
const SCRIPTS: Record<string, { text: string; voice_id: string }> = {
  breathing_4_2_6_fr: {
    voice_id: 'pNInz4obpgDQGcFmaJgB',
    text: `Installez-vous confortablement. Fermez les yeux. Nous allons pratiquer la respiration 4-2-6.
Inspirez lentement par le nez... un, deux, trois, quatre.
Retenez doucement... un, deux.
Expirez lentement par la bouche... un, deux, trois, quatre, cinq, six.
Encore une fois. Inspirez... un, deux, trois, quatre.
Retenez... un, deux.
Expirez... un, deux, trois, quatre, cinq, six.
Votre corps se détend. Votre esprit se calme. Continuez à respirer ainsi.`,
  },
  breathing_4_2_6_en: {
    voice_id: 'pNInz4obpgDQGcFmaJgB',
    text: `Find a comfortable position. Close your eyes. We'll practice 4-2-6 breathing.
Breathe in slowly through your nose... one, two, three, four.
Hold gently... one, two.
Breathe out slowly through your mouth... one, two, three, four, five, six.
Once more. Breathe in... one, two, three, four.
Hold... one, two.
Breathe out... one, two, three, four, five, six.
Your body is relaxing. Your mind is calming. Continue breathing this way.`,
  },
  relaxation_pmr_fr: {
    voice_id: 'pNInz4obpgDQGcFmaJgB',
    text: `Allongez-vous confortablement. Fermez les yeux.
Nous allons relâcher les tensions de votre corps, groupe musculaire par groupe musculaire.
Commencez par vos pieds. Contractez-les fortement pendant cinq secondes... puis relâchez complètement.
Sentez la différence entre la tension et le relâchement.
Remontez vers vos mollets. Contractez... et relâchez.
Vos cuisses maintenant. Contractez... et relâchez.
Votre ventre. Contractez... et relâchez.
Vos épaules. Montez-les vers vos oreilles... et laissez-les tomber.
Votre visage. Plissez-le... et relâchez.
Votre corps tout entier est maintenant détendu. Vous êtes prêt pour le sommeil.`,
  },
  relaxation_pmr_en: {
    voice_id: 'pNInz4obpgDQGcFmaJgB',
    text: `Lie down comfortably. Close your eyes.
We'll release tension from your body, muscle group by muscle group.
Start with your feet. Tense them tightly for five seconds... then release completely.
Feel the difference between tension and relaxation.
Move up to your calves. Tense... and release.
Your thighs now. Tense... and release.
Your abdomen. Tense... and release.
Your shoulders. Raise them toward your ears... and let them drop.
Your face. Scrunch it... and release.
Your entire body is now relaxed. You are ready for sleep.`,
  },
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { key } = await req.json();

    if (!key || !SCRIPTS[key]) {
      return new Response(
        JSON.stringify({ error: `Unknown audio key: ${key}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if already exists in storage
    const { data: existing } = await adminClient.storage
      .from(BUCKET)
      .list('', { search: `${key}.mp3` });

    if (existing && existing.length > 0) {
      const { data: signedUrl } = await adminClient.storage
        .from(BUCKET)
        .createSignedUrl(`${key}.mp3`, 3600);
      return new Response(
        JSON.stringify({ url: signedUrl?.signedUrl }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate via ElevenLabs
    const script = SCRIPTS[key];
    const elevenLabsKey = Deno.env.get('ELEVENLABS_API_KEY');

    if (!elevenLabsKey) {
      return new Response(
        JSON.stringify({ error: 'ElevenLabs API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ttsResponse = await fetch(`${ELEVENLABS_API_URL}/${script.voice_id}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': elevenLabsKey,
      },
      body: JSON.stringify({
        text: script.text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.75,
          similarity_boost: 0.75,
          style: 0.3,
          use_speaker_boost: true,
        },
      }),
    });

    if (!ttsResponse.ok) {
      const errText = await ttsResponse.text();
      throw new Error(`ElevenLabs error: ${ttsResponse.status} — ${errText}`);
    }

    const audioBuffer = await ttsResponse.arrayBuffer();

    // Upload to Supabase Storage
    const { error: uploadError } = await adminClient.storage
      .from(BUCKET)
      .upload(`${key}.mp3`, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // Return signed URL
    const { data: signedUrl } = await adminClient.storage
      .from(BUCKET)
      .createSignedUrl(`${key}.mp3`, 3600);

    return new Response(
      JSON.stringify({ url: signedUrl?.signedUrl }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('generate-audio error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate audio' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
