const { JSDOM } = require('jsdom');

const { buildPrompt, similarity, evaluateConsultation } = require('../script');

describe('buildPrompt', () => {
  beforeEach(() => {
    const dom = new JSDOM(`<!doctype html><html><body>
      <input id="patient-name" />
      <input id="patient-age" />
      <input id="patient-occupation" />
      <input id="patient-background" />
      <input id="patient-symptoms" />
      <input id="patient-tone" />
      <input id="patient-free" />
      <input id="patient-diagnosis" />
    </body></html>`);
    global.document = dom.window.document;
    global.window = dom.window;
  });

  test('builds prompt from form fields', () => {
    document.getElementById('patient-name').value = 'John Doe';
    document.getElementById('patient-age').value = '30';
    document.getElementById('patient-occupation').value = 'teacher.';
    document.getElementById('patient-background').value = 'from Texas.';
    document.getElementById('patient-symptoms').value = 'cough';
    document.getElementById('patient-tone').value = 'friendly';
    document.getElementById('patient-free').value = '';
    document.getElementById('patient-diagnosis').value = 'pneumonia';

    const prompt = buildPrompt();
    expect(prompt).toContain('You are John Doe, a 30-year-old who is a teacher from Texas');
    expect(prompt).toContain("You're experiencing cough.");
    expect(prompt).toContain('You are friendly.');
    expect(prompt).toContain('Your true diagnosis is pneumonia');
  });

  test('builds free text prompt', () => {
    document.getElementById('patient-name').value = 'Jane';
    document.getElementById('patient-free').value = 'You are at the clinic for a check-up.';
    const prompt = buildPrompt();
    expect(prompt).toMatch(/Stay in character as the patient/);
    expect(prompt).toMatch(/Wait for the doctor to ask questions/);
    expect(prompt).toContain('You are at the clinic for a check-up.');
  });
});

describe('similarity', () => {
  test('computes overlap', () => {
    expect(similarity('fever cough', 'fever sore throat')).toBeCloseTo(0.5);
  });
});

describe('evaluateConsultation', () => {
  beforeEach(() => {
    const dom = new JSDOM(`<!doctype html><html><body><div id="score-notice"></div></body></html>`);
    global.document = dom.window.document;
    global.window = dom.window;
    global.window.apiKey = 'test';
  });

  test('parses JSON response with defaults', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{"open_questions":1,"empathy":0}' } }] })
    });
    const val = await evaluateConsultation('hi');
    expect(val).toEqual({ open_questions: 1, empathy: 0, inappropriate_advice: 0 });
  });
});
