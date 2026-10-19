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

function detectAIModel(url = '') {
  const hostname = window.location.hostname || '';
  if (url.includes('chatgpt.com') || url.includes('openai.com') || hostname.includes('chatgpt.com') || hostname.includes('openai.com')) return 'ChatGPT';
  if (url.includes('claude.ai') || hostname.includes('claude.ai')) return 'Claude';
  if (url.includes('gemini.google.com') || url.includes('/_/BardChatUi') || hostname.includes('gemini.google.com')) return 'Gemini';
  if (url.includes('sydney.bing.com') || url.includes('copilot.microsoft.com') || hostname.includes('bing.com') || hostname.includes('copilot.microsoft.com')) return 'Copilot';
  if (url.includes('perplexity.ai') || hostname.includes('perplexity.ai')) return 'Perplexity';
  return 'Unknown AI';
}

function checkPromptWithEAISG(prompt, aiModel = 'Unknown AI') {
  return new Promise((resolve) => {
    const id = Math.random().toString(36).substring(7);
    pendingChecks.set(id, resolve);
    window.postMessage({ type: 'EAISG_CHECK_PROMPT', prompt, id, aiModel }, '*');
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

function checkFileWithEAISG(file, aiModel = 'Unknown AI') {
  return new Promise(async (resolve) => {
    const id = Math.random().toString(36).substring(7);
    pendingChecks.set(id, resolve);
    const fileData = await fileToBase64(file);
    window.postMessage({ type: 'EAISG_CHECK_FILE', fileData, fileName: file.name, fileType: file.type, id, aiModel }, '*');
  });
}

// Intercept file inputs
document.addEventListener('change', async (event) => {
  const target = event.target;
  if (target.tagName === 'INPUT' && target.type === 'file' && target.files.length > 0) {
    const file = target.files[0];
    console.log('[EAISG] Intercepted file selection (change event):', file.name);
    const eaisgResult = await checkFileWithEAISG(file, detectAIModel());
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
    const eaisgResult = await checkFileWithEAISG(file, detectAIModel());
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
  
  // Target AI provider messaging endpoints
  const isChatGPT = (hostname.includes('chatgpt.com') || hostname.includes('openai.com')) &&
    (url.includes('/conversation') || url.includes('/chat') || url.includes('/backend-api') || url.includes('/backend-anon'));
  const isClaude = hostname.includes('claude.ai') &&
    (url.includes('/completion') || url.includes('/append_message') || url.includes('/chat_message') || url.includes('/conversations'));
  const isGemini = url.includes('batchexecute') || (hostname.includes('gemini.google.com') && (url.includes('/_/BardChatUi') || url.includes('batchexecute') || url.includes('/assistant')));
  const isCopilot = (hostname.includes('copilot.microsoft.com') || hostname.includes('bing.com')) &&
    (url.includes('sydney') || url.includes('/chat') || url.includes('/api/'));
  const isPerplexity = hostname.includes('perplexity.ai') &&
    (url.includes('/api/') || url.includes('/socket.io'));

  if ((isChatGPT || isClaude || isGemini || isCopilot || isPerplexity) && config && config.body) {
    try {
      // 1. Network-Level File Interception (FormData)
      if (config.body instanceof FormData) {
        for (const [key, value] of config.body.entries()) {
          if (value instanceof File || value instanceof Blob) {
            const file = value instanceof File ? value : new File([value], 'blob', { type: value.type });
            console.log('[EAISG] Intercepted file upload via fetch:', file.name);
            const eaisgResult = await checkFileWithEAISG(file, detectAIModel(url));
            if (eaisgResult.success && eaisgResult.data && (eaisgResult.data.final_action || eaisgResult.data.action) === 'BLOCK') {
              showEaisgAlert('EAISG Security Alert', 'This file upload was blocked due to security policy violations.', eaisgResult.data.findings);
              return Promise.reject(new Error('EAISG Blocked File Upload'));
            }
          }
        }
      }

      // 2. Prompt Interception
      let bodyObj;
      let promptText = '';
      
      try {
        if (typeof config.body === 'string') {
          bodyObj = JSON.parse(config.body);
        } else if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData) && !(config.body instanceof URLSearchParams)) {
          bodyObj = config.body;
        }

        if (bodyObj) {
          if (isChatGPT) {
            // ChatGPT payload extraction — only extract the actual user-typed message
            if (bodyObj.messages && Array.isArray(bodyObj.messages)) {
              const userMessages = bodyObj.messages.filter((m) => m?.author?.role === 'user' || !m.author);
              const lastMessage = userMessages[userMessages.length - 1] || bodyObj.messages[bodyObj.messages.length - 1];
              if (lastMessage?.content?.parts && Array.isArray(lastMessage.content.parts)) {
                promptText = lastMessage.content.parts.filter(p => typeof p === 'string').join('\n');
              } else if (typeof lastMessage?.content?.text === 'string') {
                promptText = lastMessage.content.text;
              } else if (typeof lastMessage?.text === 'string') {
                promptText = lastMessage.text;
              }
            } else if (typeof bodyObj.prompt === 'string') {
              promptText = bodyObj.prompt;
            } else if (typeof bodyObj.input === 'string') {
              promptText = bodyObj.input;
            }
          } else if (isClaude) {
            // Claude payload extraction
            if (typeof bodyObj.prompt === 'string') {
              promptText = bodyObj.prompt;
            } else if (typeof bodyObj.text === 'string') {
              promptText = bodyObj.text;
            } else if (bodyObj.messages && Array.isArray(bodyObj.messages)) {
              const userMsgs = bodyObj.messages.filter(m => m.role === 'user');
              const last = userMsgs[userMsgs.length - 1] || bodyObj.messages[bodyObj.messages.length - 1];
              if (typeof last?.content === 'string') {
                promptText = last.content;
              } else if (Array.isArray(last?.content)) {
                promptText = last.content.map(c => typeof c === 'string' ? c : (c?.text || '')).filter(Boolean).join('\n');
              }
            }
          } else if (isPerplexity) {
            // Perplexity payload extraction
            if (bodyObj.messages && Array.isArray(bodyObj.messages)) {
              const userMessages = bodyObj.messages.filter((m) => m.role === 'user');
              promptText = userMessages.length > 0 ? (userMessages[userMessages.length - 1].content || '') : '';
            } else if (typeof bodyObj.query === 'string') {
              promptText = bodyObj.query;
            } else if (typeof bodyObj.text === 'string') {
              promptText = bodyObj.text;
            }
          }

          // Fallback safe extraction if provider specific extraction didn't populate promptText
          if (!promptText) {
            if (typeof bodyObj.prompt === 'string' && bodyObj.prompt.trim()) promptText = bodyObj.prompt;
            else if (typeof bodyObj.query === 'string' && bodyObj.query.trim()) promptText = bodyObj.query;
            else if (typeof bodyObj.text === 'string' && bodyObj.text.trim()) promptText = bodyObj.text;
            else if (typeof bodyObj.input === 'string' && bodyObj.input.trim()) promptText = bodyObj.input;
            else if (typeof bodyObj.message === 'string' && bodyObj.message.trim()) promptText = bodyObj.message;
          }
        }
      } catch (e) {
        // Not JSON, might be URL encoded (like Gemini)
        if (typeof config.body === 'string') {
          try {
            // Decode URL encoded string to find plaintext secrets
            promptText = decodeURIComponent(config.body.replace(/\+/g, '%20'));
          } catch(decErr) {
            if (config.body.length > 10) {
              promptText = config.body; 
            }
          }
        } else if (config.body instanceof URLSearchParams) {
          try {
            promptText = decodeURIComponent(config.body.toString().replace(/\+/g, '%20'));
          } catch(decErr) {
            promptText = config.body.toString();
          }
        }
      }

      if (promptText) {
        console.log('[EAISG] Intercepted prompt:', promptText);
        const eaisgResult = await checkPromptWithEAISG(promptText, detectAIModel(url));
        
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

// Add WebSocket Interception for Perplexity, Copilot and others
const originalWebSocketSend = WebSocket.prototype.send;
WebSocket.prototype.send = function(data) {
  const hostname = window.location.hostname || '';
  if (typeof data === 'string' && (hostname.includes('perplexity.ai') || hostname.includes('bing.com') || hostname.includes('copilot.microsoft.com'))) {
    let promptText = '';
    try {
      if (data.startsWith('42')) {
        const bracketIdx = data.indexOf('[');
        if (bracketIdx !== -1) {
          const jsonStr = data.substring(bracketIdx);
          const parsed = JSON.parse(jsonStr);
          if (Array.isArray(parsed) && parsed.length >= 2) {
            const payload = parsed[1];
            if (typeof payload === 'string') {
              promptText = payload;
            } else if (payload && typeof payload === 'object') {
              promptText = payload.query || payload.text || payload.prompt || payload.query_str || payload.content || '';
            }
          }
        }
      } else {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === 'object') {
          promptText = parsed.query || parsed.text || parsed.prompt || parsed.query_str || parsed.content || '';
        }
      }
    } catch (e) {
      // Not parseable JSON wire data, pass through
    }

    if (!promptText) {
      originalWebSocketSend.call(this, data);
      return;
    }

    checkPromptWithEAISG(promptText, detectAIModel()).then(eaisgResult => {
      if (eaisgResult && eaisgResult.success && eaisgResult.data) {
        const action = eaisgResult.data.final_action || eaisgResult.data.action;
        if (action === 'BLOCK') {
          showEaisgAlert('EAISG Security Alert', 'This prompt was blocked due to security policy violations.', eaisgResult.data.findings);
          return;
        } else if (action === 'SANITIZE' && eaisgResult.data.sanitized_content) {
          const sanitizedData = data.replace(promptText, eaisgResult.data.sanitized_content);
          originalWebSocketSend.call(this, sanitizedData);
        } else {
          originalWebSocketSend.call(this, data);
        }
      } else {
        originalWebSocketSend.call(this, data);
      }
    }).catch(() => {
      originalWebSocketSend.call(this, data);
    });
    return;
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
  
  // XHR interception: only for Gemini (which uses XHR with URL-encoded bodies)
  // Claude and ChatGPT use fetch, so they are handled above.
  const isGemini = url.includes('/_/BardChatUi/data/batchexecute') || (hostname.includes('gemini.google.com') && url.includes('batchexecute'));

  if (isGemini && body) {
    const processXHR = async () => {
      // 1. Network-Level File Interception (FormData)
      if (body instanceof FormData) {
        for (const [key, value] of body.entries()) {
          if (value instanceof File || value instanceof Blob) {
            const file = value instanceof File ? value : new File([value], 'blob', { type: value.type });
            console.log('[EAISG] Intercepted file upload via XHR:', file.name);
            const eaisgResult = await checkFileWithEAISG(file, detectAIModel(url));
            if (eaisgResult.success && eaisgResult.data && (eaisgResult.data.final_action || eaisgResult.data.action) === 'BLOCK') {
              showEaisgAlert('EAISG Security Alert', 'This file upload was blocked due to security policy violations.', eaisgResult.data.findings);
              this.dispatchEvent(new Event('error'));
              return; // Block XHR
            }
          }
        }
      }

      // 2. Prompt Interception (Gemini uses URL-encoded bodies)
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
        const eaisgResult = await checkPromptWithEAISG(promptText, detectAIModel(url));
        if (eaisgResult.success && eaisgResult.data) {
          const action = eaisgResult.data.final_action || eaisgResult.data.action;
          if (action === 'BLOCK') {
            showEaisgAlert('EAISG Security Alert', 'This prompt was blocked due to security policy violations.', eaisgResult.data.findings);
            this.dispatchEvent(new Event('error'));
            return;
          } else if (action === 'SANITIZE' && eaisgResult.data.sanitized_content) {
            originalXHRSend.call(this, body);
            return;
          }
        }
      }
      originalXHRSend.call(this, body);
    };

    processXHR();
    return;
  }
  
  return originalXHRSend.call(this, body);
};

console.log('[EAISG] Gateway Interceptor injected successfully.');
