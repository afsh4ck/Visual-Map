import { config } from 'dotenv';
config();

// Flows are imported here to be available in local genkit dev server
import '@/ai/flows/explain-vulnerability-risk';
