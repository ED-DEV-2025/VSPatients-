// Handles uploading case JSON and storing API key for the learner interface

document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('case-file');
  const keyInput = document.getElementById('api-key');
  const startBtn = document.getElementById('start-btn');

  startBtn.addEventListener('click', () => {
    const file = fileInput.files[0];
    const key = keyInput.value.trim();

    if (!file) {
      alert('Please select a case JSON file.');
      return;
    }
    if (!key) {
      alert('Please enter your OpenAI API key.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        sessionStorage.setItem('caseJson', JSON.stringify(data));
        sessionStorage.setItem('openaiKey', key);
        window.location.href = 'vsp.html';
      } catch (e) {
        alert('Invalid JSON file.');
      }
    };
    reader.readAsText(file);
  });
});
