'use client';

import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { useEffect, useState, useCallback } from 'react';

import idl from '@/lib/idl.json';

const PROGRAM_ID = new PublicKey('Ce91ZMFHzkcRPN64R9PXi5nsj3Ha6nkgHkJGcQW9Mnfg');

export interface CommitmentData {
  publicKey: string;
  owner: string;
  commitmentId: number[];
  title: string;
  category: string;
  description: string;
  stakeAmount: number;
  remainingStake: number;
  durationDays: number;
  dailyTargetMinutes: number;
  currentDay: number;
  failedCount: number;
  earlyFinishCount: number;
  proofCount: number;
  status: string;
  isRedemption: boolean;
  createdAt: number;
  // Computed deadline fields
  expectedDay: number;
  missedDays: number;
  isOverdue: boolean;
}

export function useCommitments() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [commitments, setCommitments] = useState<CommitmentData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchCommitments = useCallback(async () => {
    if (!wallet.publicKey) return;

    try {
      setIsLoading(true);

      // Fetch on-chain data and Supabase titles in parallel
      const provider = new AnchorProvider(connection, wallet as any, {
        preflightCommitment: 'confirmed',
      });
      const program = new Program(idl as any, provider);

      const [accounts, titleMap] = await Promise.all([
        // On-chain: all CommitmentAccount PDAs owned by this user
        (program.account as any).commitmentAccount.all([
          {
            memcmp: {
              offset: 8, // After 8-byte discriminator
              bytes: wallet.publicKey.toBase58(),
            },
          },
        ]),
        // Off-chain: metadata from Supabase
        fetch(`/api/commitments?owner=${wallet.publicKey.toBase58()}`)
          .then(res => res.ok ? res.json() : {})
          .catch(() => ({})) as Promise<Record<string, any>>,
      ]);

      const parsed: CommitmentData[] = accounts.map((acc: any) => {
        const data = acc.account as any;
        const pda = acc.publicKey.toBase58();

        // Parse the status enum
        let status = 'unknown';
        if (data.status.active !== undefined) status = 'active';
        else if (data.status.completed !== undefined) status = 'completed';
        else if (data.status.failed !== undefined) status = 'failed';
        else if (data.status.slashed !== undefined) status = 'slashed';

        const createdAt = data.createdAt.toNumber();
        const nowUnix = Math.floor(Date.now() / 1000);
        const daysSinceCreation = Math.floor((nowUnix - createdAt) / 86400);
        const expectedDay = Math.min(daysSinceCreation, data.durationDays);
        const missedDays = Math.max(0, expectedDay - data.currentDay);

        const metadata = titleMap[pda] || {};
        return {
          publicKey: pda,
          owner: data.owner.toBase58(),
          commitmentId: Array.from(data.commitmentId),
          title: metadata.title || `Commitment #${pda.substring(0, 6)}`,
          category: metadata.category || 'Other',
          description: metadata.description || '',
          stakeAmount: data.stakeAmount.toNumber() / 1e6,
          remainingStake: data.remainingStake.toNumber() / 1e6,
          durationDays: data.durationDays,
          dailyTargetMinutes: data.dailyTargetMinutes,
          currentDay: data.currentDay,
          failedCount: data.failedCount,
          earlyFinishCount: data.earlyFinishCount,
          proofCount: data.proofCount,
          status,
          isRedemption: data.isRedemption,
          createdAt,
          expectedDay,
          missedDays,
          isOverdue: status === 'active' && missedDays > 0,
        };
      });

      setCommitments(parsed);
    } catch (err) {
      console.error('Error fetching commitments:', err);
    } finally {
      setIsLoading(false);
    }
  }, [connection, wallet.publicKey]);

  useEffect(() => {
    fetchCommitments();
  }, [fetchCommitments]);

  return { commitments, isLoading, refetch: fetchCommitments };
}
