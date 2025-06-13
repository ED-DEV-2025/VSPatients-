let apiKey = '';
let systemPrompt = '';
let trueDiagnosis = '';
let messageHistory = [];
let score = 0;
let turnCount = 0;

function buildPrompt() {
  const name = document.getElementById('patient-name').value.trim();
  const age = document.getElementById('patient-age').value.trim();
  const background = document.getElementById('patient-background').value.trim();
  const symptoms = document.getElementById('patient-symptoms').value.trim();
  const tone = document.getElementById('patient-tone').value.trim();
  const free = document.getElementById('patient-free').value.trim();
  trueDiagnosis = document.getElementById('patient-diagnosis').value.trim();

  if (free) {
    return free;
  }

  return `You are playing the role of a patient in a medical consultation. Respond as ${name || 'the patient'}, age ${age}. Background: ${background}. Symptoms: ${symptoms}. Tone: ${tone}. Stay in character and keep responses short.`;
}

async function callOpenAI(messages) {
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
  const data = await response.json();
  return data.choices[0].message.content.trim();
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

  let promptMessages = [{ role: 'system', content: systemPrompt }, ...messageHistory];
  const reply = await callOpenAI(promptMessages);
  appendMessage('assistant', reply);
  messageHistory.push({ role: 'assistant', content: reply });

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
  apiKey = document.getElementById('openai-key').value.trim();
  if (!apiKey) {
    alert('Please enter your OpenAI API key.');
    return;
  }
  systemPrompt = buildPrompt();
  messageHistory = [];
  score = 0;
  turnCount = 0;
  document.getElementById('score-display').innerText = '0';
  document.getElementById('diagnosis-display').innerText = '';
  document.getElementById('case-builder').style.display = 'none';
  document.getElementById('chat-section').style.display = 'block';
  document.getElementById('info-panels').style.display = 'grid';
  appendMessage('system', 'Simulation started.');
}

document.getElementById('start-btn').addEventListener('click', startSimulation);
document.getElementById('send-btn').addEventListener('click', handleSend);
document.getElementById('chat-input').addEventListener('keypress', e => {
  if (e.key === 'Enter') handleSend();
});
