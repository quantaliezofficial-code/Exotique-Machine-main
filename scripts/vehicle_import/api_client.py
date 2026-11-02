"""
Resilient API Client for Exotique Machines Backend.
Implements authentication, health checks, rate limiting, and safe retries
without ever leaking credentials or tokens.
"""

import time
import json
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from scripts.vehicle_import.config import config
from scripts.vehicle_import.logger import logger

class ExotiqueApiClient:
    def __init__(self, base_url: str = None, token: str = None):
        self.base_url = (base_url or config.api_base_url).rstrip("/")
        self.token = token or config.api_token
        self.session = requests.Session()

        # Mount robust retry adapter for network-level timeouts & 502/503/504 errors
        retries = Retry(
            total=config.max_retries,
            backoff_factor=config.retry_backoff_factor,
            status_forcelist=[500, 502, 503, 504],
            raise_on_status=False
        )
        self.session.mount("http://", HTTPAdapter(max_retries=retries))
        self.session.mount("https://", HTTPAdapter(max_retries=retries))

    def _get_headers(self, is_json: bool = True) -> Dict[str, str]:
        headers = {}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        if is_json:
            headers["Content-Type"] = "application/json"
        return headers

    def _sleep_for_rate_limit(self):
        if config.rate_limit_delay > 0:
            time.sleep(config.rate_limit_delay)

    def check_health(self) -> Tuple[bool, Dict[str, Any]]:
        """Verify API connectivity and backend health."""
        url = f"{self.base_url}/api/health"
        try:
            res = self.session.get(url, timeout=config.request_timeout)
            if res.status_code == 200:
                data = res.json()
                logger.info(f"Connected to Exotique Backend at {self.base_url} (Dialect: {data.get('database', 'unknown')})")
                return True, data
            logger.warning(f"Health check returned non-200 status: {res.status_code}")
            return False, {"status_code": res.status_code}
        except Exception as e:
            logger.error(f"Failed to connect to backend at {self.base_url}: {e}")
            return False, {"error": str(e)}

    def authenticate(self, username: str = None, password: str = None) -> bool:
        """Authenticate as administrator and obtain JWT token."""
        if self.token:
            logger.info("Using pre-configured API token.")
            return True

        user = username or config.admin_username
        pwd = password or config.admin_password
        url = f"{self.base_url}/api/auth/login"

        try:
            logger.info(f"Authenticating with backend as user '{user}'...")
            res = self.session.post(
                url,
                json={"username": user, "password": pwd},
                timeout=config.request_timeout
            )
            if res.status_code == 200:
                data = res.json()
                self.token = data.get("token")
                logger.info(f"Authentication successful. Session token granted for role: {data.get('user', {}).get('role')}")
                return True
            logger.error(f"Authentication failed (HTTP {res.status_code}): {res.text}")
            return False
        except Exception as e:
            logger.error(f"Authentication request failed: {e}")
            return False

    def get_existing_vehicles(self) -> List[Dict[str, Any]]:
        """Fetch all existing vehicle records from the backend."""
        self._sleep_for_rate_limit()
        url = f"{self.base_url}/api/vehicles"
        try:
            res = self.session.get(url, headers=self._get_headers(), timeout=config.request_timeout)
            if res.status_code == 200:
                data = res.json()
                return data.get("vehicles", [])
            logger.warning(f"Could not fetch existing vehicles (HTTP {res.status_code}): {res.text}")
            return []
        except Exception as e:
            logger.error(f"Error fetching vehicles list: {e}")
            return []

    def get_vehicle_by_id(self, vehicle_id: str) -> Optional[Dict[str, Any]]:
        """Fetch a single vehicle by its slug ID."""
        self._sleep_for_rate_limit()
        url = f"{self.base_url}/api/vehicles/{vehicle_id}"
        try:
            res = self.session.get(url, headers=self._get_headers(), timeout=config.request_timeout)
            if res.status_code == 200:
                data = res.json()
                return data.get("vehicle")
            return None
        except Exception:
            return None

    def upload_images(self, file_paths: List[Path]) -> Tuple[bool, List[str], str]:
        """
        Upload images via the multipart POST /api/upload endpoint.
        Uploads each image individually to stay well under Nginx proxy request size limits.
        Returns (success, list_of_urls, error_message).
        """
        if not file_paths:
            return True, [], ""

        url = f"{self.base_url}/api/upload"
        headers = {}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"

        uploaded_urls = []
        for fp in file_paths:
            self._sleep_for_rate_limit()
            try:
                with open(fp, "rb") as f_handle:
                    files_payload = [("photos", (fp.name, f_handle, "image/jpeg"))]
                    res = self.session.post(url, headers=headers, files=files_payload, timeout=config.request_timeout)
                    if res.status_code == 200:
                        data = res.json()
                        urls = data.get("urls", [])
                        uploaded_urls.extend(urls)
                    else:
                        err = f"Image upload failed for {fp.name} (HTTP {res.status_code}): {res.text}"
                        logger.error(err)
                        return False, uploaded_urls, err
            except Exception as e:
                err = f"Network failure during image upload for {fp.name}: {e}"
                logger.error(err)
                return False, uploaded_urls, err

        logger.info(f"Successfully uploaded {len(uploaded_urls)} images to backend.")
        return True, uploaded_urls, ""

    def create_vehicle(self, vehicle_data: Dict[str, Any], image_urls: List[str] = None) -> Tuple[bool, Optional[Dict[str, Any]], str]:
        """
        Create a vehicle record via multipart POST /api/vehicles.
        Returns (success, vehicle_dict, error_message).
        """
        self._sleep_for_rate_limit()
        url = f"{self.base_url}/api/vehicles"
        headers = {}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"

        form_data = {
            "brand": vehicle_data["brand"],
            "model": vehicle_data["model"],
            "price": str(vehicle_data["price"]),
            "badge": vehicle_data.get("badge", f"{vehicle_data['model']} Edition"),
            "type": vehicle_data.get("type", "Luxury SUV"),
            "category": vehicle_data.get("category", "premium"),
            "lifestyle": vehicle_data.get("lifestyle", "SUV"),
            "fuel": vehicle_data.get("fuel", "Petrol"),
            "transmission": vehicle_data.get("transmission", "Automatic"),
            "emi": str(vehicle_data.get("emi", 0)),
            "seats": str(vehicle_data.get("seats", 5)),
            "engine": vehicle_data.get("engine", "Performance Powertrain"),
            "power": vehicle_data.get("power", "Certified Performance"),
            "mileage": vehicle_data.get("mileage", "Verified Showroom Mileage"),
            "description": vehicle_data.get("description", ""),
            "features": json.dumps(vehicle_data.get("features", [])),
            "colors": json.dumps(vehicle_data.get("colors", [])),
            "rating": str(vehicle_data.get("rating", 5.0)),
        }

        if image_urls:
            form_data["imageUrls"] = json.dumps(image_urls)

        try:
            res = self.session.post(url, headers=headers, data=form_data, timeout=config.request_timeout)
            if res.status_code == 201:
                data = res.json()
                created_veh = data.get("vehicle")
                logger.info(f"Vehicle created successfully: {created_veh.get('brand')} {created_veh.get('model')} (ID: {created_veh.get('id')})")
                return True, created_veh, ""
            err = f"Create vehicle failed (HTTP {res.status_code}): {res.text}"
            logger.error(err)
            return False, None, err
        except Exception as e:
            err = f"Network failure during vehicle creation: {e}"
            logger.error(err)
            return False, None, err

    def update_vehicle_images(self, vehicle_id: str, image_urls: List[str]) -> Tuple[bool, str]:
        """
        Associate image URLs with an existing vehicle via PUT /api/vehicles/{vehicle_id}.
        """
        self._sleep_for_rate_limit()
        url = f"{self.base_url}/api/vehicles/{vehicle_id}"
        headers = {}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"

        form_data = {
            "imageUrls": json.dumps(image_urls),
            "replaceImages": "true"
        }

        try:
            res = self.session.put(url, headers=headers, data=form_data, timeout=config.request_timeout)
            if res.status_code == 200:
                logger.info(f"Updated image references for vehicle '{vehicle_id}' ({len(image_urls)} images).")
                return True, ""
            err = f"Failed updating vehicle images (HTTP {res.status_code}): {res.text}"
            logger.error(err)
            return False, err
        except Exception as e:
            err = f"Network failure updating vehicle images: {e}"
            logger.error(err)
            return False, err

    def delete_vehicle(self, vehicle_id: str) -> Tuple[bool, str]:
        """Rollback helper: delete vehicle by ID."""
        self._sleep_for_rate_limit()
        url = f"{self.base_url}/api/vehicles/{vehicle_id}"
        headers = self._get_headers(is_json=False)

        try:
            res = self.session.delete(url, headers=headers, timeout=config.request_timeout)
            if res.status_code == 200:
                logger.info(f"Rollback: Vehicle '{vehicle_id}' deleted successfully.")
                return True, ""
            return False, f"HTTP {res.status_code}: {res.text}"
        except Exception as e:
            return False, str(e)
