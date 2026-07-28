export type SceneId = 'promo' | 'ecommerce' | 'content' | 'template';
export type SceneAspectRatio = '1:1' | '2:3' | '3:4' | '4:3' | '9:16' | '16:9';
export type ReferenceRole = 'logo' | 'product-name' | 'product' | 'promotion' | 'scene' | 'specification';

export interface SceneReferenceMetadata {
  id: string;
  name: string;
  role: ReferenceRole;
  description: string;
}

export interface ScenePromptMetadata {
  source: 'scene';
  sceneId: SceneId;
  templateId: string;
  promptVersion: 'v1-client';
  components: {
    businessBrief: string;
    visualRequirements: string;
    aspectRatio: SceneAspectRatio;
  };
  references: SceneReferenceMetadata[];
}

export interface ScenePromptInput {
  sceneId: SceneId;
  sceneTitle: string;
  templateId: string;
  templateName: string;
  promptLead: string;
  businessBrief: string;
  visualRequirements: string;
  references?: SceneReferenceMetadata[];
  aspectRatio: SceneAspectRatio;
}

export function assembleScenePrompt(input: ScenePromptInput): { prompt: string; metadata: ScenePromptMetadata } {
  const businessBrief = input.businessBrief.trim() || '根据用户提供的业务信息组织画面';
  const visualRequirements = input.visualRequirements.trim() || '保持主体清晰，画面信息层级明确';
  const references = input.references || [];
  const roleGuidance: Record<ReferenceRole, string> = {
    logo: '准确保留 Logo 的形状、颜色和比例，不得重新设计。',
    'product-name': '保留产品名称的文字内容和拼写，不得生成错误文字。',
    product: '保持商品的外形、颜色、材质和结构不变。',
    promotion: '参考构图层级、视觉氛围和信息排列方式，但不要复制原图内容。',
    scene: '参考背景、灯光和使用环境，让环境服务于主体。',
    specification: '只使用可确认的尺寸、规格和功能信息，不虚构参数。',
  };
  const referencePrompt = references.length > 0
    ? `参考素材要求：${references.map(reference => `${reference.name}（${reference.role}）：${reference.description || roleGuidance[reference.role]}`).join('；')}`
    : '';

  return {
    prompt: `${input.promptLead}。使用“${input.templateName}”方向。主体需求：${businessBrief}。视觉要求：${visualRequirements}。${referencePrompt}画面构图、材质、光线和文字区域应服务于${input.sceneTitle}的使用场景，画面比例为 ${input.aspectRatio}。`,
    metadata: {
      source: 'scene',
      sceneId: input.sceneId,
      templateId: input.templateId,
      promptVersion: 'v1-client',
      components: { businessBrief, visualRequirements, aspectRatio: input.aspectRatio },
      references,
    },
  };
}
