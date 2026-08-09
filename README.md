# Personal OJT Logbook

A React + TypeScript web app for OJT students who want a personal logbook with local browser storage.

## Features

- Gmail-based sign-in screen
- Dashboard with rendered hours and progress
- Daily Records page that combines attendance and logbook entries
- Optional fields for activities, skills learned, challenges, reflection, and remarks
- Profile page for student and OJT details
- IndexedDB storage
- Backup export and import for moving records to another device
- Printable OJT report

## Google Sign-In

To enable official Google Sign-In, create a Google OAuth client ID and place it in a local `.env` file:

```txt
VITE_GOOGLE_CLIENT_ID=your-google-client-id-here
```

Without a Google Client ID, the app still lets the student continue with a Gmail address for local personal use.

## Run

```txt
npm install
npm run dev
```

If npm has certificate issues on the machine, fix the npm/registry certificate first, then run the commands again.
