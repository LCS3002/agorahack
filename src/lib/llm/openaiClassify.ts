import type { ClassificationResult } from '@/lib/types';
import { createOpenAIClient, defaultOpenAIClassifyModel, withOpenAISeparateReasoningBody } from './provider';

export async function classifyQueryWithOpenAI(
  query: string,
  systemPrompt: string,
): Promise<ClassificationResult> {
  const openai = createOpenAIClient();
  const model = defaultOpenAIClassifyModel();

  const completion = await openai.chat.completions.create(
    withOpenAISeparateReasoningBody({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query },
      ],
      max_tokens: 256,
      temperature: 0.2,
    }) as never,
  );

  const text = completion.choices[0]?.message?.content?.trim() ?? '';
  const clean = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  return JSON.parse(clean) as ClassificationResult;
}
