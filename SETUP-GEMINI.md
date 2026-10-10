# NOVA AI + Gemini – Setup (5 nimisham)

## 1. Gemini key edukka
1. https://aistudio.google.com/apikey -> Google account-la login -> **Create API key** (free).
2. Key-a copy pannunga.

## 2. Key-a podunga
`.env` file-a open pannunga -> `GEMINI_API_KEY=` pakkathula key-a paste pannunga. Save.

## 3. Server start pannunga
Node.js install irukanum (https://nodejs.org – LTS).
- Windows: **start-nova.bat** double-click.
- illa terminal-la: `npm install` then `npm start`

## 4. Check
- `npm run test-gemini` -> "✅ Gemini works" nu vandha OK.
- Browser-la **http://localhost:3000/ai-support.html** open pannunga, NOVA-kitta pesunga.

## VS Code Live Server (127.0.0.1:5500) use panna
Server (port 3000) odikittu irundha pothum – NOVA thaanaave `http://localhost:3000/api/chat`-ku connect aagum.

## Server illama quick test (key browser-la theriyum!)
`js/firebase-config.js`-la `window.TVU_GEMINI_API_KEY = 'unga key'` nu podalam.
Website public-a publish panrathukku munnaadi adha kandippa remove pannidunga.

## Vercel-la deploy panna
Vercel -> Project -> Settings -> Environment Variables -> `GEMINI_API_KEY` add pannunga (`/api/chat` thaanaave work aagum).
Private data (orders/wishlist) NOVA-la paaka venum na `FIREBASE_SERVICE_ACCOUNT_KEY` kooda add pannunga (optional).

## Problem vandha
- "Missing" nu console-la: .env-la key illa -> add panni server restart.
- Key-a .env-la podum bodhu quotes / space vendaam.
- .env-a GitHub-la upload pannadheenga (.gitignore already block pannum).
