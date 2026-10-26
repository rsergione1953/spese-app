/**
 * CONFIGURAZIONE E VARIABILI GLOBALI
 */
// NON SERVE PIÙ API_URL! Tutto gira nel browser.
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
    loadTablesFromLocal(); // Carica dal LocalStorage
    calculateTotals();
}

function changeMonth(offset) {
    currentDate.setMonth(currentDate.getMonth() + offset);
    updateDateDisplay();
}

/**
 * 2. GESTIONE DATI (LOCAL STORAGE)
 */
function loadTablesFromLocal() {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

    // Recupera tutti i dati dal LocalStorage
    const allData = JSON.parse(localStorage.getItem('spese_domestiche') || '[]');

    // Filtra solo i dati del mese corrente
    const monthData = allData.filter(item => item.data === dateStr);

    const tableUscite = document.getElementById('table-uscite');
    const tableEntrate = document.getElementById('table-entrate');
    tableUscite.innerHTML = ""; tableEntrate.innerHTML = "";

    fixedExpenses.forEach(voce => {
        const found = monthData.find(item => item.voce === voce && item.tipo === 'uscita');
        tableUscite.appendChild(createRow(voce, found ? found.importo : 0, 'uscita'));
    });

    fixedIncome.forEach(voce => {
        const found = monthData.find(item => item.voce === voce && item.tipo === 'entrata');
        tableEntrate.appendChild(createRow(voce, found ? found.importo : 0, 'entrata'));
    });
}

function createRow(voce, val, tipo) {
    const row = document.createElement('tr');
    row.innerHTML = `<td ${tipo === 'uscita' ? '' : 'contenteditable="true"'} >${voce}</td>
                    <td contenteditable="true" class="amount-cell" style="text-align: right;">€ ${val.toFixed(2)}</td>`;
    const cell = row.querySelector('.amount-cell');
    cell.addEventListener('blur', () => saveValueToLocal(voce, cell.innerText, tipo));
    cell.addEventListener('input', calculateTotals);
    return row;
}

function saveValueToLocal(voce, text, tipo) {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    const value = parseCurrency(text);

    let allData = JSON.parse(localStorage.getItem('spese_domestiche') || '[]');

    // Cerca se la voce esiste già per quella data e tipo
    const index = allData.findIndex(item => item.data === dateStr && item.voce === voce && item.tipo === tipo);

    if (index > -1) {
        allData[index].importo = value; // Aggiorna
    } else {
        allData.push({ data: dateStr, voce: voce, importo: value, tipo: tipo }); // Aggiunge
    }

    localStorage.setItem('spese_domestiche', JSON.stringify(allData));
}

/**
 * 3. ANALISI E REPORTING (CALCOLI LOCALI)
 */
function loadAnnualBalance() {
    const startYear = parseInt(document.getElementById('year-start').value);
    const endYear = parseInt(document.getElementById('year-end').value);
    const allData = JSON.parse(localStorage.getItem('spese_domestiche') || '[]');

    let results = [];

    if (startYear === endYear) {
        // Calcolo per singolo anno (12 mesi)
        for (let m = 0; m < 12; m++) {
            const mStr = String(m + 1).padStart(2, '0');
            const dateStr = `${startYear}-${mStr}`;
            const monthData = allData.filter(i => i.data === dateStr);

            const entrate = monthData.filter(i => i.tipo === 'entrata').reduce((sum, i) => sum + i.importo, 0);
            const uscite = monthData.filter(i => i.tipo === 'uscita').reduce((sum, i) => sum + i.importo, 0);

            results.push({ label: months[m], entrate, uscite, saldo: entrate - uscite });
        }
    } else {
        // Calcolo per range di anni
        for (let y = startYear; y <= endYear; y++) {
            const yearData = allData.filter(i => i.data.startsWith(`${y}-`));
            const entrate = yearData.filter(i => i.tipo === 'entrata').reduce((sum, i) => sum + i.importo, 0);
            const uscite = yearData.filter(i => i.tipo === 'uscita').reduce((sum, i) => sum + i.importo, 0);

            results.push({ label: String(y), entrate, uscite, saldo: entrate - uscite });
        }
    }

    const table = document.getElementById('table-bilancio');
    table.innerHTML = "";
    results.forEach(res => {
        const row = document.createElement('tr');
        row.innerHTML = `<td>${res.label}</td><td style="text-align: right;">€ ${res.entrate.toFixed(2)}</td><td style="text-align: right;">€ ${res.uscite.toFixed(2)}</td><td style="text-align: right; font-weight: bold; color: ${res.saldo < 0 ? "red" : "black"};">€ ${res.saldo.toFixed(2)}</td>`;
        table.appendChild(row);
    });
}

function loadChart() {
    const startYear = parseInt(document.getElementById('graph-year-start').value);
    const endYear = parseInt(document.getElementById('graph-year-end').value);
    const allData = JSON.parse(localStorage.getItem('spese_domestiche') || '[]');

    let labels = [], incomeData = [], expenseData [], title = "";

    if (startYear === endYear) {
        labels = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
        incomeData = []; expenseData = [];
        for (let m = 0; m < 12; m++) {
            const dateStr = `${startYear}-${String(m + 1).padStart(2, '0')}`;
            const mData = allData.filter(i => i.data === dateStr);
            incomeData.push(mData.filter(i => i.tipo === 'entrata').reduce((sum, i) => sum + i.importo, 0));
            expenseData.push(mData.filter(i => i.tipo === 'uscita').reduce((sum, i) => sum + i.importo, 0));
        }
        title = `Andamento Mesi ${startYear}`;
    } else {
        labels = []; incomeData = []; expenseData = [];
        for (let y = startYear; y <= endYear; y++) {
            const yData = allData.filter(i => i.data.startsWith(`${y}-`));
            labels.push(String(y));
            incomeData.push(yData.filter(i => i.tipo === 'entrata').reduce((sum, i) => sum + i.importo, 0));
            expenseData.push(yData.filter(i => i.tipo === 'uscita').reduce((sum, i) => sum + i.importo, 0));
        }
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
}

/**
 * 4. EXPORT & RESTORE (Backup manuale)
 */
function exportToCSV() {
    const allData = JSON.parse(localStorage.getItem('spese_domestiche') || '[]');
    if (allData.length === 0) { alert("Nessun dato da esportare!"); return; }

    let csv = "Data;Voce;Importo;Tipo\n";
    allData.forEach(item => {
        csv += `${item.data};${item.voce};${item.importo.toFixed(2)};${item.tipo}\n`;
    });

    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `backup_spese_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    alert("✅ Backup salvato in CSV! Ora puoi spostare questo file dove preferisci.");
}

function handleRestore(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target.result;
        const lines = text.split("\n").slice(1);
        let restoredData = [];

        lines.forEach(line => {
            if (!line.trim()) return;
            const [data, voce, importo, tipo] = line.split(";");
            restoredData.push({
                data: data,
                voce: voce,
                importo: parseFloat(importo),
                tipo: tipo
            });
        });

        localStorage.setItem('spese_domestiche', JSON.stringify(restoredData));
        alert(`✅ Ripristino completato! ${restoredData.length} voci caricate.`);
        updateDateDisplay();
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
    cell.addEventListener('blur', () => saveValueToLocal(row.cells[0].innerText, cell.innerText, tipo));
    cell.addEventListener('input', calculateTotals);
    tbody.appendChild(row);
}
