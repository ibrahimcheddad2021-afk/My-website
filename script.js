function connectAPI() {
    const apiKey = document.getElementById("apiKey").value;
    const status = document.getElementById("apiStatus");

    if (apiKey.trim() === "") {
        status.textContent = "❌ API Key is required!";
        status.style.color = "red";
        return;
    }

    status.textContent = "🔄 Connecting to Rithmic...";
    status.style.color = "yellow";

    setTimeout(() => {
        status.textContent = "✔️ Connected (simulation) — waiting for real API";
        status.style.color = "lightgreen";
    }, 1500);
}
