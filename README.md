# VSPatients

This project provides a simple web interface for building virtual standardized patient (VSP) scenarios. Fill out the form in `index.html` to define patient details and then chat with the simulated patient powered by OpenAI's API via `script.js`.

## Running Locally

Instead of opening `index.html` directly, serve the project directory with a minimal HTTP server. If you have Python installed you can run:

```bash
python3 -m http.server 8000
```

Then visit [http://localhost:8000/](http://localhost:8000/) in your browser.

Browser requests to the OpenAI API can fail due to CORS restrictions. If you encounter network errors, consider running a backend proxy that forwards requests to the API.

If clicking **Continue** after entering your API key does nothing, open the browser console and check for errors.

## Consultation Scoring

Each trainee message is sent to the language model for feedback. The model returns a small JSON object with the fields `open_questions`, `empathy` and `inappropriate_advice`. Missing values default to `0`.

The application adjusts the consultation score using these fields:

- `open_questions` +5 points
- `empathy` +5 points
- `inappropriate_advice` -10 points

The score bar in the UI reflects the running total between 0 and 100.

## Case JSON Format

Scenarios are provided as JSON files. Download [caseTemplate.json](./caseTemplate.json) for a blank template. The application recognizes the following fields:

- `name` (required) – patient name.
- `age` (required) – patient age.
- `occupation` – job or role of the patient.
- `background` – additional context or history.
- `symptoms` (required) – initial symptoms or presenting complaint.
- `tone` – short description of the patient's mood.
- `personality` – extra traits that influence dialogue.
- `trueDiagnosis` – hidden diagnosis used when checking the trainee's guess.
- `description` – free form scenario text.
- `behavior` – how the patient should act during the encounter.

Any field not marked as required is optional and defaults to an empty string if omitted.

## Testing

Jest is used for unit tests. Run `npm install` to install dependencies before executing the tests:

```bash
npm install
```

The `pretest` script checks whether Jest is available and reminds you to install it if necessary.
