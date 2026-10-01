
import { Message, ExecutiveSummaryData } from '../../types';

export interface FilePart {
  data: string; // Base64 string
  mimeType: string;
}

export interface ILLMProvider {
  id: string;
  generateEmbedding(text: string): Promise<number[]>;
  getChatCompletion(messages: Message[], context?: string, files?: FilePart[]): Promise<string>;
  getChatCompletionStream(messages: Message[], context?: string, files?: FilePart[]): AsyncGenerator<string>;
  generateExecutiveSummary?(text: string, files?: FilePart[]): Promise<ExecutiveSummaryData>;
}
