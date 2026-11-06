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
        # Order, visibility and copy of every home page section (Admin → Settings → Home page).
        "sections": [
            {"id": "hero", "enabled": True},
            {"id": "stats", "enabled": True},
            {"id": "velocity", "enabled": True},
            {"id": "brands", "enabled": True, "eyebrow": "Multiple Premium Brands Available",
             "title": "Our Featured Elite Automakers",
             "subtitle": "Our showroom offers select high-tier brands to match your exact performance standard and design philosophy. Click any rotating brand card to explore its dedicated fleet."},
            {"id": "showcase", "enabled": True, "eyebrow": "Handpicked Masterpieces", "title": "Featured Elite Fleet",
             "subtitle": "Experience our highest-curated luxury and performance machines.", "limit": 12},
            {"id": "whyus", "enabled": True, "eyebrow": "The Exotique Standard", "title": "Why Buy From Us",
             "subtitle": "What comes with every car from our showroom."},
            {"id": "services", "enabled": True, "eyebrow": "Services We Provide", "title": "Bespoke Services",
             "titleAccent": "Crafted For The Elite",
             "subtitle": "Elevate your driving lifestyle. From custom interior tailored designs to elite doorstep delivery, we manage your luxury fleet seamlessly."},
            {"id": "testimonials", "enabled": True, "eyebrow": "Testimonials", "title": "What Our Customers Say",
             "subtitle": "Real stories from owners who bought their car at Exotique Machines.", "limit": 12},
            {"id": "lifestyle", "enabled": True, "eyebrow": "Showroom Collections", "title": "Discover by Lifestyle",
             "subtitle": "Hover over each collection to preview. Click any lifestyle category to view matching vehicles in our curated fleet."},
            {"id": "offers", "enabled": True, "eyebrow": "Showroom Exclusive Privileges", "title": "Celebrate with Luxury Privileges",
             "subtitle": "Live promotions from the Exotique Machines showroom.", "limit": 3},
            {"id": "faq", "enabled": True, "title": "Frequently Asked Questions"},
        ],
        # Shown in the stats bar. Leave the value empty to have it computed from inventory.
        "stats": [
            {"value": "", "label": "Cars in stock", "auto": "count"},
            {"value": "", "label": "Price range", "auto": "price_range"},
            {"value": "", "label": "Brands available", "auto": "brands"},
        ],
        # Zoom-parallax services block (from the previous home page). The centre card lists
        # the services; up to six photos fly out around it as visitors scroll.
        "services": {
            "centerEyebrow": "Concierge Hub",
            "centerTitle": "Our Bespoke Suite",
            "centerText": "A full portfolio of concierge services for your car.",
            "ctaLabel": "Book a service",
            "ctaUrl": "/service",
            "items": [
                {"title": "Bespoke Customization", "desc": "Handcrafted interior personalization and paint curation.",
                 "image": "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&q=85&w=1600", "link": "/service"},
                {"title": "Expert Diagnostics", "desc": "Precise health checks and diagnostics.",
                 "image": "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&q=85&w=1600", "link": "/service"},
                {"title": "Elite Track-Day", "desc": "High-performance driving curation.",
                 "image": "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=85&w=1600", "link": "/service"},
                {"title": "Eco Infrastructure", "desc": "Home and corporate charging installations.",
                 "image": "https://images.unsplash.com/photo-1563720223523-491ff04651de?auto=format&fit=crop&q=85&w=1600", "link": "/service"},
                {"title": "Pristine Delivery", "desc": "Direct-to-door enclosed flatbed transportation.",
                 "image": "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&q=85&w=1600", "link": "/service"},
                {"title": "24/7 VIP Concierge", "desc": "Dedicated advisors ready on the first ring.",
                 "image": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&q=85&w=1600", "link": "/about"},
            ],
        },
        # Hover-reveal rows ("Discover by Lifestyle").
        "collections": [
            {"label": "SUV Fleet", "image": "/uploads/1O8A2473_JPG-1792888826798-912125552.jpg", "link": "/cars?type=SUV"},
            {"label": "Executive Luxury", "image": "/uploads/1O8A2799_JPG-1792888318571-705636993.jpg", "link": "/cars?type=Luxury"},
            {"label": "M Sport Line", "image": "/uploads/DSC04220-1792895012921-827501317.jpg", "link": "/brands/bmw"},
            {"label": "All-Terrain 4x4", "image": "/uploads/1O8A2179_JPG-1792661673910-125869344.jpg", "link": "/cars?type=SUV"},
            {"label": "7-Seater Luxury", "image": "/uploads/1O8A3868_JPG-1792891191327-728378127.jpg", "link": "/cars?type=SUV"},
        ],
        # Moving text band (React Bits "Scroll Velocity"). Each line scrolls in the opposite
        # direction to the one above; brandLine adds a line of the brands in stock.
        "velocity": {"lines": ["Certified · Inspected · Delivered"], "brandLine": True},
        # "Why buy from us" stacking cards (React Bits "Scroll Stack"). Photos are the
        # showroom's own uploads; an empty image uses a featured car's photo. Text restates the showroom's own assurances; edit freely.
        "whyUs": [
            {"title": "Certified 120-Point Inspection", "text": "Every car is inspected on 120 points before it is listed.", "image": "/uploads/DSC04220-1792895012921-827501317.jpg"},
            {"title": "3-Year Elite Roadside Assist", "text": "Roadside assistance for three years after you buy.", "image": "/uploads/1O8A2179_JPG-1792661673910-125869344.jpg"},
            {"title": "Original OEM Spares Only", "text": "Servicing and repairs use original manufacturer parts.", "image": "/uploads/1O8A2799_JPG-1792888318571-705636993.jpg"},
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


# Hero slides that were written for the previous home page. Imported once, as published
# slides, so the first deploy shows the same hero. Edit or replace them in Admin → Hero.
LEGACY_HERO_SLIDES = [
    {"vehicle_id": "bmw-x5-2024-white-32", "watermark": "X5 M SPORT", "eyebrow": "Certified Luxury Performance SUV",
     "title": "Command Every Journey",
     "description": "Exotique Machines certified 2024 BMW X5 xDrive30d LCI M Sport in Mineral White. 22,000 verified kms, M Sport aerodynamics, and Sky Lounge panoramic glass roof.",
     "desktop_image": "/uploads/DSC04220-1792895012921-827501317.jpg", "cta_label": "Explore BMW X5",
     "image_alt": "2024 BMW X5 xDrive30d M Sport in Mineral White"},
    {"vehicle_id": "audi-a3-2020-white-26", "watermark": "AUDI A3", "eyebrow": "Certified Luxury Sedan",
     "title": "Refined Precision, Pure Performance",
     "description": "Exotique Machines certified 2020 Audi A3 35 TDI Premium Plus. UP32 registered, 2.0L Turbo Diesel, panoramic sunroof, and pristine showroom condition.",
     "desktop_image": "/uploads/1O8A2799_JPG-1792888318571-705636993.jpg", "cta_label": "Explore Audi A3",
     "image_alt": "2020 Audi A3 35 TDI Premium Plus in white"},
    {"vehicle_id": "volvo-xc90-2019-white-51", "watermark": "VOLVO XC90", "eyebrow": "Certified 7-Seater Luxury SUV",
     "title": "Scandinavian Luxury & Safety",
     "description": "Exotique Machines certified 2019 Volvo XC90 D5 Inscription 7-Seater. Luxury AWD, panoramic glass roof, crystal gearshift, and verified service history.",
     "desktop_image": "/uploads/1O8A2473_JPG-1792888826798-912125552.jpg", "cta_label": "Explore Volvo XC90",
     "image_alt": "2019 Volvo XC90 D5 Inscription in white"},
    {"vehicle_id": "mercedes-benz-cla-2018-white-43", "watermark": "MERCEDES CLA", "eyebrow": "Certified Luxury Coupe Sedan",
     "title": "Sensual Purity & Aerodynamic Grace",
     "description": "Exotique Machines certified 2018 Mercedes-Benz CLA 200d Urban Sport. Frameless doors, panoramic glass roof, dynamic driving modes, and sport styling.",
     "desktop_image": "/uploads/1O8A3190_JPG-1792890803052-217088618.jpg", "cta_label": "Explore Mercedes CLA",
     "image_alt": "2018 Mercedes-Benz CLA 200d Urban Sport in white"},
    {"vehicle_id": "bmw-x1-2019-white-30", "watermark": "BMW X1", "eyebrow": "Certified Luxury Compact SUV",
     "title": "Urban Agility, Uncompromised Comfort",
     "description": "Exotique Machines certified 2019 BMW X1 sDrive20d xLine. TwinPower Turbo Diesel, dual panoramic glass roof, and sports leather cockpit.",
     "desktop_image": "/uploads/1O8A3273_JPG-1792888527857-966383162.jpg", "cta_label": "Explore BMW X1",
     "image_alt": "2019 BMW X1 sDrive20d xLine in white"},
    {"vehicle_id": "honda-elevate-2024-white-17", "watermark": "ELEVATE", "eyebrow": "Certified Flagship SUV",
     "title": "Modern Sophistication & Space",
     "description": "Exotique Machines certified 2024 Honda Elevate ZX CVT Flagship. Single 1st owner, 29K kms, advanced safety suite, and wireless connectivity.",
     "desktop_image": "/uploads/1O8A2642_JPG-1792890601075-381505309.jpg", "cta_label": "Explore Honda Elevate",
     "image_alt": "2024 Honda Elevate ZX CVT in white"},
]

# The three testimonials that were hard-coded on the previous home page. Imported as
# PENDING reviews: approve them in Admin → Reviews only if they are genuine customers
# (the photos were stock images; replace them with the customer's own photo, with consent).
LEGACY_REVIEWS = [
    {"customer_name": "David Lee", "customer_title": "Architect & Design Principal",
     "body": "Every luxury detail feels incredibly curated. The interface response, quiet cabin, and powerful acceleration turn daily city commuting into a highly meditative and relaxing journey.",
     "photo": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=85&w=1200&auto=format&fit=crop"},
    {"customer_name": "Maria Gonzalez", "customer_title": "Urban Commuter & Tech Executive",
     "body": "Every drive feels effortless. The transition is smooth, quiet, and powerful - it's like the car understands me before I even move. The responsiveness and control give me confidence on every road.",
     "photo": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=85&w=1200&auto=format&fit=crop"},
    {"customer_name": "Sarah Jenkins", "customer_title": "Executive Director",
     "body": "The Exotique Machines concierge experience is unmatched. Pristine vehicle condition, transparent ownership documentation, expedited finance approvals, and seamless handover make acquiring a certified machine effortless.",
     "photo": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=85&w=1200&auto=format&fit=crop"},
]
