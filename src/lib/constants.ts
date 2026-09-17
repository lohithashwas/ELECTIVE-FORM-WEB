// ── Professional Elective II subjects ─────────────────────────
export const PE2_SUBJECTS = [
  { code: "EC22022", name: "Emerging Wireless Technologies",     vertical: "Wireless Systems Engineering" },
  { code: "EC22034", name: "EMI/EMC Pre Compliance Testing",     vertical: "Antenna and Microwave Technology" },
  { code: "EC22042", name: "ASIC and FPGA Design",               vertical: "VLSI" },
  { code: "EC22054", name: "Biometric Systems",                  vertical: "Signal Processing and Data Science" },
  { code: "EC22061", name: "Industry 4.0 and IIoT",              vertical: "Embedded System Design and IoT" },
  { code: "EC22077", name: "Wireless Networks",                  vertical: "Networking and Security" },
  { code: "PE2-REPLACE", name: "Replacement (NPTEL / IIT / SE / GIP / Other)", vertical: "Replacement" },
] as const;

// ── Professional Elective III subjects ────────────────────────
export const PE3_SUBJECTS = [
  { code: "EC22031", name: "Antenna Theory and Design",          vertical: "Antenna and Microwave Technology" },
  { code: "EC22047", name: "Testing of VLSI Circuits",           vertical: "VLSI" },
  { code: "EC22056", name: "Deep Learning for Computer Vision",  vertical: "Signal Processing and Data Science" },
  { code: "EC22063", name: "IoT for Real Time Applications",     vertical: "Embedded System Design and IoT" },
  { code: "EC22072", name: "Cryptography and Network Security",  vertical: "Networking and Security" },
  { code: "EC22024", name: "Intelligent Communication Networks", vertical: "Wireless Systems Engineering" },
  { code: "PE3-REPLACE", name: "Replacement (NPTEL / IIT / SE / GIP / Other)", vertical: "Replacement" },
] as const;

export const SECTIONS = [
  "A",
  "B",
  "C",
] as const;

export const MAX_SEATS = 48;
export const COLLEGE_EMAIL_DOMAIN = "@svce.ac.in";

export type Section = (typeof SECTIONS)[number];
