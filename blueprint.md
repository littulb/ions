# Ignition Switch App Blueprint

## Overview

This application is a web-based remote control for a Particle IoT device (likely a Boron board) named "Ignition". It allows a user to turn the device on and off and view its current status. The interface communicates with the Particle Cloud API to call a function (`ignitionSwitch`) and read a variable (`ignitionStatus`).

## Project Outline

### Initial Version (as provided)

*   **Framework:** React with Vite.
*   **Styling:** Tailwind CSS.
*   **Core Logic:**
    *   A single `App` component containing all UI and business logic.
    *   A custom hook, `useParticleSwitch`, manages state and API interactions.
    *   API calls are made to the Particle Cloud using `fetch`.
    *   Hardcoded `DEVICE_ID` and `ACCESS_TOKEN` for API authentication.
*   **UI:**
    *   A single-page interface.
    *   Displays the device name and ID.
    *   Shows the current status ("on" or "off") with a visual indicator.
    *   A large toggle button to send the "on" or "off" command.
    *   A log area to display status messages, API responses, and errors.
    *   Modern, dark-themed design with gradient buttons and blur effects.

## Current Task: Initial Setup and Refactoring

### Plan

1.  **Fix Tailwind CSS Configuration:**
    *   **Problem:** The application was crashing due to a PostCSS error related to Tailwind utility classes.
    *   **Action:**
        1.  Relocated custom `body` styles from `src/index.css` to `src/App.css`.
        2.  Cleaned `src/index.css` to only include the core `@tailwind` directives.
        3.  Imported `src/App.css` into `src/main.jsx` to ensure styles are applied correctly.
        *   **Status:** Done.

2.  **Improve Security and Configuration:**
    *   **Problem:** Sensitive credentials (`ACCESS_TOKEN` and `DEVICE_ID`) are hardcoded in the `App.jsx` component, which is a significant security risk.
    *   **Action:**
        1.  Create a `.env` file to store `VITE_DEVICE_ID` and `VITE_ACCESS_TOKEN`.
        2.  Add `.env` to the `.gitignore` file to prevent committing secrets.
        3.  Update `App.jsx` to read these values from `import.meta.env`.
        *   **Status:** Pending.

3.  **Enhance UI/UX (Future):**
    *   Refine the layout for better mobile responsiveness.
    *   Improve visual feedback for loading and error states.
    *   Consider breaking down the `App` component into smaller, more manageable components.
