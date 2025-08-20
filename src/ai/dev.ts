
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-communication-template.ts';
import '@/ai/flows/send-email-update.ts';
import '@/ai/flows/process-queued-emails.ts';
    
