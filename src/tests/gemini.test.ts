import { expect, describe, test } from "vitest"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { z } from "zod"
import { unwrapObject, zodToGeminiSchema } from ".."

describe(
  "gemini tests",
  () => {
    const apiKey = process.env.GOOGLE_API_KEY
    if (!apiKey) {
      console.warn(
        "GOOGLE_API_KEY environment variable not provided, skipping tests with the gemini api.",
      )
      process.exit(0)
    }
    const gemini = new GoogleGenerativeAI(apiKey)

    test("complex object", async () => {
      const schema = z
        .object({
          name: z.string().describe("the name of a famous person."),
          age: z
            .number()
            .nullable()
            .describe("the age of the person, if they're dead, omit the age."),
        })
        .array()
        .describe("a list of famous people, maximum 3.")

      const model = gemini.getGenerativeModel({
        model: "gemini-1.5-flash-latest",
        tools: [
          {
            functionDeclarations: [
              {
                name: "set_result",
                description: "set the result of the operation.",
                parameters: zodToGeminiSchema(schema),
              },
            ],
          },
        ],
      })

      const res = await model.generateContent(
        "Generate a bunch of famous people and then call set_result.",
      )
      const content = res.response.candidates?.[0].content
      if (!content) {
        throw new Error("empty completion.")
      }
      const call = content.parts.find((p) => p.functionCall)?.functionCall
      if (!call) {
        throw new Error("empty completion.")
      }

      console.log(JSON.stringify(call, undefined, 2))
      expect(schema.parse(unwrapObject(call.args)).length).toBeGreaterThan(0)
    })
  },
)
