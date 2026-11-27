
from decimal import Decimal, InvalidOperation


# =========================================================
# DELIVERY CONFIGURATION
# =========================================================

# Sylhet Division
SYLHET_DELIVERY_CHARGE = Decimal("80.00")
SYLHET_FREE_DELIVERY_THRESHOLD = Decimal("5000.00")

# Other Divisions
OTHER_DELIVERY_CHARGE = Decimal("130.00")
OTHER_FREE_DELIVERY_THRESHOLD = Decimal("10000.00")


# =========================================================
# SUPPORTED DIVISIONS
# =========================================================

VALID_DIVISIONS = {
    "dhaka",
    "chattogram",
    "rajshahi",
    "khulna",
    "barishal",
    "sylhet",
    "rangpur",
    "mymensingh",
}


# =========================================================
# CALCULATE DELIVERY CHARGE
# =========================================================

def calculate_delivery_charge(division, purchase_amount):
    """
    Calculate delivery charges based on:

    1. Customer's shipping division.
    2. Purchase amount after discounts.
    3. Free delivery eligibility.

    Sylhet:
        Below 5000 BDT = 80 BDT
        5000 BDT or more = Free

    Other divisions:
        Below 10000 BDT = 130 BDT
        10000 BDT or more = Free

    Returns:
        Decimal delivery charge.
    """

    # Normalize division
    division = str(division).strip().lower()

    # Validate division
    if division not in VALID_DIVISIONS:
        raise ValueError(
            "Invalid shipping division."
        )

    # Convert purchase amount to Decimal
    try:
        purchase_amount = Decimal(
            str(purchase_amount)
        )
    except (InvalidOperation, ValueError, TypeError):
        raise ValueError(
            "Invalid purchase amount."
        )

    # Validate purchase amount
    if not purchase_amount.is_finite():
        raise ValueError(
            "Purchase amount must be finite."
        )

    if purchase_amount < Decimal("0.00"):
        raise ValueError(
            "Purchase amount cannot be negative."
        )

    # =====================================================
    # SYLHET DIVISION
    # =====================================================

    if division == "sylhet":

        if purchase_amount >= SYLHET_FREE_DELIVERY_THRESHOLD:
            return Decimal("0.00")

        return SYLHET_DELIVERY_CHARGE

    # =====================================================
    # OTHER DIVISIONS
    # =====================================================

    if purchase_amount >= OTHER_FREE_DELIVERY_THRESHOLD:
        return Decimal("0.00")

    return OTHER_DELIVERY_CHARGE
