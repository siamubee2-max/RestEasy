/**
 * RestEasy — Audio Library (ElevenLabs TTS)
 * Generates and caches guided audio for breathing exercises,
 * relaxation sessions, and cognitive module introductions.
 *
 * Strategy:
 * - Pre-generated audio files are stored in Supabase Storage
 * - The Edge Function `generate-audio` creates them on first request
 * - Files are cached locally using expo-file-system
 * - Fallback: silent mode if audio unavailable
 */
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';
import { supabase } from './supabase';
import { captureError } from './sentry';

const AUDIO_CACHE_DIR = FileSystem.cacheDirectory + 'resteasy-audio/';
const SUPABASE_AUDIO_BUCKET = 'audio-guides';

// ─── Audio Script Library ─────────────────────────────────────────────────────

export type AudioKey =
  | 'breathing_4_2_6_fr' | 'breathing_4_2_6_en' | 'breathing_4_2_6_es' | 'breathing_4_2_6_de'
  | 'relaxation_pmr_fr'  | 'relaxation_pmr_en'  | 'relaxation_pmr_es'  | 'relaxation_pmr_de'
  | 'sleep_restriction_intro_fr' | 'sleep_restriction_intro_en'
  | 'cognitive_intro_fr' | 'cognitive_intro_en'
  | 'stimulus_control_fr' | 'stimulus_control_en';

export const AUDIO_SCRIPTS: Record<AudioKey, { text: string; voice: string; duration_hint: number }> = {
  // ── Breathing 4-2-6 ──────────────────────────────────────────────────────
  breathing_4_2_6_fr: {
    text: `Installez-vous confortablement. Fermez les yeux. Nous allons pratiquer la respiration 4-2-6.
Inspirez lentement par le nez... un, deux, trois, quatre.
Retenez doucement... un, deux.
Expirez lentement par la bouche... un, deux, trois, quatre, cinq, six.
Encore une fois. Inspirez... un, deux, trois, quatre.
Retenez... un, deux.
Expirez... un, deux, trois, quatre, cinq, six.
Votre corps se détend. Votre esprit se calme. Continuez à respirer ainsi.`,
    voice: 'pNInz4obpgDQGcFmaJgB', // Adam — calme
    duration_hint: 45,
  },
  breathing_4_2_6_en: {
    text: `Find a comfortable position. Close your eyes. We'll practice 4-2-6 breathing.
Breathe in slowly through your nose... one, two, three, four.
Hold gently... one, two.
Breathe out slowly through your mouth... one, two, three, four, five, six.
Once more. Breathe in... one, two, three, four.
Hold... one, two.
Breathe out... one, two, three, four, five, six.
Your body is relaxing. Your mind is calming. Continue breathing this way.`,
    voice: 'pNInz4obpgDQGcFmaJgB',
    duration_hint: 45,
  },
  breathing_4_2_6_es: {
    text: `Encuentra una posición cómoda. Cierra los ojos. Practicaremos la respiración 4-2-6.
Inhala lentamente por la nariz... uno, dos, tres, cuatro.
Retén suavemente... uno, dos.
Exhala lentamente por la boca... uno, dos, tres, cuatro, cinco, seis.
Una vez más. Inhala... uno, dos, tres, cuatro.
Retén... uno, dos.
Exhala... uno, dos, tres, cuatro, cinco, seis.
Tu cuerpo se relaja. Tu mente se calma.`,
    voice: 'pNInz4obpgDQGcFmaJgB',
    duration_hint: 45,
  },
  breathing_4_2_6_de: {
    text: `Setzen Sie sich bequem hin. Schließen Sie die Augen. Wir üben die 4-2-6-Atmung.
Atmen Sie langsam durch die Nase ein... eins, zwei, drei, vier.
Halten Sie sanft an... eins, zwei.
Atmen Sie langsam durch den Mund aus... eins, zwei, drei, vier, fünf, sechs.
Noch einmal. Einatmen... eins, zwei, drei, vier.
Anhalten... eins, zwei.
Ausatmen... eins, zwei, drei, vier, fünf, sechs.
Ihr Körper entspannt sich. Ihr Geist beruhigt sich.`,
    voice: 'pNInz4obpgDQGcFmaJgB',
    duration_hint: 45,
  },

  // ── Progressive Muscle Relaxation ────────────────────────────────────────
  relaxation_pmr_fr: {
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
    voice: 'pNInz4obpgDQGcFmaJgB',
    duration_hint: 90,
  },
  relaxation_pmr_en: {
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
    voice: 'pNInz4obpgDQGcFmaJgB',
    duration_hint: 90,
  },
  relaxation_pmr_es: {
    text: `Recuéstate cómodamente. Cierra los ojos.
Vamos a liberar la tensión de tu cuerpo, grupo muscular por grupo muscular.
Empieza con tus pies. Contráelos fuertemente durante cinco segundos... luego suéltalos completamente.
Siente la diferencia entre la tensión y la relajación.
Sube hacia tus pantorrillas. Contrae... y suelta.
Tus muslos ahora. Contrae... y suelta.
Tu abdomen. Contrae... y suelta.
Tus hombros. Súbelos hacia tus orejas... y déjalos caer.
Tu cara. Arruégala... y suelta.
Todo tu cuerpo está ahora relajado. Estás listo para dormir.`,
    voice: 'pNInz4obpgDQGcFmaJgB',
    duration_hint: 90,
  },
  relaxation_pmr_de: {
    text: `Legen Sie sich bequem hin. Schließen Sie die Augen.
Wir werden die Spannung aus Ihrem Körper lösen, Muskelgruppe für Muskelgruppe.
Beginnen Sie mit Ihren Füßen. Spannen Sie sie fünf Sekunden lang fest an... dann lassen Sie vollständig los.
Spüren Sie den Unterschied zwischen Spannung und Entspannung.
Gehen Sie zu Ihren Waden über. Anspannen... und loslassen.
Jetzt Ihre Oberschenkel. Anspannen... und loslassen.
Ihr Bauch. Anspannen... und loslassen.
Ihre Schultern. Heben Sie sie zu Ihren Ohren... und lassen Sie sie fallen.
Ihr Gesicht. Verziehen Sie es... und entspannen Sie.
Ihr gesamter Körper ist jetzt entspannt. Sie sind bereit für den Schlaf.`,
    voice: 'pNInz4obpgDQGcFmaJgB',
    duration_hint: 90,
  },

  // ── Module Introductions ──────────────────────────────────────────────────
  sleep_restriction_intro_fr: {
    text: `Bienvenue dans la semaine deux de votre programme RestEasy.
Cette semaine, nous allons travailler sur la restriction du sommeil.
Je sais que cela peut sembler paradoxal : passer moins de temps au lit pour mieux dormir.
Mais c'est l'une des techniques les plus efficaces de la thérapie cognitive pour l'insomnie.
En concentrant votre sommeil dans une fenêtre plus courte, vous renforcez votre pression de sommeil.
Votre corps apprend à s'endormir plus vite et à rester endormi plus longtemps.
Faites confiance au processus. Les résultats arrivent généralement dès la troisième semaine.`,
    voice: 'pNInz4obpgDQGcFmaJgB',
    duration_hint: 60,
  },
  sleep_restriction_intro_en: {
    text: `Welcome to week two of your RestEasy program.
This week, we'll work on sleep restriction.
I know this may seem paradoxical: spending less time in bed to sleep better.
But it's one of the most effective techniques in cognitive therapy for insomnia.
By concentrating your sleep into a shorter window, you strengthen your sleep pressure.
Your body learns to fall asleep faster and stay asleep longer.
Trust the process. Results typically arrive by the third week.`,
    voice: 'pNInz4obpgDQGcFmaJgB',
    duration_hint: 60,
  },
  cognitive_intro_fr: {
    text: `Bienvenue dans la semaine trois. Cette semaine est consacrée à la restructuration cognitive.
L'insomnie est souvent alimentée par des pensées anxieuses sur le sommeil.
"Je ne vais jamais m'endormir." "Je serai épuisé demain." "Mon sommeil est brisé."
Ces pensées ne sont pas des faits. Ce sont des interprétations que nous pouvons remettre en question.
Cette semaine, vous apprendrez à identifier ces pensées automatiques et à les recadrer.
Non pas pour les ignorer, mais pour les voir avec plus de précision et moins d'anxiété.`,
    voice: 'pNInz4obpgDQGcFmaJgB',
    duration_hint: 55,
  },
  cognitive_intro_en: {
    text: `Welcome to week three. This week is dedicated to cognitive restructuring.
Insomnia is often fueled by anxious thoughts about sleep.
"I'll never fall asleep." "I'll be exhausted tomorrow." "My sleep is broken."
These thoughts are not facts. They are interpretations we can question.
This week, you'll learn to identify these automatic thoughts and reframe them.
Not to ignore them, but to see them with more accuracy and less anxiety.`,
    voice: 'pNInz4obpgDQGcFmaJgB',
    duration_hint: 55,
  },
  stimulus_control_fr: {
    text: `Semaine quatre : le contrôle des stimuli.
Votre lit doit être associé uniquement au sommeil et à l'intimité, pas à l'éveil.
Si vous regardez des écrans au lit, si vous vous inquiétez au lit, si vous lisez au lit pendant des heures,
votre cerveau associe le lit à l'éveil.
Cette semaine, nous allons reconstruire cette association.
Règle principale : si vous n'êtes pas endormi en vingt minutes, levez-vous.
Allez dans une autre pièce. Faites quelque chose de calme. Revenez quand vous vous sentez somnolent.
Cela peut sembler difficile au début. Mais c'est l'une des techniques les plus puissantes du programme.`,
    voice: 'pNInz4obpgDQGcFmaJgB',
    duration_hint: 65,
  },
  stimulus_control_en: {
    text: `Week four: stimulus control.
Your bed should be associated only with sleep and intimacy, not with wakefulness.
If you watch screens in bed, worry in bed, or read in bed for hours,
your brain associates the bed with being awake.
This week, we'll rebuild that association.
Main rule: if you're not asleep within twenty minutes, get up.
Go to another room. Do something calm. Return when you feel sleepy.
This may feel difficult at first. But it's one of the most powerful techniques in the program.`,
    voice: 'pNInz4obpgDQGcFmaJgB',
    duration_hint: 65,
  },
};

// ─── Cache Management ─────────────────────────────────────────────────────────

async function ensureCacheDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(AUDIO_CACHE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(AUDIO_CACHE_DIR, { intermediates: true });
  }
}

function getCachedPath(key: AudioKey): string {
  return AUDIO_CACHE_DIR + key + '.mp3';
}

async function isCached(key: AudioKey): Promise<boolean> {
  const info = await FileSystem.getInfoAsync(getCachedPath(key));
  return info.exists;
}

// ─── Audio Download ───────────────────────────────────────────────────────────

async function downloadAudio(key: AudioKey): Promise<string | null> {
  try {
    await ensureCacheDir();

    // Get signed URL from Supabase Storage
    const { data, error } = await supabase.storage
      .from(SUPABASE_AUDIO_BUCKET)
      .createSignedUrl(`${key}.mp3`, 3600);

    if (error || !data?.signedUrl) {
      // Trigger generation via Edge Function
      const { data: genData, error: genError } = await supabase.functions.invoke(
        'generate-audio',
        { body: { key } }
      );
      if (genError || !genData?.url) return null;

      const localPath = getCachedPath(key);
      await FileSystem.downloadAsync(genData.url, localPath);
      return localPath;
    }

    const localPath = getCachedPath(key);
    await FileSystem.downloadAsync(data.signedUrl, localPath);
    return localPath;
  } catch (error) {
    captureError(error as Error, { context: 'downloadAudio', key });
    return null;
  }
}

// ─── Audio Player ─────────────────────────────────────────────────────────────

let currentSound: Audio.Sound | null = null;

export async function playAudio(key: AudioKey): Promise<void> {
  try {
    await stopAudio();

    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
    });

    let localPath: string | null = null;

    if (await isCached(key)) {
      localPath = getCachedPath(key);
    } else {
      localPath = await downloadAudio(key);
    }

    if (!localPath) return;

    const { sound } = await Audio.Sound.createAsync(
      { uri: localPath },
      { shouldPlay: true, volume: 0.85 }
    );

    currentSound = sound;
  } catch (error) {
    captureError(error as Error, { context: 'playAudio', key });
  }
}

export async function stopAudio(): Promise<void> {
  if (currentSound) {
    try {
      await currentSound.stopAsync();
      await currentSound.unloadAsync();
    } catch {
      // Ignore cleanup errors
    }
    currentSound = null;
  }
}

export async function pauseAudio(): Promise<void> {
  if (currentSound) {
    try {
      await currentSound.pauseAsync();
    } catch {
      // Ignore
    }
  }
}

export async function resumeAudio(): Promise<void> {
  if (currentSound) {
    try {
      await currentSound.playAsync();
    } catch {
      // Ignore
    }
  }
}

export function getAudioKey(type: 'breathing' | 'pmr' | string, locale: string): AudioKey {
  const lang = locale.split('-')[0].toLowerCase();
  const supportedLangs = ['fr', 'en', 'es', 'de'];
  const l = supportedLangs.includes(lang) ? lang : 'en';

  if (type === 'breathing') return `breathing_4_2_6_${l}` as AudioKey;
  if (type === 'pmr') return `relaxation_pmr_${l}` as AudioKey;
  if (type === 'sleep_restriction') return `sleep_restriction_intro_${l === 'fr' ? 'fr' : 'en'}` as AudioKey;
  if (type === 'cognitive') return `cognitive_intro_${l === 'fr' ? 'fr' : 'en'}` as AudioKey;
  if (type === 'stimulus') return `stimulus_control_${l === 'fr' ? 'fr' : 'en'}` as AudioKey;

  return `breathing_4_2_6_${l}` as AudioKey;
}

// ─── Preload ──────────────────────────────────────────────────────────────────

export async function preloadAudioForLocale(locale: string): Promise<void> {
  const lang = locale.split('-')[0].toLowerCase();
  const keysToPreload: AudioKey[] = [
    `breathing_4_2_6_${lang === 'fr' ? 'fr' : lang === 'es' ? 'es' : lang === 'de' ? 'de' : 'en'}` as AudioKey,
    `relaxation_pmr_${lang === 'fr' ? 'fr' : lang === 'es' ? 'es' : lang === 'de' ? 'de' : 'en'}` as AudioKey,
  ];

  for (const key of keysToPreload) {
    if (!(await isCached(key))) {
      downloadAudio(key).catch(() => {}); // Background preload
    }
  }
}
