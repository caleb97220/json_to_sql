// Parse JSON/JSONL and bind it directly to an in-memory table named "data'
    function processJSON() {
        let rawText = document.getElementById('jsonInput').value
            .replace(/\u00A0/g, ' ') // Remove non-breaking spaces
            .trim();

        if (!rawText) {
            showToast('Please paste or upload some data first.', 'error');
            return;
        }

        let parsedRows = [];

        try {
            // STRATEGY: First try parsing as standard JSON
            try {
                let data = JSON.parse(rawText);
            
                if (Array.isArray(data)) {
                    parsedRows = data;
                } else if (data && typeof data === 'object') {
                    // Find a nested dict-of-records (structure-based, not name-based)
                    let candidateKey = Object.keys(data).find(k => {
                        const v = data[k];
                        return v && typeof v === 'object' && !Array.isArray(v) &&
                            Object.keys(v).length > 0 &&
                            Object.values(v).every(item => item && typeof item === 'object' && !Array.isArray(item));
                    });

                    if (candidateKey) {
                        // Everything else at the top level becomes "shared" columns,
                        // merged into every inner row.
                        let outerFields = {};
                        Object.keys(data).forEach(k => {
                            if (k !== candidateKey) outerFields[k] = data[k];
                        });

                        parsedRows = Object.values(data[candidateKey]).map(innerRow => ({
                            ...outerFields,
                            ...innerRow
                        }));
                    } else {
                        parsedRows = [data];
                    }
                }


            } catch (jsonErr) {
                // FALLBACK: If standard JSON fails, try parsing as JSON Lines (JSONL)
                parsedRows = rawText.split('\n')
                    .map(line => line.trim())
                    .filter(line => line.length > 0 && !line.startsWith('//'))
                    .map(line => JSON.parse(line));
            }

            if (parsedRows.length === 0) {
                showToast("No valid records found in data.", 'error');
                return;
            }

            // Register table into AlaSQL
            alasql.tables.data = { data: parsedRows };

            // Discover unique keys for badges
            let keys = new Set(); 
            parsedRows.forEach(row => {
                if (row && typeof row === 'object') {
                    Object.keys(row).forEach(k => keys.add(k));
                }
            });

            const keyListDiv = document.getElementById('keyList'); 
            keyListDiv.innerHTML = '';
            keys.forEach(key => {
                keyListDiv.innerHTML += `<span class="key-badge">${key}</span>`;
            });

            document.getElementById('sqlInput').value = "SELECT * \nFROM data \nWHERE 1=1";

            showToast(`Successfully registered table 'data' with ${parsedRows.length} rows!`, 'success');

        } catch (err) {
            console.error("Parsing error detail:", err);
            showToast("Parsing failed. Please validate your input.", 'error');
            delete alasql.tables.data;   // so runQuery's guard correctly blocks
            document.getElementById('keyList').innerHTML = 'Upload/Paste JSON to discover columns...';
        }
        document.getElementById('tableOutput').innerHTML = 'No query executed yet.';
        lastResult = null;
        document.getElementById('downloadBtn').style.display = 'none';
    }


    let lastResult = null;
    // Run the custom query string written by the user
    function runQuery() {
        if (!alasql.tables.data) {
            showToast("Please parse and register your JSON data first.", 'error'); 
            return;
        }
        const sql = document.getElementById('sqlInput').value;
        try {
            // Execute directly against the internal tables environment
            const result = alasql(sql);             
            lastResult = result;
            renderTable(result);
            document.getElementById('downloadBtn').style.display = result.length ? 'inline-block' : 'none';

        } catch (err) {
            document.getElementById("tableOutput").innerHTML = `<span style="color: red; font-weight: bold;">SQL Error: ${err.message}</span>`;
        lastResult = null;
        document.getElementById('downloadBtn').style.display = 'none';
        }
    }

    function downloadCSV() {
        if (!lastResult || lastResult.length === 0) return;

        const headerSet = new Set();
        lastResult.forEach(row => {
            Object.keys(row).forEach(key => headerSet.add(key));
        });

        const headers = Array.from(headerSet);
        const rows = lastResult.map(row =>
            headers.map(h => escapeCSVValue(row[h] !== undefined ? row[h] : '')).join(',')
        );

        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'query_results.csv';
        a.click();
        URL.revokeObjectURL(url);
    }

    function escapeCSVValue(val) {
        if (val === null || val === undefined) return '';
        const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
        if (str.includes('"') || str.includes(',') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    }


    // Generate data grid layout
    function renderTable(data) {
        const container = document.getElementById('tableOutput');
        if (!data || data.length === 0) {
            container.innerHTML = "Query returned 0 rows."; 
            return;
        }

        const headerSet = new Set();
        data.forEach(row => {
            Object.keys(row).forEach(key => headerSet.add(key));
        });

        const headers = Array.from(headerSet);
        let html = `<table><thead><tr>`;
        headers.forEach(h => html += `<th>${h}</th>`);
        html += `</tr></thead><tbody>`;

        data.forEach(row => {
            html += '<tr>';
            headers.forEach(h => {
                let val = row[h];
                html += `<td>${val !== null && typeof val === "object" ? JSON.stringify(val) :  (val ?? '')}</td>`;
            });
            html += '</tr>';
        });
        html += `</tbody></table>`;
        container.innerHTML = html; }

        // function showToast(message, type = 'success', duration = 4000) {
        //     const container = document.getElementById('toastContainer');
        //     const toast = document.createElement('div');
        //     toast.className = `toast ${type}`;
        //     toast.textContent = message;
        //     container.appendChild(toast);
        //     setTimeout(() => toast.remove(), duration);
        // }


        // Handle File Pickers
        document.getElementById('filePicker').addEventListener('change', function(e) {
            const reader = new FileReader ();
            reader.onload = function(event) {
            document.getElementById('jsonInput').value = event.target.result;
            processJSON();
        };

    reader.readAsText(e.target.files[0]);
    });