export interface PromptGalleryItem {
  id: string;
  title: string;
  content: string;
  images: string[];
  tags: string[];
  contributor: string;
  notes: string;
  source: string;        // 数据源标识（如 "nanobanana", "gpt-image-2"）
  sourceUrl?: string;    // 来源链接（GitHub链接）
  category?: string;     // 分类
  styles?: string[];
  scenes?: string[];
  recommendedScene?: 'marketing' | 'ecommerce' | 'content' | 'brand' | 'image';
  recommendedRatio?: string;
  referenceRoles?: string[];
  caseType?: 'featured' | 'regular' | 'skill';
  skillId?: string;
  skillTemplateId?: string;
  skillName?: string;
  reviewStatus?: 'draft' | 'pending' | 'published' | 'rejected' | 'archived';
}

export interface PromptGallerySection {
  id: string;
  title: string;
  isCollapsed: boolean;
  prompts: PromptGalleryItem[];
}

export interface PromptGalleryData {
  sections: PromptGallerySection[];
}
