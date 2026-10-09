# FoodShare

FoodShare is a food-rescue demo platform that helps food donors share surplus meals with NGOs. Donors can post pickup details, NGOs can request and collect donations, and administrators can manage listings, organizations, complaints, and platform insights.

## Features

- **Donor dashboard:** Post Food, My Listings, Incoming Requests, Pickup Schedule, and Donation History.
- **Exact pickup locations:** Select a point on the map or share the browser's current location. Coordinates are saved with the donation and shown to NGOs with a map link.
- **NGO dashboard:** Discover Food, My Requests, Confirmed Pickups, Collection History, and Impact Reports.
- **Admin dashboard:** Overview, Organization Verification, Listings, Donations, Complaints, and Analytics.
- **AI insights panel:** Displays rule-based match recommendations, urgency alerts, and demand insights. These are demo rules, not predictions from a trained AI model.
- **Donation workflow:** Available → Requested → Confirmed → Collected.
- **SQLite storage:** Donations, organization verification records, and complaints are stored in `foodshare.db`.

## Requirements

- Python 3.10 or later
- Flask
- An internet connection for the Leaflet map library and OpenStreetMap tiles

## Run locally

1. Clone the repository and open its directory:

   ```powershell
   git clone https://github.com/yashrajchavan2607-star/FoodShare.git
   cd FoodShare
   ```

2. (Optional) Create and activate a virtual environment:

   ```powershell
   py -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```

3. Install the Python dependency:

   ```powershell
   py -m pip install -r requirements.txt
   ```

4. Start the Flask app:

   ```powershell
   py app.py
   ```

5. Open [http://127.0.0.1:5000](http://127.0.0.1:5000) in a browser.

The SQLite database and its tables are initialized when `app.py` is run directly. The database file is local and ignored by Git.

## Use the demo

Choose **Login**, then select a demo role:

- **Food Donor** to post and manage donations.
- **NGO** to discover donations and request, confirm, or collect them.
- **Administrator** to review platform records, verify organizations, resolve complaints, and view analytics.

The demo roles are fixed in the frontend; this project does not currently implement user accounts or authentication. Use non-sensitive sample information.

For exact pickup sharing, select a point on the map or choose **Use my location** and grant the browser permission. The donor must select coordinates before posting. Browser location access generally requires `localhost` or HTTPS.

## API overview

All API routes are served by Flask under `/api`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Check that the API is running |
| GET | `/api/donations` | List non-expired donations; supports `status`, `donor_name`, and `search` query parameters |
| GET | `/api/donations/<id>` | Get one donation |
| POST | `/api/donations` | Create a donation |
| POST | `/api/donations/<id>/request` | Request an available donation |
| POST | `/api/donations/<id>/confirm` | Confirm a requested donation |
| POST | `/api/donations/<id>/collect` | Mark a confirmed donation collected |
| GET, POST | `/api/organizations` | List or submit organizations for verification |
| PATCH | `/api/organizations/<id>/status` | Verify or reject an organization |
| GET, POST | `/api/complaints` | List or submit complaints |
| PATCH | `/api/complaints/<id>/status` | Mark a complaint resolved |
| GET | `/api/admin/stats` | Get donation and admin summary counts |

Donation creation accepts `food_name`, `quantity`, `donor_name`, `location`, and `pickup_deadline`. It can also include `latitude` and `longitude`; the frontend requires these coordinates when posting through the donor dashboard.

## Project files

- `app.py` — Flask application and JSON API
- `index.html` — Landing page and dashboard shells
- `script.js` — Dashboard interactions and API requests
- `style.css` — Page and dashboard styling
- `requirements.txt` — Python dependencies

## Notes

- The map uses Leaflet and OpenStreetMap tiles. Map rendering requires network access.
- The “AI” panel is explicitly a rule-based demo. Match suggestions compare location text; urgency alerts use request status and listing age; demand insights count listed food names.
- This is a prototype, not a production deployment. Add authentication, authorization, operational logging, deployment settings, and production-grade validation before exposing it publicly.
