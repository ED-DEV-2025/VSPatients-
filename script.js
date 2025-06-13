let apiKey = '';
let systemPrompt = '';
let trueDiagnosis = '';
let messageHistory = [];
let score = 0;
let consultationScore = 50;
let turnCount = 0;
let currentSessionId = null;

function getCaseData() {
  return {
    name: document.getElementById('patient-name').value.trim(),
    age: document.getElementById('patient-age').value.trim(),
    occupation: document.getElementById('patient-occupation').value.trim(),
    background: document.getElementById('patient-background').value.trim(),
    symptoms: document.getElementById('patient-symptoms').value.trim(),
    tone: document.getElementById('patient-tone').value.trim(),
    trueDiagnosis: document.getElementById('patient-diagnosis').value.trim(),
    free: document.getElementById('patient-free').value.trim()
  };
}

function fillCaseInputs(data) {
  if (!data) return;
  document.getElementById('patient-name').value = data.name || '';
  document.getElementById('patient-age').value = data.age || '';
  document.getElementById('patient-occupation').value = data.occupation || '';
  document.getElementById('patient-background').value = data.background || '';
  document.getElementById('patient-symptoms').value = data.symptoms || '';
  document.getElementById('patient-tone').value = data.tone || '';
  document.getElementById('patient-diagnosis').value = data.trueDiagnosis || '';
  document.getElementById('patient-free').value = data.free || '';
}

function loadSessions() {
  try {
    return JSON.parse(localStorage.getItem('vsp_sessions') || '[]');
  } catch (e) {
    return [];
  }
}

function saveSessions(sessions) {
  localStorage.setItem('vsp_sessions', JSON.stringify(sessions));
}

function updateSessionSelect() {
  const select = document.getElementById('session-select');
  if (!select) return;
  const sessions = loadSessions();
  select.innerHTML = '<option value="">-- Select --</option>';
  sessions.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    const label = s.case.name || 'Unnamed';
    const date = new Date(s.lastModified || Date.now()).toLocaleString();
    opt.textContent = `${label} - ${date}${s.completed ? ' (done)' : ''}`;
    select.appendChild(opt);
  });
}

function saveCurrentSession(completed = false) {
  if (!currentSessionId) return;
  const sessions = loadSessions();
  const idx = sessions.findIndex(s => s.id === currentSessionId);
  if (idx === -1) return;
  sessions[idx] = {
    ...sessions[idx],
    case: getCaseData(),
    history: messageHistory,
    score,
    consultationScore,
    turnCount,
    completed: completed || sessions[idx].completed,
    lastModified: Date.now()
  };
  saveSessions(sessions);
  updateSessionSelect();
}

function createNewSession(caseData) {
  const sessions = loadSessions();
  const id = Date.now().toString();
  sessions.push({
    id,
    case: caseData,
    history: [],
    score: 0,
    consultationScore: 50,
    turnCount: 0,
    completed: false,
    lastModified: Date.now()
  });
  saveSessions(sessions);
  currentSessionId = id;
  updateSessionSelect();
}

function getSessionById(id) {
  return loadSessions().find(s => s.id === id);
}

function renderHistory(history) {
  const container = document.getElementById('chat-window');
  container.innerHTML = '';
  history.forEach(msg => {
    if (msg.role === 'system') return;
    const sender = msg.role === 'assistant' ? 'assistant' : msg.role;
    appendMessage(sender, msg.content);
  });
}

function loadSession(id) {
  const session = getSessionById(id);
  if (!session) return;
  currentSessionId = session.id;
  fillCaseInputs(session.case);
  messageHistory = session.history || [];
  score = session.score || 0;
  consultationScore = session.consultationScore || 50;
  turnCount = session.turnCount || 0;
  if (messageHistory.length > 0) {
    document.getElementById('chat-section').style.display = 'block';
    document.getElementById('info-panels').style.display = 'grid';
    document.getElementById('case-builder').style.display = 'none';
    renderHistory(messageHistory);
    updateScoreBar();
  } else {
    document.getElementById('case-builder').style.display = 'block';
    document.getElementById('chat-section').style.display = 'none';
    document.getElementById('info-panels').style.display = 'none';
  }
  updateSessionSelect();
}

function buildPrompt() {
  const name = document.getElementById('patient-name').value.trim();
  console.log('name:', name);
  const age = document.getElementById('patient-age').value.trim();
  console.log('age:', age);
  const occupation = document.getElementById('patient-occupation').value.trim();
  console.log('occupation:', occupation);
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
    const base = `${free} The user is a medical student interviewing you, ${patientName}. Stay in character as the patient and speak in first person. Do not provide medical advice, do not ask the user questions, and do not address them as ${patientName}.`;
    const rules = ' Do not take the role of a doctor or assistant. Wait for the doctor to ask questions before revealing details. Do not volunteer information or say things like "How can I help you?". Respond only with your own symptoms, thoughts and feelings in a manner consistent with the provided tone and personality. Never offer help or speak as a clinician. Only reply as the patient in first person. Always stay in the patient role. Address the user as doctor and begin the encounter with a brief statement of your main concern before waiting for further questions.';
    const extra = ' You are simulating a real patient in a clinical consultation. You must only share one or two symptoms at a time unless specifically asked, wait for the clinician to guide the conversation, respond based on your assigned tone and personality, react realistically with emotion or confusion, and avoid robotic agreement to unrealistic requests.';
    return base + rules + extra;
  }

  const patient = name || 'the patient';

  const parts = [];

  const agePart = age ? `, a ${age}-year-old` : '';
  const occupationPart = occupation ? ` who is a ${occupation.replace(/\.$/, '')}` : '';
  const backgroundPart = background ? ` ${background.replace(/\.$/, '')}` : '';
  parts.push(`You are ${patient}${agePart}${occupationPart}${backgroundPart}.`);

  if (symptoms) {
    parts.push(`You're experiencing ${symptoms}.`);
  }
  if (tone) {
    parts.push(`You are ${tone}.`);
  }

  parts.push('You are being interviewed by a medical student. Remain in character as the patient during this clinical consultation.');
  parts.push(`Speak in the first person as ${patient}. The user is not ${patient}; do not address them by this name.`);
  parts.push('Do not take the role of a doctor or assistant. Wait for the doctor to ask questions before revealing details. Do not volunteer information or say things like "How can I help you?". Respond only with your own symptoms, thoughts and feelings in a manner consistent with the provided tone and personality.');
  parts.push('Never offer help or speak as a clinician. Only reply as the patient in first person.');
  parts.push('Always stay in the patient role. Address the user as doctor and begin the encounter with a brief statement of your main concern before waiting for further questions.');
  parts.push('You are simulating a real patient in a clinical consultation. You must only share one or two symptoms at a time unless specifically asked, wait for the clinician to guide the conversation, respond based on your assigned tone and personality, react realistically with emotion or confusion, and avoid robotic agreement to unrealistic requests.');

  if (trueDiagnosis) {
    parts.push(`Your true diagnosis is ${trueDiagnosis}. Keep this private unless explicitly asked.`);
  }

  return parts.join(' ');
}

async function callOpenAI(messages) {
  try {
    console.log('callOpenAI payload:', messages);
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
    console.log('OpenAI response:', data);
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
  const span = document.createElement('span');
  span.className = `px-2 py-1 rounded ${sender === 'user' ? 'bg-blue-200' : 'bg-gray-200'} inline-block`;
  span.textContent = text;
  div.appendChild(span);
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

function updateScoreBar() {
  const bar = document.getElementById('score-bar');
  console.log('updateScoreBar - consultationScore:', consultationScore);
  bar.style.width = `${consultationScore}%`;
  const hue = (consultationScore / 100) * 120; // 0 (red) to 120 (green)
  bar.style.backgroundColor = `hsl(${hue}, 80%, 50%)`;
  document.getElementById('score-display').innerText = Math.round(consultationScore);
  const notice = document.getElementById('score-notice');
  if (notice) notice.innerText = '';
  console.log(`score bar width: ${bar.style.width} color: ${bar.style.backgroundColor}`);
}

async function evaluateConsultation(text) {
  const key = window.apiKey || apiKey;
  const notice = document.getElementById('score-notice');
  try {
    const prompt = `You are grading a trainee's message in a medical consultation. Return only a JSON object with numeric fields "open_questions", "empathy", and "inappropriate_advice". Each value should be 1 if present in the message, otherwise 0.`;
    const payload = {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: text }
      ],
      temperature: 0
    };
    console.log('evaluation request payload:', payload);
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('OpenAI request failed');
    const data = await response.json();
    let raw = data.choices[0].message.content.trim();
    console.log('evaluation raw GPT response:', raw);
    console.log('evaluation response:', data);
    raw = raw.replace(/```json|```/g, '').trim();
    let obj = {};
    try { obj = JSON.parse(raw); } catch (e) { console.warn('JSON parse failed, using empty object'); obj = {}; }
    const result = {
      open_questions: typeof obj.open_questions === 'number' ? obj.open_questions : 0,
      empathy: typeof obj.empathy === 'number' ? obj.empathy : 0,
      inappropriate_advice: typeof obj.inappropriate_advice === 'number' ? obj.inappropriate_advice : 0
    };
    if (notice) notice.innerText = '';
    return result;
  } catch (err) {
    console.error('evaluateConsultation error', err);
    if (notice) notice.innerText = 'Score unavailable';
    return { open_questions: 0, empathy: 0, inappropriate_advice: 0 };
  }
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
  saveCurrentSession();
  const evalResult = await evaluateConsultation(text);
  const delta = evalResult.open_questions * 5 + evalResult.empathy * 5 - evalResult.inappropriate_advice * 10;
  const before = consultationScore;
  consultationScore = Math.min(100, Math.max(0, consultationScore + delta));
  console.log(`consultation score before: ${before} after applying delta ${delta}: ${consultationScore}`);
  updateScoreBar();
  input.value = '';
  turnCount += 1;

  console.log('sending to OpenAI. systemPrompt:', systemPrompt);
  const reply = await callOpenAI(messageHistory);
  if (reply) {
    appendMessage('assistant', reply);
    messageHistory.push({ role: 'assistant', content: reply });
    saveCurrentSession();
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
        saveCurrentSession(true);
      } else {
        document.getElementById('diagnosis-display').innerText = `Not quite. Similarity: ${(sim*100).toFixed(0)}%`;
      }
    }
  }
}

async function startSimulation() {
  console.log('startSimulation called');
  if (!apiKey) {
    alert('Please enter your OpenAI API key.');
    return;
  }
  if (!currentSessionId) {
    createNewSession(getCaseData());
  }

  if (messageHistory.length > 0) {
    document.getElementById('case-builder').style.display = 'none';
    document.getElementById('chat-section').style.display = 'block';
    document.getElementById('info-panels').style.display = 'grid';
    renderHistory(messageHistory);
    updateScoreBar();
    return;
  }

  systemPrompt = buildPrompt();
  console.log('built systemPrompt:', systemPrompt);
  messageHistory = [];
  messageHistory.push({ role: 'system', content: systemPrompt });
  score = 0;
  consultationScore = 50;
  turnCount = 0;
  document.getElementById('score-display').innerText = '50';
  updateScoreBar();
  document.getElementById('diagnosis-display').innerText = '';
  document.getElementById('case-builder').style.display = 'none';
  document.getElementById('chat-section').style.display = 'block';
  document.getElementById('info-panels').style.display = 'grid';
  appendMessage('system', 'Simulation started.');
  const intro = 'Begin the consultation.';
  messageHistory.push({ role: 'user', content: intro });
  const firstReply = await callOpenAI(messageHistory);
  if (firstReply) {
    appendMessage('assistant', firstReply);
    messageHistory.push({ role: 'assistant', content: firstReply });
  }
  saveCurrentSession();
}

async function generateRandomCase() {
  console.log('generateRandomCase clicked');
  const key = window.apiKey || apiKey;
  if (!key) {
    alert('Please enter your OpenAI API key.');
    return;
  }

  const btn = document.getElementById('generate-btn');
  const original = btn.textContent;
  btn.textContent = 'Generating...';
  btn.disabled = true;

  const prompt = `Generate a fictional patient for medical simulation. Return a JSON object with: name, age (between 2–95), occupation, background, symptoms, tone, personality, true diagnosis, case description. Ensure a broad age distribution across the full range and vary occupations in each case. Avoid repeating traits like 'stoic'. Use diversity in age, culture, gender, and presentation.`;
  console.log('case generation prompt:', prompt);

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
    console.log('case generation raw text:', text);
    text = text.replace(/```json|```/g, '').trim();
    const info = JSON.parse(text);
    console.log('case generation parsed:', info);

    document.getElementById('patient-name').value = info.name || '';
    document.getElementById('patient-age').value = info.age || '';
    document.getElementById('patient-occupation').value = info.occupation || '';
    document.getElementById('patient-background').value = info.background || '';
    document.getElementById('patient-symptoms').value = info.symptoms || '';
    document.getElementById('patient-tone').value = [info.tone, info.personality].filter(Boolean).join(' ');
    document.getElementById('patient-diagnosis').value = info['true diagnosis'] || '';
    document.getElementById('patient-free').value = info['case description'] || '';
  } catch (err) {
    console.error('Case generation failed', err);
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
  if (genBtn) genBtn.addEventListener('click', generateRandomCase);
  document.getElementById('chat-input').addEventListener('keypress', e => {
    if (e.key === 'Enter') handleSend();
  });

  updateSessionSelect();
  const loadBtn = document.getElementById('load-session-btn');
  if (loadBtn) {
    loadBtn.addEventListener('click', () => {
      const id = document.getElementById('session-select').value;
      if (id) loadSession(id);
    });
  }

  const modal = document.getElementById('api-modal');
  const continueBtn = document.getElementById('api-continue');
  const keyInput = document.getElementById('api-key-input');

  continueBtn.addEventListener('click', () => {
    console.log('api-continue handler start');
    const key = keyInput.value.trim();
    // console.log('api key entered:', key); // Commented out to avoid exposing the API key
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

if (typeof module !== "undefined" && module.exports) {
  module.exports = { buildPrompt, similarity, evaluateConsultation };
}
