const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const port = process.env.PORT || 3000;

// پوشه لاگ
const LOG_DIR = path.join(__dirname, 'logs');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR);

app.use(express.static('public'));

// ذخیره موقعیت
function saveLocation(data) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = path.join(LOG_DIR, `location_${data.userId}_${timestamp}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    
    const logFile = path.join(LOG_DIR, 'all_locations.jsonl');
    fs.appendFileSync(logFile, JSON.stringify(data) + '\n');
    console.log(`[+] Location saved: ${data.userId}`);
}

// پنل مدیریت
app.get('/panel', (req, res) => {
    const logFile = path.join(LOG_DIR, 'all_locations.jsonl');
    let latestData = [];
    if (fs.existsSync(logFile)) {
        const lines = fs.readFileSync(logFile, 'utf-8').split('\n').filter(Boolean);
        latestData = lines.slice(-30).map(line => JSON.parse(line));
    }
    
    let html = `<!DOCTYPE html>
    <html><head><title>پنل ردیابی</title>
    <meta charset="UTF-8"><meta http-equiv="refresh" content="10">
    <style>
        body { background: #0a0a0a; color: #0f0; font-family: monospace; padding: 20px; }
        .entry { background: #1a1a1a; padding: 15px; border-radius: 8px; margin-bottom: 15px; border-left: 3px solid #0f0; }
        .time { color: #ff0; } .user { color: #0ff; } .coords { color: #f0f; }
        a { color: #0ff; }
    </style>
    </head><body>
    <h1>📍 پنل ردیابی موقعیت</h1>
    <p>تعداد ورودی‌ها: ${latestData.length}</p>`;
    
    latestData.forEach(entry => {
        const time = entry.timestamp ? new Date(entry.timestamp).toLocaleString() : 'نامشخص';
        const user = entry.userId || 'نامشخص';
        const lat = entry.location?.latitude || 'نامشخص';
        const lng = entry.location?.longitude || 'نامشخص';
        html += `
            <div class="entry">
                <p class="time">⏱️ ${time}</p>
                <p class="user">👤 کاربر: ${user}</p>
                <p class="coords">🌐 موقعیت: ${lat}, ${lng}</p>
                <p><a href="https://maps.google.com/maps?q=${lat},${lng}" target="_blank">📍 نمایش روی نقشه</a></p>
            </div>
        `;
    });
    
    html += `</body></html>`;
    res.send(html);
});

// WebSocket
wss.on('connection', (ws) => {
    console.log('[+] Client connected');
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            if (data.type === 'location') {
                saveLocation(data);
                ws.send(JSON.stringify({ type: 'ack', message: 'Location received' }));
            }
        } catch (e) { console.error(e); }
    });
});

server.listen(port, '0.0.0.0', () => {
    console.log(`[+] Server running on port ${port}`);
    console.log(`[+] Panel: http://your-app.onrender.com/panel`);
});