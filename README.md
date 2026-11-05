# TrueTone Guard

Prompt to use:

Design a clean, professional, modern mobile app UI for "TrueTone" — an AI-powered voice authenticity and scam call detection app for Android. The app helps users detect AI-cloned/deepfake voices on suspicious phone calls and protects them from scams.

Design style: Trustworthy, secure, and calm — like a cybersecurity/fintech app (think Google Pay, Truecaller, or a banking security app). Use a clean sans-serif font, rounded cards, soft shadows, and generous white space. Primary color: deep blue or indigo (

#3B4AC7 or similar) for trust/security; accent color: teal/green for "safe," amber/orange for "risky," and red for "high risk/scam." Avoid cluttered or overly playful design — this app needs to feel serious and reliable.

Design the following screens, in this exact flow:

1. Splash/Login Screen

App logo (TrueTone name + a shield/waveform icon)

Email or phone number input field

"Send OTP" button

2. OTP Verification Screen

6-digit OTP input boxes

Countdown timer + "Resend OTP" link

"Verify & Continue" button

3. Permissions Screen

Clean list of 4 permissions with icons: Contacts, Call Log, Phone State, Microphone

Short one-line explanation under each (why it's needed)

"Allow & Continue" button

4. Home Dashboard

Top status card showing "Protection Active" with a shield icon

Recent calls list showing number, name (if known), and a small "Known"/"Unknown" tag

Bottom navigation: Home, History, Alerts, Profile

5. Incoming Call / Call Detected Screen

Shows caller number/name

Tag: "Known Contact" (green) or "Unknown Number" (amber)

If unknown: a visible "Analyze Call" button with a microphone icon

6. Voice Analysis Screen (Recording State)

Animated waveform/pulse visual showing live audio capture

Text: "Listening... put the call on speaker"

Small progress bar or timer (e.g., recording 10 seconds)

7. Behavior Check Screen (optional quick questions)

2–3 yes/no toggle questions: "Did the caller ask for money?", "Did they ask for an OTP/PIN?", "Did they create urgency?"

"Get Result" button

8. Result Screen (core screen — make this the most polished one)

Large circular percentage gauge/meter (e.g., 85%) with color coding: green (safe/human voice), amber (uncertain), red (likely AI-generated/scam)

Bold verdict text: "Likely Scam — AI-Generated Voice Detected" or "Likely Safe — Human Voice"

Risk breakdown card showing: Voice Authenticity Score, Behavior Risk Score, Combined Risk Score

Two buttons: "Block This Number" (red/destructive style) and "Ignore" (secondary/outline style)

9. Block Confirmation Modal

Simple confirmation dialog: "Block +91-XXXXXXXXXX?" with Yes/Cancel buttons

10. Incident History Screen

List/card view of past flagged calls: number, date/time, risk %, verdict tag, and whether it was blocked

Filter/sort options (All, Blocked, Safe, High Risk)

11. Incident Detail Screen

Full breakdown of one past incident: waveform snapshot, voice score, behavior flags selected, timestamp, action taken

12. Profile/Settings Screen

User info, logout button, permissions management, blocked numbers list

Use realistic sample data (Indian phone number formats, real-sounding contact names). Make the Result Screen (#8) and Home Dashboard (#4) the visual centerpiece of the design — these should look premium and trustworthy since they're the core value of the app. Ensure consistent spacing, a clear visual hierarchy, and accessible color contrast throughout.

Tips before you paste this into a tool:

If the tool lets you upload reference images, you can pair this prompt with 1–2 screenshots of Truecaller or a banking app's security screen for style reference.

If the tool has a "app type" or "category" selector, choose "Security / Utility" or "FinTech" rather than "Social" or "Entertainment" — this nudges the AI toward the serious, trustworthy visual style you need.

If it generates too playful/colorful a result, add this line: "Make it more minimal and enterprise-grade, similar to a banking security app — reduce bright colors except for status indicators."

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/79f01f31-975e-46ec-9409-6f0442a0a66e).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
