/// <reference types="chrome" />

let authToken = '';

async function loginToBackend() {
  try {
    const response = await fetch('http://127.0.0.1:8000/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        username: 'admin',
        password: 'admin',
      }),
    });
    const data = await response.json();
    if (data.access_token) {
      authToken = data.access_token;
      console.log('EAISG Extension logged in successfully.');
    }
  } catch (error) {
    console.error('Failed to login to EAISG backend:', error);
  }
}

// Initial login
loginToBackend();

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.type === 'ANALYZE_PROMPT') {
    if (!authToken) {
      // Try logging in again if token is missing
      loginToBackend().then(() => {
        analyzePrompt(request.payload, sendResponse);
      });
      return true; // Indicates asynchronous response
    } else {
      analyzePrompt(request.payload, sendResponse);
      return true; // Indicates asynchronous response
    }
  } else if (request.type === 'ANALYZE_FILE') {
    if (!authToken) {
      loginToBackend().then(() => {
        analyzeFile(request.payload, sendResponse);
      });
      return true;
    } else {
      analyzeFile(request.payload, sendResponse);
      return true;
    }
  }
});

// Helper function to convert base64 to Blob
function b64toBlob(b64Data: string, contentType: string = '', sliceSize: number = 512): Blob {
  const byteCharacters = atob(b64Data);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);

    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  const blob = new Blob(byteArrays, { type: contentType });
  return blob;
}

async function analyzeFile(payload: { fileName: string, fileType: string, fileData: string }, sendResponse: (response: any) => void) {
  try {
    const blob = b64toBlob(payload.fileData, payload.fileType);
    const formData = new FormData();
    // Assuming destination_id 1 is the default
    formData.append('destination_id', '1');
    formData.append('file', blob, payload.fileName);

    const response = await fetch('http://127.0.0.1:8000/api/v1/analyze/file', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      body: formData
    });
    
    const data = await response.json();
    sendResponse({ success: true, data });
  } catch (error) {
    console.error('Analyze file error:', error);
    sendResponse({ success: false, error: String(error) });
  }
}

async function analyzePrompt(prompt: string, sendResponse: (response: any) => void) {
  try {
    const response = await fetch('http://127.0.0.1:8000/api/v1/analyze/prompt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        prompt: prompt,
        destination_id: 1 // Default to 1 (e.g. generic external AI)
      })
    });
    const data = await response.json();
    sendResponse({ success: true, data });
  } catch (error) {
    console.error('Analyze prompt error:', error);
    sendResponse({ success: false, error: String(error) });
  }
}
