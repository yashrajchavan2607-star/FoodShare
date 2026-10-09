from datetime import datetime, timezone
from pathlib import Path
import sqlite3

from flask import Flask, jsonify, request, send_from_directory

BASE_DIR = Path(__file__).resolve().parent
DATABASE = BASE_DIR / "foodshare.db"

app = Flask(__name__)


def connect_db():
    """Open a connection to the SQLite database."""
    connection = sqlite3.connect(DATABASE)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database():
    """Create the donations table if it does not already exist."""
    with connect_db() as db:
        db.execute("""
            CREATE TABLE IF NOT EXISTS donations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                food_name TEXT NOT NULL,
                category TEXT NOT NULL DEFAULT 'Prepared meals',
                quantity INTEGER NOT NULL,
                donor_name TEXT NOT NULL,
                location TEXT NOT NULL,
                pickup_deadline TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'Available',
                requested_by TEXT,
                created_at TEXT NOT NULL
            )
        """)
        db.commit()


def get_donation(donation_id):
    with connect_db() as db:
        return db.execute(
            "SELECT * FROM donations WHERE id = ?",
            (donation_id,)
        ).fetchone()


def as_json(row):
    return dict(row) if row else None


def change_status(donation_id, old_status, new_status, ngo_name=None):
    """Update a donation only if it still has the expected status."""
    with connect_db() as db:
        if ngo_name is None:
            result = db.execute("""
                UPDATE donations
                SET status = ?
                WHERE id = ? AND status = ?
            """, (new_status, donation_id, old_status))
        else:
            result = db.execute("""
                UPDATE donations
                SET status = ?, requested_by = ?
                WHERE id = ? AND status = ?
            """, (new_status, ngo_name, donation_id, old_status))

        db.commit()
        return result.rowcount == 1


@app.get("/")
def home():
    return send_from_directory(BASE_DIR, "index.html")


@app.get("/style.css")
def style_file():
    return send_from_directory(BASE_DIR, "style.css")


@app.get("/script.js")
def script_file():
    return send_from_directory(BASE_DIR, "script.js")


@app.get("/api/health")
def health():
    return jsonify({"status": "ok", "service": "FoodShare API"})


@app.get("/api/donations")
def list_donations():
    """Return donations. Optional filters: status, donor_name and search."""
    status = request.args.get("status", "").strip()
    donor_name = request.args.get("donor_name", "").strip()
    search = request.args.get("search", "").strip()

    query = "SELECT * FROM donations WHERE status != 'Expired'"
    values = []

    if status:
        query += " AND status = ?"
        values.append(status)

    if donor_name:
        query += " AND donor_name = ?"
        values.append(donor_name)

    if search:
        query += " AND (food_name LIKE ? OR location LIKE ?)"
        search_term = f"%{search}%"
        values.extend([search_term, search_term])

    query += " ORDER BY created_at DESC, id DESC"

    with connect_db() as db:
        rows = db.execute(query, values).fetchall()

    return jsonify([as_json(row) for row in rows])


@app.get("/api/donations/<int:donation_id>")
def donation_details(donation_id):
    donation = get_donation(donation_id)

    if donation is None:
        return jsonify({"error": "Donation not found."}), 404

    return jsonify(as_json(donation))


@app.post("/api/donations")
def create_donation():
    data = request.get_json(silent=True) or {}

    required_fields = [
        "food_name",
        "quantity",
        "donor_name",
        "location",
        "pickup_deadline"
    ]

    missing_fields = [
        field for field in required_fields
        if not str(data.get(field, "")).strip()
    ]

    if missing_fields:
        return jsonify({
            "error": "Please fill in all required fields.",
            "missing_fields": missing_fields
        }), 400

    try:
        quantity = int(data["quantity"])
        if quantity < 1:
            raise ValueError
    except (TypeError, ValueError):
        return jsonify({
            "error": "Quantity must be a positive whole number."
        }), 400

    food_name = str(data["food_name"]).strip()
    category = str(data.get("category", "Prepared meals")).strip()
    donor_name = str(data["donor_name"]).strip()
    location = str(data["location"]).strip()
    pickup_deadline = str(data["pickup_deadline"]).strip()
    created_at = datetime.now(timezone.utc).isoformat(timespec="seconds")

    with connect_db() as db:
        cursor = db.execute("""
            INSERT INTO donations (
                food_name,
                category,
                quantity,
                donor_name,
                location,
                pickup_deadline,
                status,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, 'Available', ?)
        """, (
            food_name,
            category or "Prepared meals",
            quantity,
            donor_name,
            location,
            pickup_deadline,
            created_at
        ))

        db.commit()
        donation_id = cursor.lastrowid

    return jsonify(as_json(get_donation(donation_id))), 201


@app.post("/api/donations/<int:donation_id>/request")
def request_donation(donation_id):
    data = request.get_json(silent=True) or {}
    ngo_name = str(data.get("ngo_name", "")).strip()

    if not ngo_name:
        return jsonify({"error": "NGO name is required."}), 400

    if get_donation(donation_id) is None:
        return jsonify({"error": "Donation not found."}), 404

    if not change_status(donation_id, "Available", "Requested", ngo_name):
        return jsonify({
            "error": "This donation is no longer available."
        }), 409

    return jsonify(as_json(get_donation(donation_id)))


@app.post("/api/donations/<int:donation_id>/confirm")
def confirm_donation(donation_id):
    if get_donation(donation_id) is None:
        return jsonify({"error": "Donation not found."}), 404

    if not change_status(donation_id, "Requested", "Confirmed"):
        return jsonify({
            "error": "Only requested donations can be confirmed."
        }), 409

    return jsonify(as_json(get_donation(donation_id)))


@app.post("/api/donations/<int:donation_id>/collect")
def collect_donation(donation_id):
    if get_donation(donation_id) is None:
        return jsonify({"error": "Donation not found."}), 404

    if not change_status(donation_id, "Confirmed", "Collected"):
        return jsonify({
            "error": "Only confirmed donations can be marked collected."
        }), 409

    return jsonify(as_json(get_donation(donation_id)))


@app.get("/api/admin/stats")
def admin_stats():
    with connect_db() as db:
        rows = db.execute("""
            SELECT status, COUNT(*) AS count
            FROM donations
            GROUP BY status
        """).fetchall()

        portions_collected = db.execute("""
            SELECT COALESCE(SUM(quantity), 0)
            FROM donations
            WHERE status = 'Collected'
        """).fetchone()[0]

    counts = {row["status"]: row["count"] for row in rows}

    return jsonify({
        "total_donations": sum(counts.values()),
        "available": counts.get("Available", 0),
        "requested": counts.get("Requested", 0),
        "confirmed": counts.get("Confirmed", 0),
        "collected": counts.get("Collected", 0),
        "expired": counts.get("Expired", 0),
        "portions_collected": portions_collected
    })


@app.errorhandler(404)
def page_not_found(_error):
    if request.path.startswith("/api/"):
        return jsonify({"error": "API endpoint not found."}), 404

    return "Page not found.", 404


if __name__ == "__main__":
    initialize_database()
    app.run(host="127.0.0.1", port=5000, debug=True)