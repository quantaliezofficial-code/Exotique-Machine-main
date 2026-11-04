/**
 * Taxonomy used by filters and the admin form. These are lists of makes, not inventory:
 * which cars exist always comes from the database.
 */
export const PREMIUM_BRANDS = [
  'Audi', 'BMW', 'Mercedes-Benz', 'Land Rover', 'Jaguar', 'Volvo', 'Lexus', 'Porsche', 'Mini', 'Toyota', 'Volkswagen',
];

export const NON_PREMIUM_BRANDS = [
  'Mahindra', 'Tata Motors', 'Hyundai', 'Maruti Suzuki', 'Kia', 'MG', 'Honda', 'Jeep', 'Skoda', 'Renault', 'Nissan',
];

export const FUELS = ['Petrol', 'Diesel', 'Hybrid', 'Electric', 'CNG'];
export const TRANSMISSIONS = ['Automatic', 'Manual'];
export const BODY_TYPES = ['SUV', 'Sedan', 'Hatchback', 'Coupe', 'Luxury', 'MUV', 'Electric'];

export const BUDGETS = [
  { label: 'Any budget', min: 0, max: Infinity },
  { label: 'Under ₹20 Lakh', min: 0, max: 20 },
  { label: '₹20 – 40 Lakh', min: 20, max: 40 },
  { label: '₹40 – 75 Lakh', min: 40, max: 75 },
  { label: '₹75 Lakh – 1 Cr', min: 75, max: 100 },
  { label: 'Above ₹1 Cr', min: 100, max: Infinity },
];

export const SERVICE_TYPES = [
  'Periodic maintenance', 'Diagnostics & inspection', 'Detailing & ceramic coating', 'Brakes & suspension',
  'Battery & electricals', 'Insurance claim repair', 'Other',
];

export const TEST_DRIVE_TIMES = ['10:00 AM', '11:30 AM', '1:00 PM', '2:30 PM', '4:00 PM', '5:30 PM', '7:00 PM'];
