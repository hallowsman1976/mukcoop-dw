import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Eraser, CheckCircle2, AlertCircle, PenTool } from 'lucide-react';
import { DigitalSignature } from '../types';

interface SignaturePadProps {
  label: string;
  role: 'owner' | 'recipient';
  signerName: string;
  onSave: (sig: DigitalSignature | null) => void;
  required?: boolean;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  label,
  role,
  signerName,
  onSave,
  required = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set high resolution for retina displays
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a'; // slate-900
    ctx.lineWidth = 2.5;
  }, []);

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDrawing(true);
    const coords = getCanvasCoords(e);
    setLastPoint(coords);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !lastPoint) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentPoint = getCanvasCoords(e);

    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    ctx.lineTo(currentPoint.x, currentPoint.y);
    ctx.stroke();

    setLastPoint(currentPoint);
    setHasDrawn(true);
  };

  const endDrawing = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);
    setLastPoint(null);

    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;

    const dataUrl = canvas.toDataURL('image/png');
    onSave({
      dataUrl,
      signedAt: new Date().toISOString(),
      signerName: signerName || (role === 'owner' ? 'เจ้าของบัญชี' : 'ผู้รับเงิน'),
      signerRole: role,
    });
  }, [isDrawing, hasDrawn, onSave, signerName, role]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    onSave(null);
  };

  return (
    <div className="border border-slate-200 rounded-2xl p-3.5 bg-white shadow-2xs">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <PenTool className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-semibold text-slate-800">{label}</span>
          {required && <span className="text-rose-500 text-xs">*</span>}
        </div>
        <div className="flex items-center gap-2">
          {hasDrawn ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              <CheckCircle2 className="w-3 h-3" /> เซ็นเรียบร้อย
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              <AlertCircle className="w-3 h-3" /> รอการลงนาม
            </span>
          )}
          <button
            type="button"
            onClick={clearCanvas}
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-rose-600 px-2.5 py-1 rounded-full border border-slate-200 hover:bg-rose-50 transition-colors"
          >
            <Eraser className="w-3 h-3" /> ล้าง
          </button>
        </div>
      </div>

      <div className="relative border-2 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50 hover:bg-white transition-colors">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={endDrawing}
          onMouseLeave={endDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={endDrawing}
          className="w-full h-32 touch-none cursor-crosshair block"
        />
        {!hasDrawn && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-300 text-xs select-none">
            ลงลายมือชื่อที่นี่ (ใช้นิ้วหรือเมาส์)
          </div>
        )}
      </div>

      <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
        <span>ลงชื่อ: {signerName || (role === 'owner' ? 'เจ้าของบัญชี' : 'ผู้รับเงิน')}</span>
        <span>ระบบบันทึกภาพดิจิทัลพร้อมตราประทับเวลา</span>
      </div>
    </div>
  );
};
