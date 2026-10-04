import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
  type Types,
} from "mongoose";

const settingsSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    theme: {
      type: String,
      enum: ["light", "dark"],
      default: "dark",
    },
    units: {
      type: String,
      enum: ["weight", "volume", "both"],
      default: "both",
      required: true,
    },
    base: {
      pg: {
        type: Number,
        min: 0,
        max: 100,
        default: 30,
        required: true,
      },
      vg: {
        type: Number,
        min: 0,
        max: 100,
        default: 70,
        required: true,
      },
    },
    strength: {
      type: Number,
      min: 0,
      default: 6,
      required: true,
    },
    amount: {
      type: Number,
      min: 0,
      default: 30,
      required: true,
    },
    zeroNicotineMode: {
      type: Boolean,
      default: false,
      required: true,
    },
    nicotine: {
      strength: {
        type: Number,
        min: 0,
        max: 1000,
        default: 100,
        required: true,
      },
      base: {
        pg: {
          type: Number,
          min: 0,
          max: 100,
          default: 100,
          required: true,
        },
        vg: {
          type: Number,
          min: 0,
          max: 100,
          default: 0,
          required: true,
        },
      },
    },
    flavor: {
      percentage: {
        type: Number,
        min: 0,
        max: 100,
        default: 5,
        required: true,
      },
      base: {
        pg: {
          type: Number,
          min: 0,
          max: 100,
          default: 100,
          required: true,
        },
        vg: {
          type: Number,
          min: 0,
          max: 100,
          default: 0,
          required: true,
        },
      },
    },
  },
  {
    timestamps: true,
  },
);

export type Settings = InferSchemaType<typeof settingsSchema> & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

// One settings document per user; the API upserts against this guarantee.
settingsSchema.index({ user: 1 }, { unique: true });

export const Settings: Model<Settings> =
  (models.Settings as Model<Settings> | undefined) ??
  model<Settings>("Settings", settingsSchema);
