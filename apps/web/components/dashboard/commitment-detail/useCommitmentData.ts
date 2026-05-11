import { useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import idl from '@/lib/idl.json';

export function useCommitmentData(pda: string) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [commitment, setCommitment] = useState<any>(null);
  const [lastProof, setLastProof] = useState<any>(null);
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
        const commitmentPubkey = new PublicKey(pda);
        
        const account = await (program.account as any).commitmentAccount.fetch(commitmentPubkey);
        setCommitment(account);

        // Fetch last proof if any days completed
        if (account.currentDay > 0) {
          try {
            const dayBuffer = Buffer.alloc(2);
            dayBuffer.writeUInt16LE(account.currentDay);
            const [proofPda] = PublicKey.findProgramAddressSync(
              [Buffer.from('proof'), commitmentPubkey.toBuffer(), dayBuffer],
              new PublicKey('3nrc4dPYdhztn9d82QmrznATBbYEi9hhvRyx6AnHVGk9') // atomx program id
            );
            const proofRecord = await (program.account as any).proofRecord.fetch(proofPda);
            setLastProof(proofRecord);
          } catch (e) {
            console.warn('Could not fetch last proof record:', e);
          }
        }

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

  return { commitment, lastProof, title, category, description, loading, connection, wallet };
}
