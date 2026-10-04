import React, { useRef, useState } from 'react';
import { Upload, X, Eye, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';
import { AttachedFile } from '../types';
import { validateFileSize } from '../utils/validators';

interface FileUploadProps {
  label: string;
  accept?: string;
  required?: boolean;
  value?: AttachedFile | null;
  onChange: (file: AttachedFile | null) => void;
  helperText?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  label,
  accept = 'image/*,application/pdf',
  required = false,
  value,
  onChange,
  helperText = 'รองรับไฟล์ภาพ JPEG, PNG ไม่เกิน 5MB',
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const handleFile = (file: File) => {
    setError(null);
    const sizeValidation = validateFileSize(file);
    if (!sizeValidation.valid) {
      setError(sizeValidation.error || 'ไฟล์มีขนาดเกิน 5 MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      onChange({
        name: file.name,
        size: file.size,
        type: file.type,
        dataUrl,
        uploadedAt: new Date().toISOString(),
      });
    };
    reader.onerror = () => {
      setError('ไม่สามารถอ่านไฟล์ได้ กรุณาลองใหม่อีกครั้ง');
    };
    reader.readAsDataURL(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setError(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
          {label}
          {required && <span className="text-rose-500">*</span>}
        </label>
        {value && (
          <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> แนบไฟล์แล้ว
          </span>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
      />

      {value ? (
        <div className="relative group border border-slate-200 rounded-2xl p-3 bg-slate-50/70 hover:bg-white flex items-center justify-between gap-3 transition-colors">
          <div className="flex items-center gap-2.5 min-w-0">
            {value.type.startsWith('image/') ? (
              <div
                onClick={() => setShowPreviewModal(true)}
                className="w-12 h-12 rounded-xl overflow-hidden bg-slate-200 shrink-0 cursor-pointer border border-slate-200 hover:opacity-90 relative"
              >
                <img
                  src={value.dataUrl}
                  alt={value.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Eye className="w-3.5 h-3.5 text-white" />
                </div>
              </div>
            ) : (
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                <FileText className="w-5 h-5" />
              </div>
            )}

            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-800 truncate">{value.name}</p>
              <p className="text-[11px] text-slate-400">
                {(value.size / (1024 * 1024)).toFixed(2)} MB • {value.type.split('/')[1]?.toUpperCase() || 'FILE'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {value.type.startsWith('image/') && (
              <button
                type="button"
                onClick={() => setShowPreviewModal(true)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                title="ดูตัวอย่างภาพ"
              >
                <Eye className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={handleRemove}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="ลบไฟล์"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/30 rounded-2xl p-4 text-center cursor-pointer transition-all group"
        >
          <div className="flex flex-col items-center justify-center gap-1">
            <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-emerald-100 text-slate-500 group-hover:text-emerald-600 flex items-center justify-center transition-colors">
              <Upload className="w-4 h-4" />
            </div>
            <p className="text-xs font-medium text-slate-700 group-hover:text-emerald-700">
              คลิกเพื่อเลือกไฟล์ หรือ ลากไฟล์มาวาง
            </p>
            <p className="text-[11px] text-slate-400">{helperText}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 px-2.5 py-1.5 rounded-lg">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Image Preview Modal */}
      {showPreviewModal && value?.dataUrl && (
        <div
          className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4"
          onClick={() => setShowPreviewModal(false)}
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-in slide-in-from-bottom-6 sm:zoom-in-95 fade-in duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-3.5 border-b border-slate-100">
              <h4 className="text-sm font-semibold text-slate-800 truncate">{value.name}</h4>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3 bg-slate-900 flex items-center justify-center max-h-[70vh] overflow-auto">
              <img
                src={value.dataUrl}
                alt={value.name}
                className="max-w-full max-h-[65vh] object-contain rounded-lg"
              />
            </div>
            <div className="p-3 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
              <span>ขนาด: {(value.size / (1024 * 1024)).toFixed(2)} MB</span>
              <span>อัปโหลดเมื่อ: {new Date(value.uploadedAt).toLocaleTimeString('th-TH')}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
