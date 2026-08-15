'use client';

import { useEffect, useMemo, useState } from 'react';

type ReviewStatus = 'draft' | 'pending' | 'published' | 'rejected' | 'archived';
type PromptCase = {
  id: string;
  title: string;
  content: string;
  images?: string[];
  category?: string;
  recommendedScene?: string;
  recommendedRatio?: string;
  reviewStatus?: ReviewStatus;
};

const statusLabels: Record<ReviewStatus, string> = {
  draft: '草稿',
  pending: '待审核',
  published: '已上架',
  rejected: '已退回',
  archived: '已归档',
};

export default function PromptLibraryAdminPage() {
  const [password, setPassword] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [cases, setCases] = useState<PromptCase[]>([]);
  const [status, setStatus] = useState<ReviewStatus | 'all'>('pending');
  const [error, setError] = useState('');

  const loadCases = async () => {
    const response = await fetch('/api/ggoo/admin/prompt-gallery', { cache: 'no-store' });
    if (!response.ok) throw new Error('后台会话已失效');
    const data = await response.json();
    setCases(Array.isArray(data.cases) ? data.cases : []);
    setLoggedIn(true);
  };

  useEffect(() => {
    let active = true;
    fetch('/api/ggoo/admin/prompt-gallery', { cache: 'no-store' })
      .then(response => {
        if (!response.ok) throw new Error('后台会话已失效');
        return response.json();
      })
      .then(data => {
        if (!active) return;
        setCases(Array.isArray(data.cases) ? data.cases : []);
        setLoggedIn(true);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  const visibleCases = useMemo(
    () => status === 'all' ? cases : cases.filter(item => (item.reviewStatus || 'pending') === status),
    [cases, status],
  );

  const login = async () => {
    setError('');
    const response = await fetch('/api/ggoo/admin/prompt-gallery/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (!response.ok) {
      setError((await response.json().catch(() => null))?.error || '登录失败');
      return;
    }
    setPassword('');
    await loadCases();
  };

  const updateStatus = async (id: string, reviewStatus: ReviewStatus) => {
    const response = await fetch(`/api/ggoo/admin/prompt-gallery/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewStatus }),
    });
    if (!response.ok) {
      setError('更新审核状态失败');
      return;
    }
    const data = await response.json();
    setCases(current => current.map(item => item.id === id ? data.case : item));
  };

  const logout = async () => {
    await fetch('/api/ggoo/admin/prompt-gallery/logout', { method: 'POST' });
    setLoggedIn(false);
    setCases([]);
  };

  if (!loggedIn) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <form className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm" onSubmit={event => { event.preventDefault(); void login(); }}>
          <div>
            <h1 className="text-xl font-semibold">内容审核后台</h1>
            <p className="mt-1 text-sm text-muted-foreground">请输入管理员密码</p>
          </div>
          <input className="w-full rounded-lg border border-border bg-background px-3 py-2" type="password" value={password} onChange={event => setPassword(event.target.value)} autoFocus />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button className="w-full rounded-lg bg-primary px-4 py-2 text-primary-foreground" type="submit">登录审核后台</button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">提示词内容审核</h1>
            <p className="mt-1 text-sm text-muted-foreground">审核通过的内容才会出现在 GGOO 模板库。</p>
          </div>
          <div className="flex items-center gap-2">
            <select className="rounded-lg border border-border bg-card px-3 py-2 text-sm" value={status} onChange={event => setStatus(event.target.value as ReviewStatus | 'all')}>
              <option value="pending">待审核</option>
              <option value="published">已上架</option>
              <option value="rejected">已退回</option>
              <option value="archived">已归档</option>
              <option value="all">全部内容</option>
            </select>
            <button className="rounded-md border border-border px-3 py-2 text-sm" onClick={() => void logout()}>退出</button>
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {visibleCases.map(item => (
            <article key={item.id} className="overflow-hidden rounded-xl border border-border bg-card">
              {item.images?.[0] && <img className="aspect-square w-full object-cover" src={item.images[0]} alt={item.title} />}
              <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-medium">{item.title}</h2>
                  <span className="shrink-0 text-xs text-muted-foreground">{statusLabels[item.reviewStatus || 'pending']}</span>
                </div>
                <p className="line-clamp-5 whitespace-pre-wrap text-xs leading-5 text-muted-foreground">{item.content}</p>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {item.category && <span>{item.category}</span>}
                  {item.recommendedScene && <span>{item.recommendedScene}</span>}
                  {item.recommendedRatio && <span>{item.recommendedRatio}</span>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground" onClick={() => void updateStatus(item.id, 'published')}>上架</button>
                  <button className="rounded-md border border-border px-3 py-1.5 text-xs" onClick={() => void updateStatus(item.id, 'rejected')}>退回</button>
                  <button className="rounded-md border border-border px-3 py-1.5 text-xs" onClick={() => void updateStatus(item.id, 'archived')}>归档</button>
                </div>
              </div>
            </article>
          ))}
        </div>
        {visibleCases.length === 0 && <div className="py-20 text-center text-muted-foreground">当前筛选没有内容</div>}
      </div>
    </main>
  );
}
