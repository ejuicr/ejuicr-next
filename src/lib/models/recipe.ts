import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
  type Types,
} from "mongoose";

const ratioSchema = {
  pg: {
    type: Number,
    min: 0,
    max: 100,
    required: true,
  },
  vg: {
    type: Number,
    min: 0,
    max: 100,
    required: true,
  },
};

const recipeSchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
      required: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    strength: {
      type: Number,
      default: 0,
      min: 0,
    },
    base: ratioSchema,
    amount: {
      type: Number,
      min: 0,
      required: true,
    },
    ingredients: {
      nicotine: {
        strength: {
          type: Number,
          min: 0,
          max: 1000,
          required: true,
        },
        base: ratioSchema,
      },
      flavors: [
        {
          name: {
            type: String,
            trim: true,
            required: true,
          },
          percentage: {
            type: Number,
            min: 0,
            max: 100,
            required: true,
          },
          base: ratioSchema,
        },
      ],
    },
  },
  {
    timestamps: true,
  },
);

export type Recipe = InferSchemaType<typeof recipeSchema> & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

// A user may not have two recipes with the same title, ignoring case. The
// collation matches the normalized duplicate checks in the API routes.
recipeSchema.index(
  { author: 1, name: 1 },
  {
    unique: true,
    collation: { locale: "en", strength: 2 },
    name: "author_title_unique",
  },
);

export const Recipe: Model<Recipe> =
  (models.Recipe as Model<Recipe> | undefined) ??
  model<Recipe>("Recipe", recipeSchema);
