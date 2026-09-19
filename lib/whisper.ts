import { File } from 'expo-file-system';

/**
 * Transcribe audio using OpenAI Whisper.
 * Set EXPO_PUBLIC_OPENAI_API_KEY in your .env file.
 */
export async function transcribeAudio(audioUri: string): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';
  if (!apiKey) {
    throw new Error(
      'Missing OpenAI API key. Add EXPO_PUBLIC_OPENAI_API_KEY to your .env file.',
    );
  }

  const formData = new FormData();
  const audioBytes = new Uint8Array(await new File(audioUri).arrayBuffer());
  formData.append('file', {
    name: 'workout.m4a',
    type: 'audio/m4a',
    bytes: async () => audioBytes,
  } as any);
  formData.append('model', 'whisper-1');
  // Hint: fitness/gym terminology improves accuracy
  formData.append(
    'prompt',
    'Bench press, squat, deadlift, OHP, sets, reps, kilograms, kg, workout, chest, back, legs, arms',
  );

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const err = (await response.json()) as { error?: { message?: string } };
    throw new Error(err.error?.message ?? 'Whisper transcription failed');
  }

  const data = (await response.json()) as { text?: string };
  return data.text?.trim() ?? '';
}
