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

function showEaisgAlert(title, message, findings) {
  const existingModal = document.getElementById('eaisg-alert-modal');
  if (existingModal) existingModal.remove();

  const modal = document.createElement('div');
  modal.id = 'eaisg-alert-modal';
  
  Object.assign(modal.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: '2147483647',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    opacity: '0',
    transition: 'opacity 0.3s ease-out'
  });

  const content = document.createElement('div');
  Object.assign(content.style, {
    backgroundColor: '#1e293b',
    color: '#f8fafc',
    padding: '32px',
    borderRadius: '24px',
    maxWidth: '480px',
    width: '90%',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1) inset',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    transform: 'translateY(20px) scale(0.95)',
    transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
    position: 'relative',
    overflow: 'hidden'
  });

  const accent = document.createElement('div');
  Object.assign(accent.style, {
    position: 'absolute',
    top: '0',
    left: '0',
    right: '0',
    height: '4px',
    background: 'linear-gradient(90deg, #ef4444, #f43f5e)',
    boxShadow: '0 0 20px rgba(244, 63, 94, 0.5)'
  });
  content.appendChild(accent);

  let findingsHtml = '';
  if (findings && Array.isArray(findings) && findings.length > 0) {
    findingsHtml = `
      <div style="margin-top: 4px; max-height: 220px; overflow-y: auto; background-color: rgba(15, 23, 42, 0.6); padding: 16px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
        <h4 style="margin: 0 0 12px 0; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Detected Policy Violations</h4>
        <ul style="list-style-type: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px;">
          ${findings.map(f => `
            <li style="font-size: 14px; background: rgba(255,255,255,0.03); padding: 12px 16px; border-radius: 8px; border-left: 3px solid #f43f5e; position: relative;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <strong style="color: #e2e8f0; font-weight: 600; letter-spacing: 0.02em;">${f.category}</strong> 
                <span style="color: #f43f5e; font-size: 11px; font-weight: 700; background: rgba(244,63,94,0.1); padding: 2px 8px; border-radius: 12px;">${(f.confidence * 100).toFixed(0)}% Match</span>
              </div>
              ${f.evidence ? `<div style="color: #cbd5e1; word-break: break-all; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 13px; line-height: 1.5; background: rgba(0,0,0,0.2); padding: 8px 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.02);">${f.evidence.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>` : ''}
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  }

  const mainContentHtml = `
    <div style="display: flex; align-items: flex-start; gap: 16px; z-index: 1;">
      <div style="background: rgba(244, 63, 94, 0.1); padding: 12px; border-radius: 16px; color: #f43f5e;">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
        </svg>
      </div>
      <div>
        <h2 style="margin: 0 0 8px 0; font-size: 22px; color: #f8fafc; font-weight: 700; letter-spacing: -0.01em;">${title}</h2>
        <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #94a3b8;">${message}</p>
      </div>
    </div>
    ${findingsHtml}
    <div style="display: flex; justify-content: flex-end; margin-top: 8px;">
      <button id="eaisg-alert-close" style="background: linear-gradient(135deg, #3b82f6, #2563eb); color: #ffffff; border: none; padding: 12px 28px; border-radius: 9999px; font-weight: 600; font-size: 15px; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 4px 14px 0 rgba(37, 99, 235, 0.39);">
        Acknowledge
      </button>
    </div>
  `;
  
  content.insertAdjacentHTML('beforeend', mainContentHtml);
  modal.appendChild(content);
  document.body.appendChild(modal);

  requestAnimationFrame(() => {
    modal.style.opacity = '1';
    content.style.transform = 'translateY(0) scale(1)';
  });

  const closeBtn = document.getElementById('eaisg-alert-close');
  closeBtn.addEventListener('mouseover', () => {
    closeBtn.style.transform = 'translateY(-1px)';
    closeBtn.style.boxShadow = '0 6px 20px rgba(37, 99, 235, 0.5)';
  });
  closeBtn.addEventListener('mouseout', () => {
    closeBtn.style.transform = 'translateY(0)';
    closeBtn.style.boxShadow = '0 4px 14px 0 rgba(37, 99, 235, 0.39)';
  });
  closeBtn.addEventListener('click', () => {
    modal.style.opacity = '0';
    content.style.transform = 'translateY(10px) scale(0.95)';
    setTimeout(() => modal.remove(), 300);
  });
}

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
    if (eaisgResult.success && eaisgResult.data && (eaisgResult.data.final_action || eaisgResult.data.action) === 'BLOCK') {
      showEaisgAlert('EAISG Security Alert', 'This file was blocked due to security policy violations.', eaisgResult.data.findings);
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
    if (eaisgResult.success && eaisgResult.data && (eaisgResult.data.final_action || eaisgResult.data.action) === 'BLOCK') {
      showEaisgAlert('EAISG Security Alert', 'The dropped file was blocked due to security policy violations. Please remove it from the chat.', eaisgResult.data.findings);
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

  const hostname = window.location.hostname || '';
  
  // Target ChatGPT, Claude, Gemini, Copilot, Perplexity
  const isChatGPT = url.includes('/conversation') || url.includes('chatgpt.com/backend-api') || (hostname.includes('chatgpt.com') && url.includes('/backend-api/'));
  const isClaude = url.includes('claude.ai/api') || url.includes('/api/append_message') || url.includes('/api/organizations') || (hostname.includes('claude.ai') && url.includes('/api/'));
  const isGemini = url.includes('/_/BardChatUi/data/batchexecute') || url.includes('gemini.google.com') || (hostname.includes('gemini.google.com') && url.includes('batchexecute'));
  const isCopilot = url.includes('sydney.bing.com') || hostname.includes('bing.com');
  const isPerplexity = url.includes('perplexity.ai') || hostname.includes('perplexity.ai');

  if ((isChatGPT || isClaude || isGemini || isCopilot || isPerplexity) && config && config.body) {
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
          promptText = bodyObj.prompt || bodyObj.text || JSON.stringify(bodyObj);
        } else if (isPerplexity) {
          // Perplexity payload extraction
          if (bodyObj.messages && Array.isArray(bodyObj.messages)) {
            const userMessages = bodyObj.messages.filter((m) => m.role === 'user');
            promptText = userMessages.length > 0 ? userMessages[userMessages.length - 1].content : JSON.stringify(bodyObj);
          } else {
            promptText = JSON.stringify(bodyObj);
          }
        } else {
          promptText = JSON.stringify(bodyObj);
        }
      } catch (e) {
        // Not JSON, might be URL encoded (like Gemini)
        if (typeof config.body === 'string') {
          try {
            // Decode URL encoded string to find plaintext secrets
            promptText = decodeURIComponent(config.body.replace(/\+/g, '%20'));
          } catch(decErr) {
            // Fallback to raw body
            if (config.body.length > 10) {
              promptText = config.body; 
            }
          }
        }
      }

      if (promptText) {
        console.log('[EAISG] Intercepted prompt:', promptText);
        const eaisgResult = await checkPromptWithEAISG(promptText);
        
        console.log('[EAISG] Gateway response:', eaisgResult);
        
        if (eaisgResult.success && eaisgResult.data) {
          const action = eaisgResult.data.final_action || eaisgResult.data.action; // ALLOW, SANITIZE, BLOCK

          if (action === 'BLOCK') {
            showEaisgAlert('EAISG Security Alert', 'This prompt was blocked due to security policy violations.', eaisgResult.data.findings);
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

// Add WebSocket Interception for Perplexity and others
const originalWebSocketSend = WebSocket.prototype.send;
WebSocket.prototype.send = function(data) {
  if (typeof data === 'string' && (window.location.hostname.includes('perplexity.ai') || data.includes('"prompt"') || data.includes('"messages"'))) {
    // Attempt to parse out user prompt to avoid blocking harmless socket pings
    let promptText = data;
    try {
      // Decode if it's a Socket.IO message e.g., 42["chat", {...}]
      if (data.startsWith('42')) {
        const jsonStr = data.substring(2);
        const parsed = JSON.parse(jsonStr);
        promptText = JSON.stringify(parsed);
      }
    } catch (e) {}

    checkPromptWithEAISG(promptText).then(eaisgResult => {
      if (eaisgResult.success && eaisgResult.data) {
        const action = eaisgResult.data.final_action || eaisgResult.data.action;
        if (action === 'BLOCK') {
          showEaisgAlert('EAISG Security Alert', 'This prompt was blocked due to security policy violations.', eaisgResult.data.findings);
          // Block message - do not call originalWebSocketSend
          return;
        } else if (action === 'SANITIZE' && eaisgResult.data.sanitized_content) {
          // For websockets, a simple replace might corrupt JSON. 
          // Best effort string replace.
          const sanitizedData = data.replace(promptText, eaisgResult.data.sanitized_content);
          originalWebSocketSend.call(this, sanitizedData);
        } else {
          originalWebSocketSend.call(this, data);
        }
      } else {
        originalWebSocketSend.call(this, data);
      }
    });
    return; // Async block, returning immediately
  }
  originalWebSocketSend.call(this, data);
};

// Add XMLHttpRequest Interception for Gemini and others
const originalXHROpen = XMLHttpRequest.prototype.open;
const originalXHRSend = XMLHttpRequest.prototype.send;

XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
  this._url = typeof url === 'string' ? url : (url ? url.toString() : '');
  return originalXHROpen.apply(this, arguments);
};

XMLHttpRequest.prototype.send = function(body) {
  const url = this._url || '';
  const hostname = window.location.hostname || '';
  
  const isGemini = url.includes('/_/BardChatUi/data/batchexecute') || (hostname.includes('gemini.google.com') && url.includes('batchexecute'));
  const isCopilot = url.includes('sydney.bing.com');
  const isPerplexity = url.includes('perplexity.ai') || hostname.includes('perplexity.ai');
  const isClaude = hostname.includes('claude.ai') && url.includes('/api/');
  const isChatGPT = hostname.includes('chatgpt.com') && url.includes('/backend-api/');

  if ((isGemini || isCopilot || isPerplexity || isClaude || isChatGPT) && body) {
    let promptText = '';
    
    if (typeof body === 'string') {
      try {
        promptText = decodeURIComponent(body.replace(/\+/g, '%20'));
      } catch(e) {
        promptText = body;
      }
    } else if (body instanceof URLSearchParams) {
      try {
        promptText = decodeURIComponent(body.toString().replace(/\+/g, '%20'));
      } catch(e) {
        promptText = body.toString();
      }
    }

    if (promptText && promptText.length > 5 && !promptText.includes('EAISG_CHECK')) {
      checkPromptWithEAISG(promptText).then(eaisgResult => {
        if (eaisgResult.success && eaisgResult.data) {
          const action = eaisgResult.data.final_action || eaisgResult.data.action;
          if (action === 'BLOCK') {
            showEaisgAlert('EAISG Security Alert', 'This prompt was blocked due to security policy violations.', eaisgResult.data.findings);
            // Block XHR by dispatching error and NOT calling originalXHRSend
            this.dispatchEvent(new Event('error'));
            return;
          } else if (action === 'SANITIZE' && eaisgResult.data.sanitized_content) {
            // Sanitization in URL encoded body is complex, just pass original for now
            originalXHRSend.call(this, body);
          } else {
            originalXHRSend.call(this, body);
          }
        } else {
          originalXHRSend.call(this, body);
        }
      });
      return; // Return immediately to block sync send while we check
    }
  }
  
  return originalXHRSend.call(this, body);
};

console.log('[EAISG] Gateway Interceptor injected successfully.');
