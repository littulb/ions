# Software Requirements Specification (SRS)
**Project Name:** Ignition Switch (Asset Fleet Interface)
**Version:** 1.0

## 1. Introduction
### 1.1 Purpose
This Software Requirements Specification (SRS) outlines the functional and non-functional requirements for the **Ignition Switch** application. The system serves as a centralized, high-fidelity command center (referred to as the "Obsidian Cockpit") for monitoring, tracking, and physically interacting with a distributed fleet of remote assets (e.g., vehicles, heavy machinery) equipped with IoT hardware.

### 1.2 Scope
The application provides real-time oversight of assets via a web-based dashboard. It integrates deeply with IoT hardware via the Particle Cloud API to provide live GPS telemetry, device vitals (battery, signal strength), and remote hardware execution (e.g., triggering a physical "Kill Switch"). It also serves as a database of record for vehicle details, licensing, and maintenance logs utilizing Firebase. 

## 2. Overall Description
### 2.1 Product Perspective
Ignition Switch is a standalone React-based Single Page Application (SPA). It relies on three primary external services:
1. **Google Firebase:** Serves as the primary Backend-as-a-Service (BaaS) for Authentication, Firestore (NoSQL database), Storage, and Hosting.
2. **Particle Cloud API:** Acts as the middleware for all IoT interactions, including REST function calls, diagnostic polling, and Server-Sent Events (SSE) for continuous live telemetry.
3. **Google Maps API:** Renders interactive, styled maps for live asset tracking.

### 2.2 User Classes and Characteristics
*   **Standard Operators:** Users who monitor the fleet, view telemetry, and toggle asset power states.
*   **Administrators:** Elevated users who can add new assets, manage users, and view aggregated fleet analytics.

### 2.3 Operating Environment
The application is designed to run in modern web browsers (Chrome, Safari, Firefox, Edge) and is fully responsive, targeting both desktop operation centers and mobile field devices. 

---

## 3. System Features & Functional Requirements

### 3.1 Fleet Dashboard & Analytics
*   **Description:** A high-level overview of the entire fleet.
*   **Requirements:**
    *   The system shall display aggregate data charts (e.g., Doughnut charts via Chart.js) representing the ratio of activated vs. deactivated assets.
    *   The system shall provide a paginated grid view of all registered assets, including vehicle images, names, and license plates.

### 3.2 Real-Time Asset Telemetry (IoT Integration)
*   **Description:** Granular, live hardware data streamed from individual assets.
*   **Requirements:**
    *   The system shall fetch and display the last known hardware diagnostics immediately upon asset view load.
    *   The system shall establish a continuous EventStream (`spark/device/diagnostics/update`) to receive over-the-air updates for Battery Charge percentage and Signal Strength (RSSI).
    *   The system shall gracefully handle hardware errors (e.g., displaying "Plugged In" when hardware reports an error code `-210` for a disconnected battery cell).

### 3.3 Live GPS Tracking & Mapping
*   **Description:** Spatial tracking of assets on a styled map interface.
*   **Requirements:**
    *   The system shall trigger a custom `getLocation` firmware payload via Particle API.
    *   The system shall listen to a private `gps-telemetry` event stream and update the asset's map pin in real-time.
    *   The map shall support both a contained modal view and a fullscreen cinematic view with overlaid telemetry overlays.

### 3.4 Remote Hardware Control (Kill Switch)
*   **Description:** The ability to physically interrupt or restore power/ignition to a remote asset.
*   **Requirements:**
    *   The system shall provide an "ACTIVATE SWITCH" and "DEACTIVATE SWITCH" toggle.
    *   The toggle shall execute a POST request to a specific Particle firmware function (`ignitionSwitch`).
    *   The UI must reflect the pending network state and enforce a cooldown/retry limit if the hardware fails to acknowledge the command.

### 3.5 Asset Management & Maintenance Logging
*   **Description:** Administrative CRUD operations for fleet data.
*   **Requirements:**
    *   The system shall allow users to view detailed vehicle specifications (VIN, License, Description).
    *   The system shall allow operators to log maintenance events with associated costs and timestamps to Firestore.

### 3.6 Authentication & Role-Based Access
*   **Description:** Secure entry and route protection.
*   **Requirements:**
    *   The system shall require active authentication (Email/Password or Google via Firebase Auth) to access the dashboard.
    *   Specific routes (e.g., `/admin`) shall be protected by Role-Based Access Control (RBAC).

---

## 4. User Interface (UI) & User Experience (UX)
### 4.1 Design System ("Obsidian Cockpit")
*   The application shall utilize a dark-mode-first, high-fidelity design language characterized by deep surface container grays (`#1b2025`), vibrant primary accents (e.g., `#90d792` for active states), and uppercase modern typography (`Space Grotesk`).
*   Transitions, hover scaling, and gradient overlays shall be used to ensure a premium, cinematic feel.

---

## 5. Non-Functional Requirements
### 5.1 Performance & Reliability
*   The system shall gracefully handle offline or sleeping hardware by enforcing a 35-second timeout on Cellular event listeners before alerting the user.
*   The system shall enforce strict local/memory caching for Firestore (`memoryLocalCache`) to prevent browser-specific IndexedDB corruption bugs.

### 5.2 Security
*   All communication with the Particle Cloud shall be secured via OAuth/Bearer tokens over HTTPS.
*   The Firestore database shall implement Security Rules to restrict read/write access to authenticated users only.
*   Environment variables shall be used to protect Google Maps API keys and Particle Access Tokens in the build environment.
