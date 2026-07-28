'use client';

import type { AssetItem, ImageAsset } from '@/lib/asset-store';

const WORKSPACE_KEY = 'ggoo-workspace-id';

function getWorkspaceId(): string {
  if (typeof window === 'undefined') return '';
  const existing = window.localStorage.getItem(WORKSPACE_KEY);
  if (existing) return existing;
  const value = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? `workspace-${crypto.randomUUID()}`
    : `workspace-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  window.localStorage.setItem(WORKSPACE_KEY, value);
  return value;
}

function dataUrlFromBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('素材读取失败'));
    reader.readAsDataURL(blob);
  });
}

function headers(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'X-GGOO-Workspace-Id': getWorkspaceId(),
  };
}

export async function syncGgooAsset(asset: AssetItem, blob?: Blob | null): Promise<void> {
  if (typeof window === 'undefined') return;
  const dataUrl = asset.kind === 'text' || !blob ? undefined : await dataUrlFromBlob(blob);
  await fetch('/api/ggoo/assets', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      id: asset.id,
      kind: asset.kind === 'text' ? 'text' : 'image',
      metadata: asset,
      dataUrl,
    }),
  }).then(response => {
    if (!response.ok) throw new Error(`素材同步失败: ${response.status}`);
  });
}

export async function syncGgooAssetMetadata(asset: AssetItem): Promise<void> {
  if (typeof window === 'undefined') return;
  await fetch(`/api/ggoo/assets/${encodeURIComponent(asset.id)}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({ metadata: asset }),
  }).then(response => {
    if (!response.ok) throw new Error(`素材信息同步失败: ${response.status}`);
  });
}

export async function deleteGgooAsset(assetId: string): Promise<void> {
  if (typeof window === 'undefined') return;
  await fetch(`/api/ggoo/assets/${encodeURIComponent(assetId)}`, {
    method: 'DELETE',
    headers: headers(),
  }).then(response => {
    if (!response.ok && response.status !== 404) throw new Error(`素材删除同步失败: ${response.status}`);
  });
}

export async function migrateGgooImageAsset(asset: ImageAsset, blob: Blob | null): Promise<void> {
  await syncGgooAsset(asset, blob);
}
