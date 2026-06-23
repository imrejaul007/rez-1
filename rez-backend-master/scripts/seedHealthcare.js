/**
 * Seed Script - Healthcare Data
 *
 * Seeds the following healthcare data:
 * - 30+ Doctors (various specialties)
 * - 15+ Pharmacies (chain and local)
 * - 10+ Lab Providers
 * - 50+ Lab Tests
 * - 20+ Emergency Contacts (national and city-specific)
 * - Healthcare service categories
 */

const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = process.env.DB_NAME || 'test';

// Helper function to generate slug
function generateSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// =============================================================================
// DOCTORS DATA
// =============================================================================
const doctors = [
  // General Physicians
  { name: "Dr. Rajesh Sharma", specialty: "General Physician", experience: 15, fee: 500, rating: 4.8, education: "MBBS, MD - General Medicine", languages: ["Hindi", "English"], availableDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], availableHours: { start: "09:00", end: "18:00" }, image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400" },
  { name: "Dr. Priya Patel", specialty: "General Physician", experience: 12, fee: 450, rating: 4.7, education: "MBBS, DNB - Family Medicine", languages: ["Hindi", "English", "Gujarati"], availableDays: ["Mon", "Tue", "Wed", "Thu", "Fri"], availableHours: { start: "10:00", end: "19:00" }, image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400" },
  { name: "Dr. Amit Kumar", specialty: "General Physician", experience: 10, fee: 400, rating: 4.6, education: "MBBS", languages: ["Hindi", "English"], availableDays: ["Mon", "Wed", "Fri", "Sat"], availableHours: { start: "11:00", end: "20:00" }, image: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400" },
  { name: "Dr. Sunita Verma", specialty: "General Physician", experience: 18, fee: 600, rating: 4.9, education: "MBBS, MD", languages: ["Hindi", "English"], availableDays: ["Mon", "Tue", "Thu", "Sat"], availableHours: { start: "08:00", end: "16:00" }, image: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400" },
  { name: "Dr. Rahul Gupta", specialty: "General Physician", experience: 8, fee: 350, rating: 4.5, education: "MBBS", languages: ["Hindi", "English"], availableDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], availableHours: { start: "09:00", end: "21:00" }, image: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400" },

  // Cardiologists
  { name: "Dr. Vikram Mehta", specialty: "Cardiology", experience: 20, fee: 1500, rating: 4.9, education: "MBBS, MD - Cardiology, DM", languages: ["Hindi", "English"], availableDays: ["Mon", "Wed", "Fri"], availableHours: { start: "10:00", end: "17:00" }, image: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400" },
  { name: "Dr. Neha Reddy", specialty: "Cardiology", experience: 15, fee: 1200, rating: 4.8, education: "MBBS, DNB - Cardiology", languages: ["Hindi", "English", "Telugu"], availableDays: ["Tue", "Thu", "Sat"], availableHours: { start: "09:00", end: "16:00" }, image: "https://images.unsplash.com/photo-1527613426441-4da17471b66d?w=400" },
  { name: "Dr. Sanjay Kapoor", specialty: "Cardiology", experience: 25, fee: 2000, rating: 4.9, education: "MBBS, MD, DM - Cardiology", languages: ["Hindi", "English", "Punjabi"], availableDays: ["Mon", "Tue", "Wed", "Thu"], availableHours: { start: "11:00", end: "18:00" }, image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400" },

  // Dentists
  { name: "Dr. Anita Desai", specialty: "Dentistry", experience: 10, fee: 800, rating: 4.6, education: "BDS, MDS - Orthodontics", languages: ["Hindi", "English", "Marathi"], availableDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], availableHours: { start: "10:00", end: "19:00" }, image: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=400" },
  { name: "Dr. Karan Singh", specialty: "Dentistry", experience: 8, fee: 700, rating: 4.5, education: "BDS, MDS - Periodontics", languages: ["Hindi", "English", "Punjabi"], availableDays: ["Mon", "Wed", "Fri", "Sat"], availableHours: { start: "09:00", end: "18:00" }, image: "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=400" },
  { name: "Dr. Meera Nair", specialty: "Dentistry", experience: 12, fee: 900, rating: 4.7, education: "BDS, MDS - Prosthodontics", languages: ["Hindi", "English", "Malayalam"], availableDays: ["Tue", "Thu", "Sat"], availableHours: { start: "11:00", end: "20:00" }, image: "https://images.unsplash.com/photo-1571772996211-2f02c9727629?w=400" },
  { name: "Dr. Arun Tiwari", specialty: "Dentistry", experience: 15, fee: 1000, rating: 4.8, education: "BDS, MDS - Oral Surgery", languages: ["Hindi", "English"], availableDays: ["Mon", "Tue", "Wed", "Thu", "Fri"], availableHours: { start: "10:00", end: "18:00" }, image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400" },
  { name: "Dr. Pooja Sharma", specialty: "Dentistry", experience: 6, fee: 600, rating: 4.4, education: "BDS", languages: ["Hindi", "English"], availableDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], availableHours: { start: "09:00", end: "21:00" }, image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400" },

  // Dermatologists
  { name: "Dr. Sunita Joshi", specialty: "Dermatology", experience: 8, fee: 700, rating: 4.5, education: "MBBS, MD - Dermatology", languages: ["Hindi", "English"], availableDays: ["Mon", "Wed", "Fri", "Sat"], availableHours: { start: "10:00", end: "18:00" }, image: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400" },
  { name: "Dr. Ravi Agarwal", specialty: "Dermatology", experience: 12, fee: 900, rating: 4.7, education: "MBBS, MD, DNB - Dermatology", languages: ["Hindi", "English"], availableDays: ["Tue", "Thu", "Sat"], availableHours: { start: "11:00", end: "19:00" }, image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400" },
  { name: "Dr. Nisha Malhotra", specialty: "Dermatology", experience: 15, fee: 1100, rating: 4.8, education: "MBBS, MD - Dermatology", languages: ["Hindi", "English", "Punjabi"], availableDays: ["Mon", "Tue", "Wed", "Thu"], availableHours: { start: "09:00", end: "17:00" }, image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400" },

  // Pediatricians
  { name: "Dr. Arun Kumar", specialty: "Pediatrics", experience: 18, fee: 600, rating: 4.8, education: "MBBS, MD - Pediatrics", languages: ["Hindi", "English"], availableDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], availableHours: { start: "09:00", end: "18:00" }, image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400" },
  { name: "Dr. Deepa Krishnan", specialty: "Pediatrics", experience: 14, fee: 550, rating: 4.7, education: "MBBS, DCH, MD - Pediatrics", languages: ["Hindi", "English", "Tamil"], availableDays: ["Mon", "Wed", "Fri", "Sat"], availableHours: { start: "10:00", end: "19:00" }, image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400" },
  { name: "Dr. Vivek Saxena", specialty: "Pediatrics", experience: 10, fee: 500, rating: 4.6, education: "MBBS, MD - Pediatrics", languages: ["Hindi", "English"], availableDays: ["Tue", "Thu", "Sat"], availableHours: { start: "11:00", end: "20:00" }, image: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400" },

  // Orthopedic
  { name: "Dr. Ramesh Gupta", specialty: "Orthopedics", experience: 22, fee: 1200, rating: 4.7, education: "MBBS, MS - Orthopedics", languages: ["Hindi", "English"], availableDays: ["Mon", "Tue", "Wed", "Thu", "Fri"], availableHours: { start: "09:00", end: "17:00" }, image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400" },
  { name: "Dr. Sneha Patil", specialty: "Orthopedics", experience: 16, fee: 1000, rating: 4.6, education: "MBBS, DNB - Orthopedics", languages: ["Hindi", "English", "Marathi"], availableDays: ["Mon", "Wed", "Fri"], availableHours: { start: "10:00", end: "18:00" }, image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400" },
  { name: "Dr. Ajay Bhatt", specialty: "Orthopedics", experience: 20, fee: 1300, rating: 4.8, education: "MBBS, MS, MCh - Orthopedics", languages: ["Hindi", "English"], availableDays: ["Tue", "Thu", "Sat"], availableHours: { start: "11:00", end: "19:00" }, image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400" },

  // Gynecologists
  { name: "Dr. Kavita Reddy", specialty: "Gynecology", experience: 16, fee: 1000, rating: 4.8, education: "MBBS, MD - Obstetrics & Gynecology", languages: ["Hindi", "English", "Telugu"], availableDays: ["Mon", "Tue", "Wed", "Thu", "Fri"], availableHours: { start: "09:00", end: "17:00" }, image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400" },
  { name: "Dr. Prerna Sinha", specialty: "Gynecology", experience: 12, fee: 800, rating: 4.6, education: "MBBS, MS - OBG", languages: ["Hindi", "English"], availableDays: ["Mon", "Wed", "Fri", "Sat"], availableHours: { start: "10:00", end: "18:00" }, image: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400" },
  { name: "Dr. Ananya Chatterjee", specialty: "Gynecology", experience: 20, fee: 1200, rating: 4.9, education: "MBBS, MD, DGO", languages: ["Hindi", "English", "Bengali"], availableDays: ["Tue", "Thu", "Sat"], availableHours: { start: "11:00", end: "19:00" }, image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400" },

  // Eye Specialists
  { name: "Dr. Sanjay Verma", specialty: "Ophthalmology", experience: 14, fee: 900, rating: 4.6, education: "MBBS, MS - Ophthalmology", languages: ["Hindi", "English"], availableDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], availableHours: { start: "09:00", end: "18:00" }, image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400" },
  { name: "Dr. Ritika Bose", specialty: "Ophthalmology", experience: 10, fee: 800, rating: 4.5, education: "MBBS, DNB - Ophthalmology", languages: ["Hindi", "English", "Bengali"], availableDays: ["Mon", "Wed", "Fri"], availableHours: { start: "10:00", end: "17:00" }, image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400" },
  { name: "Dr. Manish Goel", specialty: "Ophthalmology", experience: 18, fee: 1100, rating: 4.8, education: "MBBS, MS, DOMS", languages: ["Hindi", "English"], availableDays: ["Tue", "Thu", "Sat"], availableHours: { start: "11:00", end: "19:00" }, image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400" },

  // Psychiatrists
  { name: "Dr. Alok Sharma", specialty: "Psychiatry", experience: 15, fee: 1500, rating: 4.7, education: "MBBS, MD - Psychiatry", languages: ["Hindi", "English"], availableDays: ["Mon", "Wed", "Fri"], availableHours: { start: "10:00", end: "18:00" }, image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400" },
  { name: "Dr. Sonali Mukherjee", specialty: "Psychiatry", experience: 12, fee: 1200, rating: 4.6, education: "MBBS, DPM, MD - Psychiatry", languages: ["Hindi", "English", "Bengali"], availableDays: ["Tue", "Thu", "Sat"], availableHours: { start: "11:00", end: "19:00" }, image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400" }
];

// =============================================================================
// PHARMACIES DATA
// =============================================================================
const pharmacies = [
  // Chain Pharmacies
  { name: "Apollo Pharmacy", type: "chain", delivery: true, deliveryTime: "30-60 mins", discount: 15, rating: 4.5, image: "https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=400", address: "Multiple Locations", is24Hours: true },
  { name: "MedPlus", type: "chain", delivery: true, deliveryTime: "45-90 mins", discount: 20, rating: 4.4, image: "https://images.unsplash.com/photo-1576602976047-174e57a47881?w=400", address: "Multiple Locations", is24Hours: false },
  { name: "Netmeds", type: "online", delivery: true, deliveryTime: "1-2 days", discount: 25, rating: 4.3, image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400", address: "Online Only", is24Hours: true },
  { name: "PharmEasy", type: "online", delivery: true, deliveryTime: "1-2 days", discount: 22, rating: 4.4, image: "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400", address: "Online Only", is24Hours: true },
  { name: "1mg", type: "online", delivery: true, deliveryTime: "1-2 days", discount: 18, rating: 4.5, image: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=400", address: "Online Only", is24Hours: true },
  { name: "Tata 1mg", type: "online", delivery: true, deliveryTime: "1-3 days", discount: 20, rating: 4.6, image: "https://images.unsplash.com/photo-1576602976047-174e57a47881?w=400", address: "Online Only", is24Hours: true },
  { name: "Wellness Forever", type: "chain", delivery: true, deliveryTime: "60-120 mins", discount: 12, rating: 4.3, image: "https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=400", address: "Multiple Locations", is24Hours: false },
  { name: "Guardian Pharmacy", type: "chain", delivery: true, deliveryTime: "45-90 mins", discount: 10, rating: 4.2, image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400", address: "Multiple Locations", is24Hours: false },

  // Local Pharmacies
  { name: "City Medical Store", type: "local", delivery: true, deliveryTime: "30-45 mins", discount: 5, rating: 4.6, image: "https://images.unsplash.com/photo-1576602976047-174e57a47881?w=400", address: "Sector 18, Noida", is24Hours: true },
  { name: "Health Plus Pharmacy", type: "local", delivery: true, deliveryTime: "20-40 mins", discount: 8, rating: 4.5, image: "https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=400", address: "Connaught Place, Delhi", is24Hours: false },
  { name: "Care Chemist", type: "local", delivery: false, deliveryTime: null, discount: 10, rating: 4.4, image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400", address: "Koramangala, Bangalore", is24Hours: false },
  { name: "LifeCare Pharmacy", type: "local", delivery: true, deliveryTime: "30-60 mins", discount: 7, rating: 4.3, image: "https://images.unsplash.com/photo-1576602976047-174e57a47881?w=400", address: "Bandra, Mumbai", is24Hours: true },
  { name: "Sunrise Medical", type: "local", delivery: true, deliveryTime: "45-75 mins", discount: 6, rating: 4.4, image: "https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=400", address: "Jubilee Hills, Hyderabad", is24Hours: false },
  { name: "Metro Pharmacy", type: "local", delivery: true, deliveryTime: "25-50 mins", discount: 9, rating: 4.5, image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400", address: "Anna Nagar, Chennai", is24Hours: false },
  { name: "Trust Medical Store", type: "local", delivery: false, deliveryTime: null, discount: 12, rating: 4.2, image: "https://images.unsplash.com/photo-1576602976047-174e57a47881?w=400", address: "Salt Lake, Kolkata", is24Hours: false }
];

// =============================================================================
// LAB PROVIDERS DATA
// =============================================================================
const labProviders = [
  { name: "Dr. Lal PathLabs", testsCount: 200, homeCollection: true, discount: 20, rating: 4.7, nabl: true, image: "https://images.unsplash.com/photo-1579154204601-01588f351e67?w=400", reportTime: "24-48 hours" },
  { name: "Thyrocare", testsCount: 150, homeCollection: true, discount: 25, rating: 4.6, nabl: true, image: "https://images.unsplash.com/photo-1581594693702-fbdc51b2763b?w=400", reportTime: "24 hours" },
  { name: "SRL Diagnostics", testsCount: 180, homeCollection: true, discount: 15, rating: 4.5, nabl: true, image: "https://images.unsplash.com/photo-1579154204601-01588f351e67?w=400", reportTime: "24-48 hours" },
  { name: "Metropolis", testsCount: 220, homeCollection: true, discount: 18, rating: 4.8, nabl: true, image: "https://images.unsplash.com/photo-1581594693702-fbdc51b2763b?w=400", reportTime: "24-72 hours" },
  { name: "Suburban Diagnostics", testsCount: 160, homeCollection: true, discount: 22, rating: 4.4, nabl: true, image: "https://images.unsplash.com/photo-1579154204601-01588f351e67?w=400", reportTime: "24-48 hours" },
  { name: "Max Lab", testsCount: 170, homeCollection: true, discount: 15, rating: 4.5, nabl: true, image: "https://images.unsplash.com/photo-1581594693702-fbdc51b2763b?w=400", reportTime: "24-48 hours" },
  { name: "Apollo Diagnostics", testsCount: 190, homeCollection: true, discount: 20, rating: 4.6, nabl: true, image: "https://images.unsplash.com/photo-1579154204601-01588f351e67?w=400", reportTime: "24-48 hours" },
  { name: "Healthians", testsCount: 140, homeCollection: true, discount: 30, rating: 4.3, nabl: false, image: "https://images.unsplash.com/photo-1581594693702-fbdc51b2763b?w=400", reportTime: "24-48 hours" },
  { name: "Orange Health", testsCount: 120, homeCollection: true, discount: 25, rating: 4.5, nabl: false, image: "https://images.unsplash.com/photo-1579154204601-01588f351e67?w=400", reportTime: "6-24 hours" },
  { name: "Redcliffe Labs", testsCount: 130, homeCollection: true, discount: 28, rating: 4.4, nabl: true, image: "https://images.unsplash.com/photo-1581594693702-fbdc51b2763b?w=400", reportTime: "24-48 hours" }
];

// =============================================================================
// LAB TESTS DATA
// =============================================================================
const labTests = [
  // Blood Tests
  { name: "Complete Blood Count (CBC)", category: "Blood", price: 350, description: "Measures red blood cells, white blood cells, hemoglobin, and platelets", preparationNeeded: false, reportTime: "Same day" },
  { name: "Lipid Profile", category: "Blood", price: 600, description: "Measures cholesterol levels including HDL, LDL, triglycerides", preparationNeeded: true, fastingHours: 12, reportTime: "Same day" },
  { name: "Blood Glucose Fasting", category: "Blood", price: 100, description: "Measures blood sugar levels after fasting", preparationNeeded: true, fastingHours: 8, reportTime: "Same day" },
  { name: "Blood Glucose PP", category: "Blood", price: 100, description: "Measures blood sugar 2 hours after eating", preparationNeeded: true, reportTime: "Same day" },
  { name: "HbA1c", category: "Diabetes", price: 450, description: "3-month average blood sugar levels for diabetes monitoring", preparationNeeded: false, reportTime: "Same day" },
  { name: "Hemoglobin Test", category: "Blood", price: 150, description: "Measures hemoglobin levels in blood", preparationNeeded: false, reportTime: "Same day" },
  { name: "ESR (Erythrocyte Sedimentation Rate)", category: "Blood", price: 200, description: "Detects inflammation in the body", preparationNeeded: false, reportTime: "Same day" },
  { name: "Platelet Count", category: "Blood", price: 200, description: "Measures the number of platelets in blood", preparationNeeded: false, reportTime: "Same day" },

  // Thyroid Tests
  { name: "Thyroid Profile (T3, T4, TSH)", category: "Thyroid", price: 800, description: "Complete thyroid function assessment", preparationNeeded: false, reportTime: "24 hours" },
  { name: "TSH (Thyroid Stimulating Hormone)", category: "Thyroid", price: 350, description: "Measures thyroid function", preparationNeeded: false, reportTime: "Same day" },
  { name: "Free T3", category: "Thyroid", price: 400, description: "Measures free triiodothyronine hormone", preparationNeeded: false, reportTime: "24 hours" },
  { name: "Free T4", category: "Thyroid", price: 400, description: "Measures free thyroxine hormone", preparationNeeded: false, reportTime: "24 hours" },

  // Liver Tests
  { name: "Liver Function Test (LFT)", category: "Liver", price: 700, description: "Complete liver health assessment including enzymes and proteins", preparationNeeded: true, fastingHours: 8, reportTime: "24 hours" },
  { name: "SGOT/AST", category: "Liver", price: 250, description: "Measures liver enzyme levels", preparationNeeded: false, reportTime: "Same day" },
  { name: "SGPT/ALT", category: "Liver", price: 250, description: "Measures liver enzyme for damage detection", preparationNeeded: false, reportTime: "Same day" },
  { name: "Bilirubin Total", category: "Liver", price: 200, description: "Measures bilirubin levels for liver and bile duct health", preparationNeeded: false, reportTime: "Same day" },

  // Kidney Tests
  { name: "Kidney Function Test (KFT)", category: "Kidney", price: 650, description: "Complete kidney health assessment", preparationNeeded: false, reportTime: "24 hours" },
  { name: "Creatinine", category: "Kidney", price: 200, description: "Measures kidney filtration efficiency", preparationNeeded: false, reportTime: "Same day" },
  { name: "Blood Urea", category: "Kidney", price: 180, description: "Measures urea levels for kidney function", preparationNeeded: false, reportTime: "Same day" },
  { name: "Uric Acid", category: "Kidney", price: 250, description: "Measures uric acid levels", preparationNeeded: false, reportTime: "Same day" },

  // Urine Tests
  { name: "Urine Routine & Microscopy", category: "Urine", price: 200, description: "Complete urine analysis", preparationNeeded: false, reportTime: "Same day" },
  { name: "Urine Culture", category: "Urine", price: 500, description: "Detects bacterial infection in urinary tract", preparationNeeded: false, reportTime: "48-72 hours" },

  // Vitamin Tests
  { name: "Vitamin D", category: "Vitamin", price: 900, description: "Measures Vitamin D levels", preparationNeeded: false, reportTime: "24 hours" },
  { name: "Vitamin B12", category: "Vitamin", price: 700, description: "Measures Vitamin B12 levels", preparationNeeded: false, reportTime: "24 hours" },
  { name: "Iron Studies", category: "Vitamin", price: 800, description: "Complete iron profile including ferritin and TIBC", preparationNeeded: true, fastingHours: 8, reportTime: "24 hours" },
  { name: "Calcium", category: "Vitamin", price: 250, description: "Measures calcium levels in blood", preparationNeeded: false, reportTime: "Same day" },

  // Infection Tests
  { name: "Dengue NS1 Antigen", category: "Infection", price: 600, description: "Early detection of dengue infection", preparationNeeded: false, reportTime: "Same day" },
  { name: "Malaria Antigen Test", category: "Infection", price: 400, description: "Detects malaria parasites", preparationNeeded: false, reportTime: "Same day" },
  { name: "COVID-19 RT-PCR", category: "Infection", price: 500, description: "Detects active COVID-19 infection", preparationNeeded: false, reportTime: "24-48 hours" },
  { name: "Typhoid Test (Widal)", category: "Infection", price: 350, description: "Detects typhoid infection", preparationNeeded: false, reportTime: "Same day" },
  { name: "HIV Test", category: "Infection", price: 400, description: "HIV screening test", preparationNeeded: false, reportTime: "Same day" },
  { name: "Hepatitis B Surface Antigen", category: "Infection", price: 450, description: "Hepatitis B screening", preparationNeeded: false, reportTime: "Same day" },

  // Hormone Tests
  { name: "Testosterone", category: "Hormone", price: 800, description: "Measures testosterone levels", preparationNeeded: false, reportTime: "24 hours" },
  { name: "Prolactin", category: "Hormone", price: 700, description: "Measures prolactin hormone levels", preparationNeeded: false, reportTime: "24 hours" },
  { name: "Cortisol", category: "Hormone", price: 750, description: "Measures stress hormone levels", preparationNeeded: false, reportTime: "24 hours" },

  // Cardiac Tests
  { name: "Troponin I", category: "Cardiac", price: 1200, description: "Heart attack marker", preparationNeeded: false, reportTime: "Same day" },
  { name: "CRP (C-Reactive Protein)", category: "Cardiac", price: 500, description: "Inflammation marker for heart disease risk", preparationNeeded: false, reportTime: "Same day" },
  { name: "BNP (Brain Natriuretic Peptide)", category: "Cardiac", price: 1500, description: "Heart failure marker", preparationNeeded: false, reportTime: "24 hours" },

  // Packages
  { name: "Full Body Checkup - Basic", category: "Package", price: 1499, description: "CBC, Lipid Profile, LFT, KFT, Blood Sugar, Thyroid Profile, Urine Routine", preparationNeeded: true, fastingHours: 10, reportTime: "24-48 hours", testsIncluded: 40 },
  { name: "Full Body Checkup - Advanced", category: "Package", price: 2999, description: "Basic + Vitamin D, B12, Iron, Calcium, ECG", preparationNeeded: true, fastingHours: 10, reportTime: "24-48 hours", testsIncluded: 65 },
  { name: "Full Body Checkup - Premium", category: "Package", price: 4999, description: "Advanced + Cardiac Markers, Tumor Markers, Ultrasound", preparationNeeded: true, fastingHours: 10, reportTime: "48-72 hours", testsIncluded: 90 },
  { name: "Diabetes Care Package", category: "Package", price: 999, description: "HbA1c, Fasting Blood Sugar, PP Sugar, Lipid Profile, KFT", preparationNeeded: true, fastingHours: 10, reportTime: "24 hours", testsIncluded: 15 },
  { name: "Heart Care Package", category: "Package", price: 1999, description: "Lipid Profile, ECG, Troponin, CRP, Blood Sugar", preparationNeeded: true, fastingHours: 10, reportTime: "24 hours", testsIncluded: 20 },
  { name: "Thyroid Care Package", category: "Package", price: 799, description: "T3, T4, TSH, Anti-TPO, Anti-TG", preparationNeeded: false, reportTime: "24 hours", testsIncluded: 5 },
  { name: "Women's Health Package", category: "Package", price: 2499, description: "CBC, Thyroid, Vitamin D, B12, Iron, Calcium, Pap Smear", preparationNeeded: true, fastingHours: 8, reportTime: "48-72 hours", testsIncluded: 35 },
  { name: "Men's Health Package", category: "Package", price: 2299, description: "CBC, Lipid, LFT, KFT, Thyroid, PSA, Testosterone", preparationNeeded: true, fastingHours: 10, reportTime: "24-48 hours", testsIncluded: 30 },
  { name: "Senior Citizen Package", category: "Package", price: 3499, description: "Comprehensive health assessment for 50+ years", preparationNeeded: true, fastingHours: 10, reportTime: "48-72 hours", testsIncluded: 70 },
  { name: "Fever Panel", category: "Package", price: 1299, description: "Dengue, Malaria, Typhoid, CBC, Urine", preparationNeeded: false, reportTime: "24 hours", testsIncluded: 12 }
];

// =============================================================================
// EMERGENCY CONTACTS DATA
// =============================================================================
const emergencyContacts = [
  // National Emergency Numbers
  { name: "National Emergency Number", type: "emergency", phoneNumbers: ["112"], isNational: true, operatingHours: "24x7", priority: 1, description: "Single emergency number for Police, Fire, Ambulance", icon: "phone-emergency" },
  { name: "Ambulance", type: "ambulance", phoneNumbers: ["102", "108"], isNational: true, operatingHours: "24x7", priority: 2, description: "Government ambulance service", icon: "ambulance" },
  { name: "Police", type: "police", phoneNumbers: ["100"], isNational: true, operatingHours: "24x7", priority: 3, description: "Police emergency", icon: "shield" },
  { name: "Fire Brigade", type: "fire", phoneNumbers: ["101"], isNational: true, operatingHours: "24x7", priority: 4, description: "Fire emergency services", icon: "fire" },

  // Medical Helplines
  { name: "Poison Control Helpline", type: "poison_control", phoneNumbers: ["1800-11-6117"], tollFree: "1800-11-6117", isNational: true, operatingHours: "24x7", priority: 5, description: "National poison information centre", icon: "poison" },
  { name: "Blood Bank Helpline", type: "blood_bank", phoneNumbers: ["104"], isNational: true, operatingHours: "24x7", priority: 6, description: "Blood availability and donation information", icon: "blood" },
  { name: "COVID-19 Helpline", type: "covid", phoneNumbers: ["1075", "1800-11-0031"], isNational: true, operatingHours: "24x7", priority: 7, description: "COVID-19 information and assistance", icon: "virus" },

  // Mental Health & Support
  { name: "iCall Mental Health", type: "mental_health", phoneNumbers: ["9152987821"], isNational: true, operatingHours: "Mon-Sat 8am-10pm", priority: 8, description: "Mental health counseling", icon: "brain" },
  { name: "Vandrevala Foundation", type: "mental_health", phoneNumbers: ["1860-2662-345"], isNational: true, operatingHours: "24x7", priority: 8, description: "Free mental health support", icon: "brain" },
  { name: "NIMHANS Helpline", type: "mental_health", phoneNumbers: ["080-46110007"], isNational: true, operatingHours: "24x7", priority: 9, description: "National Institute of Mental Health helpline", icon: "brain" },

  // Women & Child Safety
  { name: "Women Helpline", type: "women_helpline", phoneNumbers: ["181", "1091"], isNational: true, operatingHours: "24x7", priority: 5, description: "Women safety and assistance", icon: "woman" },
  { name: "Child Helpline", type: "child_helpline", phoneNumbers: ["1098"], isNational: true, operatingHours: "24x7", priority: 5, description: "Child abuse and emergency assistance", icon: "child" },
  { name: "Senior Citizen Helpline", type: "other", phoneNumbers: ["14567"], isNational: true, operatingHours: "24x7", priority: 10, description: "Elder abuse and assistance", icon: "elderly" },

  // Private Ambulance Services
  { name: "Apollo Ambulance", type: "ambulance", phoneNumbers: ["1066"], isNational: true, operatingHours: "24x7", priority: 3, description: "Apollo Hospitals ambulance service", icon: "ambulance", services: ["BLS", "ALS", "ICU Ambulance"] },
  { name: "Ziqitza Healthcare", type: "ambulance", phoneNumbers: ["108", "1298"], isNational: true, operatingHours: "24x7", priority: 3, description: "Emergency medical response", icon: "ambulance", services: ["BLS", "ALS"] },
  { name: "MedCab", type: "ambulance", phoneNumbers: ["8800-990-990"], isNational: false, city: "Delhi NCR", operatingHours: "24x7", priority: 4, description: "App-based ambulance service", icon: "ambulance" },
  { name: "StanPlus", type: "ambulance", phoneNumbers: ["9513-199-199"], isNational: false, city: "Multiple Cities", operatingHours: "24x7", priority: 4, description: "Premium ambulance service", icon: "ambulance", services: ["ALS", "ICU Ambulance"] },

  // Hospital Emergency Numbers (Major Cities)
  { name: "AIIMS Delhi Emergency", type: "hospital", phoneNumbers: ["011-26588500", "011-26588700"], isNational: false, city: "New Delhi", state: "Delhi", address: "Ansari Nagar, New Delhi - 110029", operatingHours: "24x7", priority: 2, description: "All India Institute of Medical Sciences", icon: "hospital", coordinates: { latitude: 28.5672, longitude: 77.2100 } },
  { name: "Safdarjung Hospital Emergency", type: "hospital", phoneNumbers: ["011-26165060", "011-26707437"], isNational: false, city: "New Delhi", state: "Delhi", address: "Ansari Nagar West, New Delhi - 110029", operatingHours: "24x7", priority: 2, description: "Safdarjung Hospital", icon: "hospital", coordinates: { latitude: 28.5688, longitude: 77.2088 } },
  { name: "KEM Hospital Emergency", type: "hospital", phoneNumbers: ["022-24136051"], isNational: false, city: "Mumbai", state: "Maharashtra", address: "Parel, Mumbai - 400012", operatingHours: "24x7", priority: 2, description: "King Edward Memorial Hospital", icon: "hospital", coordinates: { latitude: 19.0000, longitude: 72.8414 } },
  { name: "Fortis Hospitals", type: "hospital", phoneNumbers: ["1800-102-6767"], isNational: true, operatingHours: "24x7", priority: 3, description: "Fortis Healthcare Emergency", icon: "hospital" },
  { name: "Max Healthcare", type: "hospital", phoneNumbers: ["1800-102-4224"], isNational: true, operatingHours: "24x7", priority: 3, description: "Max Hospital Emergency", icon: "hospital" },
  { name: "Medanta Hospital", type: "hospital", phoneNumbers: ["0124-4141414"], isNational: false, city: "Gurugram", state: "Haryana", operatingHours: "24x7", priority: 3, description: "Medanta - The Medicity", icon: "hospital", coordinates: { latitude: 28.4395, longitude: 77.0425 } },

  // Disaster Management
  { name: "Disaster Management Helpline", type: "disaster", phoneNumbers: ["1070"], isNational: true, operatingHours: "24x7", priority: 6, description: "National disaster management", icon: "disaster" }
];

// =============================================================================
// HEALTHCARE SERVICE CATEGORIES
// =============================================================================
const healthcareCategories = [
  { name: "Doctors", slug: "doctors", description: "Consult with qualified doctors", icon: "stethoscope", cashbackPercentage: 5, sortOrder: 1 },
  { name: "Pharmacy", slug: "pharmacy", description: "Order medicines online", icon: "pill", cashbackPercentage: 8, sortOrder: 2 },
  { name: "Lab Tests", slug: "lab", description: "Book diagnostic tests", icon: "test-tube", cashbackPercentage: 10, sortOrder: 3 },
  { name: "Dental Care", slug: "dental", description: "Dental treatments and checkups", icon: "tooth", cashbackPercentage: 5, sortOrder: 4 },
  { name: "Emergency", slug: "emergency", description: "24x7 emergency services", icon: "ambulance", cashbackPercentage: 0, sortOrder: 5 },
  { name: "Health Records", slug: "records", description: "Manage your health documents", icon: "file-medical", cashbackPercentage: 0, sortOrder: 6 }
];

// =============================================================================
// SEED FUNCTION
// =============================================================================
async function seedHealthcare() {
  try {
    // Connect to MongoDB
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      dbName: DB_NAME
    });
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    // =============================================================================
    // SEED EMERGENCY CONTACTS
    // =============================================================================
    console.log('\n📞 Seeding Emergency Contacts...');
    const emergencyContactsCollection = db.collection('emergencycontacts');

    // Clear existing emergency contacts
    await emergencyContactsCollection.deleteMany({});

    const emergencyContactDocs = emergencyContacts.map(contact => ({
      ...contact,
      isActive: true,
      isVerified: contact.isNational,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    await emergencyContactsCollection.insertMany(emergencyContactDocs);
    console.log(`✅ Seeded ${emergencyContactDocs.length} emergency contacts`);

    // =============================================================================
    // SEED HEALTHCARE STORES (Doctors, Pharmacies, Labs)
    // =============================================================================
    console.log('\n🏥 Seeding Healthcare Stores...');
    const storesCollection = db.collection('stores');

    // Get or create healthcare categories
    const categoriesCollection = db.collection('categories');
    let healthcareCategory = await categoriesCollection.findOne({ slug: 'healthcare' });

    if (!healthcareCategory) {
      const result = await categoriesCollection.insertOne({
        name: 'Healthcare',
        slug: 'healthcare',
        description: 'Healthcare services including doctors, pharmacies, and labs',
        icon: 'hospital',
        image: 'https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=800',
        isActive: true,
        sortOrder: 100,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      healthcareCategory = { _id: result.insertedId };
      console.log('✅ Created healthcare category');
    }

    // Create doctor stores
    console.log('👨‍⚕️ Creating doctor stores...');
    const doctorStores = doctors.map(doctor => ({
      name: doctor.name,
      slug: generateSlug(doctor.name),
      description: `${doctor.specialty} with ${doctor.experience} years of experience. ${doctor.education}`,
      category: healthcareCategory._id,
      logo: doctor.image,
      image: doctor.image,
      images: [doctor.image],
      tags: ['healthcare', 'doctor', doctor.specialty.toLowerCase(), 'consultation'],
      isActive: true,
      isVerified: true,
      bookingType: 'CONSULTATION',
      consultationTypes: [doctor.specialty],
      bookingConfig: {
        enabled: true,
        requiresAdvanceBooking: true,
        allowWalkIn: false,
        slotDuration: 30,
        advanceBookingDays: 30,
        workingHours: doctor.availableHours,
        workingDays: doctor.availableDays
      },
      metadata: {
        specialty: doctor.specialty,
        experience: doctor.experience,
        consultationFee: doctor.fee,
        education: doctor.education,
        languages: doctor.languages,
        rating: doctor.rating,
        type: 'doctor'
      },
      rating: {
        average: doctor.rating,
        count: Math.floor(Math.random() * 500) + 100
      },
      location: {
        address: `Healthcare Center, ${['Delhi', 'Mumbai', 'Bangalore', 'Chennai', 'Hyderabad'][Math.floor(Math.random() * 5)]}`,
        city: ['Delhi', 'Mumbai', 'Bangalore', 'Chennai', 'Hyderabad'][Math.floor(Math.random() * 5)],
        state: ['Delhi', 'Maharashtra', 'Karnataka', 'Tamil Nadu', 'Telangana'][Math.floor(Math.random() * 5)],
        country: 'India',
        pincode: String(100000 + Math.floor(Math.random() * 600000))
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    // Create pharmacy stores
    console.log('💊 Creating pharmacy stores...');
    const pharmacyStores = pharmacies.map(pharmacy => ({
      name: pharmacy.name,
      slug: generateSlug(pharmacy.name),
      description: `${pharmacy.type === 'online' ? 'Online' : 'Physical'} pharmacy with ${pharmacy.discount}% discount on medicines`,
      category: healthcareCategory._id,
      logo: pharmacy.image,
      image: pharmacy.image,
      images: [pharmacy.image],
      tags: ['healthcare', 'pharmacy', 'medicine', pharmacy.type],
      isActive: true,
      isVerified: true,
      bookingType: 'NONE',
      metadata: {
        pharmacyType: pharmacy.type,
        hasDelivery: pharmacy.delivery,
        deliveryTime: pharmacy.deliveryTime,
        discount: pharmacy.discount,
        is24Hours: pharmacy.is24Hours,
        type: 'pharmacy'
      },
      rating: {
        average: pharmacy.rating,
        count: Math.floor(Math.random() * 1000) + 200
      },
      location: {
        address: pharmacy.address,
        city: pharmacy.type === 'local' ? pharmacy.address.split(', ')[1] : 'Pan India',
        state: 'Multiple',
        country: 'India',
        pincode: '000000'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    // Create lab provider stores
    console.log('🔬 Creating lab provider stores...');
    const labStores = labProviders.map(lab => ({
      name: lab.name,
      slug: generateSlug(lab.name),
      description: `${lab.nabl ? 'NABL Accredited ' : ''}Diagnostic lab with ${lab.testsCount}+ tests. ${lab.homeCollection ? 'Home collection available.' : ''}`,
      category: healthcareCategory._id,
      logo: lab.image,
      image: lab.image,
      images: [lab.image],
      tags: ['healthcare', 'lab', 'diagnostic', 'tests'],
      isActive: true,
      isVerified: lab.nabl,
      bookingType: 'APPOINTMENT',
      bookingConfig: {
        enabled: true,
        requiresAdvanceBooking: true,
        allowWalkIn: true,
        slotDuration: 15,
        advanceBookingDays: 7,
        workingHours: { start: '07:00', end: '20:00' }
      },
      metadata: {
        testsCount: lab.testsCount,
        homeCollection: lab.homeCollection,
        discount: lab.discount,
        nabl: lab.nabl,
        reportTime: lab.reportTime,
        type: 'lab'
      },
      rating: {
        average: lab.rating,
        count: Math.floor(Math.random() * 2000) + 500
      },
      location: {
        address: 'Multiple Locations',
        city: 'Pan India',
        state: 'Multiple',
        country: 'India',
        pincode: '000000'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    // Insert all healthcare stores
    const allHealthcareStores = [...doctorStores, ...pharmacyStores, ...labStores];

    // Check for existing stores and skip them
    for (const store of allHealthcareStores) {
      const exists = await storesCollection.findOne({ slug: store.slug });
      if (!exists) {
        await storesCollection.insertOne(store);
      }
    }
    console.log(`✅ Seeded ${allHealthcareStores.length} healthcare stores`);

    // =============================================================================
    // SEED LAB TESTS AS PRODUCTS
    // =============================================================================
    console.log('\n🧪 Seeding Lab Tests...');
    const productsCollection = db.collection('products');

    // Get a lab store for reference
    const labStore = await storesCollection.findOne({ 'metadata.type': 'lab' });

    const labTestProducts = labTests.map(test => ({
      name: test.name,
      slug: generateSlug(test.name),
      description: test.description,
      productType: 'service',
      category: healthcareCategory._id,
      serviceCategory: 'lab-test',
      store: labStore?._id,
      price: test.price,
      originalPrice: Math.round(test.price * 1.2),
      currency: 'INR',
      images: ['https://images.unsplash.com/photo-1579154204601-01588f351e67?w=400'],
      tags: ['lab-test', test.category.toLowerCase(), 'healthcare', 'diagnostic'],
      isActive: true,
      stock: 999,
      serviceDetails: {
        duration: 15,
        serviceType: 'store',
        maxBookingsPerSlot: 10,
        preparationNeeded: test.preparationNeeded,
        fastingHours: test.fastingHours,
        reportTime: test.reportTime,
        testsIncluded: test.testsIncluded
      },
      metadata: {
        testCategory: test.category,
        type: 'lab-test'
      },
      cashbackEnabled: true,
      cashbackPercentage: 10,
      maxCashback: Math.round(test.price * 0.1),
      rating: {
        average: 4.5 + Math.random() * 0.4,
        count: Math.floor(Math.random() * 500) + 50
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    // Insert lab test products
    for (const product of labTestProducts) {
      const exists = await productsCollection.findOne({ slug: product.slug, productType: 'service' });
      if (!exists) {
        await productsCollection.insertOne(product);
      }
    }
    console.log(`✅ Seeded ${labTestProducts.length} lab test products`);

    // =============================================================================
    // SEED SERVICE CATEGORIES
    // =============================================================================
    console.log('\n📂 Seeding Healthcare Service Categories...');
    const serviceCategoriesCollection = db.collection('servicecategories');

    const serviceCategoryDocs = healthcareCategories.map(cat => ({
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      icon: cat.icon,
      iconType: 'icon-name',
      cashbackPercentage: cat.cashbackPercentage,
      maxCashback: 500,
      isActive: true,
      sortOrder: cat.sortOrder,
      serviceCount: 0,
      metadata: {
        color: '#10B981',
        tags: ['healthcare', cat.slug]
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    for (const category of serviceCategoryDocs) {
      const exists = await serviceCategoriesCollection.findOne({ slug: category.slug });
      if (!exists) {
        await serviceCategoriesCollection.insertOne(category);
      } else {
        await serviceCategoriesCollection.updateOne(
          { slug: category.slug },
          { $set: { ...category, updatedAt: new Date() } }
        );
      }
    }
    console.log(`✅ Seeded ${serviceCategoryDocs.length} healthcare service categories`);

    // =============================================================================
    // SUMMARY
    // =============================================================================
    console.log('\n' + '='.repeat(60));
    console.log('📊 SEEDING COMPLETE - SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Emergency Contacts: ${emergencyContactDocs.length}`);
    console.log(`✅ Doctor Stores: ${doctorStores.length}`);
    console.log(`✅ Pharmacy Stores: ${pharmacyStores.length}`);
    console.log(`✅ Lab Provider Stores: ${labStores.length}`);
    console.log(`✅ Lab Test Products: ${labTestProducts.length}`);
    console.log(`✅ Service Categories: ${serviceCategoryDocs.length}`);
    console.log('='.repeat(60));

    // Disconnect
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    console.log('🎉 Healthcare seeding completed successfully!');

  } catch (error) {
    console.error('❌ Error seeding healthcare data:', error);
    process.exit(1);
  }
}

// Run the seed function
seedHealthcare();
