'use client';

import React from 'react';
import { invoke } from '@tauri-apps/api/core';

const INSTAGRAM_HANDLE = '@joaobustamante.ia';
const INSTAGRAM_URL = 'https://instagram.com/joaobustamante.ia';

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
    </svg>
  );
}

interface BrandFooterProps {
  className?: string;
}

/** Assinatura do autor: link para o Instagram, aberto no navegador padrão. */
export function BrandFooter({ className = '' }: BrandFooterProps) {
  const open = async () => {
    try {
      await invoke('open_external_url', { url: INSTAGRAM_URL });
    } catch (error) {
      console.error('Failed to open link:', error);
    }
  };

  return (
    <button
      type="button"
      onClick={open}
      className={`group flex w-full items-center justify-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${className}`}
      aria-label={`Instagram ${INSTAGRAM_HANDLE}`}
    >
      <InstagramIcon className="h-3.5 w-3.5" />
      <span>{INSTAGRAM_HANDLE}</span>
    </button>
  );
}

export default BrandFooter;
