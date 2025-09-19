import React, { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import "./index.css";

interface UploadResponse {
  status: string;
  image_path?: string;
  error?: string;
}

export const ImageUploader: React.FC = () => {
  const [text, setText] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedImage = e.target.files[0];
      setImage(selectedImage);

      // 如果用户没有输入文本，自动使用文件名（不含后缀）作为文本
      if (!text.trim()) {
        const fileNameWithoutExt = selectedImage.name.replace(/\.[^/.]+$/, "");
        setText(fileNameWithoutExt);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!text.trim() && !image) return;
    setIsUploading(true);
    setMessage('');

    // 如果用户没有输入文本，使用文件名（不含后缀）作为默认文本
    const finalText = text.trim() || image?.name.replace(/\.[^/.]+$/, "") || "";

    const formData = new FormData();
    formData.append('text', finalText);
    if (image)
      formData.append('image', image);

    try {
      const response = await fetch('http://localhost:8100/embed', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: UploadResponse = await response.json();

      if (data.status === 'success') {
        setMessage('上传成功！');
        setMessageType('success');
        setText('');
        setImage(null);
        // 清空文件输入
        const fileInput = document.getElementById('image') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else {
        throw new Error(data.error || '上传失败');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '上传失败');
      setMessageType('error');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="text-left">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">RAG知识库上传</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 文本输入 - 改为 Textarea */}
            <div>
              <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-2">
                文本描述（可选）
              </label>
              <textarea
                id="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
                placeholder="请输入图片描述（留空将使用图片文件名作为描述）"
                rows={4}
                disabled={isUploading}
              />
              <p className="mt-1 text-sm text-gray-500">
                如果不填写，将自动使用图片文件名（不含后缀）作为文本描述
              </p>
            </div>

            {/* 图片上传 */}
            <div>
              <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-2">
                选择图片 *
              </label>
              <input
                type="file"
                id="image"
                accept="image/*"
                onChange={handleImageChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isUploading}
                required
              />
              {image && (
                <div className="mt-2">
                  <p className="text-sm text-gray-600">已选择文件: {image.name}</p>
                  <p className="text-sm text-gray-500">
                    将使用的文本: {text.trim() || image.name.replace(/\.[^/.]+$/, "")}
                  </p>
                </div>
              )}
            </div>

            {/* 上传按钮 */}
            <button
              type="submit"
              disabled={isUploading || !image}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-lg font-medium"
            >
              {isUploading ? '上传中...' : '上传图片'}
            </button>
          </form>

          {/* 消息提示 */}
          {message && (
            <div className={`mt-6 p-4 rounded-md ${messageType === 'success'
              ? 'bg-green-100 text-green-800 border border-green-200'
              : 'bg-red-100 text-red-800 border border-red-200'
              }`}>
              <p className="font-medium">{message}</p>
              {messageType === 'success' && (
                <p className="text-sm mt-1">文本和图像嵌入向量已生成并存储</p>
              )}
            </div>
          )}

          {/* 使用说明 */}
          <div className="mt-8 p-5 bg-blue-50 rounded-md border border-blue-200">
            <h3 className="text-lg font-medium text-blue-900 mb-3">使用说明：</h3>
            <ul className="text-sm text-blue-800 space-y-2">
              <li className="flex items-start">
                <span>选择要上传的图片</span>
              </li>
              <li className="flex items-start">
                <span>可输入文本描述，或留空使用文件名自动生成</span>
              </li>
              <li className="flex items-start">
                <span>点击上传按钮生成文本和图像的嵌入向量</span>
              </li>
              <li className="flex items-start">
                <span>支持多行文本描述，便于详细描述图片内容</span>
              </li>
            </ul>
          </div>

          {/* 示例 */}
          <div className="mt-6 p-4 bg-gray-100 rounded-md">
            <h4 className="text-sm font-medium text-gray-900 mb-2">示例：</h4>
            <p className="text-sm text-gray-600">
              文件名: <code className="bg-gray-200 px-1 rounded">beautiful_sunset.jpg</code> →
              自动文本: <code className="bg-gray-200 px-1 rounded">beautiful_sunset</code>
            </p>
            <p className="text-sm text-gray-600 mt-1">
              文件名: <code className="bg-gray-200 px-1 rounded">cat_playing_123.png</code> →
              自动文本: <code className="bg-gray-200 px-1 rounded">cat_playing_123</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ImageUploader />
  </StrictMode>
);

