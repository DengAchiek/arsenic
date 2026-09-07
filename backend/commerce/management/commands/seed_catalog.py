from decimal import Decimal

from django.core.management.base import BaseCommand

from commerce.models import Category, Product


CATEGORIES = [
    {
        "public_id": "cat_1",
        "name": "Solar Panels",
        "slug": "solar-panels",
        "description": "High-efficiency panels for residential and commercial roofs.",
        "image_url": "assets/images/products/monocrystalline-solar-panel.png",
    },
    {
        "public_id": "cat_2",
        "name": "Inverters",
        "slug": "inverters",
        "description": "Reliable conversion and management of solar-generated power.",
        "image_url": "assets/images/products/hybrid-solar-inverter.png",
    },
    {
        "public_id": "cat_3",
        "name": "Batteries",
        "slug": "batteries",
        "description": "Storage for backup power and true energy independence.",
        "image_url": "assets/images/products/lifepo4-lithium-battery.png",
    },
    {
        "public_id": "cat_4",
        "name": "Solar Kits",
        "slug": "solar-kits",
        "description": "Complete packages sized to your household or site.",
        "image_url": "assets/images/products/complete-home-solar-kit.png",
    },
    {
        "public_id": "cat_5",
        "name": "Electrical Products",
        "slug": "electrical-products",
        "description": "Switches, cable, breakers, sockets, and connectors.",
        "image_url": "assets/images/products/solar-protection-breaker-kit.png",
    },
    {
        "public_id": "cat_6",
        "name": "Electronics",
        "slug": "electronics",
        "description": "Selected electronics and smart energy accessories.",
        "image_url": "assets/images/products/smart-energy-monitor.png",
    },
]


PRODUCTS = [
    {
        "sku": "sp-550",
        "name": "Monocrystalline Panel 550W",
        "category_slug": "solar-panels",
        "price": "189.00",
        "compare_at_price": "219.00",
        "rating": "4.8",
        "review_count": 64,
        "badge": "New",
        "badge_type": "gold",
        "image_url": "assets/images/products/monocrystalline-solar-panel.png",
        "alt_image_url": "assets/images/products/complete-home-solar-kit.png",
        "description": "High-efficiency monocrystalline cell panel built for maximum yield.",
        "specs": {
            "Power output": "550W",
            "Efficiency": "21.4%",
            "Cell type": "Monocrystalline PERC",
            "Warranty": "25 years",
            "Dimensions": "2278 x 1134 x 35mm",
        },
        "inventory_quantity": 48,
    },
    {
        "sku": "inv-5k",
        "name": "Hybrid Solar Inverter 5KW",
        "category_slug": "inverters",
        "price": "640.00",
        "compare_at_price": None,
        "rating": "4.6",
        "review_count": 41,
        "badge": "",
        "badge_type": "",
        "image_url": "assets/images/products/hybrid-solar-inverter.png",
        "alt_image_url": "assets/images/products/complete-home-solar-kit.png",
        "description": "Grid-tie and off-grid capable hybrid inverter with integrated MPPT.",
        "specs": {
            "Capacity": "5000W",
            "Type": "Hybrid, pure sine wave",
            "MPPT trackers": "2",
            "Efficiency": "97.6%",
            "Warranty": "5 years",
        },
        "inventory_quantity": 23,
    },
    {
        "sku": "bat-10k",
        "name": "Lithium Battery 10kWh",
        "category_slug": "batteries",
        "price": "2450.00",
        "compare_at_price": "2750.00",
        "rating": "4.9",
        "review_count": 88,
        "badge": "-11%",
        "badge_type": "orange",
        "image_url": "assets/images/products/lifepo4-lithium-battery.png",
        "alt_image_url": "assets/images/products/complete-home-solar-kit.png",
        "description": "LiFePO4 storage for daily cycling and dependable backup power.",
        "specs": {
            "Capacity": "10kWh",
            "Chemistry": "LiFePO4",
            "Cycle life": "6000+",
            "Voltage": "51.2V",
            "Warranty": "10 years",
        },
        "inventory_quantity": 15,
    },
    {
        "sku": "gen-port",
        "name": "Portable Solar Generator 1200W",
        "category_slug": "solar-kits",
        "price": "899.00",
        "compare_at_price": None,
        "rating": "4.5",
        "review_count": 29,
        "badge": "",
        "badge_type": "",
        "image_url": "assets/images/products/portable-solar-generator.png",
        "alt_image_url": "assets/images/products/complete-home-solar-kit.png",
        "description": "All-in-one portable power station with a folding 120W panel.",
        "specs": {
            "Output": "1200W (2400W surge)",
            "Capacity": "1024Wh",
            "Recharge time": "1.8 hrs (AC)",
            "Ports": "AC x3, USB-C x2, DC x2",
            "Weight": "12kg",
        },
        "inventory_quantity": 19,
    },
    {
        "sku": "breaker-kit",
        "name": "Solar Protection Breaker Kit",
        "category_slug": "electrical-products",
        "price": "79.00",
        "compare_at_price": "95.00",
        "rating": "4.4",
        "review_count": 18,
        "badge": "",
        "badge_type": "",
        "image_url": "assets/images/products/solar-protection-breaker-kit.png",
        "alt_image_url": "assets/images/products/complete-home-solar-kit.png",
        "description": "Breakers, surge protection, and isolators for small solar installs.",
        "specs": {
            "Rating": "63A",
            "Voltage": "1000V DC",
            "Includes": "Breaker, SPD, isolator",
            "Mounting": "DIN rail",
            "Warranty": "2 years",
        },
        "inventory_quantity": 60,
    },
    {
        "sku": "smart-meter",
        "name": "Smart Energy Monitor",
        "category_slug": "electronics",
        "price": "149.00",
        "compare_at_price": None,
        "rating": "4.7",
        "review_count": 36,
        "badge": "Popular",
        "badge_type": "gold",
        "image_url": "assets/images/products/smart-energy-monitor.png",
        "alt_image_url": "assets/images/products/smart-energy-monitor.png",
        "description": "Track household energy use and spot heavy loads in real time.",
        "specs": {
            "Connectivity": "Wi-Fi",
            "Display": "Mobile app and web",
            "Circuits": "Up to 16",
            "Alerts": "Usage and outage alerts",
            "Warranty": "2 years",
        },
        "inventory_quantity": 31,
    },
]


class Command(BaseCommand):
    help = "Seed the product catalog with the current Arsenic Energies storefront data."

    def handle(self, *args, **options):
        categories = {}
        for index, data in enumerate(CATEGORIES, start=1):
            category, _ = Category.objects.update_or_create(
                public_id=data["public_id"],
                defaults={
                    "name": data["name"],
                    "slug": data["slug"],
                    "description": data["description"],
                    "image_url": data["image_url"],
                    "display_order": index,
                    "is_active": True,
                },
            )
            categories[category.slug] = category

        for data in PRODUCTS:
            payload = data.copy()
            category = categories[payload.pop("category_slug")]
            Product.objects.update_or_create(
                sku=payload["sku"],
                defaults={
                    "name": payload["name"],
                    "category": category,
                    "description": payload["description"],
                    "specs": payload["specs"],
                    "price": Decimal(payload["price"]),
                    "compare_at_price": Decimal(payload["compare_at_price"]) if payload["compare_at_price"] else None,
                    "rating": Decimal(payload["rating"]),
                    "review_count": payload["review_count"],
                    "badge": payload["badge"],
                    "badge_type": payload["badge_type"],
                    "image_url": payload["image_url"],
                    "alt_image_url": payload["alt_image_url"],
                    "stock_status": Product.STOCK_IN,
                    "inventory_quantity": payload["inventory_quantity"],
                    "is_published": True,
                },
            )

        self.stdout.write(self.style.SUCCESS("Seeded %s categories and %s products." % (len(CATEGORIES), len(PRODUCTS))))
