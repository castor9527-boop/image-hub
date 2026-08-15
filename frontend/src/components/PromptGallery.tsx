import { useState, useEffect, useMemo, useRef, useCallback, memo } from 'react';
import { Search, Loader2, AlertCircle, ChevronUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  PromptCard,
  PromptDetailModal,
  PromptGalleryImagePreviewModal,
} from '@/components/prompt-gallery/PromptGallerySubcomponents';
import {
  ALL_CATEGORY,
  DEFAULT_CATEGORIES,
  fetchAllPromptSources,
  type PromptWithKey,
} from '@/lib/prompt-gallery-data';
import { seededShuffle } from '@/lib/seeded-shuffle';
import { fetchSkills, type SkillDefinition, type SkillTemplate } from '@/lib/skill-library';

const PROMPT_GALLERY_STEP = 20;
const PROMPT_GALLERY_WIDE_STEP = 30;

const PromptGallery = memo(function PromptGallery({
  wideMode = false,
  onUseSkillTemplate,
}: {
  wideMode?: boolean;
  onUseSkillTemplate?: (skill: SkillDefinition, template: SkillTemplate) => void;
}) {
  const pageStep = wideMode ? PROMPT_GALLERY_WIDE_STEP : PROMPT_GALLERY_STEP;
  const [allPrompts, setAllPrompts] = useState<PromptWithKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [blacklist, setBlacklist] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORY);
  const [selectedCaseType, setSelectedCaseType] = useState<'all' | 'featured' | 'regular' | 'skill'>('all');
  const [skills, setSkills] = useState<SkillDefinition[]>([]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [detailPrompt, setDetailPrompt] = useState<PromptWithKey | null>(null);
  const [imagePreview, setImagePreview] = useState<{ prompt: PromptWithKey; initialIndex: number } | null>(null);
  const [imageCache, setImageCache] = useState<Set<string>>(new Set());
  const [displayCount, setDisplayCount] = useState(pageStep);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/nova/blacklist')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.keywords)) {
          setBlacklist(data.keywords.map((keyword: string) => keyword.toLowerCase()));
        }
      })
      .catch(() => {
        setBlacklist([]);
      });

    fetchAllPromptSources()
      .then((result) => {
        setCategories(result.categories);
        setAllPrompts(result.prompts);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : '提示词广场加载失败');
        setLoading(false);
      });

    fetchSkills().then(setSkills).catch(() => setSkills([]));
  }, []);

  const handleShowDetail = useCallback((prompt: PromptWithKey) => {
    setDetailPrompt(prompt);
  }, []);

  const handleShowImages = useCallback((prompt: PromptWithKey, initialIndex = 0) => {
    setImagePreview({ prompt, initialIndex });
  }, []);

  const handleImageLoad = useCallback((url: string) => {
    setImageCache((prev) => {
      if (prev.has(url)) return prev;
      const next = new Set(prev);
      next.add(url);
      return next;
    });
  }, []);

  const skillPrompts = useMemo<PromptWithKey[]>(() => skills.flatMap((skill) => skill.templates.map((template) => ({
    id: template.id,
    uniqueKey: `skill:${skill.id}:${template.id}`,
    title: template.name,
    content: template.description,
    images: template.previewImages || [],
    tags: ['Skills', skill.name, template.recommendedRatio],
    contributor: skill.id,
    notes: `${template.requiredInput} · 推荐比例 ${template.recommendedRatio}`,
    source: `skill:${skill.id}`,
    category: 'Skills 创作模板案例',
    recommendedRatio: template.recommendedRatio,
    referenceRoles: [template.requiredInput],
    caseType: 'skill' as const,
    skillId: skill.id,
    skillTemplateId: template.id,
    skillName: skill.name,
  }))), [skills]);

  const baseFilteredPrompts = useMemo(() => {
    let prompts = [...allPrompts, ...skillPrompts];

    if (blacklist.length > 0) {
      prompts = prompts.filter((prompt) => {
        const contentToCheck = [
          prompt.title.toLowerCase(),
          prompt.content.toLowerCase(),
          prompt.contributor?.toLowerCase() || '',
          prompt.notes?.toLowerCase() || '',
          ...prompt.tags.map((tag) => tag.toLowerCase()),
        ].join(' ');

        return !blacklist.some((keyword) => contentToCheck.includes(keyword));
      });
    }

    const hasChinese = (text: string) => /[\u4e00-\u9fa5]/.test(text);
    prompts = prompts.filter((prompt) => hasChinese(prompt.title) || hasChinese(prompt.content));

    if (selectedCategory !== ALL_CATEGORY) {
      prompts = prompts.filter((prompt) => prompt.category === selectedCategory);
    }

    if (selectedCaseType !== 'all') {
      prompts = prompts.filter((prompt) => (prompt.caseType || 'regular') === selectedCaseType);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      prompts = prompts.filter((prompt) => (
        prompt.title.toLowerCase().includes(query)
        || prompt.content.toLowerCase().includes(query)
        || (prompt.contributor && prompt.contributor.toLowerCase().includes(query))
      ));
    }

    return prompts;
  }, [allPrompts, blacklist, searchQuery, selectedCategory, selectedCaseType]);

  const filteredPrompts = useMemo(() => {
    const seed = `${searchQuery}\0${selectedCategory}\0${selectedCaseType}\0${blacklist.join('\0')}\0${baseFilteredPrompts.map((prompt) => prompt.uniqueKey).join('\0')}`;
    return seededShuffle(baseFilteredPrompts, seed);
  }, [baseFilteredPrompts, blacklist, searchQuery, selectedCategory, selectedCaseType]);

  useEffect(() => {
    queueMicrotask(() => setDisplayCount(pageStep));
  }, [pageStep, searchQuery, selectedCategory, selectedCaseType]);

  useEffect(() => {
    if (!loadMoreRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && displayCount < filteredPrompts.length) {
          setDisplayCount((prev) => Math.min(prev + pageStep, filteredPrompts.length));
        }
      },
      { rootMargin: '400px' },
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [displayCount, filteredPrompts.length, pageStep]);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const displayedPrompts = useMemo(() => filteredPrompts.slice(0, displayCount), [displayCount, filteredPrompts]);
  const hasMore = displayCount < filteredPrompts.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜索提示词、标题或作者..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { value: 'all' as const, label: '全部案例' },
              { value: 'featured' as const, label: '精选案例' },
              { value: 'regular' as const, label: '常规案例' },
              { value: 'skill' as const, label: 'Skills 创作模板案例' },
            ].map((caseType) => (
              <Badge
                key={caseType.value}
                variant={selectedCaseType === caseType.value ? 'default' : 'secondary'}
                className="cursor-pointer px-3 py-1 transition-colors hover:bg-primary/80"
                onClick={() => setSelectedCaseType(caseType.value)}
              >
                {caseType.label}
              </Badge>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Badge
                key={category}
                variant={selectedCategory === category ? 'default' : 'secondary'}
                className="cursor-pointer px-3 py-1 transition-colors hover:bg-primary/80"
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex items-center text-sm">
          <span className="text-muted-foreground">
            找到 {filteredPrompts.length} 个提示词{displayedPrompts.length < filteredPrompts.length ? ` · 显示 ${displayedPrompts.length} 个` : ''}
          </span>
        </div>

        <div className={`grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${wideMode ? '2xl:grid-cols-5' : ''}`}>
          {displayedPrompts.map((prompt) => (
            <PromptCard
              key={prompt.uniqueKey}
              prompt={prompt}
              onShowDetail={() => handleShowDetail(prompt)}
              onShowImages={(initialIndex) => handleShowImages(prompt, initialIndex)}
              imageCache={imageCache}
              onImageLoad={handleImageLoad}
              onUseTemplate={prompt.caseType === 'skill' && prompt.skillId && prompt.skillTemplateId
                ? () => {
                    const skill = skills.find((item) => item.id === prompt.skillId);
                    const template = skill?.templates.find((item) => item.id === prompt.skillTemplateId);
                    if (skill && template) onUseSkillTemplate?.(skill, template);
                  }
                : undefined}
            />
          ))}
        </div>

        {hasMore && (
          <div ref={loadMoreRef} className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {filteredPrompts.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            没有找到匹配的提示词
          </div>
        )}
      </div>

      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
          aria-label="回到顶部"
        >
          <ChevronUp className="h-5 w-5" />
        </button>
      )}

      {detailPrompt && (
        <PromptDetailModal
          prompt={detailPrompt}
          onClose={() => setDetailPrompt(null)}
        />
      )}

      {imagePreview && (
        <PromptGalleryImagePreviewModal
          images={imagePreview.prompt.images}
          title={imagePreview.prompt.title}
          prompt={imagePreview.prompt}
          initialIndex={imagePreview.initialIndex}
          onClose={() => setImagePreview(null)}
        />
      )}
    </>
  );
});

export { PromptGallery };
