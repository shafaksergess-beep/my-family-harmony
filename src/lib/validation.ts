import { z } from "zod";

// Authentication schemas
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { message: "Email is required" })
    .email({ message: "Invalid email address" })
    .max(255, { message: "Email must be less than 255 characters" }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters" })
    .max(128, { message: "Password must be less than 128 characters" }),
});

export const signupSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { message: "Email is required" })
    .email({ message: "Invalid email address" })
    .max(255, { message: "Email must be less than 255 characters" }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters" })
    .max(128, { message: "Password must be less than 128 characters" })
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
      message: "Password must contain at least one uppercase letter, one lowercase letter, and one number",
    }),
  fullName: z
    .string()
    .trim()
    .min(1, { message: "Full name is required" })
    .max(100, { message: "Full name must be less than 100 characters" })
    .regex(/^[a-zA-Z\s'-]+$/, {
      message: "Full name can only contain letters, spaces, hyphens, and apostrophes",
    }),
  phone: z
    .string()
    .trim()
    .optional()
    .refine(
      (val) => !val || /^\+?[1-9]\d{1,14}$/.test(val),
      { message: "Invalid phone number format" }
    ),
});

// Contribution schemas
export const contributionSchema = z.object({
  memberId: z.string().uuid({ message: "Invalid member ID" }),
  amount: z
    .number()
    .positive({ message: "Amount must be greater than 0" })
    .max(100000000, { message: "Amount is too large" }),
  contributionDate: z.string().min(1, { message: "Contribution date is required" }),
  type: z.enum(["monthly", "special", "fine", "loan_repayment"], {
    errorMap: () => ({ message: "Invalid contribution type" }),
  }),
  notes: z
    .string()
    .max(500, { message: "Notes must be less than 500 characters" })
    .optional(),
});

// Loan schemas
export const loanSchema = z.object({
  memberId: z.string().uuid({ message: "Invalid member ID" }),
  amount: z
    .number()
    .min(50000, { message: "Minimum loan amount is 50,000 FCFA" })
    .max(10000000, { message: "Loan amount is too large" }),
  purpose: z
    .string()
    .trim()
    .min(10, { message: "Purpose must be at least 10 characters" })
    .max(500, { message: "Purpose must be less than 500 characters" }),
  termMonths: z
    .number()
    .int({ message: "Term must be a whole number" })
    .min(1, { message: "Minimum term is 1 month" })
    .max(12, { message: "Maximum term is 12 months" }),
  interestRate: z
    .number()
    .min(0, { message: "Interest rate cannot be negative" })
    .max(100, { message: "Interest rate cannot exceed 100%" }),
  notes: z
    .string()
    .max(500, { message: "Notes must be less than 500 characters" })
    .optional(),
});

// Family schemas
export const familySchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, { message: "Family name must be at least 3 characters" })
    .max(100, { message: "Family name must be less than 100 characters" }),
  description: z
    .string()
    .max(500, { message: "Description must be less than 500 characters" })
    .optional(),
  mandatoryContribution: z
    .number()
    .nonnegative({ message: "Mandatory contribution cannot be negative" })
    .max(1000000, { message: "Amount is too large" })
    .optional(),
  loanInterestRate: z
    .number()
    .min(0, { message: "Interest rate cannot be negative" })
    .max(100, { message: "Interest rate cannot exceed 100%" })
    .optional(),
  shareValue: z
    .number()
    .positive({ message: "Share value must be greater than 0" })
    .max(1000000, { message: "Share value is too large" })
    .optional(),
});

// User creation schema (for admin)
export const userCreationSchema = z.object({
  email: z
    .string()
    .trim()
    .email({ message: "Invalid email address" })
    .max(255, { message: "Email must be less than 255 characters" }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters" })
    .max(128, { message: "Password must be less than 128 characters" }),
  fullName: z
    .string()
    .trim()
    .min(1, { message: "Full name is required" })
    .max(100, { message: "Full name must be less than 100 characters" }),
  phone: z
    .string()
    .trim()
    .optional()
    .refine(
      (val) => !val || /^\+?[1-9]\d{1,14}$/.test(val),
      { message: "Invalid phone number format" }
    ),
});

// Meeting schema
export const meetingSchema = z.object({
  meetingDate: z.string().min(1, { message: "Meeting date is required" }),
  meetingTime: z.string().min(1, { message: "Meeting time is required" }),
  location: z
    .string()
    .max(200, { message: "Location must be less than 200 characters" })
    .optional(),
  hostHouse: z
    .string()
    .max(100, { message: "Host house must be less than 100 characters" })
    .optional(),
  agenda: z
    .string()
    .max(1000, { message: "Agenda must be less than 1000 characters" })
    .optional(),
  meetingType: z.enum(["regular", "emergency", "special"], {
    errorMap: () => ({ message: "Invalid meeting type" }),
  }),
});

// Assistance event schema
export const assistanceEventSchema = z.object({
  memberId: z.string().uuid({ message: "Invalid member ID" }),
  eventType: z.enum(["birth", "death", "sickness", "external_support", "joyful_event"], {
    errorMap: () => ({ message: "Invalid event type" }),
  }),
  eventDate: z.string().min(1, { message: "Event date is required" }),
  amount: z
    .number()
    .nonnegative({ message: "Amount cannot be negative" })
    .max(10000000, { message: "Amount is too large" }),
  beneficiaryName: z
    .string()
    .max(100, { message: "Beneficiary name must be less than 100 characters" })
    .optional(),
  hospitalizationDays: z
    .number()
    .int({ message: "Days must be a whole number" })
    .nonnegative({ message: "Days cannot be negative" })
    .optional(),
  notes: z
    .string()
    .max(500, { message: "Notes must be less than 500 characters" })
    .optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ContributionInput = z.infer<typeof contributionSchema>;
export type LoanInput = z.infer<typeof loanSchema>;
export type FamilyInput = z.infer<typeof familySchema>;
export type UserCreationInput = z.infer<typeof userCreationSchema>;
export type MeetingInput = z.infer<typeof meetingSchema>;
export type AssistanceEventInput = z.infer<typeof assistanceEventSchema>;
