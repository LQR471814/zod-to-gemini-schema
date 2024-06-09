import { expect, test } from "vitest"
import { zodToGeminiSchema, WRAPPED_VALUE_KEY } from ".."
import { z } from "zod"
import {
  type FunctionDeclarationSchema,
  FunctionDeclarationSchemaType,
} from "@google/generative-ai"

function removeUndefinedKeysRecursively(t: unknown) {
  if (Array.isArray(t)) {
    let cursor = 0
    while (cursor < t.length) {
      if (t[cursor] === undefined) {
        t.splice(cursor, 1)
        continue
      }
      cursor++
    }
    for (const value of t) {
      removeUndefinedKeysRecursively(value)
    }
    return
  }

  if (typeof t === "object" && t) {
    for (const key in t) {
      if (t[key] === undefined) {
        delete t[key]
        continue
      }
      removeUndefinedKeysRecursively(t[key])
    }
    return
  }
}

function removeEmptyRequired(t: unknown) {
  if (Array.isArray(t)) {
    for (const value of t) {
      removeEmptyRequired(value)
    }
    return
  }

  if (typeof t === "object" && t) {
    if (
      "required" in t &&
      Array.isArray(t.required) &&
      t.required.length === 0
    ) {
      // biome-ignore lint/performance/noDelete: this is required
      // biome-ignore lint/suspicious/noExplicitAny: this is required
      delete (t as any).required
    }
    for (const key in t) {
      removeEmptyRequired(t[key])
    }
    return
  }
}

test("simple object", () => {
  const res = zodToGeminiSchema(
    z.object({
      foo: z
        .object({
          a: z.string().optional(),
          bar: z.object({
            baz: z.boolean().nullable(),
          }),
        })
        .describe("foo"),
    }),
  )

  removeUndefinedKeysRecursively(res)
  removeEmptyRequired(res)

  expect(res).toEqual({
    type: FunctionDeclarationSchemaType.OBJECT,
    properties: {
      foo: {
        type: FunctionDeclarationSchemaType.OBJECT,
        description: "foo",
        properties: {
          a: { type: FunctionDeclarationSchemaType.STRING, properties: {} },
          bar: {
            type: FunctionDeclarationSchemaType.OBJECT,
            properties: {
              baz: {
                type: FunctionDeclarationSchemaType.BOOLEAN,
                properties: {},
                nullable: true,
              },
            },
            required: ["baz"],
          },
        },
        required: ["bar"],
      },
    },
    required: ["foo"],
  } satisfies FunctionDeclarationSchema)
})

test("non-object root", () => {
  const res = zodToGeminiSchema(
    z.array(
      z.object({
        foo: z
          .object({
            a: z.string(),
            b: z.string(),
          })
          .nullish(),
      }),
    ),
  )

  removeUndefinedKeysRecursively(res)
  removeEmptyRequired(res)

  expect(res).toEqual({
    type: FunctionDeclarationSchemaType.OBJECT,
    properties: {
      [WRAPPED_VALUE_KEY]: {
        type: FunctionDeclarationSchemaType.ARRAY,
        items: {
          type: FunctionDeclarationSchemaType.OBJECT,
          properties: {
            foo: {
              type: FunctionDeclarationSchemaType.OBJECT,
              properties: {
                a: {
                  type: FunctionDeclarationSchemaType.STRING,
                  properties: {},
                },
                b: {
                  type: FunctionDeclarationSchemaType.STRING,
                  properties: {},
                },
              },
              required: ["a", "b"],
              nullable: true,
            },
          },
        },
      },
    },
    required: [WRAPPED_VALUE_KEY],
  } satisfies FunctionDeclarationSchema)
})

test("optional root", () => {
  const res = zodToGeminiSchema(z.number().describe("a number").optional())

  removeUndefinedKeysRecursively(res)
  removeEmptyRequired(res)

  expect(res).toEqual({
    type: FunctionDeclarationSchemaType.OBJECT,
    properties: {
      [WRAPPED_VALUE_KEY]: {
        type: FunctionDeclarationSchemaType.OBJECT,
        properties: {
          [WRAPPED_VALUE_KEY]: {
            type: FunctionDeclarationSchemaType.NUMBER,
            description: "a number",
            properties: {},
          },
        },
        required: [WRAPPED_VALUE_KEY],
      },
    },
  } satisfies FunctionDeclarationSchema)
})

