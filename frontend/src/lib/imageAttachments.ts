const MAX_ATTACHMENT_BYTES = 120_000;

export const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((value) => (value ? resolve(value) : reject(new Error('Could not compress image.'))), 'image/jpeg', quality),
  );
}

export async function prepareImageAttachment(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error(`${file.name}: use JPG or PNG. HEIC is not supported in the browser.`);
  });

  try {
    let maxDim = 1024;
    while (maxDim >= 320) {
      const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not process image.');
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      for (let quality = 0.82; quality >= 0.45; quality -= 0.08) {
        const blob = await canvasToJpeg(canvas, quality);
        if (blob.size <= MAX_ATTACHMENT_BYTES) {
          const base = file.name.replace(/\.[^.]+$/, '') || 'image';
          return new File([blob], `${base}.jpg`, { type: 'image/jpeg' });
        }
      }
      maxDim = Math.round(maxDim * 0.75);
    }
    throw new Error(`${file.name} is too large. Try a smaller image.`);
  } finally {
    bitmap.close();
  }
}
