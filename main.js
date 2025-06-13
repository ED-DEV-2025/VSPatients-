import { appState } from './state.js';
import { callOpenAI, evaluateConsultation, generateRandomCase } from './openai.js';

function buildPrompt() {
  const name = document.getElementById('patient-name').value.trim();
  const age = document.getElementById('patient-age').value.trim();
  const occupation = document.getElementById('patient-occupation').value.trim();
  const background = document.getElementById('patient-background').value.trim();
  const symptoms = document.getElementById('patient-symptoms').value.trim();
  const tone = document.getElementById('patient-tone').value.trim();
  const free = document.getElementById('patient-free').value.trim();
  appState.trueDiagnosis = document.getElementById('patient-diagnosis').value.trim();

  if (free) {
    const patientName = name || 'the patient';
    return `${free} The user is a medical student interviewing you, ${patientName}. Stay in character as the patient and speak in first person. Do not provide medical advice, do not ask the user questions, and do not address them as ${patientName}.`;
  }

  const patient = name || 'the patient';
  const parts = [];
  const agePart = age ? `, a ${age}-year-old` : '';
  const occupationPart = occupation ? ` who is a ${occupation.replace(/\.$/, '')}` : '';
  const backgroundPart = background ? ` ${background.replace(/\.$/, '')}` : '';
  parts.push(`You are ${patient}${agePart}${occupationPart}${backgroundPart}.`);
  if (symptoms) parts.push(`You're experiencing ${symptoms}.`);
  if (tone) parts.push(`You are ${tone}.`);
  parts.push('You are being interviewed by a medical student. Remain in character as the patient during this clinical consultation.');
  parts.push(`Speak in the first person as ${patient}. The user is not ${patient}; do not address them by this name.`);
  parts.push('Do not take the role of a doctor or assistant. Wait for the doctor to ask questions before revealing details. Do not volunteer information or say things like "How can I help you?". Respond only with your own symptoms, thoughts and feelings in a manner consistent with the provided tone and personality.');
  parts.push('Never offer help or speak as a clinician. Only reply as the patient in first person.');
  parts.push('Always stay in the patient role. Address the user as doctor and begin the encounter with a brief statement of your main concern before waiting for further questions.');
  if (appState.trueDiagnosis) parts.push(`Your true diagnosis is ${appState.trueDiagnosis}. Keep this private unless explicitly asked.`);
  return parts.join(' ');
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
  if (checkOpenQuestion(text)) appState.score += 1;
  if (checkICE(text)) appState.score += 1;
  if (checkEmpathy(text)) appState.score += 1;
  document.getElementById('score-display').innerText = appState.score;
}

function updateScoreBar() {
  const bar = document.getElementById('score-bar');
  bar.style.width = `${appState.consultationScore}%`;
  const hue = (appState.consultationScore / 100) * 120;
  bar.style.backgroundColor = `hsl(${hue}, 80%, 50%)`;
  document.getElementById('score-display').innerText = Math.round(appState.consultationScore);
  const notice = document.getElementById('score-notice');
  if (notice) notice.innerText = '';
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
  appState.messageHistory.push({ role: 'user', content: text });
  const delta = await evaluateConsultation(text);
  appState.consultationScore = Math.min(100, Math.max(0, appState.consultationScore + delta * 10));
  updateScoreBar();
  input.value = '';
  appState.turnCount += 1;

  const reply = await callOpenAI(appState.messageHistory);
  if (reply) {
    appendMessage('assistant', reply);
    appState.messageHistory.push({ role: 'assistant', content: reply });
  }

  if (appState.turnCount % 5 === 0) {
    const diag = prompt("What's your current diagnosis?");
    if (diag) {
      const sim = similarity(diag, appState.trueDiagnosis);
      if (sim >= 0.7) {
        document.getElementById('diagnosis-display').innerText = `Correct! The diagnosis was: ${appState.trueDiagnosis}`;
        document.getElementById('chat-input').disabled = true;
        document.getElementById('send-btn').disabled = true;
        appendMessage('system', 'Case completed.');
      } else {
        document.getElementById('diagnosis-display').innerText = `Not quite. Similarity: ${(sim*100).toFixed(0)}%`;
      }
    }
  }
}

async function startSimulation() {
  if (!appState.apiKey) {
    alert('Please enter your OpenAI API key.');
    return;
  }
  appState.systemPrompt = buildPrompt();
  appState.messageHistory = [{ role: 'system', content: appState.systemPrompt }];
  appState.score = 0;
  appState.consultationScore = 50;
  appState.turnCount = 0;
  document.getElementById('score-display').innerText = '50';
  updateScoreBar();
  document.getElementById('diagnosis-display').innerText = '';
  document.getElementById('case-builder').style.display = 'none';
  document.getElementById('chat-section').style.display = 'block';
  document.getElementById('info-panels').style.display = 'grid';
  appendMessage('system', 'Simulation started.');
  const intro = 'Begin the consultation.';
  appState.messageHistory.push({ role: 'user', content: intro });
  const firstReply = await callOpenAI(appState.messageHistory);
  if (firstReply) {
    appendMessage('assistant', firstReply);
    appState.messageHistory.push({ role: 'assistant', content: firstReply });
  }
}

async function handleGenerateRandomCase() {
  if (!appState.apiKey) {
    alert('Please enter your OpenAI API key.');
    return;
  }
  const btn = document.getElementById('generate-btn');
  const original = btn.textContent;
  btn.textContent = 'Generating...';
  btn.disabled = true;
  try {
    const info = await generateRandomCase();
    document.getElementById('patient-name').value = info.name || '';
    document.getElementById('patient-age').value = info.age || '';
    document.getElementById('patient-occupation').value = info.occupation || '';
    document.getElementById('patient-background').value = info.background || '';
    document.getElementById('patient-symptoms').value = info.symptoms || '';
    document.getElementById('patient-tone').value = [info.tone, info.personality].filter(Boolean).join(' ');
    document.getElementById('patient-diagnosis').value = info['true diagnosis'] || '';
    document.getElementById('patient-free').value = info['case description'] || '';
  } catch (err) {
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
  if (genBtn) genBtn.addEventListener('click', handleGenerateRandomCase);
  document.getElementById('chat-input').addEventListener('keypress', e => {
    if (e.key === 'Enter') handleSend();
  });

  const modal = document.getElementById('api-modal');
  const continueBtn = document.getElementById('api-continue');
  const keyInput = document.getElementById('api-key-input');

  continueBtn.addEventListener('click', () => {
    const key = keyInput.value.trim();
    if (!key) {
      alert('Please enter your OpenAI API key.');
      return;
    }
    appState.apiKey = key;
    window.apiKey = key;
    modal.style.display = 'none';
    document.getElementById('app-container').style.display = 'block';
  });
});
