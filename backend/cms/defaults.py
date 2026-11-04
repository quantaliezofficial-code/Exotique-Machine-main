"""Default website settings.

Every value here is taken from content that was already live on the site (footer,
header, home page, service page and finance FAQ) so the first deploy looks the same. The
owner can change all of it from Admin → Website → Settings.
"""

DEFAULT_SETTINGS = {
    "general": {
        "siteName": "Exotique Machines",
        "legalName": "Sai Baba Car Sales Pvt Ltd",
        "tagline": "Certified pre-owned luxury cars in Lucknow",
        "footerBlurb": "Lucknow's premier showroom for certified pre-owned luxury and performance cars. Excellence in every handpicked detail.",
        "aboutTitle": "About Exotique Machines",
        "aboutBody": (
            "Exotique Machines is a pre-owned luxury car showroom on Faizabad Road, Lucknow, "
            "next to Indira Nagar Metro Station. We are a unit of Sai Baba Car Sales Pvt Ltd.\n\n"
            "Every car in our showroom goes through a multi-stage inspection, and we help with "
            "finance, insurance transfer, trade-in of your current car and after-sales service."
        ),
        "assurances": [
            "Certified 120-Point Inspection",
            "3-Year Elite Roadside Assist",
            "Original OEM Spares Only",
        ],
        "announcement": {"enabled": False, "text": "", "link": ""},
    },
    "contact": {
        "phones": [
            {"label": "Garima", "number": "+916390000976"},
            {"label": "Akash", "number": "+916390000593"},
        ],
        "whatsapp": "916390000976",
        "email": "infoexotiquelucknow@gmail.com",
        "streetAddress": "A.Automovers Building, Main Faizabad Road, Adjacent to Indira Nagar Metro Station",
        "locality": "Indira Nagar",
        "city": "Lucknow",
        "region": "Uttar Pradesh",
        "postalCode": "226016",
        "country": "IN",
        "mapUrl": "https://maps.app.goo.gl/3yrpemSXVP7ffMGX7",
        "latitude": None,
        "longitude": None,
        # Hours as previously shown on the Service page.
        "openingHours": [{"days": ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"], "opens": "09:30", "closes": "20:30"}],
    },
    "social": {
        "instagram": "https://www.instagram.com/exotique_machines_lucknow",
        "youtube": "https://www.youtube.com/@ExotiqueMachinesofficial",
        "facebook": "https://www.facebook.com/exotiquemachines",
        "linkedin": "",
        "x": "",
    },
    "seo": {
        "homeTitle": "Exotique Machines | Certified Pre-Owned Luxury Cars in Lucknow",
        "homeDescription": (
            "Buy certified pre-owned luxury cars in Lucknow - BMW, Mercedes-Benz, Audi, Land Rover, "
            "Toyota and more. Inspected cars, finance, trade-in and test drives at Exotique Machines, Faizabad Road."
        ),
        "titleSuffix": " | Exotique Machines Lucknow",
        "defaultOgImage": "/og-default.jpg",
        "googleSiteVerification": "",
        "bingSiteVerification": "",
        "allowAiCrawlers": True,
    },
    "homepage": {
        "heading": "Certified Pre-Owned Luxury Cars in Lucknow",
        "sections": [
            {"id": "hero", "enabled": True},
            {"id": "stats", "enabled": True},
            {"id": "brands", "enabled": True},
            {"id": "showcase", "enabled": True, "title": "Featured Elite Fleet",
             "subtitle": "Handpicked luxury and performance cars from our showroom.", "limit": 12},
            {"id": "offers", "enabled": True, "title": "Current Offers",
             "subtitle": "Live promotions from the Exotique Machines showroom.", "limit": 3},
            {"id": "services", "enabled": True},
            {"id": "testimonials", "enabled": True, "title": "What Our Customers Say",
             "subtitle": "Reviews from Exotique Machines customers.", "limit": 8},
            {"id": "lifestyle", "enabled": True},
            {"id": "faq", "enabled": True, "title": "Frequently Asked Questions"},
        ],
        # Shown in the stats bar. Leave the value empty to have it computed from inventory.
        "stats": [
            {"value": "", "label": "Cars in stock", "auto": "count"},
            {"value": "", "label": "Price range", "auto": "price_range"},
            {"value": "", "label": "Brands available", "auto": "brands"},
        ],
    },
    "faq": [
        {
            "question": "Where is the Exotique Machines showroom in Lucknow?",
            "answer": "Our showroom is in the A.Automovers Building on Main Faizabad Road, adjacent to Indira Nagar Metro Station, Lucknow, Uttar Pradesh 226016.",
        },
        {
            "question": "How do I apply for car finance through Exotique Machines?",
            "answer": "Fill out the finance application form on our Finance page. Choose the car, add your contact details and use the EMI calculator; our finance team will contact you with options from partner banks.",
        },
        {
            "question": "What is the minimum down payment required?",
            "answer": "Standard financing down payments usually start at 10% to 15% of the vehicle price, subject to the lender's credit assessment.",
        },
        {
            "question": "How does the trade-in valuation work?",
            "answer": "The online trade-in estimator gives an indicative range based on manufacture year, kilometres driven and condition. The final price is confirmed after a physical inspection of your car.",
        },
    ],
}

# Offers that were hard-coded on the old Offers page. They are imported as DRAFTS so the
# owner can confirm dates and terms before they go live again.
LEGACY_OFFERS = [
    {
        "slug": "corporate-elite-program",
        "title": "Corporate Elite Program",
        "summary": "Benefits of up to Rs 1,50,000 for employees of eligible corporates on selected luxury SUVs.",
        "description": "Employees and executive staff of eligible MNCs, public sector units and software companies can receive benefits of up to Rs 1,50,000 on selected luxury SUV purchases, with priority finance processing.",
        "terms": "Requires corporate identity or salary slip. Benefit amount depends on the vehicle. Contact the showroom for eligibility.",
        "discount_type": "fixed",
        "discount_value": 150000,
        "cta_label": "Apply for corporate finance",
    },
    {
        "slug": "3-year-complimentary-care-pack",
        "title": "3-Year Complimentary Care Pack",
        "summary": "Complimentary 3-year scheduled periodic care pack on vehicles booked during the offer period.",
        "description": "Vehicles booked during the offer period receive a complimentary 3-year scheduled periodic care pack covering diagnostic checks, engine oil service and roadside assistance diagnostics.",
        "terms": "Applies to bookings made within the offer dates. Service schedule and inclusions as per the care pack document.",
        "discount_type": "none",
        "discount_value": None,
        "cta_label": "Book a service visit",
    },
    {
        "slug": "golden-key-delivery-experience",
        "title": "The Golden Key Delivery Experience",
        "summary": "A personalised showroom unveiling with flowers, cake and a professional photography set for your car delivery.",
        "description": "Make your delivery a family milestone with a personalised showroom unveiling, flowers and cake, and a digital photography set of the key handover.",
        "terms": "Available on request at the time of booking.",
        "discount_type": "none",
        "discount_value": None,
        "cta_label": "Ask on WhatsApp",
    },
]
