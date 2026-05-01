'use client';

import { useState } from 'react';

export default function TestAIPage() {
  const [image, setImage] = useState<string | null>(null);
  const [targetMinutes, setTargetMinutes] = useState(30);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!image) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/validate-proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image, targetMinutes }),
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to validate');

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-8 font-sans">
      <div className="max-w-2xl mx-auto space-y-8">
        <header className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
            Atomx AI Auditor
          </h1>
          <p className="text-gray-400 text-lg">Test Sprint 5: Gemini 1.5 Flash Validation</p>
        </header>

        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Daily Target (Minutes)</label>
            <input
              type="number"
              value={targetMinutes}
              onChange={(e) => setTargetMinutes(parseInt(e.target.value))}
              className="w-full bg-black border border-zinc-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Proof Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700 cursor-pointer"
            />
          </div>

          {image && (
            <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-zinc-700">
              <img src={image} alt="Preview" className="object-cover w-full h-full" />
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={!image || loading}
            className={`w-full py-4 rounded-xl font-bold transition-all ${loading ? 'bg-zinc-800 text-gray-500 cursor-not-allowed' : 'bg-white text-black hover:bg-purple-500 hover:text-white'
              }`}
          >
            {loading ? 'Analyzing with Groq...' : 'Validate Proof'}
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-900/20 border border-red-900/50 text-red-400 rounded-xl text-sm">
            Error: {error}
          </div>
        )}

        {result && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-bold">Audit Result</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
                <p className="text-gray-500 text-xs uppercase font-bold tracking-widest">Valid Status</p>
                <p className={`text-xl font-bold ${result.aiResult.isValid ? 'text-green-400' : 'text-red-400'}`}>
                  {result.aiResult.isValid ? 'VALID' : 'INVALID'}
                </p>
              </div>
              <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
                <p className="text-gray-500 text-xs uppercase font-bold tracking-widest">Extracted Minutes</p>
                <p className="text-xl font-bold text-blue-400">{result.aiResult.minutes} Min</p>
              </div>
            </div>

            <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-1">
              <p className="text-gray-500 text-xs uppercase font-bold tracking-widest">Activity & Reason</p>
              <p className="font-semibold text-purple-300">{result.aiResult.activity}</p>
              <p className="text-sm text-gray-400 italic">"{result.aiResult.reason}"</p>
            </div>

            <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
              <p className="text-gray-500 text-xs uppercase font-bold tracking-widest mb-2">On-Chain Proof Hash (SHA-256)</p>
              <div className="flex flex-wrap gap-1">
                {result.proofHash.slice(0, 16).map((b: number, i: number) => (
                  <span key={i} className="bg-black px-1.5 py-0.5 rounded text-[10px] font-mono border border-zinc-800">
                    {b.toString(16).padStart(2, '0')}
                  </span>
                ))}
                <span>...</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
