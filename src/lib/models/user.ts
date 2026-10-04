import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
  type Types,
} from "mongoose";

const userSchema = new Schema(
  {
    email: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      required: true,
    },
    password: {
      type: String,
      minLength: 6,
      maxLength: 250,
    },
    // Bumped on password changes to revoke previously issued sessions.
    sessionVersion: {
      type: Number,
      default: 0,
      required: true,
    },
    // Single-use nonce for password-reset links; cleared when consumed.
    passwordResetNonce: {
      type: String,
      default: null,
    },
    authProvider: {
      type: String,
    },
    googleId: {
      type: String,
    },
    googlePicture: {
      type: String,
    },
    googleDisplayName: {
      type: String,
    },
    twitterId: {
      type: String,
    },
    twitterPicture: {
      type: String,
    },
    twitterDisplayName: {
      type: String,
    },
    twitterHandle: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

export type User = InferSchemaType<typeof userSchema> & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const User: Model<User> =
  (models.User as Model<User> | undefined) ?? model<User>("User", userSchema);
