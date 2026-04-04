const fetch = require('node-fetch');

const DEFAULT_GROQ_KEY = process.env.GROQ_API_KEY;

exports.run = async (agent, input) => {
  switch (agent.type) {
    case 'groq':
      return await runGroq(agent.credentials, input);
    case 'telegram':
      return await runTelegram(agent.credentials, input);
    default:
      throw new Error('❌ Unknown agent type!');
  }
};

async function runGroq(credentials, input) {
  const apiKey = credentials?.apiKey || DEFAULT_GROQ_KEY;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: input }],
      max_tokens: 500
    })
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.choices[0].message.content;
}

async function runTelegram(credentials, input) {
  const url = `https://api.telegram.org/bot${credentials.botToken}/sendMessage`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: credentials.chatId,
      text: input
    })
  });

  const data = await response.json();
  if (!data.ok) throw new Error(data.description);
  return '✅ Telegram message sent!';
}
