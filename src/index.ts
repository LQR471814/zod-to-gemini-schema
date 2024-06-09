import {
  FunctionDeclarationSchemaType,
  type FunctionDeclarationSchema,
  type FunctionDeclarationSchemaProperty,
} from "@google/generative-ai"
import {
  ZodOptional,
  ZodNullable,
  type ZodTypeAny,
  ZodArray,
  ZodObject,
  ZodNumber,
  ZodString,
  ZodBoolean,
} from "zod"

// wrap_value(type) = create a wrapper with WRAPPED_VALUE_KEY as the only key pointing to type
// 1. always wrap array in root_object = if field does not accept arrays, wrap_value(array)
// 2. always wrap nullable in root_object = if field does not accept nullable, wrap_value(nullable)
// 3. root type must be root_object = if root type is not object, wrap_value(non-object type)

export const WRAPPED_VALUE_KEY = "__value__"

const EMPTY_OBJECT = {}

function convertPrimitive(t: ZodTypeAny) {
  if (t instanceof ZodNumber) {
    return {
      type: FunctionDeclarationSchemaType.NUMBER,
      description: t.description,
      properties: EMPTY_OBJECT,
    }
  }
  if (t instanceof ZodString) {
    return {
      type: FunctionDeclarationSchemaType.STRING,
      description: t.description,
      properties: EMPTY_OBJECT,
    }
  }
  if (t instanceof ZodBoolean) {
    return {
      type: FunctionDeclarationSchemaType.BOOLEAN,
      description: t.description,
      properties: EMPTY_OBJECT,
    }
  }
}

function convertProp(
  t: ZodTypeAny,
  out: { optional: boolean },
): FunctionDeclarationSchemaProperty {
  if (t instanceof ZodOptional) {
    out.optional = true
    return convertProp(t._def.innerType, out)
  }
  if (t instanceof ZodNullable) {
    const prop = convertProp(t._def.innerType, out)
    prop.nullable = true
    return prop
  }

  if (t instanceof ZodArray) {
    return {
      type: FunctionDeclarationSchemaType.ARRAY,
      description: t.description,
      // we don't have to set anything for an array with potentially optional elements
      // because the undefined elements will be omitted by default
      items: convertSchema(t._def.type, { optional: false }),
    }
  }
  if (t instanceof ZodObject) {
    const properties: Record<string, FunctionDeclarationSchema> = {}
    const shape = t._def.shape()

    const required: string[] = []
    for (const key in shape) {
      const out = { optional: false }
      properties[key] = convertSchema(shape[key], out)
      if (!out.optional) {
        required.push(key)
      }
    }

    return {
      type: FunctionDeclarationSchemaType.OBJECT,
      description: t.description,
      properties,
      required,
    }
  }

  const primitiveConvert = convertPrimitive(t)
  if (primitiveConvert) {
    return primitiveConvert
  }

  throw new Error(`Unsupported type: ${t.constructor.name} (2)`)
}

function convertSchema(
  t: ZodTypeAny,
  out: { optional: boolean },
): FunctionDeclarationSchema {
  if (t instanceof ZodOptional) {
    out.optional = true
    return convertSchema(t._def.innerType, out)
  }

  if (t instanceof ZodObject) {
    const properties: Record<string, FunctionDeclarationSchemaProperty> = {}
    const shape = t._def.shape()

    const required: string[] = []
    for (const key in shape) {
      const out = { optional: false }
      properties[key] = convertProp(shape[key], out)
      if (!out.optional) {
        required.push(key)
      }
    }

    return {
      type: FunctionDeclarationSchemaType.OBJECT,
      description: t._def.description,
      properties,
      required,
    }
  }

  // things that have to be wrapped
  if (t instanceof ZodArray) {
    return {
      type: FunctionDeclarationSchemaType.OBJECT,
      properties: {
        [WRAPPED_VALUE_KEY]: convertProp(t, out),
      },
      required: [WRAPPED_VALUE_KEY],
    }
  }
  if (t instanceof ZodNullable) {
    return {
      type: FunctionDeclarationSchemaType.OBJECT,
      properties: {
        [WRAPPED_VALUE_KEY]: convertProp(t, out),
      },
      required: [WRAPPED_VALUE_KEY],
    }
  }

  const primitiveResult = convertPrimitive(t)
  if (primitiveResult) {
    return primitiveResult
  }

  throw new Error(`Unsupported type: ${t.constructor.name} (1)`)
}

/**
 * Converts any zod schema into the `FunctionDeclarationSchema` the Gemini function calling api requires.
 *
 * Note that this will add extra objects into the `FunctionDeclarationSchema` produced to ensure compatibility
 * with the underlying zod schema.
 */
export function zodToGeminiSchema(t: ZodTypeAny): FunctionDeclarationSchema {
  const rootOptional = { optional: false }
  const schema = convertSchema(t, rootOptional)
  if (rootOptional.optional) {
    return {
      type: FunctionDeclarationSchemaType.OBJECT,
      properties: {
        [WRAPPED_VALUE_KEY]: {
          type: FunctionDeclarationSchemaType.OBJECT,
          properties: {
            [WRAPPED_VALUE_KEY]: schema,
          },
          required: [WRAPPED_VALUE_KEY],
        },
      },
    }
  }
  return schema
}

/**
 * Unwrap all wrapper objects created by `zodToGeminiSchema`.
 */
export function unwrapObject(value: unknown): unknown {
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      value[i] = unwrapObject(value[i])
    }
    return value
  }
  if (typeof value === "object" && value) {
    const keys = Object.keys(value)
    if (keys.length === 1 && keys[0] === WRAPPED_VALUE_KEY) {
      return unwrapObject(value[keys[0]])
    }
    for (const key in value) {
      value[key] = unwrapObject(value[key])
    }
    return value
  }
  return value
}
