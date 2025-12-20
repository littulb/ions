# Ignition Switch Asset Management Dashboard Blueprint

## Overview

This document outlines the design, features, and implementation of the Ignition Switch Asset Management Dashboard. The application provides a user-friendly interface for managing and monitoring a fleet of assets, with a focus on remote control capabilities via Particle.io integration.

## Implemented Features & Design

### Core Functionality

*   **Asset Listing:** Displays a grid of assets from a Firestore database.
    *   Each asset is represented by a card with its name, license, and an image.
    *   Thumbnails are uniformly sized for a clean and consistent look.
*   **Asset Details:** Clicking an asset reveals a detailed view with the following information:
    *   Asset Name
    *   Asset ID
    *   Asset License
    *   Asset VIN
    *   Asset Description
    *   Creation Date
*   **Add Asset:** A form allows users to add new assets to the Firestore database.
    *   The form includes fields for all the asset details listed above.
*   **Remote Ignition Switch:** The asset details card includes a button to remotely toggle the ignition of the asset.
    *   This feature is powered by a Particle.io device and a Firebase Function.
    *   The UI provides real-time feedback on the ignition status and the success or failure of the command.

### Design & Styling

*   **Dark Mode Theme:** The application uses a dark mode theme for a modern and visually appealing look.
*   **Material-UI (MUI):** The UI is built using the MUI component library, providing a consistent and professional feel.
*   **Responsive Design:** The layout is designed to be responsive and work well on different screen sizes.
*   **Visual Feedback:** The UI provides clear visual feedback for user actions, such as loading indicators and status messages.

### Technical Implementation

*   **React:** The front-end is built using the React library.
*   **Firebase:** The application uses the following Firebase services:
    *   **Firestore:** To store and manage asset data.
    *   **Firebase Functions:** To securely interact with the Particle.io API.
*   **Particle.io:** The remote ignition switch is controlled by a Particle.io device.
*   **`firebase.json`:**  Configured for hosting and functions deployment.
*   **`ignitioncode/index.js`:** Contains the Firebase Function that interacts with the Particle.io API.

## Plan for Requested Changes

The following is a to-do list of features to add broken down into tasks and subtasks:

### Task 1: New Features to add to the asset card

*   **Subtask 1.1: Implement Live GPS Tracking**
    *   Add a place in the details of the asset card that shows a map of where the asset is/will be.
    *   Add a field to the assets document schema that stores the location (in an array string field called `assetLocation`). The last index in the array is the location that shows on the map.
*   **Subtask 1.2: Develop Trip History Details**
    *   Create a link in the asset details card that will show/hide a new trip history component that shows a list of past locations pulled from the `assetLocation` array field values.
*   **Subtask 1.4: Design Analytics Dashboard (`dashboard.jsx`)**
    *   Show the number of cars with kill switches activated and the number of cars without the switch activated.

### Task 2: Asset Maintenance Features

*   **Subtask 2.1: Implement Vehicle Details Management**
*   **Subtask 2.2: Add Service History Tracking**
*   **Subtask 2.3: Implement Maintenance Reminders Functionality**

### Task 3: User account and Role Management

*   **Subtask 3.1: Define Various Admin Roles with Different Permissions**
    *   Should be able to create admin users.
*   **Subtask 3.2: Implement User Onboarding and Management Functionality**
    *   After an admin user is created they can go through onboarding to set their roles.

### Task 4: Billing Functionality (Stripe API)

*   **Subtask 4.1: Develop Automated Invoice Generation System**
*   **Subtask 4.2: Integrate with Payment Gateways**
*   **Subtask 4.3: Add Payment History and Balance Tracking Functionality**
