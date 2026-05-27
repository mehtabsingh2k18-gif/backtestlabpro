// ============================================================================
// TRADE ENGINE: Execution, PnL, and Risk Management
// ============================================================================
let trades = [];
let activeTrade = null;
let entryLine, slLine, tpLine;

function calcLots() {
    const elBal = document.getElementById("balance");
    const elRisk = document.getElementById("riskPct") || {value: 1}; // Default risk if missing
    const elSL = document.getElementById("slPips");
    const elContract = document.getElementById("contractSize");

    if (elBal && elSL && elContract) {
        const bal = parseFloat(elBal.value);
        const riskPct = parseFloat(elRisk.value);
        const slPips = parseFloat(elSL.value);
        const contract = parseFloat(elContract.value);

        if (bal && riskPct && slPips && contract) {
            const riskAmount = bal * (riskPct / 100);
            const lot = riskAmount / (slPips * (contract * 0.01));
            const resEl = document.getElementById("calcLotResult");
            if (resEl) resEl.innerText = lot.toFixed(2);
        }
    }
}

function calculatePnL(price) {
    if (!activeTrade) return 0;
    const diff = activeTrade.type === 'BUY' ? (price - activeTrade.entry) : (activeTrade.entry - price);
    return diff * activeTrade.lots * activeTrade.contract;
}

function updateStats() {
    const totalPL = trades.reduce((a, b) => a + b.pl, 0);
    const balEl = document.getElementById("balance");
    const bal = balEl ? parseFloat(balEl.value) : 0;
    
    document.getElementById("tradeCount").innerText = trades.length;
    const plEl = document.getElementById("totalPL");
    plEl.innerText = (totalPL >= 0 ? '+$' : '-$') + Math.abs(totalPL).toFixed(2);
    plEl.style.color = totalPL >= 0 ? 'var(--up)' : 'var(--down)';
    document.getElementById("currentEquity").innerText = '$' + (bal + totalPL).toLocaleString();
}

function updateTradeLines(type, entry, sl, tp, lots) {
    if (entryLine) series.removePriceLine(entryLine);
    if (slLine) series.removePriceLine(slLine);
    if (tpLine) series.removePriceLine(tpLine);

    const currentPnl = calculatePnL(data[index-1]?.close || entry);
    const pnlString = (currentPnl >= 0 ? '+' : '') + currentPnl.toFixed(2);

    entryLine = series.createPriceLine({
        price: entry,
        color: '#2962ff',
        lineWidth: 2,
        lineStyle: LightweightCharts.LineStyle.Solid,
        axisLabelVisible: true,
        title: `${lots} Lots | ${pnlString} USD ✕`,
    });

    slLine = series.createPriceLine({
        price: sl,
        color: '#f23645',
        lineWidth: 2,
        lineStyle: LightweightCharts.LineStyle.Dashed,
        axisLabelVisible: true,
        title: `SL`,
    });

    tpLine = series.createPriceLine({
        price: tp,
        color: '#089981',
        lineWidth: 2,
        lineStyle: LightweightCharts.LineStyle.Dashed,
        axisLabelVisible: true,
        title: `TP`,
    });
}

function placeTrade(type) {
    if (activeTrade) {
        alert("Close current trade before opening a new one.");
        return;
    }

    const currentPrice = data[index-1]?.close || 0;
    const lotRes = document.getElementById("calcLotResult");
    const lotSize = lotRes ? parseFloat(lotRes.innerText) : 0.1;
    const slPips = parseFloat(document.getElementById("slPips").value);
    const contract = parseFloat(document.getElementById("contractSize").value);

    const pipVal = 0.1; 
    const slDist = slPips * pipVal;
    const tpDist = slDist * 2; 

    const slPrice = type === 'BUY' ? (currentPrice - slDist) : (currentPrice + slDist);
    const tpPrice = type === 'BUY' ? (currentPrice + tpDist) : (currentPrice - tpDist);

    activeTrade = {
        type: type,
        entry: currentPrice,
        sl: slPrice,
        tp: tpPrice,
        lots: lotSize,
        contract: contract
    };

    updateTradeLines(type, currentPrice, slPrice, tpPrice, lotSize);
    
    const journal = document.getElementById("journal");
    if (journal) {
        if (trades.length === 0) journal.innerHTML = "";
        const item = document.createElement("div");
        item.className = "journal-item";
        item.innerHTML = `<span><span class="tag ${type === 'BUY' ? 'tag-buy' : 'tag-sell'}">${type}</span>${currentPrice}</span><span>OPEN</span>`;
        journal.prepend(item);
    }
}

function closeTrade() {
    if (!activeTrade) return;
    const currentPrice = data[index-1]?.close || 0;
    const pnl = calculatePnL(currentPrice);

    trades.push({ type: activeTrade.type, price: activeTrade.entry, pl: pnl });

    if (entryLine) series.removePriceLine(entryLine);
    if (slLine) series.removePriceLine(slLine);
    if (tpLine) series.removePriceLine(tpLine);
    
    activeTrade = null;
    updateStats();
}