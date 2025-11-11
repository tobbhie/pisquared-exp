# Pi2 Explainer – Privacy Policy

Effective date: November 2025

Pi2 Explainer is a Chrome extension that helps users get AI‑powered explanations for content on pi2.network. We take privacy seriously and collect only what’s necessary to provide the feature.

## Summary (what we collect and why)
- Selected text you choose to explain and the current page URL: sent to your configured backend to generate the explanation.
- Extension settings: the backend URL and simple preferences, stored via `chrome.storage` on your device.
- We do not collect browsing history, credentials, or background telemetry. We do not sell user data.

## Data we process
1. Selected content: The exact text you highlight and submit, and optionally surrounding context captured by the page selection.  
2. Page URL: Used to improve retrieval and relevance (RAG) on the backend.  
3. Settings: Backend endpoint and feature toggles saved locally using `chrome.storage`.  

## How the data is used
- To generate an explanation via your configured backend service (e.g., a Render‑hosted API you control).  
- The backend may use vector search and an LLM provider (e.g., OpenRouter or Fireworks) to fulfill your request. Those providers process the prompt to return an answer.

## Data retention
- The extension itself does not retain your submitted text beyond the active request.  
- Your backend may store embeddings or logs if you configured it to do so. You control that server and its retention. Review your backend and LLM provider policies for details.

## Data sharing
- We do not share data with third parties from the extension.  
- When you trigger an explain request, your selected text and URL are transmitted to your configured backend, which may forward prompts to an LLM provider strictly to fulfill the request.

## Permissions used
- `storage`: save extension options (e.g., backend URL) locally.  
- Host permissions (e.g., `http://localhost:3001/*`, `https://*.onrender.com/*`): allow the background script to call only your backend API.  
- Content scripts run on `pi2.network` pages to provide the explain UI; they do not access data on other sites.

## Cookies and tracking
- The extension does not set or read third‑party cookies, nor does it include analytics or tracking scripts.

## User controls
- You can disable or remove the extension at any time.  
- You can change or clear the backend URL in the extension popup/options.  
- Do not submit sensitive personal data in selections you choose to explain.

## Children’s privacy
Pi2 Explainer is not directed to children under 13 and should not be used by them.

## Security
We follow least‑privilege permissions and transmit requests using HTTPS when your backend supports it. No security measure is perfect; operate your backend securely and keep keys private.

## International transfers
If your backend or chosen LLM provider is hosted outside your country, your submitted content may be processed in other jurisdictions.

## Changes to this policy
We may update this policy as the product evolves. Material changes will be reflected in this file with a new effective date.

## Contact
For questions or requests, open an issue in the repository or contact the maintainer of your deployed backend.


