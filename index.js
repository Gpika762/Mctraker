const express = require('express');
const axios = require('axios');
const app = express();
const port = process.env.PORT || 10000;

// Estado inicial
let estadoCajita = {
    nombre: "Sincronizando...",
    progreso: "0",
    metodo: "Auto"
};

let historial = [];

// Función para consultar la API de McDonald's (Arcos Dorados)
async function consultarAPI() {
    try {
        // Endpoint dinámico para Chile (puedes ajustar el país CL/AR/MX)
        const response = await axios.get('https://cache-backend-mcd.mcdonalds.com/api/v1/content-service/cl/happymeal', {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 5000
        });

        if (response.data && response.data.data) {
            // Intentamos extraer el nombre de la promoción actual
            const promo = response.data.data[0]; 
            estadoCajita.nombre = promo.title || "Colección Nueva";
            estadoCajita.progreso = "100";
            estadoCajita.metodo = "API Automática";
            console.log(`[AUTO]: Detectado ${estadoCajita.nombre}`);
        }
    } catch (error) {
        console.log("[ERROR API]: No se pudo obtener datos automáticamente.");
        // Si falla, no sobreescribimos para no borrar lo que haya puesto el usuario manualmente
    }
}

// Consultar cada 1 hora automáticamente
setInterval(consultarAPI, 3600000);
consultarAPI();

// Middleware de Logs
app.use((req, res, next) => {
    const log = {
        hora: new Date().toLocaleTimeString(),
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        ruta: req.url,
        userAgent: req.headers['user-agent'] || 'Desconocido'
    };
    historial.unshift(log);
    if (historial.length > 15) historial.pop();
    next();
});

// --- RUTA PARA EL LG T310i ---
app.get('/status', (req, res) => {
    res.set('Content-Type', 'text/plain');
    res.send(`${estadoCajita.nombre}|${estadoCajita.progreso}`);
});

// --- PANEL DE CONTROL (UPDATE MANUAL) ---
app.get('/update', (req, res) => {
    const { n, p } = req.query;
    if (n) {
        estadoCajita.nombre = n.replace(/_/g, ' ');
        estadoCajita.metodo = "Manual";
    }
    if (p) estadoCajita.progreso = p;
    res.send(`OK: LG mostrará ${estadoCajita.nombre}`);
});

// --- DEBUGGER MEJORADO ---
app.get('/debug', (req, res) => {
    let logsHtml = historial.map(l => `
        <div style="border-bottom: 1px solid #eee; padding: 10px; font-family: monospace; font-size: 12px;">
            <span style="color: #888;">[${l.hora}]</span> 
            <b style="color: #d32f2f;">${l.ip}</b> -> 
            <span style="background: #e3f2fd; padding: 2px 5px; border-radius: 3px;">${l.ruta}</span>
            <br><small style="color: #999;">${l.userAgent}</small>
        </div>
    `).join('');

    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>McTracker Debugger</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body { font-family: -apple-system, sans-serif; background: #f4f4f9; margin: 0; padding: 20px; }
                .card { background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); padding: 20px; margin-bottom: 20px; }
                .status-badge { display: inline-block; padding: 5px 10px; border-radius: 20px; background: #ffc107; color: black; font-weight: bold; }
                .btn { display: inline-block; background: #d32f2f; color: white; padding: 10px 15px; border-radius: 8px; text-decoration: none; margin-top: 10px; }
            </style>
        </head>
        <body>
            <div class="card">
                <h1 style="margin-top:0; color:#d32f2f;">🍟 McTracker Proxy</h1>
                <p><strong>Evento Actual:</strong> <span style="font-size: 1.2em; color: #333;">${estadoCajita.nombre}</span></p>
                <p><strong>Progreso:</strong> ${estadoCajita.progreso}%</p>
                <p><strong>Modo:</strong> <span class="status-badge">${estadoCajita.metodo}</span></p>
                <a href="/status" class="btn">Ver texto plano (LG)</a>
            </div>

            <div class="card">
                <h3>🛰️ Historial de Conexiones</h3>
                <div style="max-height: 300px; overflow-y: auto; border: 1px solid #ddd; border-radius: 8px;">
                    ${logsHtml || '<p style="padding:10px;">Esperando conexiones...</p>'}
                </div>
            </div>
            
            <p style="text-align:center; color:#999; font-size:12px;">McTracker para LG T310i - 2026</p>
        </body>
        </html>
    `);
});

app.listen(port, () => {
    console.log(`Servidor corriendo en puerto ${port}`);
});
