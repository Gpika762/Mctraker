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

let coleccionesHistoricas = []; // Aquí guardaremos los nombres de Fandom

// --- 1. BUSCADOR DE EVENTO ACTUAL (Tu código mejorado) ---
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

// --- 2. BUSCADOR DE COLECCIONES ANTIGUAS (Fandom) ---
async function cargarHistorialFandom() {
    try {
        const { data } = await axios.get('https://kidsmeal.fandom.com/wiki/McDonald%27s_Happy_Meal_(USA)/List_of_toys', {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const $ = cheerio.load(data);
        let listaTemp = [];
        
        // Buscamos en las tablas de la wiki (las celdas que tienen enlaces b a)
        $('table.wikitable b a').each((i, el) => {
            let item = $(el).text().trim();
            if (item && !listaTemp.includes(item)) {
                listaTemp.push(item);
            }
            return i < 49; // Traemos 50 máximo para no saturar la memoria del LG
        });
        
        coleccionesHistoricas = listaTemp;
        console.log(`[HISTORIA]: ${coleccionesHistoricas.length} items cargados.`);
    } catch (error) {
        console.log("Error cargando Fandom.");
    }
}

// Ejecutar rastreos al iniciar y luego por intervalo
setInterval(buscarEventoActual, 7200000); // Cada 2 horas
setInterval(cargarHistorialFandom, 86400000); // Cada 24 horas (el historial no cambia tanto)
buscarEventoActual();
cargarHistorialFandom();

// --- RUTAS PARA EL LG JAVA ---

// Lo que ve el LG en la pantalla principal
app.get('/status', (req, res) => {
    res.set('Content-Type', 'text/plain');
    res.send(`${estadoCajita.nombre}|${estadoCajita.progreso}`);
});

// Nueva ruta para que el LG descargue la lista histórica
app.get('/history', (req, res) => {
    res.set('Content-Type', 'text/plain');
    // Mandamos todo separado por un caracter especial para el split en Java
    // Usamos ";" porque los nombres de juguetes pueden tener comas
    res.send(coleccionesHistoricas.join(';'));
});

// --- DEBUGGER MEJORADO ---
app.get('/debug', (req, res) => {
    let listaHtml = coleccionesHistoricas.map(item => `<li>${item}</li>`).join('');
    res.send(`
        <body style="font-family:sans-serif; background:#f4f4f4; padding:20px; text-align:center;">
            <h1 style="color:#d32f2f;">🍟 McTracker Proxy Server</h1>
            
            <div style="background:white; padding:20px; border-radius:15px; display:inline-block; border:2px solid red; margin-bottom:20px;">
                <h2>Evento Actual: ${estadoCajita.nombre}</h2>
                <p>Progreso: ${estadoCajita.progreso}% | Fuente: ${estadoCajita.fuente}</p>
            </div>

            <div style="background:white; padding:20px; border-radius:15px; max-width:500px; margin:0 auto; border:2px solid gold;">
                <h3>📜 Historial (Fandom Wiki)</h3>
                <ul style="text-align:left; height:200px; overflow-y:scroll;">
                    ${listaHtml || 'Cargando historia...'}
                </ul>
            </div>
            <br>
            <a href="/status">Ver /status</a> | <a href="/history">Ver /history</a>
        </body>
    `);
});

app.listen(port, () => console.log(`Servidor de Coleccionismo Activo`));
