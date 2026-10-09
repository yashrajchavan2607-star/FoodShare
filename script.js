const API = "/api";
const DONOR_NAME = "College Mess";
const NGO_NAME = "Helping Hands NGO";
let activeDonorSection = "post-food";
let activeNGOSection = "discover-food";
let activeAdminSection = "overview";
let activeDashboardRole = "";

const donorSections = [
    { id: "post-food", label: "Post Food" },
    { id: "my-listings", label: "My Listings" },
    { id: "incoming-requests", label: "Incoming Requests" },
    { id: "pickup-schedule", label: "Pickup Schedule" },
    { id: "donation-history", label: "Donation History" }
];

const ngoSections = [
    { id: "discover-food", label: "Discover Food" },
    { id: "my-requests", label: "My Requests" },
    { id: "confirmed-pickups", label: "Confirmed Pickups" },
    { id: "collection-history", label: "Collection History" },
    { id: "impact-reports", label: "Impact Reports" }
];

const adminSections = [
    { id: "overview", label: "Overview" },
    { id: "organization-verification", label: "Organization Verification" },
    { id: "listings", label: "Listings" },
    { id: "donations", label: "Donations" },
    { id: "complaints", label: "Complaints" },
    { id: "analytics", label: "Analytics" }
];

const loginModal = document.getElementById("loginModal");
const dashboard = document.getElementById("dashboard");
const dashboardContent = document.getElementById("dashboardContent");
let donationMap;
let pickupMarker;

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
    activeDashboardRole = role;
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

            ${donation.latitude != null && donation.longitude != null
                ? `<div class="food-details">
                    <span>📌 Exact pickup coordinates: ${escapeHTML(Number(donation.latitude).toFixed(6))}, ${escapeHTML(Number(donation.longitude).toFixed(6))}</span>
                    <a href="https://www.openstreetmap.org/?mlat=${encodeURIComponent(donation.latitude)}&mlon=${encodeURIComponent(donation.longitude)}#map=17/${encodeURIComponent(donation.latitude)}/${encodeURIComponent(donation.longitude)}" target="_blank" rel="noopener noreferrer">View map ↗</a>
                   </div>`
                : ""}

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
                    await showNGODashboard("my-requests");
                } else if (action === "confirm") {
                    await apiRequest(`/donations/${id}/confirm`, {
                        method: "POST"
                    });
                    await showDonorDashboard(activeDonorSection);
                } else if (action === "collect") {
                    await apiRequest(`/donations/${id}/collect`, {
                        method: "POST"
                    });
                    if (activeDashboardRole === "ngo") {
                        await showNGODashboard(activeNGOSection);
                    } else {
                        await showDonorDashboard(activeDonorSection);
                    }
                }
            } catch (error) {
                alert(error.message);
                button.disabled = false;
            }
        });
    });
}

async function showDonorDashboard(section = activeDonorSection) {
    activeDonorSection = donorSections.some(item => item.id === section)
        ? section
        : "post-food";

    const donorQuery = `donor_name=${encodeURIComponent(DONOR_NAME)}`;
    const [donations, expiredDonations] = await Promise.all([
        apiRequest(`/donations?${donorQuery}`),
        apiRequest(`/donations?status=Expired&${donorQuery}`)
    ]);

    const available = donations.filter(item => item.status === "Available").length;
    const requested = donations.filter(item => item.status === "Requested").length;
    const collected = donations.filter(item => item.status === "Collected").length;
    const sectionContent = {
        "post-food": `
            <section class="dashboard-card">
                <h3>➕ Post Food</h3>
                <form id="donationForm">
                    <input name="food_name" placeholder="Food name, e.g. Rice and dal" required>
                    <input name="quantity" type="number" min="1" placeholder="Quantity in portions" required>
                    <input name="location" placeholder="Pickup location" required>
                    <div class="pickup-map-heading">
                        <strong>Choose exact pickup point</strong>
                        <button class="map-location-button" id="useCurrentLocation" type="button">USE MY LOCATION</button>
                    </div>
                    <div id="donationMap" class="donation-map" role="application" aria-label="Select exact pickup location on map"></div>
                    <p id="pickupCoordinates" class="map-help" aria-live="polite">Click the map or use your current location. Coordinates will be shared with the donation.</p>
                    <input name="latitude" id="pickupLatitude" type="hidden">
                    <input name="longitude" id="pickupLongitude" type="hidden">
                    <input name="pickup_deadline" placeholder="Pickup deadline, e.g. 10:30 PM" required>
                    <button class="action-btn" type="submit">POST DONATION</button>
                </form>
            </section>
        `,
        "my-listings": `
            <section class="dashboard-card">
                <h3>📦 My Listings</h3>
                ${renderDonations(
                    donations.filter(item => ["Available", "Requested", "Confirmed"].includes(item.status)),
                    "No active listings yet. Post food to create your first listing."
                )}
            </section>
        `,
        "incoming-requests": `
            <section class="dashboard-card">
                <h3>🤝 Incoming Requests</h3>
                ${renderDonations(
                    donations.filter(item => item.status === "Requested"),
                    "No incoming requests right now."
                )}
            </section>
        `,
        "pickup-schedule": `
            <section class="dashboard-card">
                <h3>🗓️ Pickup Schedule</h3>
                ${renderDonations(
                    donations.filter(item => item.status === "Confirmed"),
                    "No confirmed pickups scheduled yet."
                )}
            </section>
        `,
        "donation-history": `
            <section class="dashboard-card">
                <h3>📚 Donation History</h3>
                ${renderDonations(
                    [...donations.filter(item => item.status === "Collected"), ...expiredDonations],
                    "Completed or expired donations will appear here."
                )}
            </section>
        `
    };

    dashboardContent.innerHTML = `
        ${dashboardHeader("Donor Dashboard 🏢", `Welcome, ${DONOR_NAME}`)}

        <div class="dashboard-stats">
            <div class="dashboard-stat"><strong>${available}</strong><span>Available</span></div>
            <div class="dashboard-stat"><strong>${requested}</strong><span>Requested</span></div>
            <div class="dashboard-stat"><strong>${collected}</strong><span>Collected</span></div>
            <div class="dashboard-stat"><strong>${donations.length + expiredDonations.length}</strong><span>Total listings</span></div>
        </div>

        <nav class="dashboard-tabs" aria-label="Donor dashboard sections">
            ${donorSections.map(item => `
                <button
                    class="dashboard-tab${activeDonorSection === item.id ? " active" : ""}"
                    type="button"
                    data-donor-section="${item.id}"
                    aria-pressed="${activeDonorSection === item.id}"
                >${item.label}</button>
            `).join("")}
        </nav>

        ${sectionContent[activeDonorSection]}
    `;

    dashboardContent.querySelectorAll("[data-donor-section]").forEach(button => {
        button.addEventListener("click", async () => {
            try {
                await showDonorDashboard(button.dataset.donorSection);
            } catch (error) {
                dashboardContent.innerHTML =
                    `<p class="error-message">${escapeHTML(error.message)}</p>`;
            }
        });
    });

    const donationForm = document.getElementById("donationForm");
    if (donationForm) {
        initializeDonationMap();
        donationForm.addEventListener("submit", async event => {
            event.preventDefault();

            const formData = Object.fromEntries(new FormData(event.currentTarget));

            if (formData.latitude === "" || formData.longitude === "") {
                alert("Select the exact pickup point on the map or use your current location.");
                return;
            }

            try {
                await apiRequest("/donations", {
                    method: "POST",
                    body: JSON.stringify({
                        ...formData,
                        category: "Prepared meals",
                        donor_name: DONOR_NAME
                    })
                });
                await showDonorDashboard("my-listings");
            } catch (error) {
                alert(error.message);
            }
        });
    }

    connectActionButtons();
}

function renderDonations(donations, emptyMessage) {
    if (!donations.length) {
        return `<p>${emptyMessage}</p>`;
    }

    return donations.map(item => donationCard(
        item,
        item.status === "Requested"
            ? "confirm"
            : item.status === "Confirmed"
                ? "collect"
                : ""
    )).join("");
}

function initializeDonationMap() {
    const mapElement = document.getElementById("donationMap");
    if (!mapElement) {
        return;
    }

    if (!window.L) {
        mapElement.textContent = "The map could not be loaded. Enter the pickup address above to continue.";
        return;
    }

    if (donationMap) {
        donationMap.remove();
    }
    pickupMarker = null;

    donationMap = window.L.map(mapElement).setView([12.9716, 77.5946], 12);
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(donationMap);

    const latitudeInput = document.getElementById("pickupLatitude");
    const longitudeInput = document.getElementById("pickupLongitude");
    const coordinatesText = document.getElementById("pickupCoordinates");

    function selectPickupPoint(latitude, longitude) {
        const preciseLatitude = Number(latitude.toFixed(6));
        const preciseLongitude = Number(longitude.toFixed(6));
        latitudeInput.value = String(preciseLatitude);
        longitudeInput.value = String(preciseLongitude);
        coordinatesText.textContent =
            `Pickup point selected: ${preciseLatitude.toFixed(6)}, ${preciseLongitude.toFixed(6)}`;

        if (!pickupMarker) {
            pickupMarker = window.L.marker([preciseLatitude, preciseLongitude], {
                draggable: true
            }).addTo(donationMap);
            pickupMarker.on("dragend", event => {
                const position = event.target.getLatLng();
                selectPickupPoint(position.lat, position.lng);
            });
        } else {
            pickupMarker.setLatLng([preciseLatitude, preciseLongitude]);
        }
    }

    donationMap.on("click", event => {
        selectPickupPoint(event.latlng.lat, event.latlng.lng);
    });

    const locationButton = document.getElementById("useCurrentLocation");
    locationButton.addEventListener("click", () => {
        if (!navigator.geolocation) {
            alert("Your browser does not support location sharing. Select a point on the map instead.");
            return;
        }

        locationButton.disabled = true;
        navigator.geolocation.getCurrentPosition(
            position => {
                const { latitude, longitude } = position.coords;
                selectPickupPoint(latitude, longitude);
                donationMap.setView([latitude, longitude], 16);
                locationButton.disabled = false;
            },
            error => {
                alert(`Could not get your location: ${error.message}`);
                locationButton.disabled = false;
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    });

    window.setTimeout(() => donationMap.invalidateSize(), 0);
}

async function showNGODashboard(section = activeNGOSection) {
    activeNGOSection = ngoSections.some(item => item.id === section)
        ? section
        : "discover-food";

    const [available, allDonations, expiredDonations] = await Promise.all([
        apiRequest("/donations?status=Available"),
        apiRequest("/donations"),
        apiRequest("/donations?status=Expired")
    ]);

    const ngoDonations = allDonations.filter(item => item.requested_by === NGO_NAME);
    const myRequests = ngoDonations.filter(item => item.status === "Requested");
    const confirmedPickups = ngoDonations.filter(item => item.status === "Confirmed");
    const collectionHistory = ngoDonations.filter(item => item.status === "Collected");
    const expiredRequests = expiredDonations.filter(item => item.requested_by === NGO_NAME);
    const completedPortions = collectionHistory.reduce(
        (total, item) => total + Number(item.quantity || 0),
        0
    );
    const sectionContent = {
        "discover-food": `
            <section class="dashboard-card">
                <h3>🍱 Discover Food</h3>
                ${available.length
                    ? available.map(item => donationCard(item, "request")).join("")
                    : "<p>No available donations right now. Check back later.</p>"}
            </section>
        `,
        "my-requests": `
            <section class="dashboard-card">
                <h3>🤝 My Requests</h3>
                ${renderDonations(myRequests, "You have no pending food requests.")}
            </section>
        `,
        "confirmed-pickups": `
            <section class="dashboard-card">
                <h3>🗓️ Confirmed Pickups</h3>
                ${renderDonations(
                    confirmedPickups,
                    "You have no confirmed pickups scheduled."
                )}
            </section>
        `,
        "collection-history": `
            <section class="dashboard-card">
                <h3>📚 Collection History</h3>
                ${renderDonations(
                    collectionHistory,
                    "Completed collections will appear here."
                )}
            </section>
        `,
        "impact-reports": `
            <section class="dashboard-card">
                <h3>📊 Impact Reports</h3>
                <div class="dashboard-stats impact-report-stats">
                    <div class="dashboard-stat"><strong>${collectionHistory.length}</strong><span>Completed pickups</span></div>
                    <div class="dashboard-stat"><strong>${completedPortions}</strong><span>Portions collected</span></div>
                    <div class="dashboard-stat"><strong>${ngoDonations.length + expiredRequests.length}</strong><span>Total requests</span></div>
                    <div class="dashboard-stat"><strong>${expiredRequests.length}</strong><span>Expired requests</span></div>
                </div>
                <p>Your impact totals are based on this NGO’s recorded donation requests.</p>
            </section>
        `
    };

    dashboardContent.innerHTML = `
        ${dashboardHeader("NGO Dashboard 🤝", `Finding food as ${NGO_NAME}`)}

        <div class="dashboard-stats">
            <div class="dashboard-stat"><strong>${available.length}</strong><span>Available</span></div>
            <div class="dashboard-stat"><strong>${myRequests.length}</strong><span>My requests</span></div>
            <div class="dashboard-stat"><strong>${confirmedPickups.length}</strong><span>Confirmed pickups</span></div>
            <div class="dashboard-stat"><strong>${collectionHistory.length}</strong><span>Collected</span></div>
        </div>

        <nav class="dashboard-tabs" aria-label="NGO dashboard sections">
            ${ngoSections.map(item => `
                <button
                    class="dashboard-tab${activeNGOSection === item.id ? " active" : ""}"
                    type="button"
                    data-ngo-section="${item.id}"
                    aria-pressed="${activeNGOSection === item.id}"
                >${item.label}</button>
            `).join("")}
        </nav>

        ${sectionContent[activeNGOSection]}
    `;

    dashboardContent.querySelectorAll("[data-ngo-section]").forEach(button => {
        button.addEventListener("click", async () => {
            try {
                await showNGODashboard(button.dataset.ngoSection);
            } catch (error) {
                dashboardContent.innerHTML =
                    `<p class="error-message">${escapeHTML(error.message)}</p>`;
            }
        });
    });

    connectActionButtons();
}

async function showAdminDashboard(section = activeAdminSection) {
    activeAdminSection = adminSections.some(item => item.id === section)
        ? section
        : "overview";

    const [stats, currentDonations, expiredDonations, organizations, complaints] = await Promise.all([
        apiRequest("/admin/stats"),
        apiRequest("/donations"),
        apiRequest("/donations?status=Expired"),
        apiRequest("/organizations"),
        apiRequest("/complaints")
    ]);

    const donations = [...currentDonations, ...expiredDonations];
    const availableDonations = donations.filter(item => item.status === "Available");
    const requestedDonations = donations.filter(item => item.status === "Requested");
    const verifiedOrganizations = organizations.filter(item => item.status === "Verified");
    const pendingOrganizations = organizations.filter(item => item.status === "Pending");
    const openComplaints = complaints.filter(item => item.status === "Open");
    const demandCounts = donations.reduce((counts, item) => {
        const food = item.food_name.trim();
        counts[food] = (counts[food] || 0) + 1;
        return counts;
    }, {});
    const demandLeaders = Object.entries(demandCounts)
        .sort((left, right) => right[1] - left[1])
        .slice(0, 5);
    const now = Date.now();
    const urgencyAlerts = [
        ...requestedDonations.map(item => ({
            donation: item,
            reason: `Waiting for donor confirmation${item.requested_by ? ` from ${item.requested_by}` : ""}.`
        })),
        ...availableDonations
            .filter(item => {
                const createdAt = Date.parse(item.created_at);
                return Number.isFinite(createdAt) && now - createdAt >= 24 * 60 * 60 * 1000;
            })
            .map(item => ({
                donation: item,
                reason: "Available for more than 24 hours; review pickup urgency."
            }))
    ];

    const matchRecommendations = availableDonations.flatMap(donation => {
        const location = donation.location.trim().toLowerCase();
        const locationMatches = verifiedOrganizations.filter(organization =>
            location && organization.location.trim().toLowerCase().includes(location)
        );
        const candidates = locationMatches.length
            ? locationMatches
            : verifiedOrganizations;

        return candidates.slice(0, 3).map(organization => ({
            donation,
            organization,
            reason: locationMatches.includes(organization)
                ? "Location text matches the pickup area."
                : "Verified organization; location needs manual review."
        }));
    });

    const organizationCards = organizations.length
        ? organizations.map(organization => `
            <article class="food-card">
                <div class="food-card-header">
                    <h4>${escapeHTML(organization.name)}</h4>
                    <span class="status">${escapeHTML(organization.status).toUpperCase()}</span>
                </div>
                <div class="food-details">
                    <span>📍 ${escapeHTML(organization.location)}</span>
                    <span>✉️ ${escapeHTML(organization.contact_email)}</span>
                </div>
                ${organization.status === "Pending" ? `
                    <button class="action-btn" data-organization-status="Verified" data-id="${organization.id}">VERIFY</button>
                    <button class="action-btn secondary-action" data-organization-status="Rejected" data-id="${organization.id}">REJECT</button>
                ` : ""}
            </article>
        `).join("")
        : "<p>No organizations have been submitted for verification.</p>";

    const complaintCards = complaints.length
        ? complaints.map(complaint => `
            <article class="food-card">
                <div class="food-card-header">
                    <h4>${escapeHTML(complaint.subject)}</h4>
                    <span class="status">${escapeHTML(complaint.status).toUpperCase()}</span>
                </div>
                <div class="food-details">
                    <span>Reported by: ${escapeHTML(complaint.reporter_name)}</span>
                    <span>${escapeHTML(complaint.created_at)}</span>
                </div>
                <p>${escapeHTML(complaint.details)}</p>
                ${complaint.status === "Open"
                    ? `<button class="action-btn" data-resolve-complaint="${complaint.id}">MARK RESOLVED</button>`
                    : ""}
            </article>
        `).join("")
        : "<p>No complaints have been reported.</p>";

    const recommendationCards = matchRecommendations.length
        ? matchRecommendations.map(match => `
            <article class="food-card">
                <h4>${escapeHTML(match.donation.food_name)} → ${escapeHTML(match.organization.name)}</h4>
                <div class="food-details">
                    <span>${escapeHTML(match.donation.quantity)} portions</span>
                    <span>Pickup: ${escapeHTML(match.donation.location)}</span>
                    <span>Organization: ${escapeHTML(match.organization.location)}</span>
                </div>
                <p>${escapeHTML(match.reason)}</p>
            </article>
        `).join("")
        : "<p>No recommendations yet. Verify organizations and add available donations to generate suggestions.</p>";

    const urgencyCards = urgencyAlerts.length
        ? urgencyAlerts.map(alert => `
            <article class="food-card">
                <div class="food-card-header">
                    <h4>${escapeHTML(alert.donation.food_name)}</h4>
                    <span class="status">${escapeHTML(alert.donation.status).toUpperCase()}</span>
                </div>
                <p>${escapeHTML(alert.reason)}</p>
                <div class="food-details">
                    <span>📍 ${escapeHTML(alert.donation.location)}</span>
                    <span>⏰ ${escapeHTML(alert.donation.pickup_deadline)}</span>
                </div>
            </article>
        `).join("")
        : "<p>No urgency alerts based on current listing status and age.</p>";

    const demandInsights = demandLeaders.length
        ? `<ol>${demandLeaders.map(([food, count]) =>
            `<li>${escapeHTML(food)} — ${count} listing${count === 1 ? "" : "s"}</li>`
        ).join("")}</ol>`
        : "<p>Demand insights will appear as donations are listed.</p>";

    const analyticsRows = [
        ["Available", stats.available],
        ["Requested", stats.requested],
        ["Confirmed", stats.confirmed],
        ["Collected", stats.collected],
        ["Expired", stats.expired]
    ];

    const sectionContent = {
        overview: `
            <section class="dashboard-card">
                <h3>🤖 AI Insights Panel</h3>
                <p class="insight-disclaimer">Rule-based demo insights calculated from current listings; recommendations are not generated by a trained AI model.</p>
                <div class="dashboard-card insight-card">
                    <h4>🔗 Match Recommendations</h4>
                    ${recommendationCards}
                </div>
                <div class="dashboard-card insight-card">
                    <h4>🚨 Urgency Alerts</h4>
                    ${urgencyCards}
                </div>
                <div class="dashboard-card insight-card">
                    <h4>📈 Demand Insights</h4>
                    ${demandInsights}
                </div>
            </section>
        `,
        "organization-verification": `
            <section class="dashboard-card">
                <h3>🏢 Organization Verification</h3>
                <p>${pendingOrganizations.length} organization(s) awaiting verification.</p>
                <form id="organizationForm">
                    <input name="name" placeholder="Organization name" required>
                    <input name="location" placeholder="Organization location" required>
                    <input name="contact_email" type="email" placeholder="Contact email" required>
                    <button class="action-btn" type="submit">ADD FOR VERIFICATION</button>
                </form>
                ${organizationCards}
            </section>
        `,
        listings: `
            <section class="dashboard-card">
                <h3>📋 Listings</h3>
                ${donations.length
                    ? donations.filter(item => item.status === "Available").map(item => donationCard(item)).join("")
                    : "<p>No active listings are available.</p>"}
            </section>
        `,
        donations: `
            <section class="dashboard-card">
                <h3>🍱 Donations</h3>
                <p>${stats.portions_collected} portions collected across ${stats.total_donations} donation records.</p>
                ${donations.length
                    ? donations.map(item => donationCard(item)).join("")
                    : "<p>No donations have been posted yet.</p>"}
            </section>
        `,
        complaints: `
            <section class="dashboard-card">
                <h3>📝 Complaints</h3>
                <p>${openComplaints.length} complaint(s) still open.</p>
                <form id="complaintForm">
                    <input name="reporter_name" placeholder="Reporter name" required>
                    <input name="subject" placeholder="Complaint subject" required>
                    <textarea name="details" placeholder="Describe the complaint" required></textarea>
                    <button class="action-btn" type="submit">SUBMIT COMPLAINT</button>
                </form>
                ${complaintCards}
            </section>
        `,
        analytics: `
            <section class="dashboard-card">
                <h3>📊 Analytics</h3>
                <div class="dashboard-stats">
                    <div class="dashboard-stat"><strong>${stats.total_donations}</strong><span>Total donations</span></div>
                    <div class="dashboard-stat"><strong>${stats.portions_collected}</strong><span>Portions collected</span></div>
                    <div class="dashboard-stat"><strong>${stats.verified_organizations}</strong><span>Verified organizations</span></div>
                    <div class="dashboard-stat"><strong>${stats.open_complaints}</strong><span>Open complaints</span></div>
                </div>
                <h4>Donation status breakdown</h4>
                <ul>${analyticsRows.map(([label, count]) =>
                    `<li>${label}: ${count}</li>`
                ).join("")}</ul>
                <h4>Most-listed foods</h4>
                ${demandInsights}
            </section>
        `
    };

    dashboardContent.innerHTML = `
        ${dashboardHeader("Admin Dashboard 🛡️", "Live FoodShare database overview")}

        <div class="dashboard-stats">
            <div class="dashboard-stat"><strong>${stats.total_donations}</strong><span>Total donations</span></div>
            <div class="dashboard-stat"><strong>${stats.available}</strong><span>Available</span></div>
            <div class="dashboard-stat"><strong>${stats.requested}</strong><span>Requested</span></div>
            <div class="dashboard-stat"><strong>${stats.collected}</strong><span>Collected</span></div>
        </div>

        <nav class="dashboard-tabs" aria-label="Admin dashboard sections">
            ${adminSections.map(item => `
                <button
                    class="dashboard-tab${activeAdminSection === item.id ? " active" : ""}"
                    type="button"
                    data-admin-section="${item.id}"
                    aria-pressed="${activeAdminSection === item.id}"
                >${item.label}</button>
            `).join("")}
        </nav>

        ${sectionContent[activeAdminSection]}
    `;

    dashboardContent.querySelectorAll("[data-admin-section]").forEach(button => {
        button.addEventListener("click", async () => {
            try {
                await showAdminDashboard(button.dataset.adminSection);
            } catch (error) {
                dashboardContent.innerHTML =
                    `<p class="error-message">${escapeHTML(error.message)}</p>`;
            }
        });
    });

    const organizationForm = document.getElementById("organizationForm");
    if (organizationForm) {
        organizationForm.addEventListener("submit", async event => {
            event.preventDefault();
            const formData = Object.fromEntries(new FormData(event.currentTarget));
            try {
                await apiRequest("/organizations", {
                    method: "POST",
                    body: JSON.stringify(formData)
                });
                await showAdminDashboard("organization-verification");
            } catch (error) {
                alert(error.message);
            }
        });
    }

    const complaintForm = document.getElementById("complaintForm");
    if (complaintForm) {
        complaintForm.addEventListener("submit", async event => {
            event.preventDefault();
            const formData = Object.fromEntries(new FormData(event.currentTarget));
            try {
                await apiRequest("/complaints", {
                    method: "POST",
                    body: JSON.stringify(formData)
                });
                await showAdminDashboard("complaints");
            } catch (error) {
                alert(error.message);
            }
        });
    }

    dashboardContent.querySelectorAll("[data-organization-status]").forEach(button => {
        button.addEventListener("click", async () => {
            button.disabled = true;
            try {
                await apiRequest(`/organizations/${button.dataset.id}/status`, {
                    method: "PATCH",
                    body: JSON.stringify({ status: button.dataset.organizationStatus })
                });
                await showAdminDashboard("organization-verification");
            } catch (error) {
                alert(error.message);
                button.disabled = false;
            }
        });
    });

    dashboardContent.querySelectorAll("[data-resolve-complaint]").forEach(button => {
        button.addEventListener("click", async () => {
            button.disabled = true;
            try {
                await apiRequest(`/complaints/${button.dataset.resolveComplaint}/status`, {
                    method: "PATCH",
                    body: JSON.stringify({ status: "Resolved" })
                });
                await showAdminDashboard("complaints");
            } catch (error) {
                alert(error.message);
                button.disabled = false;
            }
        });
    });
}