// Simple CSV dashboard parser + charts (Chart.js)
let trades = [];
let equityChart, dailyChart, winLossChart;

document.getElementById('csvFile').addEventListener('change', handleFile);
document.getElementById('loadExample').addEventListener('click', loadExample);
document.getElementById('filterSymbol').addEventListener('input', applyFilter);
document.getElementById('clearFilter').addEventListener('click', () => {
  document.getElementById('filterSymbol').value = '';
  renderTable();
});

function loadExample(){
  const sample = `time,symbol,side,price,qty,pl
2025-01-10 09:15,ES,BUY,4500.5,1,150
2025-01-10 10:20,ES,SELL,4510.0,1,-50
2025-01-11 11:05,NQ,BUY,18500.0,1,200
2025-01-11 12:30,ES,BUY,4520.0,1,120
2025-01-12 09:50,NQ,SELL,18400.0,1,-80
2025-01-12 14:10,ES,SELL,4490.0,1,75`;
  parseCSV(sample);
}

function handleFile(e){
  const f = e.target.files[0];
  if(!f) return;
  const reader = new FileReader();
  reader.onload = () => parseCSV(reader.result);
  reader.readAsText(f);
}

function parseCSV(text){
  const lines = text.trim().split(/\r?\n/);
  const headers = lines.shift().split(',').map(h => h.trim().toLowerCase());
  trades = lines.map(l => {
    const cols = l.split(',').map(c => c.trim());
    const obj = {};
    headers.forEach((h,i) => obj[h] = cols[i] || '');
    // normalize
    obj.time = obj.time || obj.date || '';
    obj.symbol = obj.symbol || obj.instrument || '';
    obj.side = (obj.side||'').toUpperCase();
    obj.qty = parseFloat(obj.qty || '0') || 0;
    obj.price = parseFloat(obj.price || '0') || 0;
    obj.pl = parseFloat(obj.pl || '0') || 0;
    // date only for daily aggregation
    obj.dateOnly = obj.time.split(' ')[0];
    return obj;
  });
  computeAndRender();
}

function computeAndRender(){
  if(!trades.length) return;
  // sort by time
  trades.sort((a,b) => (a.time > b.time)?1:-1);

  // stats
  const totalPL = trades.reduce((s,t)=>s + t.pl,0);
  const wins = trades.filter(t => t.pl > 0);
  const losses = trades.filter(t => t.pl <= 0);
  const winRate = trades.length ? Math.round((wins.length / trades.length) * 10000)/100 : 0;
  const avgWin = wins.length ? (wins.reduce((s,t)=>s+t.pl,0)/wins.length).toFixed(2) : '—';
  const avgLoss = losses.length ? (losses.reduce((s,t)=>s+t.pl,0)/losses.length).toFixed(2) : '—';

  // update summary UI
  document.getElementById('sumPL').innerText = formatMoney(totalPL);
  document.getElementById('sumTrades').innerText = trades.length;
  document.getElementById('sumWins').innerText = wins.length;
  document.getElementById('sumLosses').innerText = losses.length;
  document.getElementById('avgWin').innerText = (avgWin !== '—') ? formatMoney(avgWin) : '—';
  document.getElementById('avgLoss').innerText = (avgLoss !== '—') ? formatMoney(avgLoss) : '—';
  document.getElementById('totalPL').innerText = 'Total P/L: ' + formatMoney(totalPL);
  document.getElementById('winRate').innerText = 'Win Rate: ' + winRate + '%';

  // equity curve
  let cum = 0;
  const eqLabels = [];
  const eqData = [];
  trades.forEach(t => { cum += t.pl; eqLabels.push(t.time); eqData.push(cum); });

  // daily pnl
  const daily = {};
  trades.forEach(t => {
    daily[t.dateOnly] = (daily[t.dateOnly] || 0) + t.pl;
  });
  const dailyLabels = Object.keys(daily).sort();
  const dailyData = dailyLabels.map(d => daily[d]);

  // win/loss donut
  const winCount = wins.length;
  const lossCount = losses.length;

  // render charts
  renderChart('equityChart', 'line', eqLabels, eqData, equityChart, {label:'Equity', borderColor:'#0b6ef6', backgroundColor:'rgba(11,110,246,0.08)'});
  renderChart('dailyChart', 'bar', dailyLabels, dailyData, dailyChart, {label:'Daily PnL', borderColor:'#16a34a', backgroundColor:'#a7f3d0'});
  renderDonut('winLossChart', [winCount, lossCount], ['Wins','Losses']);

  // render table
  renderTable();
  // store in localStorage (optional)
  try { localStorage.setItem('lastTrades', JSON.stringify(trades)); } catch(e){}
}

function formatMoney(v){
  const n = Number(v);
  return (isNaN(n) ? '—' : (n>=0?'+':'') + n.toFixed(2));
}

function renderChart(canvasId, type, labels, data, instanceRef, opts={}){
  const ctx = document.getElementById(canvasId).getContext('2d');
  if(instanceRef && instanceRef.destroy) instanceRef.destroy();
  if(type === 'line'){
    window[canvasId+'Inst'] = new Chart(ctx, {
      type:'line',
      data:{labels, datasets:[Object.assign({data}, opts)]},
      options:{responsive:true, maintainAspectRatio:false, scales:{x:{display:false}}}
    });
  } else if(type === 'bar'){
    window[canvasId+'Inst'] = new Chart(ctx, {
      type:'bar',
      data:{labels, datasets:[Object.assign({data}, opts)]},
      options:{responsive:true, maintainAspectRatio:false}
    });
  }
}

function renderDonut(canvasId, data, labels){
  const ctx = document.getElementById(canvasId).getContext('2d');
  if(window[canvasId+'Inst'] && window[canvasId+'Inst'].destroy) window[canvasId+'Inst'].destroy();
  window[canvasId+'Inst'] = new Chart(ctx, {
    type:'doughnut',
    data:{labels, datasets:[{data, backgroundColor:['#16a34a','#ef4444']}]},
    options:{responsive:true, maintainAspectRatio:false, plugins:{legend:{position:'bottom'}}}
  });
}

function renderTable(){
  const tbody = document.querySelector('#tradesTable tbody');
  tbody.innerHTML = '';
  const filter = (document.getElementById('filterSymbol').value || '').trim().toUpperCase();
  const rows = trades.filter(t => !filter || (t.symbol || '').toUpperCase().includes(filter));
  if(!rows.length) {
    tbody.innerHTML = '<tr><td colspan="6">No trades found.</td></tr>';
    return;
  }
  rows.forEach(t => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${t.time}</td>
      <td>${t.symbol}</td>
      <td>${t.side}</td>
      <td>${t.qty}</td>
      <td>${t.price}</td>
      <td style="color:${t.pl>=0? '#16a34a':'#ef4444'}">${formatMoney(t.pl)}</td>`;
    tbody.appendChild(tr);
  });
}

function applyFilter(){ renderTable(); }

// load last if exists
try{
  const saved = localStorage.getItem('lastTrades');
  if(saved) { trades = JSON.parse(saved); computeAndRender(); }
} catch(e){}
