const API = "/api";
const DONOR_NAME = "College Mess";
const NGO_NAME = "Helping Hands NGO";

const loginModal = document.getElementById("loginModal");
const dashboard = document.getElementById("dashboard");
const dashboardContent = document.getElementById("dashboardContent");

document.getElementById("loginButton").addEventListener("click", openLogin);
document.getElementById("shareButton").addEventListener("click", openLogin);
document.getElementById("joinButton").addEventListener("click", openLogin);
document.getElementById("closeLogin").addEventListener("click", closeLogin);
document.getElementById("closeDashboard").addEventListener("click", closeDashboard);

document.querySelectorAll("[data-role]").forEach(button => {
    button.addEventListener("click", () => openDashboard(button.dataset.role));
});

loginModal.addEventListener("click", event => {
    if (event.target === loginModal) closeLogin();
});

dashboard.addEventListener("click", event => {
    if (event.target === dashboard) closeDashboard();
});

function openLogin() {
    loginModal.classList.add("open");
    loginModal.setAttribute("aria-hidden", "false");
}

function closeLogin() {
    loginModal.classList.remove("open");
    loginModal.setAttribute("aria-hidden", "true");
}

function closeDashboard() {
    dashboard.classList.remove("open");
    dashboard.setAttribute("aria-hidden", "true");
}

async function openDashboard(role) {
    closeLogin();
    dashboard.classList.add("open");
    dashboard.setAttribute("aria-hidden", "false");
    dashboardContent.innerHTML = "<p>Loading FoodShare data…</p>";

    try {
        if (role === "donor") {
            await showDonorDashboard();
        } else if (role === "ngo") {
            await showNGODashboard();
        } else {
            await showAdminDashboard();
        }
    } catch (error) {
        dashboardContent.innerHTML =
            `<p class="error-message">${escapeHTML(error.message)}</p>`;
    }
}

async function apiRequest(path, options = {}) {
    const response = await fetch(`${API}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.error || `Request failed (${response.status})`);
    }

    return data;
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function dashboardHeader(title, subtitle) {
    return `
        <div class="dashboard-header">
            <h2>${title}</h2>
            <p>${subtitle}</p>
        </div>
    `;
}

function donationCard(donation, action = "") {
    const buttonText = {
        request: "REQUEST FOOD",
        confirm: "ACCEPT NGO REQUEST",
        collect: "MARK COLLECTED"
    };

    return `
        <article class="food-card">
            <div class="food-card-header">
                <h4>🍱 ${escapeHTML(donation.food_name)}</h4>
                <span class="status">${escapeHTML(donation.status).toUpperCase()}</span>
            </div>

            <div class="food-details">
                <span>⚖️ ${escapeHTML(donation.quantity)} portions</span>
                <span>📍 ${escapeHTML(donation.location)}</span>
                <span>⏰ ${escapeHTML(donation.pickup_deadline)}</span>
            </div>

            <div class="food-details">
                <span>Donor: ${escapeHTML(donation.donor_name)}</span>
                ${donation.requested_by
                    ? `<span>NGO: ${escapeHTML(donation.requested_by)}</span>`
                    : ""}
            </div>

            ${action
                ? `<button class="action-btn" data-action="${action}" data-id="${donation.id}">
                    ${buttonText[action]}
                   </button>`
                : ""}
        </article>
    `;
}

function connectActionButtons() {
    document.querySelectorAll("[data-action]").forEach(button => {
        button.addEventListener("click", async () => {
            button.disabled = true;

            try {
                const id = button.dataset.id;
                const action = button.dataset.action;

                if (action === "request") {
                    await apiRequest(`/donations/${id}/request`, {
                        method: "POST",
                        body: JSON.stringify({ ngo_name: NGO_NAME })
                    });
                    await showNGODashboard();
                } else if (action === "confirm") {
                    await apiRequest(`/donations/${id}/confirm`, {
                        method: "POST"
                    });
                    await showDonorDashboard();
                } else if (action === "collect") {
                    await apiRequest(`/donations/${id}/collect`, {
                        method: "POST"
                    });
                    await showDonorDashboard();
                }
            } catch (error) {
                alert(error.message);
                button.disabled = false;
            }
        });
    });
}

async function showDonorDashboard() {
    const donations = await apiRequest(
        `/donations?donor_name=${encodeURIComponent(DONOR_NAME)}`
    );

    const available = donations.filter(item => item.status === "Available").length;
    const requested = donations.filter(item => item.status === "Requested").length;
    const collected = donations.filter(item => item.status === "Collected").length;

    dashboardContent.innerHTML = `
        ${dashboardHeader("Donor Dashboard 🏢", `Welcome, ${DONOR_NAME}`)}

        <div class="dashboard-stats">
            <div class="dashboard-stat"><strong>${available}</strong><span>Available</span></div>
            <div class="dashboard-stat"><strong>${requested}</strong><span>Requested</span></div>
            <div class="dashboard-stat"><strong>${collected}</strong><span>Collected</span></div>
            <div class="dashboard-stat"><strong>${donations.length}</strong><span>Total listings</span></div>
        </div>

        <section class="dashboard-card">
            <h3>➕ Add New Donation</h3>
            <form id="donationForm">
                <input name="food_name" placeholder="Food name, e.g. Rice and dal" required>
                <input name="quantity" type="number" min="1" placeholder="Quantity in portions" required>
                <input name="location" placeholder="Pickup location" required>
                <input name="pickup_deadline" placeholder="Pickup deadline, e.g. 10:30 PM" required>
                <button class="action-btn" type="submit">POST DONATION</button>
            </form>
        </section>

        <section class="dashboard-card">
            <h3>📦 My Donations</h3>
            ${donations.length
                ? donations.map(item => donationCard(
                    item,
                    item.status === "Requested"
                        ? "confirm"
                        : item.status === "Confirmed"
                            ? "collect"
                            : ""
                )).join("")
                : "<p>No donations yet. Add a listing above.</p>"}
        </section>
    `;

    document.getElementById("donationForm").addEventListener("submit", async event => {
        event.preventDefault();

        const formData = Object.fromEntries(new FormData(event.currentTarget));

        try {
            await apiRequest("/donations", {
                method: "POST",
                body: JSON.stringify({
                    ...formData,
                    category: "Prepared meals",
                    donor_name: DONOR_NAME
                })
            });
            await showDonorDashboard();
        } catch (error) {
            alert(error.message);
        }
    });

    connectActionButtons();
}

async function showNGODashboard() {
    const [available, allDonations] = await Promise.all([
        apiRequest("/donations?status=Available"),
        apiRequest("/donations")
    ]);

    const requested = allDonations.filter(item => item.status === "Requested").length;
    const collected = allDonations.filter(item => item.status === "Collected").length;

    dashboardContent.innerHTML = `
        ${dashboardHeader("NGO Dashboard 🤝", `Finding food as ${NGO_NAME}`)}

        <div class="dashboard-stats">
            <div class="dashboard-stat"><strong>${available.length}</strong><span>Available</span></div>
            <div class="dashboard-stat"><strong>${requested}</strong><span>Requested</span></div>
            <div class="dashboard-stat"><strong>${collected}</strong><span>Collected</span></div>
            <div class="dashboard-stat"><strong>${allDonations.length}</strong><span>Total listings</span></div>
        </div>

        <section class="dashboard-card">
            <h3>🍱 Available Donations</h3>
            ${available.length
                ? available.map(item => donationCard(item, "request")).join("")
                : "<p>No available donations right now. Check back later.</p>"}
        </section>
    `;

    connectActionButtons();
}

async function showAdminDashboard() {
    const [stats, donations] = await Promise.all([
        apiRequest("/admin/stats"),
        apiRequest("/donations")
    ]);

    dashboardContent.innerHTML = `
        ${dashboardHeader("Admin Dashboard 🛡️", "Live FoodShare database overview")}

        <div class="dashboard-stats">
            <div class="dashboard-stat"><strong>${stats.total_donations}</strong><span>Total donations</span></div>
            <div class="dashboard-stat"><strong>${stats.available}</strong><span>Available</span></div>
            <div class="dashboard-stat"><strong>${stats.requested}</strong><span>Requested</span></div>
            <div class="dashboard-stat"><strong>${stats.collected}</strong><span>Collected</span></div>
        </div>

        <section class="dashboard-card">
            <h3>📊 Donation listings</h3>
            <p>${stats.portions_collected} portions collected so far.</p>
            ${donations.length
                ? donations.map(item => donationCard(item)).join("")
                : "<p>No donations have been posted yet.</p>"}
        </section>
    `;
}