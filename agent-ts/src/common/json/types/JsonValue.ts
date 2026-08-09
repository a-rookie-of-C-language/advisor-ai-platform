import type { JsonObject } from "./JsonObject.js";
import type { JsonPrimitive } from "./JsonPrimitive.js";

export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
