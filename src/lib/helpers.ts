/**
 * Pure calculation and validation helpers, ported from the original front end
 * (`src/helpers.js`) so the calculator behaves the same.
 */

// Round a number to two decimal places
export function roundToTwoDecimalPlaces(num: number): number {
  return +(Math.round(Number(`${num}e+2`)) + "e-2");
}

// Parse the input of target values
export function parseNumberInput(value: string | number): number {
  // Enforce minimum of 0
  if (Number(value) < 0) return 0;
  // Remove leading zeros to allow valid inputs like 0.5
  const strippedValue = value.toString().replace(/^0+(?=\d)/, "");
  // Use parseFloat to validate and normalize the input value
  const parsedValue = parseFloat(strippedValue);
  // Return 0 if the parsed value is not a number
  return isNaN(parsedValue) ? 0 : parsedValue;
}

// Validate inputs for PG/VG ratio values
export function validatePgVgValue(value: string | number): number {
  // enforce min 0 / max 100, change "" to 0 and force integer values
  const numeric = Number(value);
  return Math.round(
    numeric > 100 ? 100 : numeric < 0 || value === "" ? 0 : numeric,
  );
}

// Return the sum of all percentage values of objects in an array
export function totalFlavorPercentage(
  flavors: { percentage: number }[],
): number {
  return flavors.reduce((acc, flavor) => acc + flavor.percentage, 0);
}

// Return the sum of all pgAmount values of objects in an array
export function totalFlavorPg(flavors: { pgAmount: number }[]): number {
  return flavors.reduce((acc, flavor) => acc + flavor.pgAmount, 0);
}

// Return the sum of all vgAmount values of objects in an array
export function totalFlavorVg(flavors: { vgAmount: number }[]): number {
  return flavors.reduce((acc, flavor) => acc + flavor.vgAmount, 0);
}

// Return true if results are invalid (below 0) else return false.
export function isResultsInvalid(
  percentage: number,
  volume: number,
  weight: number,
): boolean {
  return percentage < 0 || volume < 0 || weight < 0;
}

// Calculate the weight of a liquid mixed from PG and/or VG
export function calculateWeight(
  totalVolume: number,
  pgPercentage: number,
  vgPercentage: number,
): number {
  const pgDensity = 1.036; // g/mL
  const vgDensity = 1.26; // g/mL
  const pgVolume = (pgPercentage / 100) * totalVolume;
  const vgVolume = (vgPercentage / 100) * totalVolume;
  const pgWeight = pgVolume * pgDensity;
  const vgWeight = vgVolume * vgDensity;
  return pgWeight + vgWeight;
}

// Check that email address is valid
export function validateEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// Check that password is valid
export function validatePassword(password: string): true | string {
  if (password.length < 6)
    return "Password is too short.  It must be at least 6 characters.";
  if (password.length > 250)
    return "Password is too long.  It must not be more than 250 characters.";
  return true;
}

// Capitalize the first letter in a string
export function capitalizeFirstLetter(string: string): string {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
