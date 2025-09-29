import {z} from 'genkit';

export const ExplainVulnerabilityRiskInputSchema = z.object({
  hostDetails: z
    .string()
    .describe('Detailed information about the host, including open ports, services, versions, and NSE script results.'),
  rankingFactors: z
    .string()
    .describe('A list of factors contributing to the host vulnerability ranking, such as number of open ports and critical ports.'),
  riskScore: z.number().describe('The calculated risk score for the host, on a scale of 0 to 100.'),
  locale: z.string().describe('The language to use for the explanation. Can be "en" or "es".'),
});
export type ExplainVulnerabilityRiskInput = z.infer<typeof ExplainVulnerabilityRiskInputSchema>;

export const ExplainVulnerabilityRiskOutputSchema = z.object({
  explanation: z
    .string()
    .describe('A detailed explanation of why the host has its given risk score, based on the provided host details, ranking factors, and score.'),
  translatedRiskFactors: z.array(z.string()).describe('The rankingFactors translated into the requested locale.'),
});
export type ExplainVulnerabilityRiskOutput = z.infer<typeof ExplainVulnerabilityRiskOutputSchema>;
