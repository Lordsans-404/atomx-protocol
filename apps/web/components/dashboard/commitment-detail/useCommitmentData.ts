import { useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import idl from '@/lib/idl.json';

export function useCommitmentData(pda: string) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [commitment, setCommitment] = useState<any>(null);
  const [title, setTitle] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!wallet.publicKey || !pda) return;
      try {
        setLoading(true);
        const provider = new AnchorProvider(connection, wallet as any, { preflightCommitment: 'confirmed' });
        const program = new Program(idl as any, provider);
        const account = await (program.account as any).commitmentAccount.fetch(new PublicKey(pda));
        setCommitment(account);

        const res = await fetch(`/api/commitments?owner=${wallet.publicKey.toBase58()}`);
        if (res.ok) {
          const metadataMap = await res.json();
          const metadata = metadataMap[pda] || {};
          setTitle(metadata.title || `Commitment #${pda.substring(0, 6)}`);
          setCategory(metadata.category || 'Other');
          setDescription(metadata.description || '');
        }
      } catch (err) {
        console.error('Error fetching commitment:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [connection, wallet.publicKey, pda]);

  return { commitment, title, category, description, loading, connection, wallet };
}
