import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { nanoid } from "nanoid";

const app = express();
const PORT = process.env.PORT || 5000; // Important: Use PORT from environment

const CORRECT_KEY = 3;

// CORS Configuration for production
app.use(cors({
  origin: process.env.CLIENT_URL || '*', // Allow your client URL
  credentials: true
}));

app.use(bodyParser.json());

let diaryEntries = {};

function caesarDecrypt(text, shift) {
  return text
    .split("")
    .map((char) => {
      if (/[a-z]/.test(char)) {
        return String.fromCharCode(((char.charCodeAt(0) - 97 - shift + 26) % 26) + 97);
      } else if (/[A-Z]/.test(char)) {
        return String.fromCharCode(((char.charCodeAt(0) - 65 - shift + 26) % 26) + 65);
      }
      return char;
    })
    .join("");
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "OK", entries: Object.keys(diaryEntries).length });
});

// Web Dashboard
app.get("/", (req, res) => {
  const entries = Object.entries(diaryEntries).map(([id, data]) => ({
    id,
    ...data
  }));

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Server Dashboard - Secure E-Diary</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          padding: 2rem;
        }
        .container {
          max-width: 1200px;
          margin: 0 auto;
          background: white;
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          padding: 3rem;
        }
        .header {
          text-align: center;
          margin-bottom: 3rem;
          padding-bottom: 2rem;
          border-bottom: 3px solid #667eea;
        }
        .header h1 {
          font-size: 2.5rem;
          color: #667eea;
          margin-bottom: 0.5rem;
        }
        .header p {
          color: #666;
          font-size: 1.1rem;
        }
        .stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
          margin-bottom: 3rem;
        }
        .stat-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 1.5rem;
          border-radius: 15px;
          text-align: center;
        }
        .stat-card h3 {
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
        }
        .stat-card p {
          opacity: 0.9;
          font-size: 1rem;
        }
        .entries-section {
          margin-top: 2rem;
        }
        .entries-section h2 {
          color: #333;
          margin-bottom: 1.5rem;
          font-size: 1.8rem;
        }
        .entry-card {
          background: #f8f9fa;
          border: 2px solid #e9ecef;
          border-radius: 15px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          transition: all 0.3s ease;
        }
        .entry-card:hover {
          border-color: #667eea;
          box-shadow: 0 5px 15px rgba(102, 126, 234, 0.2);
        }
        .entry-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid #dee2e6;
        }
        .entry-id {
          font-family: 'Courier New', monospace;
          background: #667eea;
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-weight: bold;
          font-size: 0.9rem;
        }
        .entry-time {
          color: #666;
          font-size: 0.9rem;
        }
        .encrypted-text {
          background: #fff;
          padding: 1.5rem;
          border-radius: 10px;
          border: 2px dashed #667eea;
          font-family: 'Courier New', monospace;
          color: #333;
          word-break: break-all;
          line-height: 1.6;
        }
        .no-entries {
          text-align: center;
          padding: 3rem;
          color: #999;
          font-size: 1.2rem;
        }
        .refresh-btn {
          position: fixed;
          bottom: 2rem;
          right: 2rem;
          background: #667eea;
          color: white;
          border: none;
          padding: 1rem 2rem;
          border-radius: 50px;
          font-size: 1rem;
          cursor: pointer;
          box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
          transition: all 0.3s ease;
        }
        .refresh-btn:hover {
          background: #764ba2;
          transform: translateY(-2px);
          box-shadow: 0 7px 20px rgba(102, 126, 234, 0.6);
        }
        .key-info {
          background: #fff3cd;
          border: 2px solid #ffc107;
          border-radius: 10px;
          padding: 1rem;
          margin-bottom: 2rem;
          text-align: center;
        }
        .key-info strong {
          color: #856404;
          font-size: 1.1rem;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Server Dashboard</h1>
          <p>Secure E-Diary Server - Encrypted Message Storage</p>
        </div>

        <div class="key-info">
          <strong>🔑 Decryption Key: ${CORRECT_KEY}</strong>
          <p>Only requests with this key will be decrypted</p>
        </div>

        <div class="stats">
          <div class="stat-card">
            <h3>${entries.length}</h3>
            <p>📝 Total Entries</p>
          </div>
          <div class="stat-card">
            <h3>${CORRECT_KEY}</h3>
            <p>🔐 Caesar Shift</p>
          </div>
          <div class="stat-card">
            <h3>Active</h3>
            <p>✅ Server Status</p>
          </div>
        </div>

        <div class="entries-section">
          <h2>📬 Received Encrypted Messages</h2>
          
          ${entries.length === 0 ? `
            <div class="no-entries">
              📭 No encrypted messages received yet.<br>
              Waiting for clients to send diary entries...
            </div>
          ` : entries.map(entry => `
            <div class="entry-card">
              <div class="entry-header">
                <span class="entry-id">ID: ${entry.id}</span>
                <span class="entry-time">⏰ ${entry.timestamp}</span>
              </div>
              <div class="encrypted-text">
                🔒 ${entry.encryptedText}
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <button class="refresh-btn" onclick="location.reload()">
        🔄 Refresh
      </button>

      <script>
        setTimeout(() => location.reload(), 10000);
      </script>
    </body>
    </html>
  `);
});

// API Endpoints
app.post("/save", (req, res) => {
  const { encryptedText } = req.body;
  
  if (!encryptedText) {
    return res.status(400).json({ error: "No content provided" });
  }
  
  const id = nanoid();
  const timestamp = new Date().toLocaleString();
  
  diaryEntries[id] = {
    encryptedText,
    timestamp
  };
  
  console.log(`✅ NEW ENTRY: ${id} at ${timestamp}`);
  
  res.json({ success: true, id });
});

app.get("/entries", (req, res) => {
  const ids = Object.keys(diaryEntries);
  res.json({ ids });
});

app.post("/decrypt", (req, res) => {
  const { id, key } = req.body;
  
  if (!id || key === undefined) {
    return res.status(400).json({ error: "Missing id or key" });
  }
  
  const entry = diaryEntries[id];
  
  if (!entry) {
    return res.status(404).json({ error: "Entry not found" });
  }
  
  if (Number(key) !== CORRECT_KEY) {
    console.log(`❌ WRONG KEY for ${id}`);
    return res.status(403).json({ error: "Incorrect decryption key" });
  }
  
  const decrypted = caesarDecrypt(entry.encryptedText, CORRECT_KEY);
  console.log(`✅ DECRYPTED: ${id}`);
  
  res.json({ success: true, decrypted });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});