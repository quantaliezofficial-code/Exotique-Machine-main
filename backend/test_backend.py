import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.database import SessionLocal, init_db
from backend.seed import seed_database
from backend.models import User

client = TestClient(app)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    init_db()
    seed_database()


def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "database" in data


def test_superadmin_login_and_auth_me():
    # Login as Super Admin
    login_res = client.post("/api/auth/login", json={
        "username": "superadmin",
        "password": "superadmin123"
    })
    assert login_res.status_code == 200
    data = login_res.json()
    assert "token" in data
    assert data["user"]["role"] == "superadmin"

    token = data["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Verify session /me
    me_res = client.get("/api/auth/me", headers=headers)
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["user"]["username"] == "superadmin"


def test_invalid_login():
    res = client.post("/api/auth/login", json={
        "username": "superadmin",
        "password": "wrongpassword"
    })
    assert res.status_code == 401
    assert "Invalid username or password" in res.json()["detail"]


def test_vehicles_list_and_filter():
    # Public read
    res = client.get("/api/vehicles")
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["count"] > 0
    assert len(data["vehicles"]) > 0

    first_vehicle = data["vehicles"][0]
    first_id = first_vehicle["id"]

    # Single vehicle lookup
    detail_res = client.get(f"/api/vehicles/{first_id}")
    assert detail_res.status_code == 200
    assert detail_res.json()["vehicle"]["id"] == first_id

    # Filter by category
    filter_res = client.get("/api/vehicles?category=non-premium")
    assert filter_res.status_code == 200
    for v in filter_res.json()["vehicles"]:
        assert v["category"] == "non-premium"


def test_admin_management_crud():
    # Login superadmin
    login_res = client.post("/api/auth/login", json={
        "username": "superadmin",
        "password": "superadmin123"
    })
    token = login_res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create admin
    new_username = "test_staff_admin"
    create_res = client.post("/api/auth/admins", headers=headers, json={
        "username": new_username,
        "name": "Test Staff Manager",
        "temporaryPassword": "TemporaryPass123!",
        "permissions": ["inventory:view", "inventory:create", "inventory:edit"]
    })
    assert create_res.status_code == 201
    admin_id = create_res.json()["admin"]["id"]

    # List admins
    list_res = client.get("/api/auth/admins", headers=headers)
    assert list_res.status_code == 200
    admin_usernames = [a["username"] for a in list_res.json()["admins"]]
    assert new_username in admin_usernames

    # Toggle status to deactivated
    status_res = client.patch(f"/api/auth/admins/{admin_id}/status", headers=headers, json={
        "status": "deactivated"
    })
    assert status_res.status_code == 200
    assert status_res.json()["status"] == "deactivated"

    # Verify deactivated admin cannot log in
    staff_login = client.post("/api/auth/login", json={
        "username": new_username,
        "password": "TemporaryPass123!"
    })
    assert staff_login.status_code == 403

    # Reactivate
    client.patch(f"/api/auth/admins/{admin_id}/status", headers=headers, json={
        "status": "active"
    })

    # Delete admin
    del_res = client.delete(f"/api/auth/admins/{admin_id}", headers=headers)
    assert del_res.status_code == 200


def test_vehicle_lifecycle():
    login_res = client.post("/api/auth/login", json={
        "username": "superadmin",
        "password": "superadmin123"
    })
    token = login_res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create vehicle via multipart form
    form_data = {
        "brand": "Porsche",
        "model": "911 Carrera S",
        "price": "145.5",
        "type": "Luxury Sports Coupe",
        "category": "premium",
        "lifestyle": "Luxury",
        "fuel": "Petrol",
        "transmission": "Automatic",
        "engine": "3.0L Twin-Turbo Boxer 6",
        "power": "450 PS",
        "mileage": "11.2 km/pl",
        "description": "Certified pristine 911 Carrera S with Sports Chrono Package."
    }
    create_res = client.post("/api/vehicles", headers=headers, data=form_data)
    assert create_res.status_code == 201
    created_veh = create_res.json()["vehicle"]
    veh_id = created_veh["id"]
    assert created_veh["brand"] == "Porsche"
    assert created_veh["price"] == 145.5

    # Update vehicle
    update_res = client.put(f"/api/vehicles/{veh_id}", headers=headers, data={
        "price": "142.0",
        "badge": "Heritage Edition"
    })
    assert update_res.status_code == 200
    assert update_res.json()["vehicle"]["price"] == 142.0
    assert update_res.json()["vehicle"]["badge"] == "Heritage Edition"

    # Delete vehicle
    del_res = client.delete(f"/api/vehicles/{veh_id}", headers=headers)
    assert del_res.status_code == 200

    # Ensure 404 after delete
    get_res = client.get(f"/api/vehicles/{veh_id}")
    assert get_res.status_code == 404


def test_activity_logs():
    login_res = client.post("/api/auth/login", json={
        "username": "superadmin",
        "password": "superadmin123"
    })
    token = login_res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/activity-logs?limit=20", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "logs" in data
    assert len(data["logs"]) > 0


def test_customer_bookings():
    # Finance application
    fin_res = client.post("/api/finance/apply", json={
        "name": "Rajesh Sharma",
        "phone": "+91 98765 43210",
        "whatsappUpdates": True,
        "model": "Toyota Innova Crysta"
    })
    assert fin_res.status_code == 201
    assert fin_res.json()["success"] is True

    # Test drive booking
    td_res = client.post("/api/test-drives", json={
        "modelId": "toyota-innova-crysta-2022-bronze-1",
        "modelName": "Toyota Innova Crysta 2022",
        "date": "2026-11-05",
        "time": "14:00",
        "name": "Rajesh Sharma",
        "phone": "+91 98765 43210",
        "email": "rajesh@example.com",
        "hasLicense": True
    })
    assert td_res.status_code == 201
    assert td_res.json()["success"] is True

    # Service booking
    srv_res = client.post("/api/service/book", json={
        "vehicleModel": "Toyota Innova Crysta",
        "serviceType": "Major Periodic Service",
        "preferredDate": "2026-11-10",
        "customerName": "Rajesh Sharma",
        "customerPhone": "+91 98765 43210",
        "notes": "Please check brake pads and detailing."
    })
    assert srv_res.status_code == 201
    assert srv_res.json()["success"] is True
