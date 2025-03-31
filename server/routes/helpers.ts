import type { Context } from "hono";
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { z } from "zod";

export interface TypedResponse<T> extends Response {
  // Optionally, add a helper method that returns the parsed JSON with type T.
  json: () => Promise<T>;
}

type JSONValue =
  | string
  | number
  | boolean
  | null
  | { [x: string]: JSONValue }
  | JSONValue[];

// Create a helper that wraps c.json and enforces the payload type.
export function typedJson<T extends JSONValue>(
  c: Context, 
  payload: T, 
  status: ContentfulStatusCode
): TypedResponse<T> {
  // The generic here forces payload to match T.
  return c.json<T>(payload, status) as TypedResponse<T>;
}

// A helper that enforces that the provided data is of the expected input type
export function safeParse<S extends z.ZodTypeAny>(
  schema: S,
  data: z.input<S>
): z.infer<S> {
  return schema.parse(data);
}