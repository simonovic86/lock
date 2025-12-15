'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { decodeBackupFromHash } from '@/lib/share';
import { saveVaultRef, getAllVaultRefs, VaultRef } from '@/lib/storage';

type State = 'loading' | 'preview' | 'restoring' | 'done' | 'error';

export default function RestorePage() {
  const router = useRouter();
  const [state, setState] = useState<State>('loading');
  const [vaultsToRestore, setVaultsToRestore] = useState<VaultRef[]>([]);
  const [existingCount, setExistingCount] = useState(0);
  const [newCount, setNewCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBackup = async () => {
      const hash = window.location.hash;
      const backupVaults = decodeBackupFromHash(hash);

      if (!backupVaults || backupVaults.length === 0) {
        setError('Invalid or empty backup link.');
        setState('error');
        return;
      }

      // Check which vaults already exist
      const existingVaults = await getAllVaultRefs();
      const existingIds = new Set(existingVaults.map((v) => v.id));

      const newVaults = backupVaults.filter((v) => !existingIds.has(v.id));
      const existingInBackup = backupVaults.length - newVaults.length;

      setVaultsToRestore(backupVaults);
      setNewCount(newVaults.length);
      setExistingCount(existingInBackup);
      setState('preview');
    };

    loadBackup();
  }, []);

  const handleRestore = async () => {
    setState('restoring');

    try {
      // Get existing vault IDs
      const existingVaults = await getAllVaultRefs();
      const existingIds = new Set(existingVaults.map((v) => v.id));

      // Only save new vaults
      for (const vault of vaultsToRestore) {
        if (!existingIds.has(vault.id)) {
          await saveVaultRef(vault);
        }
      }

      setState('done');
    } catch (err) {
      console.error('Restore error:', err);
      setError('Failed to restore vaults. Please try again.');
      setState('error');
    }
  };

  // Loading
  if (state === 'loading') {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-zinc-400 border-t-transparent rounded-full" />
      </main>
    );
  }

  // Error
  if (state === 'error') {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="card max-w-lg mx-auto p-6 text-center animate-fade-in">
          <div className="icon-container-lg mx-auto mb-4">
            <svg className="w-8 h-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-zinc-100 mb-2">Restore Failed</h1>
          <p className="text-sm text-zinc-500 mb-6">{error}</p>
          <Link
            href="/"
            className="btn-secondary inline-flex px-6"
          >
            Go Home
          </Link>
        </div>
      </main>
    );
  }

  // Preview
  if (state === 'preview') {
    return (
      <main className="min-h-screen py-12 px-4">
        <div className="card max-w-lg mx-auto p-6 animate-fade-in">
          <div className="flex items-center gap-3 mb-6">
            <div className="icon-container-md">
              <svg className="w-6 h-6 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-zinc-100">Restore Vaults</h1>
              <p className="text-sm text-zinc-500">From backup link</p>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <div className="card-inner p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">Total in backup</span>
                <span className="text-sm font-medium text-zinc-100">{vaultsToRestore.length}</span>
              </div>
            </div>

            {newCount > 0 && (
              <div className="card-inner p-4 bg-zinc-800/80 border-zinc-700/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-300">New vaults to add</span>
                  <span className="text-sm font-medium text-zinc-100">{newCount}</span>
                </div>
              </div>
            )}

            {existingCount > 0 && (
              <div className="card-inner p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-500">Already exist (skipped)</span>
                  <span className="text-sm font-medium text-zinc-500">{existingCount}</span>
                </div>
              </div>
            )}
          </div>

          {newCount > 0 ? (
            <button
              onClick={handleRestore}
              className="btn-primary w-full"
            >
              Restore {newCount} Vault{newCount !== 1 ? 's' : ''}
            </button>
          ) : (
            <div className="text-center">
              <p className="text-sm text-zinc-400 mb-4">All vaults already exist on this device.</p>
              <Link
                href="/"
                className="btn-secondary inline-flex px-6"
              >
                Go to Vaults
              </Link>
            </div>
          )}
        </div>
      </main>
    );
  }

  // Restoring
  if (state === 'restoring') {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="card max-w-lg mx-auto p-6 text-center">
          <div className="animate-spin w-12 h-12 border-2 border-zinc-400 border-t-transparent rounded-full mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-zinc-100 mb-2">Restoring Vaults</h2>
          <p className="text-sm text-zinc-400">Please wait...</p>
        </div>
      </main>
    );
  }

  // Done
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="card max-w-lg mx-auto p-6 text-center animate-fade-in">
        <div className="icon-container-lg mx-auto mb-4">
          <svg className="w-8 h-8 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-zinc-100 mb-2">Restore Complete!</h1>
        <p className="text-sm text-zinc-400 mb-6">
          {newCount} vault{newCount !== 1 ? 's' : ''} restored successfully.
        </p>
        <button
          onClick={() => router.push('/')}
          className="btn-primary w-full"
        >
          View Your Vaults
        </button>
      </div>
    </main>
  );
}
