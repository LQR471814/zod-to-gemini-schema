import { test, expect } from "vitest"
import { unwrapObject } from ".."

test("kitchen sink", () => {
  const res = unwrapObject({
    __value__: {
      a: 1,
      b: "",
      c: undefined,
      arr: [
        {
          __value__: {
            __value__: 2,
          },
        },
        {
          __value__: [{ __value__: "b" }],
        },
        {
          a: 1,
          b: "",
        },
        {
          __value__: [{ a: "b" }],
          c: 2,
        },
      ]
    },
  })
  expect(res).toEqual({
    a: 1,
    b: "",
    c: undefined,
    arr: [
      2,
      ["b"],
      {
        a: 1,
        b: "",
      },
      {
        __value__: [{ a: "b" }],
        c: 2,
      },
    ]
  })
})

