'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { VaultCountdown } from '@/components/VaultCountdown';
import { getVaultRef, deleteVaultRef, VaultRef } from '@/lib/storage';
import { fromBase64 } from '@/lib/encoding';
import { initLit, decryptKey, isUnlockable } from '@/lib/lit';
import { importKey, decryptToString } from '@/lib/crypto';
import { decodeVaultFromHash } from '@/lib/share';
import { useToast } from '@/components/Toast';
import { QRCodeModal } from '@/components/QRCode';
import { ConfirmModal } from '@/components/ConfirmModal';
import { getFriendlyError } from '@/lib/errors';
import { getShareableUrl } from '@/lib/share';

type State = 'loading' | 'not_found' | 'locked' | 'ready' | 'unlocking' | 'unlocked' | 'destroyed' | 'error';

export default function VaultPage() {
  const params = useParams();
  const id = params.id as string;
  const [state, setState] = useState<State>('loading');
  const [vault, setVault] = useState<VaultRef | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState('');
  const [decryptedSecret, setDecryptedSecret] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [showDestroyConfirm, setShowDestroyConfirm] = useState(false);
  const { showToast, ToastComponent } = useToast();

  useEffect(() => {
    const loadVault = async () => {
      // First try localStorage
      const localVault = await getVaultRef(id);
      if (localVault) {
        setVault(localVault);
        setState(isUnlockable(localVault.unlockTime) ? 'ready' : 'locked');
        return;
      }

      // Then try URL hash (shared link)
      const hash = window.location.hash;
      const sharedVault = decodeVaultFromHash(hash, id);
      if (sharedVault) {
        setVault(sharedVault);
        setState(isUnlockable(sharedVault.unlockTime) ? 'ready' : 'locked');
        return;
      }

      // Not found anywhere
      setState('not_found');
    };

    loadVault();
  }, [id]);

  // Security: Clear decrypted secret from memory on unmount
  useEffect(() => {
    return () => {
      setDecryptedSecret(null);
    };
  }, []);

  const handleUnlock = async () => {
    if (!vault) return;

    setState('unlocking');
    setError(null);

    try {
      // Connect to Lit
      setProgress('Connecting to Lit Network...');
      await initLit();

      // Get decryption key from Lit
      setProgress('Retrieving decryption key...');
      const rawKey = await decryptKey(
        vault.litEncryptedKey,
        vault.litKeyHash,
        vault.unlockTime,
      );

      // Load encrypted data from URL
      setProgress('Loading encrypted data...');
      const encryptedData = fromBase64(vault.inlineData);

      // Import key and decrypt
      setProgress('Decrypting...');
      const symmetricKey = await importKey(rawKey);
      const secret = await decryptToString(encryptedData, symmetricKey);

      setDecryptedSecret(secret);

      // Handle destroy after read
      if (vault.destroyAfterRead) {
        setProgress('Destroying vault...');
        
        // Delete from local storage (data in URL becomes inaccessible without the key)
        await deleteVaultRef(vault.id);
        
        setState('destroyed');
      } else {
        setState('unlocked');
      }
    } catch (err) {
      console.error('Unlock error:', err);
      const friendlyError = getFriendlyError(err instanceof Error ? err : new Error(String(err)));
      setError(friendlyError.message);
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

  // Not found
  if (state === 'not_found') {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="card max-w-lg mx-auto p-6 text-center">
          <div className="icon-container-lg mx-auto mb-4">
            <svg className="w-8 h-8 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-zinc-100 mb-2">Vault Not Found</h1>
          <p className="text-sm text-zinc-400 mb-6">
            This vault doesn&apos;t exist. Make sure you have the complete shareable link.
          </p>
          <Link href="/" className="btn-primary inline-flex px-6">
            Create a Vault
          </Link>
        </div>
      </main>
    );
  }

  // Error
  if (state === 'error') {
    return (
      <main className="min-h-screen py-12 px-4">
        <div className="max-w-lg mx-auto mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
        </div>
        <div className="card max-w-lg mx-auto p-6 text-center">
          <div className="icon-container-lg mx-auto mb-4">
            <svg className="w-8 h-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-zinc-100 mb-2">Unlock Failed</h1>
          <p className="text-sm text-zinc-500 mb-6">{error}</p>
          <button
            onClick={() => setState('ready')}
            className="btn-secondary px-6"
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  // Locked - show countdown
  if (state === 'locked' && vault) {
    return (
      <main className="min-h-screen py-12 px-4">
        <div className="max-w-lg mx-auto mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
        </div>
        <div className="card max-w-lg mx-auto p-6">
          <h2 className="text-xl font-semibold text-zinc-100 mb-2 text-center">
            Time-Locked Vault
          </h2>
          {vault.destroyAfterRead && (
            <p className="text-xs text-zinc-400 text-center mb-2">
              This vault will be destroyed after reading
            </p>
          )}
          <VaultCountdown
            unlockTime={vault.unlockTime}
            onUnlockReady={() => setState('ready')}
          />
          
          {/* No early access notice */}
          <div className="card-inner mt-6 p-3">
            <p className="text-xs text-zinc-500 text-center">
              No early access. No payment option. No support ticket.
              <br />
              <span className="text-zinc-400">Even we can&apos;t unlock it.</span>
            </p>
          </div>
          
          <div className="mt-4 pt-4 border-t border-zinc-800/50 flex justify-center">
            <button
              onClick={() => setShowQR(true)}
              className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              Share QR
            </button>
          </div>
        </div>
        <QRCodeModal
          url={getShareableUrl(vault)}
          isOpen={showQR}
          onClose={() => setShowQR(false)}
        />
      </main>
    );
  }

  // Ready to unlock
  if (state === 'ready' && vault) {
    const handleUnlockClick = () => {
      if (vault.destroyAfterRead) {
        setShowDestroyConfirm(true);
      } else {
        handleUnlock();
      }
    };

    return (
      <>
      <main className="min-h-screen py-12 px-4">
        <div className="max-w-lg mx-auto mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
        </div>
        <div className="card max-w-lg mx-auto p-6 text-center">
          <div className="icon-container-lg mx-auto mb-4">
            <svg className="w-8 h-8 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-zinc-100 mb-2">Ready to Unlock</h2>
          <p className="text-sm text-zinc-400 mb-6">
            This vault can now be opened. Click below to decrypt.
            {vault.destroyAfterRead && (
              <span className="block mt-2 text-zinc-500">
                This vault will be destroyed after reading
              </span>
            )}
          </p>
          <button
            onClick={handleUnlockClick}
            className="btn-primary w-full"
          >
            Unlock Vault
          </button>
          <button
            onClick={() => setShowQR(true)}
            className="btn-ghost w-full mt-3 flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            Share via QR
          </button>
        </div>
        <QRCodeModal
          url={getShareableUrl(vault)}
          isOpen={showQR}
          onClose={() => setShowQR(false)}
        />
      </main>
      <ConfirmModal
        isOpen={showDestroyConfirm}
        title="Destroy After Reading"
        message="This vault will be permanently destroyed after you view its contents. This action cannot be undone. Are you sure you want to continue?"
        confirmText="Unlock & Destroy"
        cancelText="Cancel"
        variant="warning"
        onConfirm={() => {
          setShowDestroyConfirm(false);
          handleUnlock();
        }}
        onCancel={() => setShowDestroyConfirm(false)}
      />
      </>
    );
  }

  // Unlocking
  if (state === 'unlocking') {
    return (
      <main className="min-h-screen py-12 px-4">
        <div className="card max-w-lg mx-auto p-6 text-center">
          <div className="animate-spin w-12 h-12 border-2 border-zinc-400 border-t-transparent rounded-full mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-zinc-100 mb-2">Unlocking Vault</h2>
          <p className="text-sm text-zinc-400">{progress}</p>
        </div>
      </main>
    );
  }

  // Destroyed (burn after reading)
  if (state === 'destroyed') {
    return (
      <>
      {ToastComponent}
      <main className="min-h-screen py-12 px-4">
        <div className="card max-w-lg mx-auto p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="icon-container-sm">
              <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">Vault Destroyed</h2>
              <p className="text-xs text-zinc-500">This secret cannot be accessed again</p>
            </div>
          </div>
          <div className="card-inner p-4">
            <p className="text-sm text-zinc-300 whitespace-pre-wrap break-words">{decryptedSecret}</p>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(decryptedSecret || '');
              showToast('Secret copied!');
            }}
            className="btn-primary w-full mt-6"
          >
            Copy Secret
          </button>
          <p className="mt-4 text-xs text-zinc-500 text-center">
            Save this secret now — it&apos;s gone forever after you leave this page.
          </p>
          <Link 
            href="/" 
            className="btn-secondary block mt-4 text-center"
          >
            Create New Vault
          </Link>
        </div>
      </main>
      </>
    );
  }

  // Unlocked
  return (
    <>
    {ToastComponent}
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-lg mx-auto mb-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Link>
      </div>
      <div className="card max-w-lg mx-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="icon-container-sm">
            <svg className="w-5 h-5 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">Vault Unlocked</h2>
            <p className="text-xs text-zinc-500">Decrypted successfully</p>
          </div>
        </div>
        <div className="card-inner p-4">
          <p className="text-sm text-zinc-300 whitespace-pre-wrap break-words">{decryptedSecret}</p>
        </div>
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => {
              navigator.clipboard.writeText(decryptedSecret || '');
              showToast('Secret copied!');
            }}
            className="btn-primary flex-1"
          >
            Copy Secret
          </button>
          <Link href="/" className="btn-secondary flex-1 text-center">
            Create Vault
          </Link>
        </div>
      </div>
      
      {/* Technology badges */}
      <div className="max-w-lg mx-auto mt-8 flex flex-wrap justify-center gap-2">
        <a
          href="https://litprotocol.com"
          target="_blank"
          rel="noopener noreferrer"
          className="tech-badge"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Lit Protocol
        </a>
      </div>
    </main>
    </>
  );
}
