import { useState, useCallback, useRef, useEffect } from "react";
import imageIcon from "../assets/image.png";
import imageActiveIcon from "../assets/image-active.png";

type ImageUploaderProps = {
  onImagesChange: (images: string[]) => void;
  disabled?: boolean;
  resetTrigger?: boolean; // New prop to trigger reset
};

export const ImageUploader = ({
  onImagesChange,
  disabled = false,
  resetTrigger = false // Default value
}: ImageUploaderProps) => {
  const [images, setImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImageActive, setIsImageActive] = useState(false);

  // Reset when resetTrigger changes
  useEffect(() => {
    if (resetTrigger) {
      setImages([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = ""; // Clear the file input
      }
    }
  }, [resetTrigger]);

  const handleImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;

      const newImages: string[] = [];
      const readers = Array.from(files).map(file => {
        const reader = new FileReader();
        return new Promise<string>(resolve => {
          reader.onload = event => {
            if (event.target?.result) {
              newImages.push(event.target.result as string);
              resolve(event.target.result as string);
            }
          };
          reader.readAsDataURL(file);
        });
      });

      Promise.all(readers).then(() => {
        const updatedImages = [...images, ...newImages];
        setImages(updatedImages);
        onImagesChange(updatedImages);
      });
    },
    [images, onImagesChange]
  );

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    onImagesChange(newImages);
  };

  return (
    <div className="flex gap-2">
      <div className="flex flex-wrap gap-2">
        {images.map((img, index) => (
          <div key={index} className="relative">
            <img
              src={img}
              alt={`Uploaded ${index}`}
              className="w-8 h-8 object-cover rounded"
            />
            {!disabled && (
              <div
                onClick={() => removeImage(index)}
                className="absolute -top-2 -right-2 bg-red-500! text-white rounded-full w-3 h-3 flex items-center justify-center text-xs cursor-pointer"
                aria-label="Remove image"
              >
                ×
              </div>
            )}
          </div>
        ))}
      </div>
      <div
        className="relative w-8 h-8 cursor-pointer"
        onClick={() => {
          setIsImageActive(!isImageActive);
          fileInputRef.current?.click();
          setTimeout(() => {
            setIsImageActive(false);
          }, 200);
        }}
      >
        <img
          src={isImageActive ? imageActiveIcon : imageIcon}
          alt="上传图片"
          className="w-full h-full"
        />
      </div>
      <input
        ref={fileInputRef}
        style={{ display: "none" }}
        type="file"
        accept="image/*"
        multiple
        onChange={handleImageUpload}
        disabled={disabled}
        className={`block w-full text-sm text-gray-500
          file:mr-4 file:py-2 file:px-4
          file:rounded-md file:border-0
          file:text-sm file:font-semibold
          ${
            disabled
              ? "file:bg-gray-200 file:text-gray-500"
              : "file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          }
          ${disabled ? "cursor-not-allowed" : ""}`}
      />
    </div>
  );
};
