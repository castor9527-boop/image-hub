'use client';

import { useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowRight, ImagePlus, WandSparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { assembleScenePrompt, type SceneAspectRatio, type SceneId, type ScenePromptMetadata } from '@/lib/scene-prompts';
import { getTemplateRecommendedRatio, SCENE_ASPECT_RATIOS } from '@/lib/scene-rules';
import { addImageAsset, updateImageAsset } from '@/lib/asset-store';
import type { RefImageData } from '@/lib/job-store';
import type { ReferenceRole } from '@/lib/scene-prompts';

function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn('rounded-2xl border border-border bg-card text-card-foreground shadow-sm', className)}>{children}</section>;
}

function PanelHeader({ children }: { children: ReactNode }) {
  return <div className="space-y-1.5 p-5">{children}</div>;
}

function PanelContent({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('p-5 pt-0', className)}>{children}</div>;
}

function PanelTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={cn('font-semibold tracking-tight', className)}>{children}</h2>;
}

function PanelDescription({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

type SceneDefinition = {
  id: SceneId;
  title: string;
  description: string;
  templates: string[];
  promptLead: string;
};

type TemplateCase = {
  id: string;
  sceneId: SceneId;
  name: string;
  description: string;
  style: string;
  kicker: string;
  title: string;
  meta: string;
};

type SceneReference = RefImageData & { role: ReferenceRole; description: string; assetId: string };

const REFERENCE_ROLES: Array<{ value: ReferenceRole; label: string }> = [
  { value: 'product', label: '商品图' },
  { value: 'logo', label: 'Logo' },
  { value: 'product-name', label: '产品名称图' },
  { value: 'promotion', label: '宣传图' },
  { value: 'scene', label: '场景图' },
  { value: 'specification', label: '参数图' },
];

const STYLE_OPTIONS_BY_SCENE: Record<SceneId, Array<{ id: string; label: string }>> = {
  promo: [
    { id: 'clean', label: '清晰商业' },
    { id: 'minimal', label: '极简留白' },
    { id: 'luxury', label: '高级质感' },
    { id: 'tech', label: '科技未来' },
  ],
  ecommerce: [
    { id: 'clean', label: '清透专业' },
    { id: 'minimal', label: '极简留白' },
    { id: 'luxury', label: '高级质感' },
    { id: 'tech', label: '科技感' },
  ],
  content: [
    { id: 'clean', label: '清晰易读' },
    { id: 'minimal', label: '极简留白' },
    { id: 'luxury', label: '杂志质感' },
    { id: 'tech', label: '年轻潮流' },
  ],
  template: [
    { id: 'clean', label: '清晰商业' },
    { id: 'minimal', label: '极简高级' },
    { id: 'luxury', label: '品牌编辑感' },
    { id: 'tech', label: '现代社媒' },
  ],
};

function getReferenceRoleLabel(role: ReferenceRole): string {
  return REFERENCE_ROLES.find(item => item.value === role)?.label || '商品图';
}

const SCENES: SceneDefinition[] = [
  {
    id: 'promo',
    title: '生成宣传海报',
    description: '门店活动、产品上新、节日促销',
    templates: ['周末门店活动', '新品上新海报', '节日限定主题', '直播间促销图', '社交媒体宣传图'],
    promptLead: '制作一张适合宣传传播的商业海报',
  },
  {
    id: 'ecommerce',
    title: '生成电商套图',
    description: '主图、场景图、卖点图一套规划',
    templates: ['清透商品主图', '生活方式场景', '卖点详情图', '使用场景图', '尺寸参数图', '对比效果图'],
    promptLead: '制作一组围绕商品展示和转化的电商视觉图片',
  },
  {
    id: 'content',
    title: '生成内容配图',
    description: '小红书、公众号、短视频封面',
    templates: ['内容平台封面'],
    promptLead: '制作一张适合移动端内容传播的配图',
  },
  {
    id: 'template',
    title: '从模板开始',
    description: '沿用已验证的视觉方向快速生成',
    templates: ['品牌上新模板', '社媒内容卡片', '极简产品展示'],
    promptLead: '基于已验证的视觉模板完成一次内容替换和生成',
  },
];

const TEMPLATE_CASES: TemplateCase[] = [
  { id: 'promo-weekend', sceneId: 'promo', name: '周末门店活动', description: '大标题与活动利益点，适合门店引流', style: '门店活动', kicker: 'WEEKEND EVENT', title: '周末限时活动', meta: '到店即享专属礼遇' },
  { id: 'promo-launch', sceneId: 'promo', name: '新品上新海报', description: '突出新品主体与上新信息，保留品牌落款', style: '产品上新', kicker: 'NEW ARRIVAL', title: '夏日新品', meta: '今日正式上线' },
  { id: 'promo-festival', sceneId: 'promo', name: '节日限定主题', description: '节日氛围明确，适合活动预热与社媒传播', style: '节日促销', kicker: 'LIMITED EDITION', title: '节日限定', meta: '把好心意带回家' },
  { id: 'promo-live', sceneId: 'promo', name: '直播间促销图', description: '突出直播活动、利益点和行动区域', style: '强促销视觉', kicker: 'LIVE PROMO', title: '直播限时福利', meta: '现在进入直播间' },
  { id: 'promo-social', sceneId: 'promo', name: '社交媒体宣传图', description: '适合社交平台发布和内容传播', style: '社交媒体风', kicker: 'SOCIAL POST', title: '今天分享一个好物', meta: '首屏主体 · 轻量信息' },
  { id: 'ecommerce-studio', sceneId: 'ecommerce', name: '清透商品主图', description: '干净背景突出商品，适合作为首图展示', style: '清透棚拍', kicker: 'PRODUCT HERO', title: '清透棚拍', meta: '主体清晰 · 信息克制' },
  { id: 'ecommerce-life', sceneId: 'ecommerce', name: '生活方式场景', description: '用真实使用氛围表达商品价值和生活感', style: '生活场景', kicker: 'LIFESTYLE', title: '自然使用场景', meta: '让商品进入日常' },
  { id: 'ecommerce-detail', sceneId: 'ecommerce', name: '卖点详情图', description: '围绕功能、材质、尺寸组织卖点信息', style: '卖点详情', kicker: 'DETAILS', title: '细节看得见', meta: '材质 · 功能 · 规格' },
  { id: 'ecommerce-usage', sceneId: 'ecommerce', name: '使用场景图', description: '展示商品在真实环境中的使用方式', style: '真实使用', kicker: 'HOW TO USE', title: '放进真实生活', meta: '动作清楚 · 商品为主' },
  { id: 'ecommerce-spec', sceneId: 'ecommerce', name: '尺寸参数图', description: '展示尺寸、容量、材质或规格关系', style: '结构信息', kicker: 'SPECIFICATION', title: '规格一眼看懂', meta: '尺寸 · 容量 · 材质' },
  { id: 'ecommerce-comparison', sceneId: 'ecommerce', name: '对比效果图', description: '用清晰对照表达产品解决的问题', style: '前后对比', kicker: 'BEFORE / AFTER', title: '差异看得见', meta: '一致视角 · 可观察变化' },
  { id: 'content-cover', sceneId: 'content', name: '内容平台封面', description: '适合小红书、公众号和短视频封面', style: '清晰易读', kicker: 'CONTENT COVER', title: '一张图讲清卖点', meta: '移动端首屏 · 标题清晰' },
  { id: 'template-brand', sceneId: 'template', name: '品牌上新模板', description: '保留品牌留白和版式，替换商品与文案即可使用', style: '品牌编辑感', kicker: 'BRAND TEMPLATE', title: '品牌上新', meta: '可替换商品与文案' },
  { id: 'template-social', sceneId: 'template', name: '社媒内容卡片', description: '适合小红书、朋友圈等内容发布场景', style: '社媒卡片', kicker: 'SOCIAL CONTENT', title: '今日灵感', meta: '一张图讲清一个卖点' },
  { id: 'template-minimal', sceneId: 'template', name: '极简产品展示', description: '结构清晰、信息克制，适合长期复用', style: '极简高级', kicker: 'ESSENTIAL', title: '少即是多', meta: '产品 · 留白 · 质感' },
];

export function SceneGenerationWorkspace({
  wideMode = false,
  disabled = false,
  onConfigureApiKey,
  onOpenFreeCreation,
}: {
  wideMode?: boolean;
  disabled?: boolean;
  onConfigureApiKey: () => void;
  onOpenFreeCreation: (prompt?: string, metadata?: ScenePromptMetadata, refImages?: RefImageData[], options?: { aspectRatio: SceneAspectRatio }) => void;
}) {
  const [sceneId, setSceneId] = useState<SceneId>('promo');
  const [template, setTemplate] = useState(SCENES[0].templates[0]);
  const [brief, setBrief] = useState('');
  const [styleId, setStyleId] = useState(STYLE_OPTIONS_BY_SCENE.promo[0].id);
  const [aspectRatio, setAspectRatio] = useState<SceneAspectRatio>('1:1');
  const [references, setReferences] = useState<SceneReference[]>([]);
  const [uploadingReference, setUploadingReference] = useState(false);
  const referenceInputRef = useRef<HTMLInputElement>(null);
  const scene = SCENES.find(item => item.id === sceneId) ?? SCENES[0];
  const visibleTemplates = TEMPLATE_CASES.filter(item => item.sceneId === sceneId);
  const selectedTemplate = visibleTemplates.find(item => item.name === template) || visibleTemplates[0];

  const { prompt: assembledPrompt, metadata } = useMemo(() => assembleScenePrompt({
    sceneId,
    sceneTitle: scene.title,
    templateId: `${sceneId}-${template}`,
    templateName: template,
    promptLead: scene.promptLead,
    businessBrief: brief,
    visualRequirements: STYLE_OPTIONS_BY_SCENE[sceneId].find(item => item.id === styleId)?.label || '',
    aspectRatio,
    references: references.map(reference => ({
      id: reference.assetId,
      name: reference.name,
      role: reference.role,
      description: reference.description,
    })),
  }), [aspectRatio, brief, references, scene, sceneId, styleId, template]);

  const readDataUrl = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('图片读取失败'));
    reader.readAsDataURL(file);
  });

  const handleReferenceUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploadingReference(true);
    try {
      const next: SceneReference[] = [];
      for (const file of Array.from(files).filter(item => item.type.startsWith('image/'))) {
        const dataUrl = await readDataUrl(file);
        const asset = await addImageAsset({
          blob: file,
          name: file.name,
          tags: ['场景参考', '待确认角色'],
          sourceKind: 'upload',
          sourceLabel: 'GGOO 场景生成',
          sourceRef: `scene-${sceneId}`,
        });
        next.push({
          id: asset.id,
          assetId: asset.id,
          name: file.name,
          dataUrl,
          mimeType: file.type,
          role: 'product',
          description: '',
        });
      }
      setReferences(current => [...current, ...next]);
    } finally {
      setUploadingReference(false);
      if (referenceInputRef.current) referenceInputRef.current.value = '';
    }
  };

  const updateReference = (id: string, patch: Partial<Pick<SceneReference, 'role' | 'description'>>) => {
    setReferences(current => current.map(item => item.id === id ? { ...item, ...patch } : item));
    const current = references.find(item => item.id === id);
    if (!current) return;
    const nextRole = patch.role || current.role;
    const nextDescription = patch.description ?? current.description;
    void updateImageAsset(current.assetId, {
      tags: ['场景参考', getReferenceRoleLabel(nextRole)],
      note: nextDescription,
    });
  };

  const handleSceneChange = (nextSceneId: SceneId) => {
    const nextScene = SCENES.find(item => item.id === nextSceneId) ?? SCENES[0];
    setSceneId(nextSceneId);
    setTemplate(nextScene.templates[0]);
    setStyleId(STYLE_OPTIONS_BY_SCENE[nextSceneId][0].id);
    setAspectRatio(SCENE_ASPECT_RATIOS[nextSceneId][0]);
  };

  return (
    <div className={cn('space-y-5', wideMode && 'xl:flex xl:min-h-0 xl:flex-1 xl:flex-col')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
            <WandSparkles className="size-4" />
            场景生成
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">不会写 Prompt，也能按用途生成图片</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">选择业务场景，补充必要信息，系统会把需求整理成可直接生成的图片描述。</p>
        </div>
      </div>

      <div className={cn('grid gap-4', wideMode ? 'xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]' : 'lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.75fr)]')}>
        <Panel>
          <PanelHeader>
            <PanelTitle className="text-base">选择视觉方向</PanelTitle>
            <PanelDescription>先确定内容用途，再从对应模板中选择具体版式。</PanelDescription>
          </PanelHeader>
          <PanelContent className="space-y-5">
            <div className="space-y-4 border-t border-border pt-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">模板库 · 案例预览</p>
                  <h2 className="mt-2 text-xl font-semibold tracking-tight">选择模板</h2>
                  <p className="mt-1 text-sm text-muted-foreground">当前视觉方向的模板会在这里展示，选择后继续填写生成内容。</p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{visibleTemplates.length} 个模板</span>
              </div>
              <div className="flex flex-wrap gap-4 border-b border-border" role="tablist" aria-label="模板分类">
                {SCENES.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={sceneId === item.id}
                    onClick={() => handleSceneChange(item.id)}
                    className={cn('border-b-2 border-transparent pb-2 text-sm text-muted-foreground transition-colors hover:text-foreground', sceneId === item.id ? 'border-primary text-primary' : '')}
                  >
                    {item.id === 'promo' ? '营销视觉' : item.id === 'ecommerce' ? '电商套图' : item.id === 'content' ? '内容配图' : '品牌模板'}
                  </button>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {visibleTemplates.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => { setTemplate(item.name); setSceneId(item.sceneId); setAspectRatio(getTemplateRecommendedRatio(item.id, item.sceneId)); }}
                    className={cn('overflow-hidden rounded-xl border border-border bg-background text-left transition hover:border-primary/60 hover:shadow-sm', template === item.name ? 'border-primary ring-1 ring-primary/20' : '')}
                  >
                    <div className="flex aspect-[1.45] flex-col justify-end bg-sky-100 p-4 text-slate-900">
                      <span className="text-[10px] font-semibold tracking-[0.14em] text-sky-700">{item.kicker}</span>
                      <strong className="mt-1 text-lg font-semibold">{item.title}</strong>
                      <span className="mt-1 text-xs text-slate-600">{item.meta}</span>
                    </div>
                    <div className="space-y-2 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <strong className="text-sm">{item.name}</strong>
                        <span className="text-[11px] text-primary">{item.style}</span>
                      </div>
                      <p className="text-xs leading-5 text-muted-foreground">{item.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <label className="block space-y-2 text-sm">
              <span className="font-medium">模板方向</span>
              <select value={template} onChange={event => setTemplate(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                {scene.templates.map(item => <option key={item}>{item}</option>)}
              </select>
            </label>

            <label className="block space-y-2 text-sm">
              <span className="font-medium">你想表达什么</span>
              <Textarea value={brief} onChange={event => setBrief(event.target.value)} placeholder="例如：突出商品轻便、防水，面向年轻通勤用户" rows={5} />
            </label>

            <div className="space-y-2 text-sm">
              <span className="font-medium">视觉风格</span>
              <div className="flex flex-wrap gap-2">
                {STYLE_OPTIONS_BY_SCENE[sceneId].map(style => (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => setStyleId(style.id)}
                    className={cn('rounded-lg border px-3 py-2 text-xs transition-colors', styleId === style.id ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground')}
                  >
                    {style.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="block space-y-2 text-sm">
              <span className="font-medium">画面比例</span>
              <select value={aspectRatio} onChange={event => setAspectRatio(event.target.value as SceneAspectRatio)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                {SCENE_ASPECT_RATIOS[sceneId].map(ratio => (
                  <option key={ratio} value={ratio}>{ratio}{selectedTemplate && getTemplateRecommendedRatio(selectedTemplate.id, sceneId) === ratio ? ' · 模板推荐' : ''}</option>
                ))}
              </select>
              <span className="text-xs text-muted-foreground">当前模板推荐 {selectedTemplate ? getTemplateRecommendedRatio(selectedTemplate.id, sceneId) : SCENE_ASPECT_RATIOS[sceneId][0]}，可根据发布渠道调整。</span>
            </label>

            <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">参考素材</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">先保存到我的素材，再指定它在本次生成中的角色。</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => referenceInputRef.current?.click()} disabled={uploadingReference}>
                  {uploadingReference ? '保存中…' : '上传图片'}
                </Button>
                <input ref={referenceInputRef} type="file" accept="image/*" multiple className="hidden" onChange={event => void handleReferenceUpload(event.target.files)} />
              </div>
              {references.length > 0 && (
                <div className="space-y-2">
                  {references.map(reference => (
                    <div key={reference.id} className="grid gap-2 rounded-lg border border-border bg-background p-2 sm:grid-cols-[48px_minmax(0,1fr)_140px] sm:items-center">
                      <img src={reference.dataUrl} alt={reference.name} className="size-12 rounded-md object-cover" />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium">{reference.name}</p>
                        <Input value={reference.description} onChange={event => updateReference(reference.id, { description: event.target.value })} placeholder="补充事实描述（可选）" className="mt-1 h-8 text-xs" />
                      </div>
                      <select value={reference.role} onChange={event => updateReference(reference.id, { role: event.target.value as ReferenceRole })} className="h-8 rounded-md border border-input bg-background px-2 text-xs">
                        {REFERENCE_ROLES.map(role => <option key={role.value} value={role.value}>{role.label}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </PanelContent>
        </Panel>

        <Panel className="flex flex-col">
          <PanelHeader>
            <PanelTitle className="flex items-center gap-2 text-base"><ImagePlus className="size-4" />生成前预览</PanelTitle>
            <PanelDescription>先由 GGOO 场景模块组装需求，再进入图片生成流程。</PanelDescription>
          </PanelHeader>
          <PanelContent className="flex flex-1 flex-col gap-4">
            <div className="min-h-48 rounded-xl bg-muted/50 p-4 text-sm leading-6 text-muted-foreground">{assembledPrompt}</div>
            <div className="mt-auto space-y-2">
              {disabled && <p className="text-xs text-muted-foreground">请先在设置中配置图片模型。</p>}
              <Button disabled={disabled} onClick={() => onOpenFreeCreation(assembledPrompt, metadata, references, { aspectRatio })} className="w-full gap-2">
                开始生成图片
                <ArrowRight className="size-4" />
              </Button>
              {disabled && <Button variant="outline" onClick={onConfigureApiKey} className="w-full">配置图片模型</Button>}
            </div>
          </PanelContent>
        </Panel>
      </div>

    </div>
  );
}
