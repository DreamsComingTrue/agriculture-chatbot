import { useState, useCallback } from 'react';

type ImageUploaderProps = {
  onImagesChange: (images: string[]) => void;
};

export const ImageUploader = ({ onImagesChange }: ImageUploaderProps) => {
  const [images, setImages] = useState<string[]>([]);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: string[] = [];
    const readers = Array.from(files).map(file => {
      const reader = new FileReader();
      return new Promise<string>((resolve) => {
        reader.onload = (event) => {
          if (event.target?.result) {
            newImages.push(event.target.result as string);
            resolve(event.target.result as string);
          }
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readers).then(() => {
      setImages(prev => [...prev, ...newImages]);
      onImagesChange([...images, ...newImages]);
    });
  }, [images, onImagesChange]);

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    onImagesChange(newImages);
  };

  return (
    <div className="mb-4">
      <label className="block mb-2 text-sm font-medium text-gray-700">
        Upload Images (for multimodal models)
      </label>
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={handleImageUpload}
        className="block w-full text-sm text-gray-500
          file:mr-4 file:py-2 file:px-4
          file:rounded-md file:border-0
          file:text-sm file:font-semibold
          file:bg-blue-50 file:text-blue-700
          hover:file:bg-blue-100"
      />
      <div className="flex flex-wrap gap-2 mt-2">
        {images.map((img, index) => (
          <div key={index} className="relative">
            <img
              src={img}
              alt={`Uploaded ${index}`}
              className="h-16 w-16 object-cover rounded"
            />
            <button
              onClick={() => removeImage(index)}
              className="absolute -top-2 -right-2 bg-red-500 !important text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
