import { eq } from "drizzle-orm";
import { patients } from "../../drizzle/schema";
import { soundex } from "./soundex";

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  reason?: string;
  patient?: typeof patients.$inferSelect;
  score?: number;
}

export async function checkDuplicatePatient(
  dbInstance: any,
  input: { firstName: string; lastName: string; phone: string; dob: Date }
): Promise<DuplicateCheckResult> {
  // 1. Exact phone number check
  const phoneMatch = await dbInstance
    .select()
    .from(patients)
    .where(eq(patients.phone, input.phone))
    .limit(1);

  if (phoneMatch.length > 0) {
    return {
      isDuplicate: true,
      reason: "Phone number already exists in registry",
      patient: phoneMatch[0],
      score: 100,
    };
  }

  // 2. DOB exact check + soundex first/last name phonetic matches
  const dobStr = input.dob.toISOString().split("T")[0];
  const dobMatches = await dbInstance
    .select()
    .from(patients)
    .where(eq(patients.dateOfBirth, dobStr as any))
    .execute();

  const inputFirstSoundex = soundex(input.firstName);
  const inputLastSoundex = input.lastName ? soundex(input.lastName) : "";

  for (const p of dobMatches) {
    const pFirstSoundex = soundex(p.firstName);
    const pLastSoundex = p.lastName ? soundex(p.lastName) : "";

    if (
      pFirstSoundex === inputFirstSoundex &&
      pLastSoundex === inputLastSoundex
    ) {
      return {
        isDuplicate: true,
        reason: "Phonetic name match with identical date of birth",
        patient: p,
        score: 90,
      };
    }
  }

  return { isDuplicate: false };
}
