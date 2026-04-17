export function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Failed to read image file"));
    };

    reader.onerror = () => {
      reject(reader.error ?? new Error("Failed to read image file"));
    };

    reader.readAsDataURL(file);
  });
}

export function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load image"));
    image.src = source;
  });
}

export async function compressImageFile(file: File) {
  if (file.type === "image/gif" || file.type === "image/svg+xml") {
    return readFileAsDataUrl(file);
  }

  const source = await readFileAsDataUrl(file);
  const image = await loadImage(source);
  const maxDimension = 1600;
  const scale = Math.min(maxDimension / image.width, maxDimension / image.height, 1);
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");

  if (!context) {
    return source;
  }

  context.drawImage(image, 0, 0, width, height);

  return new Promise<string>((resolve, reject) => {
    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          resolve(source);
          return;
        }

        try {
          const compressedSource = await readFileAsDataUrl(
            new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), {
              type: "image/webp",
            })
          );

          resolve(compressedSource);
        } catch (error) {
          reject(error);
        }
      },
      "image/webp",
      0.82
    );
  });
}