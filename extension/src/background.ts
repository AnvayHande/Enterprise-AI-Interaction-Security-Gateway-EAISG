/// <reference types="chrome" />

let authToken = '';
let currentUsername = 'employee';
let currentRole = 'EMPLOYEE';

async function getStoredCredentials(): Promise<{ username: string; password: string }> {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['eaisg_username', 'eaisg_password'], (res: Record<string, any>) => {
        resolve({
          username: (res && res.eaisg_username) ? String(res.eaisg_username) : 'employee',
          password: (res && res.eaisg_password) ? String(res.eaisg_password) : 'employee123',
        });
      });
    } else {
      resolve({ username: 'employee', password: 'employee123' });
    }
  });
}

async function loginToBackend(customUsername?: string, customPassword?: string): Promise<boolean> {
  try {
    const creds = customUsername && customPassword
      ? { username: customUsername, password: customPassword }
      : await getStoredCredentials();

    const response = await fetch('http://127.0.0.1:8000/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        username: creds.username,
        password: creds.password,
      }),
    });

    if (!response.ok) {
      console.error(`Login failed for user ${creds.username}: status ${response.status}`);
      return false;
    }

    const data = await response.json();
    if (data.access_token) {
      authToken = data.access_token;
      currentUsername = creds.username;

      // Persist in local extension storage
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({
          eaisg_username: creds.username,
          eaisg_password: creds.password,
        });
      }

      // Fetch user profile from /auth/me
      try {
        const meRes = await fetch('http://127.0.0.1:8000/api/v1/auth/me', {
          headers: { 'Authorization': `Bearer ${authToken}` },
        });
        if (meRes.ok) {
          const meData = await meRes.json();
          currentRole = meData.role || 'EMPLOYEE';
          currentUsername = meData.username || creds.username;
        }
      } catch (e) {
        // Fallback
      }

      console.log(`[EAISG Extension] Logged in successfully as "${currentUsername}" (${currentRole}).`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to login to EAISG backend:', error);
    return false;
  }
}

// Initial login
loginToBackend();

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.type === 'GET_USER_PROFILE') {
    sendResponse({
      success: !!authToken,
      username: currentUsername,
      role: currentRole,
    });
    return true;
  } else if (request.type === 'LOGIN_USER') {
    loginToBackend(request.payload.username, request.payload.password).then((success) => {
      sendResponse({
        success,
        username: currentUsername,
        role: currentRole,
      });
    });
    return true;
  } else if (request.type === 'ANALYZE_PROMPT') {
    if (!authToken) {
      loginToBackend().then(() => {
        analyzePrompt(request.payload, sendResponse);
      });
      return true;
    } else {
      analyzePrompt(request.payload, sendResponse);
      return true;
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
  } else if (request.type === 'GET_RECENT_ACTIVITY') {
    if (!authToken) {
      loginToBackend().then(() => {
        getRecentActivity(sendResponse);
      });
      return true;
    } else {
      getRecentActivity(sendResponse);
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

async function analyzeFile(payload: { fileName: string; fileType: string; fileData: string; aiModel?: string }, sendResponse: (response: any) => void) {
  try {
    if (!authToken) {
      await loginToBackend();
    }
    const blob = b64toBlob(payload.fileData, payload.fileType);
    const createFormData = () => {
      const fd = new FormData();
      fd.append('destination_id', '1');
      if (payload.aiModel) fd.append('ai_model', payload.aiModel);
      fd.append('file', blob, payload.fileName);
      return fd;
    };

    let response = await fetch('http://127.0.0.1:8000/api/v1/analyze/file', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
      body: createFormData(),
    });

    if (response.status === 401) {
      await loginToBackend();
      response = await fetch('http://127.0.0.1:8000/api/v1/analyze/file', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        body: createFormData(),
      });
    }
    
    if (!response.ok) {
      sendResponse({ success: false, error: `HTTP ${response.status}` });
      return;
    }

    const data = await response.json();
    sendResponse({ success: true, data });
  } catch (error) {
    console.error('Analyze file error:', error);
    sendResponse({ success: false, error: String(error) });
  }
}

async function analyzePrompt(payload: { prompt: string; aiModel?: string }, sendResponse: (response: any) => void) {
  try {
    if (!authToken) {
      await loginToBackend();
    }
    let response = await fetch('http://127.0.0.1:8000/api/v1/analyze/prompt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        prompt: payload.prompt,
        ai_model: payload.aiModel,
        destination_id: 1,
      }),
    });

    if (response.status === 401) {
      console.warn('[EAISG Extension] Token expired, re-authenticating...');
      await loginToBackend();
      response = await fetch('http://127.0.0.1:8000/api/v1/analyze/prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          prompt: payload.prompt,
          ai_model: payload.aiModel,
          destination_id: 1,
        }),
      });
    }

    if (!response.ok) {
      console.error('[EAISG Extension] Gateway response not ok:', response.status);
      sendResponse({ success: false, error: `HTTP ${response.status}` });
      return;
    }

    const data = await response.json();
    sendResponse({ success: true, data });
  } catch (error) {
    console.error('Analyze prompt error:', error);
    sendResponse({ success: false, error: String(error) });
  }
}

async function getRecentActivity(sendResponse: (response: any) => void) {
  try {
    if (!authToken) {
      await loginToBackend();
    }
    let response = await fetch("http://127.0.0.1:8000/api/v1/dashboard/requests?limit=5", {
      headers: { "Authorization": `Bearer ${authToken}` },
    });
    
    if (response.status === 401) {
      await loginToBackend();
      response = await fetch("http://127.0.0.1:8000/api/v1/dashboard/requests?limit=5", {
        headers: { "Authorization": `Bearer ${authToken}` },
      });
    }

    const destResponse = await fetch("http://127.0.0.1:8000/api/v1/settings/destinations", {
      headers: { "Authorization": `Bearer ${authToken}` },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch activity: HTTP ${response.status}`);
    }
    
    const requests = await response.json();
    const destinations = destResponse.ok ? await destResponse.json() : [];
    
    const destMap: Record<number, any> = {};
    for (const d of destinations) {
      destMap[d.id] = d;
    }
    
    const merged = requests.map((r: any) => ({
      ...r,
      destination: destMap[r.destination_id] || { name: r.ai_model || "AI Model", provider: r.ai_model || "AI Model" },
    }));
    
    sendResponse({ success: true, data: merged });
  } catch (error) {
    console.error("Get recent activity error:", error);
    sendResponse({ success: false, error: String(error) });
  }
}