# Real-Time Chat Application

A full-stack, real-time messaging application built with the MERN stack (MongoDB, Express, React, Node.js) and Socket.io. The application supports instant peer-to-peer messaging, live presence detection, and message delivery status indicators.

## Features

*   **Real-Time Messaging:** Instantaneous message delivery and reception powered by Socket.io.
*   **User Authentication:** Secure registration and login flows using JWT (JSON Web Tokens) and bcrypt password hashing.
*   **Live Presence Indicators:** Real-time tracking of user connections to display active/online status.
*   **Read Receipts:** Sophisticated message status tracking (Sent, Delivered, and Read) with visual indicators.
*   **Unread Message Badges:** Conversation-level counters for unread messages that automatically clear upon opening the chat.
*   **Dynamic Avatars:** Auto-generated profile avatars based on user initials with gradient backgrounds.
*   **Responsive UI:** A modern, clean interface styled with Tailwind CSS.

## Technology Stack

*   **Frontend:** React.js, Tailwind CSS
*   **Backend:** Node.js, Express.js
*   **Database:** MongoDB Atlas, Mongoose
*   **Real-Time Communication:** Socket.io
*   **Authentication:** JSON Web Tokens (JWT), bcryptjs

## Local Setup and Installation

### Prerequisites

*   Node.js (v14 or higher)
*   A MongoDB Atlas account and cluster (or a local MongoDB instance)

### 1. Clone the Repository

```bash
git clone https://github.com/SagarHipparagi/chat-app.git
cd chat-app
```

### 2. Install Dependencies

The application requires dependencies to be installed in both the `client` and `server` directories.

```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### 3. Environment Configuration

Create a `.env` file in the `server` directory and add the following variables:

```env
PORT=8000
DB_USERNAME=your_mongodb_username
DB_PASSWORD=your_mongodb_password
JWT_SECRET_KEY=your_secure_random_string
```

*Note: Ensure your MongoDB cluster network access is configured to allow connections from your IP address.*

### 4. Running the Application

To run the application locally, you will need to start both the frontend and backend servers.

**Start the Backend Server:**
```bash
cd server
npm start
```

**Start the Frontend Development Server:**
```bash
cd client
npm start
```

The application will be accessible at `http://localhost:3000`.

## Deployment

This application is configured for streamlined deployment on Render as a single Web Service. The backend Node.js server is configured to serve the static built React files in production, routing all traffic over a single port.

### Deploying via Render Blueprint

1.  Connect your GitHub repository to Render.
2.  Create a new "Blueprint" from the Render dashboard.
3.  Render will automatically read the `render.yaml` file in the root directory.
4.  Provide your specific environment variables (`DB_USERNAME` and `DB_PASSWORD`) when prompted by the Render dashboard.
5.  Render will automatically execute the build commands and start the unified server.

## License

This project is open-source and available under the MIT License.
