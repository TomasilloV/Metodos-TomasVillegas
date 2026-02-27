/* ══════════════════════════════════════════════════════
   Métodos Numéricos — Frontend Logic
   ══════════════════════════════════════════════════════ */

const chartInstances = {};

const heroData = {
    euler:  { title: 'Euler Mejorado',  sub: 'Método de Heun para resolver Ecuaciones Diferenciales Ordinarias' },
    runge:  { title: 'Runge-Kutta RK4', sub: 'Método de 4to orden para EDOs — Alta precisión' },
    newton: { title: 'Newton-Raphson',  sub: 'Búsqueda iterativa de raíces de funciones' },
};

/* ─── Navigation ─── */

function selectMethod(method) {
    // Nav buttons
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-method="${method}"]`).classList.add('active');

    // Panels
    document.querySelectorAll('.method-panel').forEach(p => p.classList.remove('active'));
    document.getElementById(`${method}Panel`).classList.add('active');

    // Hero
    const d = heroData[method];
    document.getElementById('heroTitle').textContent = d.title;
    document.getElementById('heroSubtitle').textContent = d.sub;

    // Close sidebar on mobile
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('show');
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebarOverlay').classList.toggle('show');
}

function toggleInfo(id) {
    document.getElementById(id).classList.toggle('open');
}

/* ─── Unified calculate dispatcher ─── */

async function calculate(method, event) {
    event.preventDefault();

    const btn = document.getElementById(`${method}Btn`);
    btn.classList.add('loading');
    btn.textContent = 'Calculando...';

    let url, body;

    if (method === 'euler') {
        url = '/api/euler';
        body = {
            funcion: val('eulerFunction'),
            x0: num('eulerX0'), y0: num('eulerY0'),
            xf: num('eulerXf'), h: num('eulerH'),
        };
    } else if (method === 'runge') {
        url = '/api/runge-kutta';
        body = {
            funcion: val('rungeFunction'),
            x0: num('rungeX0'), y0: num('rungeY0'),
            xf: num('rungeXf'), h: num('rungeH'),
        };
    } else {
        url = '/api/newton-raphson';
        body = {
            funcion: val('newtonFunction'),
            derivada: val('newtonDerivative'),
            x0: num('newtonX0'),
            tolerancia: num('newtonTol'),
            maxIteraciones: num('newtonMaxIter'),
        };
    }

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Error desconocido');

        if (method === 'euler')  renderEuler(data.results, body.funcion);
        if (method === 'runge')  renderRunge(data.results, body.funcion);
        if (method === 'newton') renderNewton(data.results, data.converged, body);

    } catch (err) {
        document.getElementById(`${method}Results`).innerHTML = `
            <div class="error-card">
                <span>${err.message}</span>
            </div>`;
    } finally {
        btn.classList.remove('loading');
        btn.textContent = 'Calcular';
    }
}

/* ─── Helpers ─── */

const val = id => document.getElementById(id).value;
const num = id => parseFloat(document.getElementById(id).value);

function destroyChart(id) {
    if (chartInstances[id]) { chartInstances[id].destroy(); delete chartInstances[id]; }
}

/* ─── Chart theme (Cupertino light) ─── */

const chartColors = {
    blue:   { border: '#007aff', bg: 'rgba(0,122,255,0.10)', point: '#007aff' },
    green:  { border: '#34c759', bg: 'rgba(52,199,89,0.10)', point: '#34c759' },
    orange: { border: '#ff9f0a', bg: 'rgba(255,159,10,0.15)', point: '#ff9f0a' },
    red:    { border: '#ff3b30', bg: 'rgba(255,59,48,0.10)', point: '#ff3b30' },
    purple: { border: '#af52de', bg: 'rgba(175,82,222,0.10)', point: '#af52de' },
};

function makeChart(canvasId, labels, datasets, title) {
    destroyChart(canvasId);
    const ctx = document.getElementById(canvasId).getContext('2d');
    chartInstances[canvasId] = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 700, easing: 'easeOutQuart' },
            plugins: {
                legend: {
                    labels: { color: '#6e6e73', font: { family: 'Inter', size: 12, weight: '600' }, padding: 16, usePointStyle: true, pointStyle: 'circle' }
                },
                title: {
                    display: true, text: title, color: '#1d1d1f',
                    font: { family: 'Inter', size: 15, weight: '700' },
                    padding: { bottom: 16 }
                },
                tooltip: {
                    backgroundColor: '#1d1d1f', titleColor: '#fff', bodyColor: '#f5f5f7',
                    borderColor: '#3a3a3c', borderWidth: 1, cornerRadius: 10, padding: 12,
                    bodyFont: { family: 'Inter', size: 12 },
                    callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y.toFixed(6)}` }
                }
            },
            scales: {
                x: {
                    ticks: { color: '#aeaeb2', font: { family: 'Inter', size: 10 } },
                    grid: { color: 'rgba(0,0,0,0.04)' },
                    title: { display: true, text: 'x', color: '#6e6e73', font: { family: 'Inter', size: 12, weight: '600' } }
                },
                y: {
                    ticks: { color: '#aeaeb2', font: { family: 'Inter', size: 10 } },
                    grid: { color: 'rgba(0,0,0,0.04)' },
                    title: { display: true, text: 'y', color: '#6e6e73', font: { family: 'Inter', size: 12, weight: '600' } }
                }
            }
        }
    });
}

/* ────────────────────────────────────────────
   RENDER: Euler Mejorado
   ──────────────────────────────────────────── */

function renderEuler(results, funcStr) {
    const last = results[results.length - 1];
    const container = document.getElementById('eulerResults');

    container.innerHTML = `
        <div class="results-wrapper">
            <div class="summary-card">
                <div class="summary-header">
                    <h3>Resultados — Euler Mejorado (Heun)</h3>
                </div>
                <div class="summary-stats">
                    <div class="stat-item">
                        <div class="stat-label">Función</div>
                        <div class="stat-value">f(x,y) = ${funcStr}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Valor final</div>
                        <div class="stat-value green">y(${last.x}) ≈ ${last.yNext}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Iteraciones</div>
                        <div class="stat-value">${results.length - 1}</div>
                    </div>
                </div>
            </div>

            <div class="chart-card"><canvas id="eulerChart"></canvas></div>

            <div class="table-card">
                <div class="table-card-header">
                    <h4>Tabla de iteraciones</h4>
                </div>
                <div class="table-scroll">
                    <table class="data-table">
                        <thead><tr>
                            <th>i</th><th>xᵢ</th><th>f(xᵢ, yᵢ)</th>
                            <th>k₁</th><th>k₂</th><th>yᵢ₊₁</th><th>Error</th>
                        </tr></thead>
                        <tbody>
                            ${results.map((r, i) => `
                                <tr class="${i === results.length - 1 ? 'highlight-row' : ''}">
                                    <td>${r.i}</td><td>${r.x}</td><td>${r.fxy}</td>
                                    <td>${r.k1}</td><td>${r.k2}</td><td>${r.yNext}</td><td>${r.error}</td>
                                </tr>`).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>`;

    const labels = results.map(r => typeof r.x === 'number' ? r.x.toFixed(4) : String(r.x));
    const yVals = results.map(r => typeof r.yNext === 'number' ? r.yNext : (typeof r.fxy === 'number' ? r.fxy : null));
    const fxyVals = results.map(r => typeof r.fxy === 'number' ? r.fxy : null);

    makeChart('eulerChart', labels, [
        { label: 'y aproximado', data: yVals, borderColor: chartColors.blue.border, backgroundColor: chartColors.blue.bg, pointBackgroundColor: chartColors.blue.point, pointRadius: 4, pointHoverRadius: 6, borderWidth: 2.5, fill: true, tension: 0.35 },
        { label: 'f(xᵢ, yᵢ)', data: fxyVals, borderColor: chartColors.orange.border, backgroundColor: 'transparent', pointBackgroundColor: chartColors.orange.point, pointRadius: 3, borderWidth: 1.5, borderDash: [6, 4], fill: false, tension: 0.35 },
    ], 'Solución — Euler Mejorado');
}

/* ────────────────────────────────────────────
   RENDER: Runge-Kutta
   ──────────────────────────────────────────── */

function renderRunge(results, funcStr) {
    const last = results[results.length - 1];
    const container = document.getElementById('rungeResults');

    container.innerHTML = `
        <div class="results-wrapper">
            <div class="summary-card">
                <div class="summary-header">
                    <h3>Resultados — Runge-Kutta RK4</h3>
                </div>
                <div class="summary-stats">
                    <div class="stat-item">
                        <div class="stat-label">Función</div>
                        <div class="stat-value">f(x,y) = ${funcStr}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Valor final</div>
                        <div class="stat-value green">yᵢ₊₁ ≈ ${last.yNext}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Iteraciones</div>
                        <div class="stat-value">${results.length - 1}</div>
                    </div>
                </div>
            </div>

            <div class="chart-card"><canvas id="rungeChart"></canvas></div>

            <div class="table-card">
                <div class="table-card-header">
                    <h4>Tabla de iteraciones</h4>
                </div>
                <div class="table-scroll">
                    <table class="data-table">
                        <thead><tr>
                            <th>i</th><th>xᵢ</th>
                            <th>k₁</th><th>k₂</th><th>k₃</th><th>k₄</th><th>yᵢ₊₁</th>
                        </tr></thead>
                        <tbody>
                            ${results.map((r, i) => `
                                <tr class="${i === results.length - 1 ? 'highlight-row' : ''}">
                                    <td>${r.i}</td><td>${r.xi}</td>
                                    <td>${r.k1}</td><td>${r.k2}</td><td>${r.k3}</td><td>${r.k4}</td><td>${r.yNext}</td>
                                </tr>`).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>`;

    const labels = results.map(r => typeof r.xi === 'number' ? r.xi.toFixed(4) : String(r.xi));
    const yVals = results.map(r => typeof r.yNext === 'number' ? r.yNext : null);
    const k1Vals = results.map(r => typeof r.k1 === 'number' ? r.k1 : null);

    makeChart('rungeChart', labels, [
        { label: 'y aproximado (RK4)', data: yVals, borderColor: chartColors.green.border, backgroundColor: chartColors.green.bg, pointBackgroundColor: chartColors.green.point, pointRadius: 4, pointHoverRadius: 6, borderWidth: 2.5, fill: true, tension: 0.35 },
        { label: 'k₁ (pendiente)', data: k1Vals, borderColor: chartColors.orange.border, backgroundColor: 'transparent', pointBackgroundColor: chartColors.orange.point, pointRadius: 3, borderWidth: 1.5, borderDash: [6, 4], fill: false, tension: 0.35 },
    ], 'Solución — Runge-Kutta 4to Orden');
}

/* ────────────────────────────────────────────
   RENDER: Newton-Raphson
   ──────────────────────────────────────────── */

function renderNewton(results, converged, body) {
    const last = results[results.length - 1];
    const container = document.getElementById('newtonResults');
    const derivInfo = body.derivada ? `f'(x) = ${body.derivada}` : 'Derivada numérica (diferencia central, h = 1×10⁻⁷)';

    const badge = converged
        ? `<span class="convergence-badge success">✓ Convergió en ${results.length} iteración(es)</span>`
        : `<span class="convergence-badge fail">✗ No convergió</span>`;

    container.innerHTML = `
        <div class="results-wrapper">
            <div class="summary-card">
                <div class="summary-header">
                    <h3>Resultados — Newton-Raphson</h3>
                </div>
                <div class="summary-stats">
                    <div class="stat-item">
                        <div class="stat-label">Función</div>
                        <div class="stat-value">f(x) = ${body.funcion}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Derivada</div>
                        <div class="stat-value orange">${derivInfo}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Raíz encontrada</div>
                        <div class="stat-value green">x ≈ ${last.xNew}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">f(x) en última iteración</div>
                        <div class="stat-value">${last.fx}</div>
                    </div>
                </div>
                <div style="margin-top:16px">${badge}</div>
            </div>

            <div class="chart-card"><canvas id="newtonChart"></canvas></div>

            <div class="table-card">
                <div class="table-card-header">
                    <h4>Tabla de iteraciones</h4>
                </div>
                <div class="table-scroll">
                    <table class="data-table">
                        <thead><tr>
                            <th>Iter</th><th>xₙ</th><th>f(xₙ)</th>
                            <th>f'(xₙ)</th><th>xₙ₊₁</th><th>Error</th>
                        </tr></thead>
                        <tbody>
                            ${results.map((r, i) => `
                                <tr class="${i === results.length - 1 ? 'highlight-row' : ''}">
                                    <td>${r.iter}</td><td>${r.x}</td><td>${r.fx}</td>
                                    <td>${r.fpx}</td><td>${r.xNew}</td><td>${r.error}</td>
                                </tr>`).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>`;

    // Chart with dual y-axes
    destroyChart('newtonChart');
    const ctx = document.getElementById('newtonChart').getContext('2d');
    const iterLabels = results.map(r => `iter=${r.iter}`);
    const xVals = results.map(r => typeof r.x === 'number' ? r.x : null);
    const fxVals = results.map(r => typeof r.fx === 'number' ? r.fx : null);

    chartInstances['newtonChart'] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: iterLabels,
            datasets: [
                {
                    label: 'xₙ (aproximación)', data: xVals,
                    borderColor: chartColors.blue.border, backgroundColor: chartColors.blue.bg,
                    pointBackgroundColor: chartColors.blue.point, pointRadius: 5, pointHoverRadius: 7,
                    borderWidth: 2.5, fill: false, tension: 0.2, yAxisID: 'y'
                },
                {
                    label: 'f(xₙ)', data: fxVals,
                    borderColor: chartColors.red.border, backgroundColor: chartColors.red.bg,
                    pointBackgroundColor: chartColors.red.point, pointRadius: 4,
                    borderWidth: 2, borderDash: [5, 3], fill: false, tension: 0.2, yAxisID: 'y2'
                }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            animation: { duration: 700, easing: 'easeOutQuart' },
            plugins: {
                legend: { labels: { color: '#6e6e73', font: { family: 'Inter', size: 12, weight: '600' }, padding: 16, usePointStyle: true, pointStyle: 'circle' } },
                title: { display: true, text: 'Convergencia — Newton-Raphson', color: '#1d1d1f', font: { family: 'Inter', size: 15, weight: '700' }, padding: { bottom: 16 } },
                tooltip: { backgroundColor: '#1d1d1f', titleColor: '#fff', bodyColor: '#f5f5f7', borderColor: '#3a3a3c', borderWidth: 1, cornerRadius: 10, padding: 12 }
            },
            scales: {
                x: { ticks: { color: '#aeaeb2', font: { family: 'Inter', size: 10 } }, grid: { color: 'rgba(0,0,0,0.04)' }, title: { display: true, text: 'Iteración', color: '#6e6e73', font: { family: 'Inter', size: 12, weight: '600' } } },
                y: { position: 'left', ticks: { color: '#007aff', font: { family: 'Inter', size: 10 } }, grid: { color: 'rgba(0,0,0,0.04)' }, title: { display: true, text: 'xₙ', color: '#007aff', font: { family: 'Inter', size: 12, weight: '600' } } },
                y2: { position: 'right', ticks: { color: '#ff3b30', font: { family: 'Inter', size: 10 } }, grid: { drawOnChartArea: false }, title: { display: true, text: 'f(xₙ)', color: '#ff3b30', font: { family: 'Inter', size: 12, weight: '600' } } }
            }
        }
    });
}

/* ─── Init ─── */
document.addEventListener('DOMContentLoaded', () => {
    selectMethod('euler');
    console.log('✓ Métodos Numéricos — Cupertino Edition cargado');
});
