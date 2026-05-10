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
    <div className="w-full flex flex-col items-center justify-center">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Camera className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground font-headline-card">Upload Proof</h2>
      </div>
      <p className="mb-8 text-sm text-muted-foreground text-center">
        Upload a screenshot or photo showing your activity. Timer: <span className="text-primary font-semibold">{formatTime(elapsedSeconds)}</span> ({elapsedMinutes} min)
      </p>

      {submitError && (
        <div className="w-full max-w-md flex items-center gap-3 p-4 mb-6 text-sm text-error bg-error/10 border border-error/20 rounded-xl justify-center animate-in fade-in slide-in-from-top-2">
          <AlertTriangle className="w-5 h-5 shrink-0" /> {submitError}
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
          className="flex flex-col items-center justify-center w-full max-w-md gap-4 py-20 transition-all border-2 border-dashed rounded-2xl border-white/10 hover:border-primary/50 hover:bg-primary/5 group bg-card/40"
        >
          <div className="p-4 bg-white/5 rounded-full group-hover:scale-110 transition-transform duration-300">
            <Upload className="w-10 h-10 text-white/30 group-hover:text-primary transition-colors" />
          </div>
          <div className="text-center">
            <p className="text-lg font-headline-card text-white/70 group-hover:text-white">Click to upload proof</p>
            <p className="text-sm text-white/30 mt-1 font-body-main">JPG, PNG • Max 5MB</p>
          </div>
        </button>
      ) : (
        <div className="relative group w-full max-w-md">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40">
            <img 
              src={proofImage} 
              alt="Proof Preview" 
              className="w-full max-h-[400px] object-contain mx-auto transition-transform duration-500 group-hover:scale-[1.02]" 
            />
          </div>
          <button
            onClick={onRemoveImage}
            className="absolute p-2 transition-all bg-black/60 backdrop-blur-md rounded-full top-4 right-4 hover:bg-error hover:scale-110 border border-white/10"
            title="Remove image"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 mt-10 w-full max-w-md">
        <button
          onClick={onBack}
          className="px-8 py-4 font-headline-card text-lg text-muted-foreground transition-all border border-white/10 rounded-xl hover:text-foreground hover:bg-white/5 order-2 sm:order-1 flex-1 flex items-center justify-center"
        >
          ← Back
        </button>
        {proofImage && (
          <button
            onClick={onValidate}
            className="flex items-center justify-center gap-2 px-8 py-4 font-headline-card text-lg text-on-primary bg-primary rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(78,222,163,0.3)] order-1 sm:order-2 flex-1"
          >
            <Shield className="w-5 h-5" /> Validate
          </button>
        )}
      </div>
    </div>
  );
};
