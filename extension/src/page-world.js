const originalFetch = window.fetch;

// A simple queue to keep track of pending checks
const pendingChecks = new Map();

window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (event.data && event.data.type === 'EAISG_CHECK_RESPONSE') {
    const { id, response } = event.data;
    if (pendingChecks.has(id)) {
      pendingChecks.get(id)(response);
      pendingChecks.delete(id);
    }
  }
});

function checkPromptWithEAISG(prompt) {
  return new Promise((resolve) => {
    const id = Math.random().toString(36).substring(7);
    pendingChecks.set(id, resolve);
    window.postMessage({ type: 'EAISG_CHECK_PROMPT', prompt, id }, '*');
  });
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
}

function checkFileWithEAISG(file) {
  return new Promise(async (resolve) => {
    const id = Math.random().toString(36).substring(7);
    pendingChecks.set(id, resolve);
    const fileData = await fileToBase64(file);
    window.postMessage({ type: 'EAISG_CHECK_FILE', fileData, fileName: file.name, fileType: file.type, id }, '*');
  });
}

// Intercept file inputs
document.addEventListener('change', async (event) => {
  const target = event.target;
  if (target.tagName === 'INPUT' && target.type === 'file' && target.files.length > 0) {
    const file = target.files[0];
    console.log('[EAISG] Intercepted file selection (change event):', file.name);
    const eaisgResult = await checkFileWithEAISG(file);
    if (eaisgResult.success && eaisgResult.data && eaisgResult.data.action === 'BLOCK') {
      alert('EAISG Blocked this file due to security policy violations.\n\nFindings: ' + JSON.stringify(eaisgResult.data.findings));
      target.value = ''; // Clear the selected file
    }
  }
}, true); // Capture phase

// Intercept drag and drop
document.addEventListener('drop', async (event) => {
  if (event.dataTransfer && event.dataTransfer.files.length > 0) {
    const file = event.dataTransfer.files[0];
    console.log('[EAISG] Intercepted file drop:', file.name);
    const eaisgResult = await checkFileWithEAISG(file);
    if (eaisgResult.success && eaisgResult.data && eaisgResult.data.action === 'BLOCK') {
      alert('EAISG Blocked the dropped file due to security policy violations.\n\nPlease remove the file from the chat.');
      // Cannot easily reverse a drop event asynchronously, so we warn the user.
    }
  }
}, true);

// @ts-ignore
window.fetch = async (...args) => {
  const [resource, config] = args;
  let url = '';
  
  if (typeof resource === 'string') {
    url = resource;
  } else if (resource instanceof Request) {
    url = resource.url;
  }

  // Very simplistic check to see if this is an AI chat endpoint
  // Target ChatGPT and Claude specifically
  const isChatGPT = url.includes('/conversation');
  const isClaude = url.includes('/api/append_message');
  const isGemini = url.includes('/_/BardChatUi/data/batchexecute');
  const isCopilot = url.includes('sydney.bing.com');

  if ((isChatGPT || isClaude || isGemini || isCopilot) && config && config.body) {
    try {
      let bodyObj;
      let promptText = '';
      
      try {
        bodyObj = JSON.parse(config.body);
        if (isChatGPT) {
          // ChatGPT payload extraction
          // It could be in messages array. Let's extract the last user message part.
          if (bodyObj.messages && Array.isArray(bodyObj.messages)) {
            const userMessages = bodyObj.messages.filter((m) => m?.author?.role === 'user' || !m.author);
            const lastMessage = userMessages[userMessages.length - 1] || bodyObj.messages[0];
            promptText = lastMessage?.content?.parts?.join('\n') || '';
          }
          if (!promptText) {
             // Fallback
             promptText = JSON.stringify(bodyObj);
          }
        } else if (isClaude) {
          // Claude payload extraction
          promptText = bodyObj.text || bodyObj.prompt || '';
        }
      } catch (e) {
        // Not JSON, might be URL encoded (like Gemini)
        if (typeof config.body === 'string') {
          // Simplistic extraction for non-JSON bodies (just analyze the whole body for now if it's text)
          if (config.body.length > 10) {
            promptText = config.body; 
          }
        }
      }

      if (promptText) {
        console.log('[EAISG] Intercepted prompt:', promptText);
        const eaisgResult = await checkPromptWithEAISG(promptText);
        
        console.log('[EAISG] Gateway response:', eaisgResult);
        
        if (eaisgResult.success && eaisgResult.data) {
          const action = eaisgResult.data.action; // ALLOW, SANITIZE, BLOCK

          if (action === 'BLOCK') {
            alert('EAISG Blocked this prompt due to security policy violations.\n\nFindings: ' + JSON.stringify(eaisgResult.data.findings));
            return Promise.reject(new Error('EAISG Blocked Request'));
          } else if (action === 'SANITIZE' && eaisgResult.data.sanitized_content) {
            // Replace the prompt with the sanitized version
            if (isChatGPT && bodyObj) {
              if (bodyObj.messages && Array.isArray(bodyObj.messages)) {
                const userMessages = bodyObj.messages.filter((m) => m?.author?.role === 'user' || !m.author);
                const lastMessage = userMessages[userMessages.length - 1] || bodyObj.messages[0];
                if (lastMessage && lastMessage.content && lastMessage.content.parts) {
                  // Replace the original text with sanitized text
                  lastMessage.content.parts = lastMessage.content.parts.map((part) => {
                    if (typeof part === 'string' && part.includes(promptText)) {
                      return part.replace(promptText, eaisgResult.data.sanitized_content);
                    }
                    return part;
                  });
                }
              }
              config.body = JSON.stringify(bodyObj);
            } else if (isClaude && bodyObj) {
              if (bodyObj.text) bodyObj.text = eaisgResult.data.sanitized_content;
              if (bodyObj.prompt) bodyObj.prompt = eaisgResult.data.sanitized_content;
              config.body = JSON.stringify(bodyObj);
            } else if (typeof config.body === 'string') {
              // Best effort replace for others
              config.body = config.body.replace(promptText, eaisgResult.data.sanitized_content);
            }
          }
        }
      }
    } catch (e) {
      console.error('[EAISG] Error processing fetch interception:', e);
    }
  }

  return originalFetch(...args);
};

console.log('[EAISG] Gateway Interceptor injected successfully.');
