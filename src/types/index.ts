/**
 * Shared application types.
 *
 * These interfaces intentionally mirror the JSON shapes used by the previous
 * Express API so that existing MongoDB documents and any other clients keep
 * working after the Next.js rebuild.
 */

export interface BaseRatio {
  pg: number;
  vg: number;
}

export interface FlavorIngredient {
  name: string;
  percentage: number;
  base: BaseRatio;
}

export interface NicotineIngredient {
  strength: number;
  base: BaseRatio;
}

export interface Recipe {
  _id: string;
  name: string;
  author: string;
  strength: number;
  base: BaseRatio;
  amount: number;
  ingredients: {
    nicotine: NicotineIngredient;
    flavors: FlavorIngredient[];
  };
  createdAt?: string;
  updatedAt?: string;
}

export type MixingUnits = "weight" | "volume" | "both";

export interface SettingsData {
  _id?: string;
  user?: string;
  theme: "light" | "dark";
  units: MixingUnits;
  base: BaseRatio;
  strength: number;
  amount: number;
  zeroNicotineMode: boolean;
  nicotine: {
    strength: number;
    base: BaseRatio;
  };
  flavor: {
    percentage: number;
    base: BaseRatio;
  };
}

/** User object returned by the API (never includes credentials). */
export interface PublicUser {
  _id: string;
  email: string;
  authProvider?: string;
  twitterHandle?: string;
  googleDisplayName?: string;
  googlePicture?: string;
  twitterDisplayName?: string;
  twitterPicture?: string;
  hasPassword: boolean;
  hasGoogleLinked: boolean;
  hasTwitterLinked: boolean;
}

export interface AuthProviders {
  google: boolean;
  twitter: boolean;
}

/** Calculator state */
export interface NicConfig {
  strength: number;
  pg: number;
  vg: number;
}

export interface NicResults {
  amount: number;
  percentage: number;
  pg: number;
  vg: number;
  weight: number;
}

export interface FlavorState {
  name: string;
  pg: number;
  vg: number;
  percentage: number;
  amount: number;
  pgAmount: number;
  vgAmount: number;
  weight: number;
}

export interface CalculatorValues {
  targetPg: number;
  targetVg: number;
  targetNicStrength: number;
  targetAmount: number;
  nicConfig: NicConfig;
  nicResults: NicResults;
  flavors: FlavorState[];
  pgRequired: number;
  vgRequired: number;
}
