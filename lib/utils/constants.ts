// Commerce constants for the MVP. Tune the numbers here once, everywhere
// else (cart, checkout, future dashboards) reads from this file.

// Flat delivery fee for orders shipped inside Ernakulam district (INR).
// Pickup orders never charge this fee.
export const DELIVERY_FEE = 49;

/**
 * Official company and contact details for MADETRUE.
 * Referenced across legal policies, contact page, and footer links.
 */
export const COMPANY_DETAILS = {
  legalName: "MADETRUE PRIVATE LIMITED COMPANY",
  brandName: "MADETRUE",
  address: "Kochi, Kerala, India - 682001",
  pinCode: "682001",
  city: "Kochi",
  state: "Kerala",
  country: "India",
  email: "madetrue.in@gmail.com",
  phone: "+91 8876789131",
  whatsappNumber: "+91 8876789131",
  whatsappUrl: "https://wa.me/918876789131",
  operatingHours: "9:00 AM – 7:00 PM IST (Monday to Saturday)",
} as const;

