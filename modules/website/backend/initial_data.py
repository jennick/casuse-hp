from sqlalchemy.orm import Session

from database import SessionLocal
from models import CustomerType, Customer
from schemas import RegistrationRequest
from crud import create_customer, get_customer_by_email
from security import get_password_hash


def init_db() -> None:
    db: Session = SessionLocal()
    try:
        if db.query(Customer).count() > 0:
            return

        password = "Test1234!"
        hashed = get_password_hash(password)

        seed_customers = [
            RegistrationRequest(
                email="admin@casuse.mx",
                first_name="Carlos",
                last_name="Ramírez",
                phone_number="+52 33 1234 5678",
                customer_type=CustomerType.bedrijf,
                description="Hoofdadmin van Casuse website module.",
                company_name="Ventanas Casuse S.A. de C.V.",
                tax_id="VCS921231ABC",
                address_street="Av. López Mateos Sur",
                address_ext_number="1234",
                address_int_number="Piso 3",
                address_neighborhood="Jardines del Bosque",
                address_city="Guadalajara",
                address_state="Jalisco",
                address_postal_code="44520",
                address_country="Mexico",
            ),
            RegistrationRequest(
                email="sofia.lopez@example.mx",
                first_name="Sofía",
                last_name="López",
                phone_number="+52 55 9876 5432",
                customer_type=CustomerType.particulier,
                description="Particuliere klant uit CDMX.",
                company_name=None,
                tax_id=None,
                address_street="Calle Reforma",
                address_ext_number="456",
                address_int_number="Depto 12",
                address_neighborhood="Centro",
                address_city="Ciudad de México",
                address_state="CDMX",
                address_postal_code="06000",
                address_country="Mexico",
            ),
            RegistrationRequest(
                email="compras@aluminios-azteca.mx",
                first_name="Miguel",
                last_name="Hernández",
                phone_number="+52 81 1111 2222",
                customer_type=CustomerType.bedrijf,
                description="Aluminiumramen leverancier in Monterrey.",
                company_name="Aluminios Azteca S.A. de C.V.",
                tax_id="AAZ850101XYZ",
                address_street="Av. Constitución",
                address_ext_number="789",
                address_int_number=None,
                address_neighborhood="Centro",
                address_city="Monterrey",
                address_state="Nuevo León",
                address_postal_code="64000",
                address_country="Mexico",
            ),
            RegistrationRequest(
                email="luis.garcia@example.mx",
                first_name="Luis",
                last_name="García",
                phone_number="+52 33 2222 3333",
                customer_type=CustomerType.particulier,
                description="Architect met interesse in maatwerkprofielen.",
                company_name=None,
                tax_id=None,
                address_street="Calle Hidalgo",
                address_ext_number="321",
                address_int_number=None,
                address_neighborhood="Americana",
                address_city="Guadalajara",
                address_state="Jalisco",
                address_postal_code="44160",
                address_country="Mexico",
            ),
            RegistrationRequest(
                email="info@puertas-del-sol.mx",
                first_name="Ana",
                last_name="Martínez",
                phone_number="+52 55 3333 4444",
                customer_type=CustomerType.bedrijf,
                description="Deuren- en ramenbedrijf voor residentiële projecten.",
                company_name="Puertas del Sol S.A. de C.V.",
                tax_id="PDS900101QWE",
                address_street="Av. Insurgentes Sur",
                address_ext_number="1500",
                address_int_number="Oficina 402",
                address_neighborhood="Del Valle",
                address_city="Ciudad de México",
                address_state="CDMX",
                address_postal_code="03100",
                address_country="Mexico",
            ),
        ]

        for i, reg in enumerate(seed_customers):
            if get_customer_by_email(db, reg.email):
                continue
            is_admin = i == 0
            create_customer(
                db,
                registration=reg,
                hashed_password=hashed,
                is_admin=is_admin,
            )

        db.commit()
    finally:
        db.close()
