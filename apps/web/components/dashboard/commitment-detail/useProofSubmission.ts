import { useState, useRef } from 'react';
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import idl from '@/lib/idl.json';

export interface AIResult {
  isValid: boolean;
  confidenceScore: number;
  minutes: number;
  activity: string;
  relevance: string;
  reason: string;
}

export function useProofSubmission(
  pda: string, 
  commitment: any, 
  title: string, 
  category: string, 
  description: string,
  targetMinutes: number,
  minimumMinutes: number,
  elapsedMinutes: number,
  connection: any,
  wallet: any,
  onSuccess: () => void
) {
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [proofHash, setProofHash] = useState<number[]>([]);
  const [actualMinutes, setActualMinutes] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setSubmitError('File too large. Maximum size is 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setProofImage(reader.result as string);
      setSubmitError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleValidateProof = async (onValidating: () => void, onResult: () => void, onUploadError: () => void) => {
    if (!proofImage) return;

    if (elapsedMinutes < minimumMinutes) {
      setSubmitError(`Timer duration insufficient (${elapsedMinutes}/${minimumMinutes} min). Go back and continue.`);
      return;
    }

    onValidating();
    setSubmitError(null);

    try {
      const res = await fetch('/api/validate-proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: proofImage,
          targetMinutes,
          elapsedMinutes,
          commitmentTitle: title,
          commitmentCategory: category,
          commitmentDescription: description,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setAiResult(data.aiResult);
        setProofHash(data.proofHash);
        setActualMinutes(data.actualMinutes);
        onResult();
      } else {
        setSubmitError(data.error || 'AI validation failed');
        onUploadError();
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Validation request failed');
      onUploadError();
    }
  };

  const handleSubmitOnChain = async () => {
    if (!wallet.publicKey || !commitment || !aiResult) return;

    if (!aiResult.isValid) {
      setSubmitError('Invalid proof. Please upload a matching activity proof.');
      return;
    }
    if (elapsedMinutes < minimumMinutes) {
      setSubmitError('Timer duration does not meet minimum requirements.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const provider = new AnchorProvider(connection, wallet as any, { preflightCommitment: 'confirmed' });
      const program = new Program(idl as any, provider);

      const nextDay = (commitment.currentDay || 0) + 1;

      const [proofRecordPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('proof'),
          new PublicKey(pda).toBuffer(),
          new BN(nextDay).toArrayLike(Buffer, 'le', 2),
        ],
        program.programId
      );

      const tx = await program.methods
        .submitProof(nextDay, proofHash, actualMinutes)
        .accounts({
          user: wallet.publicKey,
          commitment: new PublicKey(pda),
          proofRecord: proofRecordPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc({ commitment: 'confirmed' });

      // Sync transaction signature via webhook
      fetch('/api/webhooks/helius', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature: tx }),
      }).catch(err => console.error('Webhook sync failed:', err));

      setSubmitSuccess(true);
      onSuccess();
    } catch (err: any) {
      console.error('Submit proof error:', err);
      setSubmitError(err.message || 'Failed to submit proof to the blockchain');
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    proofImage,
    setProofImage,
    aiResult,
    setAiResult,
    isSubmitting,
    submitError,
    setSubmitError,
    submitSuccess,
    fileInputRef,
    handleImageSelect,
    handleValidateProof,
    handleSubmitOnChain
  };
}
