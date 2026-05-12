const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();
const port = process.env.PORT || 10000;

// VARIABLES DE ESTADO
let estadoCajita = { 
    nombre: "Buscando en la red...", 
    progreso: "0",
    fuente: "Ninguna"
};

let coleccionesHistoricas = []; 

// --- 1. BUSCADOR DE EVENTO ACTUAL ---
async function buscarEventoActual() {
    try {
        const urlBusqueda = 'https://www.google.com/search?q=cajita+feliz+mcdonalds+chile+mayo+2026';
        const { data } = await axios.get(urlBusqueda, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        const $ = cheerio.load(data);
        let resultados = [];
        $('h3').each((i, el) => {
            let texto = $(el).text();
            if (texto.toLowerCase().includes('cajita') || texto.toLowerCase().includes('juguetes')) {
                resultados.push(texto);
            }
        });
        if (resultados.length > 0) {
            let detectado = resultados[0].split('-')[0].split('|')[0].trim();
            estadoCajita.nombre = detectado.substring(0, 25);
            estadoCajita.progreso = "100";
            estadoCajita.fuente = "Google News Search";
        }
    } catch (error) {
        console.log("Error buscando evento actual.");
    }
}

// --- 2. BUSCADOR DE COLECCIONES ANTIGUAS (Fandom API) ---
async function cargarHistorialFandom() {
    try {
        console.log("Conectando a la API de Fandom...");
        const apiUrl = 'https://kidsmeal.fandom.com/api.php?action=parse&page=McDonald%27s_Happy_Meal_(USA)/List_of_toys&prop=links&format=json&origin=*';
        
        const response = await axios.get(apiUrl, {
            headers: { 'User-Agent': 'McTrackerBot/1.0' }
        });

        if (response.data && response.data.parse) {
            const links = response.data.parse.links;
            let listaTemp = [];
            links.forEach(link => {
                let nombre = link['*'];
                if (nombre.includes('(') && !nombre.includes(':')) {
                    listaTemp.push(nombre);
                }
            });

            if (listaTemp.length > 0) {
                coleccionesHistoricas = listaTemp; // Guardamos todas
                console.log(`[HISTORIA]: ${coleccionesHistoricas.length} colecciones cargadas.`);
                return;
            }
        }
    } catch (error) {
        console.log("Error en API Fandom: " + error.message);
    }
}

setInterval(buscarEventoActual, 7200000); 
setInterval(cargarHistorialFandom, 86400000); 
buscarEventoActual();
cargarHistorialFandom();

// --- RUTAS PARA EL LG JAVA ---

app.get('/status', (req, res) => {
    res.set('Content-Type', 'text/plain');
    res.send(`${estadoCajita.nombre}|${estadoCajita.progreso}`);
});

// Historia con PAGINACIÓN (ej: /history?p=0 para los primeros 10)
app.get('/history', (req, res) => {
    res.set('Content-Type', 'text/plain');
    const p = parseInt(req.query.p) || 0;
    const items = 10; 
    const inicio = p * items;
    const fin = inicio + items;
    
    const listaCorta = coleccionesHistoricas.slice(inicio, fin);
    res.send(listaCorta.length > 0 ? listaCorta.join(';') : "FIN");
});

// --- NUEVA RUTA DE FOTOS ---
app.get('/foto', async (req, res) => {
    const nombre = req.query.nombre;
    try {
        const apiImg = `https://kidsmeal.fandom.com/api.php?action=query&titles=${encodeURIComponent(nombre)}&prop=pageimages&format=json&pithumbsize=320&origin=*`;
        const response = await axios.get(apiImg);
        const pages = response.data.query.pages;
        const pageId = Object.keys(pages)[0];
        const source = pages[pageId].thumbnail ? pages[pageId].thumbnail.source : null;

        if (source) {
            res.redirect(source);
        } else {
            res.redirect('https://placehold.co/240x320/png?text=Sin+Imagen');
        }
    } catch (e) {
        res.status(404).send("Error");
    }
});

app.get('/update', (req, res) => {
    const { n, p } = req.query;
    if (n) { estadoCajita.nombre = n.replace(/_/g, ' '); estadoCajita.fuente = "Manual Update"; }
    if (p) estadoCajita.progreso = p;
    res.send(`OK: ${estadoCajita.nombre}`);
});

app.get('/debug', (req, res) => {
    let listaHtml = coleccionesHistoricas.slice(0, 50).map(item => `<li>${item} <a href="/foto?nombre=${encodeURIComponent(item)}" target="_blank">🖼️</a></li>`).join('');
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>McTracker Debugger</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body { font-family: sans-serif; background: #f0f2f5; padding: 20px; text-align: center; }
                .card { background: white; border-radius: 15px; padding: 20px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); margin: auto; max-width: 500px; border-top: 5px solid #d32f2f; }
                ul { text-align: left; height: 250px; overflow-y: scroll; background: #fafafa; padding: 10px; border-radius: 10px; list-style: none; border: 1px solid #ddd; }
                li { padding: 8px 0; border-bottom: 1px solid #eee; font-size: 14px; display: flex; justify-content: space-between; }
                .btn { display: inline-block; padding: 10px; background: #d32f2f; color: white; text-decoration: none; border-radius: 8px; margin: 5px; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="card">
                <h1>🍟 McTracker Proxy</h1>
                <p><b>Actual:</b> ${estadoCajita.nombre} (${estadoCajita.progreso}%)</p>
                <hr>
                <h3>📜 Museo (Primeros 50)</h3>
                <ul>${listaHtml || '<li>Cargando...</li>'}</ul>
                <div style="margin-top:20px;">
                    <a href="/status" class="btn">/status</a>
                    <a href="/history?p=0" class="btn" style="background:#ffbc0d; color:black;">/history</a>
                </div>
            </div>
        </body>
        </html>
    `);
});

app.listen(port, () => console.log(`Servidor Activo`));
