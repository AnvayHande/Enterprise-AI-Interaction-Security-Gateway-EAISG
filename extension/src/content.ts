// @ts-ignore
import pageWorldUrl from './page-world.js?script';

// Inject page-world.ts into the main world
const script = document.createElement('script');
script.src = chrome.runtime.getURL(pageWorldUrl);
(document.head || document.documentElement).appendChild(script);

script.onload = () => {
  script.remove();
};

// Listen for messages from the page world (using window.postMessage)
window.addEventListener('message', (event) => {
  // We only accept messages from ourselves
  if (event.source !== window) return;

  if (event.data && event.data.type === 'EAISG_CHECK_PROMPT') {
    const { prompt, id } = event.data;

    // Send it to the background script
    chrome.runtime.sendMessage(
      { type: 'ANALYZE_PROMPT', payload: prompt },
      (response) => {
        // Send the response back to the page world
        window.postMessage({ type: 'EAISG_CHECK_RESPONSE', id, response }, '*');
      }
    );
  } else if (event.data && event.data.type === 'EAISG_CHECK_FILE') {
    const { fileData, fileName, fileType, id } = event.data;
    
    chrome.runtime.sendMessage(
      { type: 'ANALYZE_FILE', payload: { fileData, fileName, fileType } },
      (response) => {
        window.postMessage({ type: 'EAISG_CHECK_RESPONSE', id, response }, '*');
      }
    );
  }
});
