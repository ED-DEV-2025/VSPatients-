import { appState } from './state.js';

export async function callOpenAI(messages) {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${appState.apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      alert('Failed to get a response from OpenAI.');
      return null;
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (err) {
    alert('Unable to reach OpenAI.');
    return null;
  }
}

export async function evaluateConsultation(text) {
  const prompt = `You are evaluating the quality of a medical consultation. Respond with +1 if the following user message is good, 0 if neutral, or -1 if poor.`;
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${appState.apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: text }
        ],
        temperature: 0
      })
    });
    if (!response.ok) throw new Error();
    const data = await response.json();
    const raw = data.choices[0].message.content.trim();
    const m = raw.match(/^([+-]?1|0)$/);
    return m ? parseInt(m[1], 10) : 0;
  } catch (err) {
    return 0;
  }
}

export async function generateRandomCase() {
  const prompt = `Generate a fictional patient for medical simulation. Return a JSON object with: name, age (between 2–95), occupation, background, symptoms, tone, personality, true diagnosis, case description.`;
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${appState.apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    })
  });
  if (!response.ok) throw new Error();
  const data = await response.json();
  let text = data.choices[0].message.content.trim();
  text = text.replace(/```json|```/g, '').trim();
  return JSON.parse(text);
}
