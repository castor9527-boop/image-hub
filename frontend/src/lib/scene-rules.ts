import type { SceneAspectRatio, SceneId } from '@/lib/scene-prompts';

export const SCENE_ASPECT_RATIOS: Record<SceneId, SceneAspectRatio[]> = {
  promo: ['1:1', '2:3', '9:16', '16:9'],
  ecommerce: ['1:1', '2:3', '3:4'],
  content: ['2:3', '3:4', '9:16', '1:1'],
  template: ['1:1', '2:3', '3:4'],
};

export const TEMPLATE_RECOMMENDED_RATIOS: Record<string, SceneAspectRatio> = {
  'promo-weekend': '1:1',
  'promo-launch': '1:1',
  'promo-festival': '2:3',
  'promo-live': '2:3',
  'promo-social': '2:3',
  'ecommerce-studio': '1:1',
  'ecommerce-life': '2:3',
  'ecommerce-detail': '2:3',
  'ecommerce-usage': '2:3',
  'ecommerce-spec': '2:3',
  'ecommerce-comparison': '2:3',
  'content-cover': '2:3',
  'template-brand': '1:1',
  'template-social': '2:3',
  'template-minimal': '1:1',
};

export function getTemplateRecommendedRatio(templateId: string, sceneId: SceneId): SceneAspectRatio {
  return TEMPLATE_RECOMMENDED_RATIOS[templateId] || SCENE_ASPECT_RATIOS[sceneId][0];
}

export function isSceneAspectRatioAllowed(sceneId: SceneId, ratio: SceneAspectRatio): boolean {
  return SCENE_ASPECT_RATIOS[sceneId].includes(ratio);
}
