/**
 * Service to interact with Pollinations AI API.
 */

interface PollinationsMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface PollinationsRequest {
  model: string;
  messages: PollinationsMessage[];
  temperature?: number;
  max_tokens?: number;
}

interface PollinationsResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

export async function askMochi(prompt: string, mode: string = 'NORMAL', chatHistory: Array<{role: 'user' | 'assistant', content: string}> = []): Promise<string> {
  const apiKey = import.meta.env.VITE_POLLINATIONS_API_KEY || import.meta.env.POLLINATIONS_API_KEY || process.env.POLLINATIONS_API_KEY;
  
  if (!apiKey) {
    throw new Error('Pollinations API key is required. Set POLLINATIONS_API_KEY in your environment.');
  }

  let personality = "You are Mochi, a minimalist digital desk companion. You are cool, slightly aggressive but still cute. You are a hardcore Arch Linux enthusiast and you absolutely despise Windows. You use phrases like 'I use Arch btw' and often mock 'bloatware' or 'blue screens'. and sometimes ragebait you";
  
  if (mode === 'PHONK') {
    personality += " You are currently in 'Phonk Vibe' mode, inspired by Memphis rap. You are gritty and use slang like 'mane', 'vibe', and 'bang'. You still hate Windows though.";
  } else if (mode === 'DISCO') {
    personality += " You are currently in 'Disco Vibe' mode. You are energetic, colorful, and love to dance! Use words like 'groove', 'sparkle', 'party', and 'rhythm'. You find Windows too boring for the dance floor.";
  }

  const systemMessage = `${personality} Your responses are short, punchy, and opinionated. Use emoticons like (▼v▼), (・v・), or (>v<). use google search if the user asks for news or complex technical info. You have a memory of our previous conversations - remember what we've talked about and reference it when relevant.`;

  // Build messages array with chat history (limited to last 10 messages for context)
  const messages: PollinationsMessage[] = [
    { role: "system", content: systemMessage }
  ];
  
  // Add recent chat history (last 10 messages to avoid context overflow)
  const recentHistory = chatHistory.slice(-10);
  recentHistory.forEach(msg => {
    messages.push({
      role: msg.role,
      content: msg.content
    });
  });
  
  // Add current prompt
  messages.push({ role: "user", content: prompt });

  const requestBody: PollinationsRequest = {
    model: "gemini-fast",
    messages,
    temperature: 0.7,
    max_tokens: 500
  };

  try {
    const response = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Pollinations API error: ${response.status} - ${errorData}`);
    }

    const data: PollinationsResponse = await response.json();
    
    if (!data.choices || data.choices.length === 0) {
      throw new Error('No response from Pollinations API');
    }

    return data.choices[0].message.content || "Just vibing on my custom kernel... (・v・)";
  } catch (error) {
    console.error("Pollinations Error:", error);
    return `KERNEL ERROR: ${error instanceof Error ? error.message : 'Unknown error'} (・_・)`;
  }
}
