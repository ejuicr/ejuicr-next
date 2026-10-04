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
      min: 8,
      unique: true,
      required: true,
    },
    password: {
      type: String,
      min: 6,
      max: 255,
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
