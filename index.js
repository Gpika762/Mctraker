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

// --- 2. BUSCADOR DE COLECCIONES ANTIGUAS (Fandom) ---
async function cargarHistorialFandom() {
    try {
        console.log("Intentando bypass para Fandom...");
        
        // Intentamos usar un servicio de proxy gratuito para saltar el 403
        const urlProxy = 'https://api.allorigins.win/get?url=' + encodeURIComponent('https://kidsmeal.fandom.com/wiki/McDonald%27s_Happy_Meal_(USA)/List_of_toys');
        
        const response = await axios.get(urlProxy, { timeout: 15000 });
        const data = response.data.contents; // AllOrigins devuelve el HTML dentro de 'contents'

        const $ = cheerio.load(data);
        let listaTemp = [];
        
        $('table.wikitable b a').each((i, el) => {
            let item = $(el).text().trim();
            if (item && item.length > 2) listaTemp.push(item);
            return i < 59; 
        });

        if (listaTemp.length > 0) {
            coleccionesHistoricas = listaTemp;
            console.log("¡Bypass exitoso! Historia cargada.");
        } else {
            throw new Error("HTML vacío");
        }

    } catch (error) {
        console.log("Fandom bloqueado totalmente. Activando Lista de Respaldo Local.");
        
        // LISTA DE RESPALDO (Los mejores juguetes de la historia para tu LG)
        coleccionesHistoricas = [
            "Super Mario 3 (1990)",
            "Pokemon Advanced (2005)",
            "Star Wars Episode III",
            "Beanie Babies (1997)",
            "Hot Wheels 1999",
            "Disney 100 Years",
            "Spider-Man 2 (2004)",
            "Hello Kitty 40th",
            "Batman Animated Series",
            "Yu-Gi-Oh! (2002)",
            "Shrek 2 (2004)",
            "Sonic the Hedgehog",
            "Minions (2015)",
            "Adventure Time",
            "Power Rangers (1995)"
        ];
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

app.get('/history', (req, res) => {
    res.set('Content-Type', 'text/plain');
    res.send(coleccionesHistoricas.length > 0 ? coleccionesHistoricas.join(';') : "Cargando historia...");
});

// --- RUTA DE EMERGENCIA (Para cambiar el nombre manualmente si Google falla) ---
app.get('/update', (req, res) => {
    const { n, p } = req.query;
    if (n) {
        estadoCajita.nombre = n.replace(/_/g, ' ');
        estadoCajita.fuente = "Manual Update";
    }
    if (p) estadoCajita.progreso = p;
    res.send(`OK: LG mostrará ${estadoCajita.nombre}`);
});

// --- DEBUGGER PRO ---
app.get('/debug', (req, res) => {
    let listaHtml = coleccionesHistoricas.map(item => `<li>${item}</li>`).join('');
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>McTracker Debugger</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body { font-family: sans-serif; background: #f0f2f5; margin: 0; padding: 20px; color: #333; }
                .container { max-width: 600px; margin: auto; }
                .card { background: white; border-radius: 15px; padding: 20px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); margin-bottom: 20px; border-top: 5px solid #d32f2f; }
                .history-card { border-top-color: #ffbc0d; }
                h1 { color: #d32f2f; font-size: 24px; }
                ul { text-align: left; height: 150px; overflow-y: scroll; background: #fafafa; border: 1px solid #ddd; padding: 10px; border-radius: 10px; list-style: none; }
                li { padding: 5px 0; border-bottom: 1px solid #eee; font-size: 14px; }
                .btn { display: inline-block; padding: 10px 20px; background: #d32f2f; color: white; text-decoration: none; border-radius: 10px; font-weight: bold; margin: 5px; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🍟 McTracker Proxy</h1>
                
                <div class="card">
                    <h3>Evento Actual</h3>
                    <p style="font-size: 22px; margin: 10px 0;"><b>${estadoCajita.nombre}</b></p>
                    <p>Progreso: <b>${estadoCajita.progreso}%</b></p>
                    <small>Fuente: ${estadoCajita.fuente}</small>
                </div>

                <div class="card history-card">
                    <h3>📜 Museo (Fandom Wiki)</h3>
                    <p>Total items: ${coleccionesHistoricas.length}</p>
                    <ul>${listaHtml || '<li>Cargando...</li>'}</ul>
                </div>

                <div class="links">
                    <a href="/status" class="btn">/status</a>
                    <a href="/history" class="btn" style="background:#ffbc0d; color:black;">/history</a>
                </div>
            </div>
        </body>
        </html>
    `);
});

app.listen(port, () => console.log(`Servidor de Coleccionismo Activo`));
