'use client';

import React, { RefObject } from 'react';
import { Camera, Upload, X, Shield, AlertTriangle } from 'lucide-react';

interface ProofUploadProps {
  proofImage: string | null;
  submitError: string | null;
  elapsedSeconds: number;
  elapsedMinutes: number;
  fileInputRef: RefObject<HTMLInputElement | null>;
  formatTime: (seconds: number) => string;
  onImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: () => void;
  onValidate: () => void;
  onBack: () => void;
}

/**
 * ProofUpload component handles the image upload and preview for commitment proof
 */
export const ProofUpload: React.FC<ProofUploadProps> = ({
  proofImage,
  submitError,
  elapsedSeconds,
  elapsedMinutes,
  fileInputRef,
  formatTime,
  onImageSelect,
  onRemoveImage,
  onValidate,
  onBack,
}) => {
  return (
    <div className="p-8 border bg-white/5 backdrop-blur-xl border-white/10 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-[#00FFA3]/10 rounded-lg">
          <Camera className="w-6 h-6 text-[#00FFA3]" />
        </div>
        <h2 className="text-2xl font-bold text-white font-playfair">Upload Proof</h2>
      </div>
      <p className="mb-8 text-sm text-white/40">
        Upload a screenshot or photo showing your activity. Timer: <span className="text-[#00FFA3] font-semibold">{formatTime(elapsedSeconds)}</span> ({elapsedMinutes} min)
      </p>

      {submitError && (
        <div className="flex items-center gap-3 p-4 mb-6 text-sm text-red-300 border rounded-xl bg-red-500/10 border-red-500/20 animate-in fade-in slide-in-from-top-2">
          <AlertTriangle className="w-5 h-5 shrink-0 text-red-400" /> {submitError}
        </div>
      )}

      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        accept="image/*" 
        onChange={onImageSelect} 
        className="hidden" 
      />

      {/* Upload Dropzone / Preview */}
      {!proofImage ? (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center justify-center w-full gap-4 py-20 transition-all border-2 border-dashed rounded-2xl border-white/10 hover:border-[#00FFA3]/50 hover:bg-[#00FFA3]/5 group bg-black/20"
        >
          <div className="p-4 bg-white/5 rounded-full group-hover:scale-110 transition-transform duration-300">
            <Upload className="w-10 h-10 text-white/30 group-hover:text-[#00FFA3] transition-colors" />
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-white/70 group-hover:text-white">Click to upload proof</p>
            <p className="text-sm text-white/30 mt-1">JPG, PNG • Max 5MB</p>
          </div>
        </button>
      ) : (
        <div className="relative group">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40">
            <img 
              src={proofImage} 
              alt="Proof Preview" 
              className="w-full max-h-[400px] object-contain mx-auto transition-transform duration-500 group-hover:scale-[1.02]" 
            />
          </div>
          <button
            onClick={onRemoveImage}
            className="absolute p-2 transition-all bg-black/60 backdrop-blur-md rounded-full top-4 right-4 hover:bg-red-500 hover:scale-110 border border-white/10"
            title="Remove image"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 mt-10">
        <button
          onClick={onBack}
          className="px-8 py-3 font-semibold text-white/60 transition-all border border-white/10 rounded-full hover:text-white hover:bg-white/5 hover:border-white/20 order-2 sm:order-1"
        >
          ← Back to Timer
        </button>
        {proofImage && (
          <button
            onClick={onValidate}
            className="flex items-center justify-center gap-2 px-10 py-3 font-bold text-black uppercase bg-[#00FFA3] rounded-full hover:bg-[#00FFA3]/90 transition-all hover:scale-105 shadow-[0_0_20px_rgba(0,255,163,0.3)] order-1 sm:order-2 flex-1"
          >
            <Shield className="w-5 h-5" /> Validate with AI
          </button>
        )}
      </div>
    </div>
  );
};
