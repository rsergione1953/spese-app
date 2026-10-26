/**
 * CONFIGURAZIONE E VARIABILI GLOBALI
 */
// NOTA SOCIO: Se pubblichi su Render/Railway, cambia '127.0.0.1' con l'indirizzo HTTPS del tuo server!
const API_URL = "http://127.0.0.1:5000";

const fixedExpenses = ["Corrente", "Gas", "Telefono", "Immondizie", "Condominio", "Acqua Minerale", "Carburante"];
const fixedIncome = ["Stipendio 1", "Stipendio 2"];
const months = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];

let currentDate = new Date(2026, 9, 1);
let annualChart = null;

/**
 * 1. INIZIALIZZAZIONE E SISTEMA
 */
window.onload = () => {
    populateYearSelectors();
    updateDateDisplay();
};

function populateYearSelectors() {
    const selectors = ['year-start', 'year-end', 'graph-year-start', 'graph-year-end'];
    selectors.forEach(id => {
        const select = document.getElementById(id);
        if (!select) return;
        select.innerHTML = "";
        for (let year = 2000; year <= 2030; year++) {
            const opt = document.createElement('option');
            opt.value = year; opt.innerText = year;
            if (year === 2026) opt.selected = true;
            select.appendChild(opt);
        }
    });
}

async function updateDateDisplay() {
    const monthName = months[currentDate.getMonth()];
    const year = currentDate.getFullYear();
    document.getElementById('date-display').innerText = `${monthName} ${year}`;
    await loadTablesFromDB();
    calculateTotals();
}

function changeMonth(offset) {
    currentDate.setMonth(currentDate.getMonth() + offset);
    updateDateDisplay();
}

/**
 * 2. GESTIONE DATI (SINGLE MONTH)
 */
async function loadTablesFromDB() {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    try {
        const response = await fetch(`${API_URL}/get_data?data=${dateStr}`);
        const data = await response.json();

        const tableUscite = document.getElementById('table-uscite');
        const tableEntrate = document.getElementById('table-entrate');
        tableUscite.innerHTML = ""; tableEntrate.innerHTML = "";

        fixedExpenses.forEach(voce => {
            const found = data.find(item => item.voce === voce && item.tipo === 'uscita');
            tableUscite.appendChild(createRow(voce, found ? found.importo : 0, 'uscita'));
        });

        fixedIncome.forEach(voce => {
            const found = data.find(item => item.voce === voce && item.tipo === 'entrata');
            tableEntrate.appendChild(createRow(voce, found ? found.importo : 0, 'entrata'));
        });
    } catch (e) { console.error("Errore connessione server:", e); }
}

function createRow(voce, val, tipo) {
    const row = document.createElement('tr');
    row.innerHTML = `<td ${tipo === 'uscita' ? '' : 'contenteditable="true"'} >${voce}</td>
                    <td contenteditable="true" class="amount-cell" style="text-align: right;">€ ${val.toFixed(2)}</td>`;
    const cell = row.querySelector('.amount-cell');
    cell.addEventListener('blur', () => saveValueToDB(voce, cell.innerText, tipo));
    cell.addEventListener('input', calculateTotals);
    return row;
}

async function saveValueToDB(voce, text, tipo) {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    const value = parseCurrency(text);
    try {
        await fetch(`${API_URL}/save_data`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: dateStr, voce: voce, importo: value, tipo: tipo })
        });
    } catch (e) { console.error("Errore salvataggio:", e); }
}

/**
 * 3. ANALISI E REPORTING (ANNUAL & RANGE)
 */
async function loadAnnualBalance() {
    const startYear = document.getElementById('year-start').value;
    const endYear = document.getElementById('year-end').value;
    try {
        let labels = [], incomeData = [], expenseData = [], saldoData = [];
        if (startYear === endYear) {
            const response = await fetch(`${API_URL}/get_annual_summary?year=${startYear}`);
            const data = await response.json();
            labels = months;
            incomeData = data.map(i => i.entrate); expenseData = data.map(i => i.uscite); saldoData = data.map(i => i.saldo);
        } else {
            const response = await fetch(`${API_URL}/get_range_summary?start=${startYear}&end=${endYear}`);
            const data = await response.json();
            labels = data.map(i => i.anno); incomeData = data.map(i => i.entrate); expenseData = data.map(i => i.uscite); saldoData = data.map(i => i.saldo);
        }
        const table = document.getElementById('table-bilancio');
        table.innerHTML = "";
        labels.forEach((label, i) => {
            const row = document.createElement('tr');
            row.innerHTML = `<td>${label}</td><td style="text-align: right;">€ ${incomeData[i].toFixed(2)}</td><td style="text-align: right;">€ ${expenseData[i].toFixed(2)}</td><td style="text-align: right; font-weight: bold; color: ${saldoData[i] < 0 ? "red" : "black"};">€ ${saldoData[i].toFixed(2)}</td>`;
            table.appendChild(row);
        });
    } catch (e) { console.error("Errore bilancio:", e); }
}

async function loadChart() {
    const startYear = document.getElementById('graph-year-start').value;
    const endYear = document.getElementById('graph-year-end').value;
    try {
        let labels = [], incomeData = [], expenseData = [], title = "";
        if (startYear === endYear) {
            const response = await fetch(`${API_URL}/get_annual_summary?year=${startYear}`);
            const data = await response.json();
            labels = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
            incomeData = data.map(i => i.entrate); expenseData = data.map(i => i.uscite);
            title = `Andamento Mesi ${startYear}`;
        } else {
            const response = await fetch(`${API_URL}/get_range_summary?start=${startYear}&end=${endYear}`);
            const data = await response.json();
            labels = data.map(i => i.anno); incomeData = data.map(i => i.entrate); expenseData = data.map(i => i.uscite);
            title = `Confronto Annuale ${startYear} - ${endYear}`;
        }
        const ctx = document.getElementById('myChart').getContext('2d');
        if (annualChart) annualChart.destroy();
        annualChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Entrate', data: incomeData, borderColor: '#2e7d32', backgroundColor: 'rgba(46, 125, 50, 0.1)', borderWidth: 3, tension: 0.3, fill: true },
                    { label: 'Uscite', data: expenseData, borderColor: '#c62828', backgroundColor: 'rgba(198, 40, 42, 0.1)', borderWidth: 3, tension: 0.3, fill: true }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: title } } }
        });
    } catch (e) { console.error("Errore grafico:", e); }
}

/**
 * 4. EXPORT & RESTORE (IL CUORE DEL NUOVO SISTEMA)
 */
async function exportToCSV() {
    try {
        const response = await fetch(`${API_URL}/export_all`);
        if (!response.ok) throw new Error("Server non raggiungibile");

        const data = await response.json();
        if (data.length === 0) { alert("Nessun dato da esportare!"); return; }

        let csv = "Data;Voce;Importo;Tipo\n";
        data.forEach(item => {
            csv += `${item.data};${item.voce};${item.importo.toFixed(2)};${item.tipo}\n`;
        });

        // Aggiunta BOM per compatibilità totale con Excel (UTF-8)
        const BOM = "\uFEFF";
        const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `export_spese_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        alert("✅ Esportazione riuscita! Salva il file nella tua cartella sincronizzata.");
    } catch (e) {
        console.error(e);
        alert("Errore esportazione: Assicurati che il server sia attivo.");
    }
}

async function handleRestore(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        const text = e.target.result;
        const lines = text.split("\n").slice(1); // Salta l'intestazione (Data;Voce...)
        let count = 0;

        try {
            for (let line of lines) {
                if (!line.trim()) continue;
                const [data, voce, importo, tipo] = line.split(";");

                // Inviamo ogni riga al server per salvarla nel DB
                const response = await fetch(`${API_URL}/save_data`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        data: data,
                        voce: voce,
                        importo: parseFloat(importo),
                        tipo: tipo
                    })
                });
                if (response.ok) count++;
            }
            alert(`✅ Ripristino completato! ${count} voci caricate correttamente.`);
            updateDateDisplay(); // Ricarica i dati a schermo
        } catch (err) {
            console.error(err);
            alert("Errore durante il ripristino. Verifica la connessione al server.");
        }
    };
    reader.readAsText(file);
}

/**
 * 5. UTILS E CALCOLO
 */
function parseCurrency(text) {
    const clean = text.replace('€', '').replace(/\s/g, '').replace(',', '.').trim();
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
}

function calculateTotals() {
    let ent = 0, usc = 0;
    document.querySelectorAll('#table-entrate .amount-cell').forEach(c => ent += parseCurrency(c.innerText));
    document.querySelectorAll('#table-uscite .amount-cell').forEach(c => usc += parseCurrency(c.innerText));
    const bil = ent - usc;
    document.getElementById('sum-entrate').innerText = `€ ${ent.toFixed(2)}`;
    document.getElementById('sum-uscite').innerText = `€ ${usc.toFixed(2)}`;
    document.getElementById('sum-bilancio').innerText = `€ ${bil.toFixed(2)}`;
    document.getElementById('sum-bilancio').style.color = bil < 0 ? "red" : "black";
}

/**
 * 6. GESTIONE INTERFACCIA (UI)
 */
document.addEventListener('keypress', (e) => {
    if (e.target.classList.contains('amount-cell') && !/[0-9.,]/.test(e.key)) e.preventDefault();
});

function showPage(pageId, btn) {
    document.querySelectorAll('.page-sheet').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    document.querySelectorAll('.btn-3d').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if (pageId === 'page-bilancio') loadAnnualBalance();
    if (pageId === 'page-grafico') loadChart();
}

function addRow(tableId, tipo) {
    const tbody = document.getElementById(tableId);
    const row = document.createElement('tr');
    row.innerHTML = `<td contenteditable="true">Nuova Voce</td><td contenteditable="true" class="amount-cell" style="text-align: right;">€ 0.00</td>`;
    const cell = row.querySelector('.amount-cell');
    cell.addEventListener('blur', () => saveValueToDB(row.cells[0].innerText, cell.innerText, tipo));
    cell.addEventListener('input', calculateTotals);
    tbody.appendChild(row);
}
