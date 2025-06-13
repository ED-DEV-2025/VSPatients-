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
