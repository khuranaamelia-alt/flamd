/**
 * Unsigned upload to Cloudinary. Set in `.env`:
 * EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME
 * EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET
 */
const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME ?? '';
const uploadPreset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? '';

export async function uploadToCloudinary(imageUri: string): Promise<string> {
  if (!cloudName || !uploadPreset) {
    throw new Error(
      'Missing Cloudinary config. Add EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME and EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET to your environment.',
    );
  }

  const formData = new FormData();
  formData.append('file', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'profile.jpg',
  } as any);
  formData.append('upload_preset', uploadPreset);
  formData.append('cloud_name', cloudName);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  });

  const data = (await response.json()) as { secure_url?: string; error?: { message?: string } };

  if (!response.ok) {
    throw new Error(data.error?.message ?? 'Cloudinary upload failed');
  }
  if (!data.secure_url) {
    throw new Error('Cloudinary did not return secure_url');
  }

  return data.secure_url;
}
