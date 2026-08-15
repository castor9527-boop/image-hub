export interface SkillTemplate {
  id: string;
  name: string;
  description: string;
  recommendedRatio: string;
  requiredInput: string;
  previewImages?: string[];
}

export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  input: {
    minReferenceImages: number;
    maxReferenceImages: number;
    recommendedRatios: string[];
  };
  templates: SkillTemplate[];
}

export interface SkillRuntimeContext {
  skillId: string;
  skillVersion: string;
  skillName: string;
  templateId: string;
  templateName: string;
  templateDescription: string;
  recommendedRatio: string;
  requiredInput: string;
  instructions: string;
}

export async function fetchSkills(): Promise<SkillDefinition[]> {
  const response = await fetch('/api/ggoo/skills');
  if (!response.ok) throw new Error('Skill 列表加载失败');
  const data = await response.json() as { skills?: SkillDefinition[] };
  return Array.isArray(data.skills) ? data.skills : [];
}

export async function fetchSkillRuntime(skillId: string, templateId: string): Promise<SkillRuntimeContext> {
  const query = new URLSearchParams({ templateId });
  const response = await fetch(`/api/ggoo/skills/${encodeURIComponent(skillId)}/runtime?${query.toString()}`);
  if (!response.ok) throw new Error('Skill 规则加载失败');
  return await response.json() as SkillRuntimeContext;
}
