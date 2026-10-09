/* ================= LOGIN ================= */

function openLogin() {
    document.getElementById("loginModal").style.display = "flex";
}

function closeLogin() {
    document.getElementById("loginModal").style.display = "none";
}


/* ================= DASHBOARD ================= */

function openDashboard(role) {

    closeLogin();

    const dashboard = document.getElementById("dashboard");
    const content = document.getElementById("dashboardContent");

    dashboard.style.display = "flex";

    if (role === "donor") {
        showDonorDashboard(content);
    }

    if (role === "ngo") {
        showNGODashboard(content);
    }

    if (role === "admin") {
        showAdminDashboard(content);
    }
}


function closeDashboard() {
    document.getElementById("dashboard").style.display = "none";
}


/* ================= DONOR DASHBOARD ================= */

function showDonorDashboard(content) {

    content.innerHTML = `

        <div class="dashboard-header">

            <h2>Donor Dashboard 🏢</h2>

            <p>
                Welcome, College Mess
            </p>

        </div>


        <div class="dashboard-stats">

            <div class="dashboard-stat">
                <strong>3</strong>
                <span>Available</span>
            </div>

            <div class="dashboard-stat">
                <strong>1</strong>
                <span>Requested</span>
            </div>

            <div class="dashboard-stat">
                <strong>8</strong>
                <span>Collected</span>
            </div>

            <div class="dashboard-stat">
                <strong>2</strong>
                <span>Expired</span>
            </div>

        </div>


        <div class="dashboard-card">

            <h3>➕ Add New Donation</h3>

            <div class="food-card">

                <input
                    id="foodName"
                    placeholder="Food name e.g. Rice + Dal"
                    style="width:100%; padding:12px; margin-bottom:10px; border:1px solid #ddd; border-radius:8px;"
                >

                <input
                    id="quantity"
                    placeholder="Quantity e.g. 25 kg"
                    style="width:100%; padding:12px; margin-bottom:10px; border:1px solid #ddd; border-radius:8px;"
                >

                <input
                    id="location"
                    placeholder="Pickup location"
                    style="width:100%; padding:12px; margin-bottom:10px; border:1px solid #ddd; border-radius:8px;"
                >

                <input
                    id="deadline"
                    placeholder="Pickup deadline e.g. 10:30 PM"
                    style="width:100%; padding:12px; margin-bottom:15px; border:1px solid #ddd; border-radius:8px;"
                >

                <button
                    class="action-btn"
                    onclick="postDonation()"
                >
                    POST DONATION
                </button>

            </div>

        </div>


        <div class="dashboard-card">

            <h3>📦 My Donations</h3>

            <div id="donationList">

                <div class="food-card">

                    <div class="food-card-header">

                        <h4>🍚 Rice + Dal</h4>

                        <span class="status">
                            AVAILABLE
                        </span>

                    </div>

                    <div class="food-details">

                        <span>⚖️ 20 kg</span>

                        <span>📍 College Mess</span>

                        <span>⏰ 10:30 PM</span>

                    </div>

                </div>


                <div class="food-card">

                    <div class="food-card-header">

                        <h4>🥗 Vegetable Curry</h4>

                        <span class="status">
                            REQUESTED
                        </span>

                    </div>

                    <div class="food-details">

                        <span>⚖️ 15 kg</span>

                        <span>📍 College Mess</span>

                    </div>

                    <button
                        class="action-btn"
                        onclick="confirmDonation(this)"
                    >
                        ACCEPT NGO REQUEST
                    </button>

                </div>

            </div>

        </div>
    `;
}


/* ================= POST DONATION ================= */

function postDonation() {

    const foodName = document.getElementById("foodName").value;
    const quantity = document.getElementById("quantity").value;
    const location = document.getElementById("location").value;
    const deadline = document.getElementById("deadline").value;

    if (
        foodName === "" ||
        quantity === "" ||
        location === "" ||
        deadline === ""
    ) {
        alert("Please fill all donation details.");
        return;
    }


    const donationList =
        document.getElementById("donationList");


    const newDonation = document.createElement("div");

    newDonation.className = "food-card";

    newDonation.innerHTML = `

        <div class="food-card-header">

            <h4>🍱 ${foodName}</h4>

            <span class="status">
                AVAILABLE
            </span>

        </div>

        <div class="food-details">

            <span>⚖️ ${quantity}</span>

            <span>📍 ${location}</span>

            <span>⏰ ${deadline}</span>

        </div>

    `;


    donationList.prepend(newDonation);


    document.getElementById("foodName").value = "";
    document.getElementById("quantity").value = "";
    document.getElementById("location").value = "";
    document.getElementById("deadline").value = "";


    alert("Donation posted successfully! 🍱");
}


/* ================= CONFIRM DONATION ================= */

function confirmDonation(button) {

    const card = button.parentElement;

    const status = card.querySelector(".status");

    status.innerText = "CONFIRMED";

    button.innerText = "NGO CONFIRMED ✓";

    button.disabled = true;

    alert("NGO request confirmed successfully!");
}


/* ================= NGO DASHBOARD ================= */

function showNGODashboard(content) {

    content.innerHTML = `

        <div class="dashboard-header">

            <h2>NGO Dashboard 🤝</h2>

            <p>
                Find surplus food available near you
            </p>

        </div>


        <div class="dashboard-stats">

            <div class="dashboard-stat">
                <strong>12</strong>
                <span>Available Donations</span>
            </div>

            <div class="dashboard-stat">
                <strong>4</strong>
                <span>My Requests</span>
            </div>

            <div class="dashboard-stat">
                <strong>18</strong>
                <span>Collected</span>
            </div>

            <div class="dashboard-stat">
                <strong>2.4 km</strong>
                <span>Nearest Food</span>
            </div>

        </div>


        <div class="dashboard-card">

            <h3>🍱 Available Donations</h3>


            ${createNGOFoodCard(
                "Rice + Dal",
                "25 kg",
                "College Mess",
                "10:30 PM"
            )}


            ${createNGOFoodCard(
                "Vegetable Pulao",
                "18 kg",
                "City Canteen",
                "9:45 PM"
            )}


            ${createNGOFoodCard(
                "Chapati + Sabzi",
                "30 kg",
                "Hotel Green",
                "11:00 PM"
            )}

        </div>

    `;
}


function createNGOFoodCard(
    food,
    quantity,
    location,
    deadline
) {

    return `

        <div class="food-card">

            <div class="food-card-header">

                <h4>🍚 ${food}</h4>

                <span class="status">
                    AVAILABLE
                </span>

            </div>

            <div class="food-details">

                <span>⚖️ ${quantity}</span>

                <span>📍 ${location}</span>

                <span>⏰ ${deadline}</span>

            </div>

            <button
                class="action-btn"
                onclick="requestFood(this)"
            >
                REQUEST FOOD
            </button>

        </div>

    `;
}


/* ================= REQUEST FOOD ================= */

function requestFood(button) {

    button.innerText = "REQUEST SENT ✓";

    button.disabled = true;

    button.style.background = "#718078";

    alert(
        "Food request sent to the donor successfully!"
    );
}


/* ================= ADMIN ================= */

function showAdminDashboard(content) {

    content.innerHTML = `

        <div class="dashboard-header">

            <h2>Admin Dashboard 🛡️</h2>

            <p>
                Monitor and manage the FoodShare platform
            </p>

        </div>


        <div class="dashboard-stats">

            <div class="dashboard-stat">
                <strong>18</strong>
                <span>Donors</span>
            </div>

            <div class="dashboard-stat">
                <strong>24</strong>
                <span>NGOs</span>
            </div>

            <div class="dashboard-stat">
                <strong>86</strong>
                <span>Completed</span>
            </div>

            <div class="dashboard-stat">
                <strong>7</strong>
                <span>Expired</span>
            </div>

        </div>


        <div class="dashboard-card">

            <h3>📊 Platform Overview</h3>

            <div class="food-card">

                <div class="food-card-header">

                    <h4>Food Rescued</h4>

                    <strong>1,250 kg</strong>

                </div>

                <div class="food-details">

                    <span>🍽️ 3,420 meals saved</span>

                    <span>🤝 24 NGOs</span>

                </div>

            </div>


            <div class="food-card">

                <div class="food-card-header">

                    <h4>Pending Verification</h4>

                    <span class="status">
                        3 USERS
                    </span>

                </div>

                <div class="food-details">

                    <span>2 NGOs</span>

                    <span>1 Donor</span>

                </div>

                <button
                    class="action-btn"
                    onclick="alert('Verification panel will be connected to the backend later.')"
                >
                    REVIEW
                </button>

            </div>

        </div>


        <div class="dashboard-card">

            <h3>🤖 Smart Matching Preview</h3>

            <div class="food-card">

                <div class="food-card-header">

                    <h4>Best NGO Match</h4>

                    <span class="status">
                        94% MATCH
                    </span>

                </div>

                <div class="food-details">

                    <span>📍 2.4 km away</span>

                    <span>🍚 Accepts cooked food</span>

                    <span>🚚 Pickup available</span>

                </div>

            </div>

        </div>

    `;
}


/* ================= SCROLL ================= */

function scrollToSection(sectionId) {

    document
        .getElementById(sectionId)
        .scrollIntoView({
            behavior: "smooth"
        });
}


/* ================= CLOSE MODAL ================= */

window.addEventListener("click", function(event) {

    const loginModal =
        document.getElementById("loginModal");

    const dashboard =
        document.getElementById("dashboard");


    if (event.target === loginModal) {
        closeLogin();
    }

    if (event.target === dashboard) {
        closeDashboard();
    }

});