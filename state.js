export class AppState {
  constructor() {
    this.apiKey = '';
    this.systemPrompt = '';
    this.trueDiagnosis = '';
    this.messageHistory = [];
    this.score = 0;
    this.consultationScore = 50;
    this.turnCount = 0;
  }

  reset() {
    this.systemPrompt = '';
    this.trueDiagnosis = '';
    this.messageHistory = [];
    this.score = 0;
    this.consultationScore = 50;
    this.turnCount = 0;
  }
}

export const appState = new AppState();
