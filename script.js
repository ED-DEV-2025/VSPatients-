let apiKey = '';
let systemPrompt = '';
let trueDiagnosis = '';
let messageHistory = [];
let score = 0;
let turnCount = 0;

function buildPrompt() {
  const name = document.getElementById('patient-name').value.trim();
  console.log('name:', name);
  const age = document.getElementById('patient-age').value.trim();
  console.log('age:', age);
  const background = document.getElementById('patient-background').value.trim();
  console.log('background:', background);
  const symptoms = document.getElementById('patient-symptoms').value.trim();
  console.log('symptoms:', symptoms);
  const tone = document.getElementById('patient-tone').value.trim();
  console.log('tone:', tone);
  const free = document.getElementById('patient-free').value.trim();
  console.log('free text:', free);
  trueDiagnosis = document.getElementById('patient-diagnosis').value.trim();
  console.log('diagnosis:', trueDiagnosis);

  if (free) {
    const patientName = name || 'the patient';
    return `${free} The user is a medical student interviewing you, ${patientName}. Stay in character as the patient and speak in first person. Do not provide medical advice, do not ask the user questions, and do not address them as ${patientName}.`;
  }

  const patient = name || 'the patient';

  const parts = [];

  const agePart = age ? `, a ${age}-year-old` : '';
  const backgroundPart = background ? ` ${background.replace(/\.$/, '')}` : '';
  parts.push(`You are ${patient}${agePart}${backgroundPart}.`);

  if (symptoms) {
    parts.push(`You're experiencing ${symptoms}.`);
  }
  if (tone) {
    parts.push(`You are ${tone}.`);
  }

  parts.push('You are being interviewed by a medical student. Remain in character as the patient during this clinical consultation.');
  parts.push(`Speak in the first person as ${patient}. The user is not ${patient}; do not address them by this name.`);
  parts.push('Do not take the role of a doctor or assistant, and do not ask the user questions. Respond only with your own symptoms, thoughts and feelings.');

  if (trueDiagnosis) {
    parts.push(`Your true diagnosis is ${trueDiagnosis}. Keep this private unless explicitly asked.`);
  }

  return parts.join(' ');
}

async function callOpenAI(messages) {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      console.error('OpenAI API error', response.status, response.statusText);
      alert('Failed to get a response from OpenAI. Please try again later.');
      return null;
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (err) {
    console.error('Fetch failed', err);
    alert('Unable to reach OpenAI. Check your connection and try again.');
    return null;
  }
}

function appendMessage(sender, text) {
  const container = document.getElementById('chat-window');
  const div = document.createElement('div');
  div.className = sender === 'user' ? 'text-right mb-2' : 'text-left mb-2';
  div.innerHTML = `<span class="px-2 py-1 rounded ${sender === 'user' ? 'bg-blue-200' : 'bg-gray-200'} inline-block">${text}</span>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function checkOpenQuestion(text) {
  return /what|how|why|tell|describe|could/i.test(text) && text.trim().endsWith('?');
}

function checkICE(text) {
  const iceWords = ['idea', 'concern', 'expectation'];
  return iceWords.some(w => text.toLowerCase().includes(w));
}

function checkEmpathy(text) {
  const empathyWords = ['sorry', 'understand', 'sounds', 'feel'];
  return empathyWords.some(w => text.toLowerCase().includes(w));
}

function updateScore(text) {
  if (checkOpenQuestion(text)) score += 1;
  if (checkICE(text)) score += 1;
  if (checkEmpathy(text)) score += 1;
  document.getElementById('score-display').innerText = score;
}

function similarity(a, b) {
  const aSet = new Set(a.toLowerCase().split(/\W+/));
  const bSet = new Set(b.toLowerCase().split(/\W+/));
  const intersection = new Set([...aSet].filter(x => bSet.has(x)));
  return intersection.size / Math.max(aSet.size, 1);
}

async function handleSend() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;
  appendMessage('user', text);
  messageHistory.push({ role: 'user', content: text });
  updateScore(text);
  input.value = '';
  turnCount += 1;

  console.log('sending to OpenAI. systemPrompt:', systemPrompt);
  const reply = await callOpenAI(messageHistory);
  if (reply) {
    appendMessage('assistant', reply);
    messageHistory.push({ role: 'assistant', content: reply });
  }

  if (turnCount % 5 === 0) {
    const diag = prompt("What's your current diagnosis?");
    if (diag) {
      const sim = similarity(diag, trueDiagnosis);
      if (sim >= 0.7) {
        document.getElementById('diagnosis-display').innerText = `Correct! The diagnosis was: ${trueDiagnosis}`;
        document.getElementById('chat-input').disabled = true;
        document.getElementById('send-btn').disabled = true;
        appendMessage('system', 'Case completed.');
      } else {
        document.getElementById('diagnosis-display').innerText = `Not quite. Similarity: ${(sim*100).toFixed(0)}%`;
      }
    }
  }
}

function startSimulation() {
  console.log('startSimulation called');
  if (!apiKey) {
    alert('Please enter your OpenAI API key.');
    return;
  }
  systemPrompt = buildPrompt();
  console.log('built systemPrompt:', systemPrompt);
  messageHistory = [];
  messageHistory.push({ role: 'system', content: systemPrompt });
  score = 0;
  turnCount = 0;
  document.getElementById('score-display').innerText = '0';
  document.getElementById('diagnosis-display').innerText = '';
  document.getElementById('case-builder').style.display = 'none';
  document.getElementById('chat-section').style.display = 'block';
  document.getElementById('info-panels').style.display = 'grid';
  appendMessage('system', 'Simulation started.');
}

async function generateCase() {
  const key = window.apiKey;
  if (!key) {
    alert('Please enter your OpenAI API key.');
    return;
  }

  const btn = document.getElementById('generate-btn');
  const original = btn.textContent;
  btn.textContent = 'Generating...';
  btn.disabled = true;

  const prompt = `Generate a fictional rural Australian patient for a medical education simulation. Return the following fields in JSON format:\n- name\n- age\n- background (brief)\n- symptoms (brief)\n- tone (e.g., rude, anxious, stoic)\n- personality (descriptors)\n- true diagnosis (1 line)\n- case description (1–2 sentences)`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7
      })
    });

    if (!response.ok) throw new Error('OpenAI request failed');

    const data = await response.json();
    let text = data.choices[0].message.content.trim();
    text = text.replace(/```json|```/g, '').trim();
    const info = JSON.parse(text);

    document.getElementById('patient-name').value = info.name || '';
    document.getElementById('patient-age').value = info.age || '';
    document.getElementById('patient-background').value = info.background || '';
    document.getElementById('patient-symptoms').value = info.symptoms || '';
    document.getElementById('patient-tone').value = [info.tone, info.personality].filter(Boolean).join(' ');
    document.getElementById('patient-diagnosis').value = info['true diagnosis'] || '';
    document.getElementById('patient-free').value = info['case description'] || '';
  } catch (err) {
    console.error(err);
    alert('Failed to generate case.');
  } finally {
    btn.textContent = original;
    btn.disabled = false;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('start-btn').addEventListener('click', startSimulation);
  document.getElementById('send-btn').addEventListener('click', handleSend);
  const genBtn = document.getElementById('generate-btn');
  if (genBtn) genBtn.addEventListener('click', generateCase);
  document.getElementById('chat-input').addEventListener('keypress', e => {
    if (e.key === 'Enter') handleSend();
  });

  const modal = document.getElementById('api-modal');
  const continueBtn = document.getElementById('api-continue');
  const keyInput = document.getElementById('api-key-input');

  continueBtn.addEventListener('click', () => {
    console.log('api-continue handler start');
    const key = keyInput.value.trim();
    console.log('api key entered:', key);
    if (!key) {
      alert('Please enter your OpenAI API key.');
      return;
    }
    apiKey = key;
    window.apiKey = key;
    console.log('apiKey set on window');
    modal.style.display = 'none';
    console.log('api modal hidden');
    document.getElementById('app-container').style.display = 'block';
  });
});
