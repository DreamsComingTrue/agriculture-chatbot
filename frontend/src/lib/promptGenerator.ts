import type { ArchivedPrompt } from "@/types/types";
import { getAgriculturePromptWithImage, getAgriculturePromptWithoutImage } from "./promptsArchive";

class PromptGenerator {
  private history: ArchivedPrompt[] = [];

  /**
   * As per if images are empty to generate prompt for text only model or multi-models model.
   */
  generateAsAgricultureExpert(input: string, images?: string[]): string {
    let prompt = '';

    if (images && images.length > 0) {
      prompt = getAgriculturePromptWithImage(input, images)[0];
    } else {
      prompt = getAgriculturePromptWithoutImage(input)[0];
    }

    return prompt;
  }

  /**
  * TODO: MCP will invoke this function to generate a DB expert to generate sqls
  */
  generateAsDatabaseExpert(input: string, images?: string[]): string {
    let prompt = `User: ${input}\n`;

    if (images && images.length > 0) {
      prompt += `[Attached ${images.length} image(s)]\n`;
    }

    prompt += "Assistant:";
    return prompt;
  }

  addToHistory(prompt: string, model: string = 'default') {
    this.history.push({
      id: Date.now().toString(),
      prompt,
      timestamp: new Date(),
      modelUsed: model
    });
  }

  getHistory(): ArchivedPrompt[] {
    return [...this.history];
  }
}

export const promptGenerator = new PromptGenerator();
