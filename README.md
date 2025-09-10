# AI Voice Calendar ⏰🎙️

AI-powered voice calendar app with **Flow blockchain staking mechanics**.  
Users connect their Google Calendar, schedule meetings, and stake FLOW tokens.  
- If they **attend the meeting**, their stake is returned.  
- If they **miss the meeting**, they lose their stake.  

This introduces **accountability** and **skin in the game** for time management.

---

## 🚀 Features
- **Voice-powered assistant**  
  Interact with the app using natural voice commands to schedule, cancel, and check appointments.
- **Google Calendar integration**  
  Sync events seamlessly with your Google Calendar.
- **Flow staking system**  
  - Stake FLOW tokens before a meeting.  
  - Attend → get your FLOW back.  
  - Miss → lose your FLOW stake.  
- **Web-based app (Next.js)**  
  Modern UI with push-to-talk microphone button for interaction.  

---

## 🛠️ Tech Stack
- **Frontend**: Next.js 14 (React, App Router, Tailwind CSS, shadcn/ui)  
- **Backend**: Next.js API routes (serverless functions)  
- **AI**: OpenAI GPT-5 for natural language understanding and scheduling intents  
- **Blockchain**: Flow blockchain (Cadence smart contracts) for staking mechanics  
- **Database**: Firebase / Firestore for storing user + event metadata  
- **Integrations**: Google Calendar API  

---

## 📦 Installation

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)  
- [Flow CLI](https://developers.flow.com/tools/flow-cli/install) for blockchain interactions  
- Google Cloud credentials for Calendar API  

### Steps
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/ai-voice-calendar.git
   cd ai-voice-calendar
# ai_voice_calendar
