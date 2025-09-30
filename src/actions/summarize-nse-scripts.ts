
'use server';

import { ai } from '@/ai/genkit';
import type { Host } from '@/types/nmap';
import { getLocale } from 'next-intl/server';
import { z } from 'genkit';

const NseScriptsSummaryInputSchema = z.object({
  nseScriptsOutput: z
    .string()
    .describe(
      'The combined raw output from all NSE scripts (host and port scripts) for a single host.'
    ),
  locale: z
    .string()
    .describe('The language to use for the summary. Can be "en" or "es".'),
});
export type NseScriptsSummaryInput = z.infer<
  typeof NseScriptsSummaryInputSchema
>;

const NseScriptsSummaryOutputSchema = z.object({
  summary: z
    .string()
    .describe('A concise, easy-to-read summary of the key findings from the NSE scripts. It should be formatted in Markdown, using paragraphs and bullet points for clarity.'),
});
export type NseScriptsSummaryOutput = z.infer<
  typeof NseScriptsSummaryOutputSchema
>;

const prompt = ai.definePrompt({
  name: 'nseScriptsSummaryPrompt',
  input: { schema: NseScriptsSummaryInputSchema },
  output: { schema: NseScriptsSummaryOutputSchema },
  prompt: `You are a cybersecurity expert specializing in interpreting Nmap scan results. Your task is to summarize the provided NSE script outputs for a host.

Respond in this language: {{{locale}}}.

Your summary should be clear, concise, and highlight the most important information for a penetration tester. Focus on actionable intelligence, such as discovered user accounts, OS details, security misconfigurations (like disabled message signing), or potential vulnerabilities.

Do not just list the scripts. Instead, synthesize the information into a coherent narrative. Use Markdown for formatting: use paragraphs for explanations and bullet points for lists.

NSE Scripts Output:
\`\`\`
{{{nseScriptsOutput}}}
\`\`\`

Example of a good summary:
"The scripts revealed several key details about the host. The SMB service reported a computer name of 'WIN-SERVER-2K19' and confirmed that message signing is enabled but not required, which could expose it to certain attacks. The system time appears to be correctly synchronized. Additionally, an HTTP title 'Login Page' was found on port 8080."
`,
});

const nseScriptsSummaryFlow = ai.defineFlow(
  {
    name: 'nseScriptsSummaryFlow',
    inputSchema: NseScriptsSummaryInputSchema,
    outputSchema: NseScriptsSummaryOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);


export async function getNseScriptsSummary(
  rawScriptOutput: string
): Promise<NseScriptsSummaryOutput> {
  try {
    const locale = await getLocale();
    
    if (!rawScriptOutput.trim()) {
        return { summary: locale === 'es' ? 'No se encontraron scripts NSE para resumir.' : 'No NSE scripts found to summarize.' };
    }

    const result = await nseScriptsSummaryFlow({
      nseScriptsOutput: rawScriptOutput,
      locale,
    });

    return result;
  } catch (error) {
    console.error('Error getting NSE scripts summary:', error);
    throw new Error('Failed to generate NSE scripts summary from AI model.');
  }
}
