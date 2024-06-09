## zod-to-gemini-schema

> Convert a zod schema into a gemini function call parameter.

## Usage

```ts
import { zodToGeminiSchema, unwrapObject } from "zod-to-gemini-schema"

const schema = z.object({
  ...
})

const model = gemini.getGenerativeModel({
  model: "gemini-1.5-flash-latest",
  tools: [
    {
      functionDeclarations: [
        {
          name: "...",
          parameters: zodToGeminiSchema(schema),
        },
      ],
    },
  ],
})

const res = await model.generateContent(...)

const content = res.response.candidates?.[0].content
if (!content) {
  throw new Error("empty completion.")
}
const call = content.parts.find((p) => p.functionCall)?.functionCall
if (!call) {
  throw new Error("empty completion.")
}

console.log(schema.parse(unwrapObject(call.args)))
```

> [!NOTE]
> `unwrapObject` must be called after `call.args` is generated because
> a bunch of wrapper objects are generated to maintain compatibility between
> the zod schema and gemini schema. (ex. array of arrays is impossible in gemini schema).

```ts
// zod schema: array of array of numbers
const schema = z.number().array().array()

// gemini-safe wrapped type
type OpenAPISchema = {
    __value__: {
        __value__: {
            __value__: number
        }[]
    }[]
}

// `unwrapObject` will revert this to
type Unwrapped = number[][]
```

