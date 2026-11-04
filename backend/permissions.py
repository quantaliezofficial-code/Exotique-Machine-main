"""Permission catalogue and role presets.

Roles stored on the user are still "superadmin" (everything) or "admin" (explicit
permission list). Presets are named bundles the Super Admin can apply in one click.
"""
from typing import Dict, List

PERMISSIONS: Dict[str, str] = {
    "inventory:view": "View inventory",
    "inventory:create": "Create vehicles",
    "inventory:edit": "Edit vehicles",
    "inventory:delete": "Delete vehicles",
    "pricing:edit": "Change vehicle prices",
    "logs:view": "View security & activity logs",
    "leads:view": "View customer enquiries & bookings (personal data)",
    "leads:manage": "Update enquiry & booking status",
    "cms:hero": "Edit hero slides",
    "cms:showcase": "Manage homepage vehicle showcase",
    "cms:reviews": "Create, edit and moderate reviews",
    "cms:offers": "Create and edit offers",
    "cms:media": "Upload and manage media library",
    "cms:settings": "Edit website settings, homepage sections & SEO",
    "cms:publish": "Publish content (without it, changes stay as drafts)",
}

ALL_PERMISSIONS: List[str] = list(PERMISSIONS.keys())

ROLE_PRESETS: Dict[str, Dict] = {
    "content_manager": {
        "label": "Content Manager",
        "permissions": ["inventory:view", "cms:hero", "cms:reviews", "cms:offers", "cms:media",
                        "cms:publish", "leads:view", "leads:manage"],
    },
    "inventory_manager": {
        "label": "Inventory Manager",
        "permissions": ["inventory:view", "inventory:create", "inventory:edit", "inventory:delete",
                        "pricing:edit", "cms:showcase", "cms:media", "cms:publish"],
    },
    "editor": {
        "label": "Editor (drafts only)",
        "permissions": ["inventory:view", "cms:hero", "cms:reviews", "cms:offers", "cms:media"],
    },
    "sales_staff": {
        "label": "Sales Staff",
        "permissions": ["inventory:view", "leads:view", "leads:manage"],
    },
}

DEFAULT_ADMIN_PERMISSIONS = ["inventory:view", "inventory:create", "inventory:edit", "pricing:edit"]


def clean_permissions(perms) -> List[str]:
    """Drop unknown permission strings (including the old '*' wildcard)."""
    seen = []
    for p in perms or []:
        if p in PERMISSIONS and p not in seen:
            seen.append(p)
    return seen


def has_permission(user, permission: str) -> bool:
    if user is None:
        return False
    if user.role == "superadmin":
        return True
    return permission in (user.permissions or [])
