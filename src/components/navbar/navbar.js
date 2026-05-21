const navbarHTML = `
    <div class="navbar">
        <a class="nav-link" href="${toHome}index.html">Home</a>
        <a class="nav-link" href="${toHome}src/pages/environment/index.html">Environment</a>
        <a class="nav-link" href="${toHome}src/pages/testtoken/index.html">Test Tokens</a>
        <a class="nav-link" href="${toHome}src/pages/jr-pricing/index.html">JR Pricing</a>
        <a class="nav-link" href="${toHome}src/pages/pools-vtps/index.html">Pools & Positions</a>
        <a class="nav-link" href="${toHome}src/pages/swap/index.html">Swap</a>
        <a class="nav-link" href="${toHome}src/pages/calc/index.html">Calculator</a>
        <a class="nav-link" href="${toHome}src/pages/arbitrage/index.html">Arbitrage</a>
        <a class="nav-link" href="${toHome}src/pages/errors/index.html">Errors</a>
    </div>
`

document.body.innerHTML += navbarHTML;
