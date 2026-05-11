const express = require('express');
const app = express();
const port = process.env.PORT || 10000;

let estadoCajita = {
    nombre: "Buscando...",
    progreso: "0"
};

// Aquí guardaremos los logs para el Debugger
let historial = [];

app.use((req, res, next) => {
    const log = {
        hora: new Date().toLocaleTimeString(),
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        ruta: req.url
    };
    // Guardamos solo los últimos 10 para no llenar la RAM
    historial.unshift(log);
    if (historial.length > 10) historial.pop();
    
    console.log(`[LOG]: ${log.hora} - ${log.ip} -> ${log.ruta}`);
    next();
});

// --- RUTA PARA EL LG T310i ---
app.get('/status', (req, res) => {
    res.set('Content-Type', 'text/plain');
    res.send(`${estadoCajita.nombre}|${estadoCajita.progreso}`);
});

// --- TU PANEL DE CONTROL (UPDATE) ---
app.get('/update', (req, res) => {
    const { n, p } = req.query;
    if (n) estadoCajita.nombre = n.replace(/_/g, ' ');
    if (p) estadoCajita.progreso = p;
    res.send(`Actualizado a: ${estadoCajita.nombre}`);
});

// --- RUTA DE DEBUGGER (PARA TI) ---
app.get('/debug', (req, res) => {
    let html = `<h1>McTracker Debugger</h1>`;
    html += `<p><strong>Estado Actual:</strong> ${estadoCajita.nombre} (${estadoCajita.progreso}%)</p>`;
    html += `<h3>Últimas Conexiones:</h3><ul>`;
    historial.forEach(log => {
        html += `<li>[${log.hora}] IP: ${log.ip} -> Accedió a: ${log.ruta}</li>`;
    });
    html += `</ul>`;
    html += `<br><a href="/status">Ver lo que ve el LG</a>`;
    
    res.send(html);
});

app.listen(port, () => {
    console.log(`Debugger activo en /debug`);
});
