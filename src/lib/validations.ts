import { z } from "zod";
import { COLLEGE_EMAIL_DOMAIN } from "./constants";

export const registrationSchema = z.object({
  student_name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must not exceed 100 characters")
    .trim(),

  roll_number: z
    .string()
    .min(3, "Roll number must be at least 3 characters")
    .max(20, "Roll number must not exceed 20 characters")
    .regex(
      /^[A-Za-z0-9]+$/,
      "Roll number must contain only letters and numbers"
    )
    .trim()
    .transform((v) => v.toUpperCase()),

  phone_number: z
    .string()
    .regex(
      /^[6-9]\d{9}$/,
      "Phone number must be a valid 10-digit Indian mobile number"
    )
    .trim(),

  section: z
    .string()
    .min(1, "Please select a section"),

  college_email: z
    .string()
    .email("Please enter a valid email address")
    .toLowerCase()
    .refine(
      (email) => email.endsWith(COLLEGE_EMAIL_DOMAIN),
      `Email must end with ${COLLEGE_EMAIL_DOMAIN}`
    ),

  pe2_subject_id: z
    .string()
    .uuid("Please select a valid PE-II subject"),

  pe3_subject_id: z
    .string()
    .uuid("Please select a valid PE-III subject"),
});

export type RegistrationInput = z.infer<typeof registrationSchema>;

export interface Subject {
  id: string;
  subject_code: string;
  subject_name: string;
  max_seats: number;
  filled_seats: number;
  status: "open" | "full";
  elective_group: "PE2" | "PE3";
}

export interface Registration {
  id: string;
  student_name: string;
  roll_number: string;
  phone_number: string;
  section: string;
  college_email: string;
  pe2_subject_id: string;
  pe3_subject_id: string;
  registered_at: string;
}
