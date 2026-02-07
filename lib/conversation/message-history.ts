// Simple in-memory conversation history
// For production, consider using Vercel KV or similar

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

class MessageHistory {
  private messages: Message[] = [];
  private maxHistory: number = 20; // Keep last 20 messages

  addMessage(role: 'user' | 'assistant' | 'system', content: string): void {
    this.messages.push({
      role,
      content,
      timestamp: Date.now(),
    });

    // Trim to max history
    if (this.messages.length > this.maxHistory) {
      this.messages = this.messages.slice(-this.maxHistory);
    }
  }

  getMessages(): Message[] {
    return [...this.messages];
  }

  getFormattedHistory(systemPrompt: string): Array<{ role: string; content: string }> {
    return [
      { role: 'system', content: systemPrompt },
      ...this.messages
        .filter(m => m.role !== 'system')
        .map(m => ({ role: m.role, content: m.content })),
    ];
  }

  clear(): void {
    this.messages = [];
  }

  // Get last N messages for context
  getRecentMessages(count: number = 10): Message[] {
    return this.messages.slice(-count);
  }
}

// Singleton instance
export const messageHistory = new MessageHistory();

