// eslint-disable-next-line @typescript-eslint/no-var-requires
const postcss = require("postcss");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const expect = require("chai").expect;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const prettier = require("prettier");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const postcssImport = require("postcss-import");

// eslint-disable-next-line @typescript-eslint/no-var-requires
const postcssFor = require("../dist").default;

const test = async function (input, output, opts) {
  const result = await postcss([
    postcssImport,
    postcssFor(opts),
  ])
    .process(input, {
      from: undefined,
      to: undefined,
    })
    .catch((err) => {
      throw new Error(err.message);
    });

    expect(
      prettier.format(result.css, {
        parser: "css",
      })
    ).to.equal(
      prettier.format(output, {
        parser: "css",
      })
    );
};

describe("utilitycss-postcss-for", function () {
  it("it iterates from and to", async function () {
    await test(
      "@for $i from 1 to 2 { .b-$i { width: $(i)px; } }",
      ".b-1 {\n    width: 1px\n}\n.b-2 {\n    width: 2px\n}"
    );
  });

  it("it iterates from bigger to smaller", async function () {
    await test(
      "@for $i from 3 to 1 { .b-$i { width: $(i)px; } }",
      ".b-3 {\n    width: 3px\n}\n.b-2 {\n    width: 2px\n}\n.b-1 {\n    width: 1px\n}"
    );
  });

  it("it iterates from and to by two", async function () {
    await test(
      "@for $i from 1 to 4 by 2 { .b-$i { width: $(i)px; } }",
      ".b-1 {\n    width: 1px\n}\n.b-3 {\n    width: 3px\n}"
    );
  });

  it("it handles comma separated selectors", async function () {
    await test(
      "@for $i from 1 to 2 { .b-$i, .c-$i { width: $(i)px; } }",
      ".b-1,.c-1 {\n    width: 1px\n}\n.b-2,.c-2 {\n    width: 2px\n}"
    );
  });

  it("it supports nested loops", async function () {
    await test(
      "@for $i from 1 to 2 { @for $j from 1 to 2 {.b-$(i)-$(j) {} } }",
      ".b-1-1 {}\n.b-1-2 {}\n.b-2-1 {}\n.b-2-2 {}"
    );
  });

  it("it supports nested loops with comma separated selectors", async function () {
    await test(
      "@for $i from 1 to 2 { @for $j from 1 to 2 {.b-$(i)-$(j),.c-$(i)-$(j) {} } }",
      ".b-1-1,.c-1-1 {}\n.b-1-2,.c-1-2 {}\n.b-2-1,.c-2-1 {}\n.b-2-2,.c-2-2 {}"
    );
  });

  it("it supports ranges with a variable from the parent for loop", async function () {
    await test(
      "@for $j from 1 to 3 { @for $i from 1 to $j {.b-$(i)-$(j) {} } }",
      ".b-1-1 {}\n.b-1-2 {}\n.b-2-2 {}\n.b-1-3 {}\n.b-2-3 {}\n.b-3-3 {}"
    );
  });

  it("it supports ranges with variables from any parent for loop", async function () {
    await test(
      "@for $w from 1 to 2 { @for $x from 1 to $w { @for $y from $x to $w { @for $z from $y to $w { .c-$(w)-$(z)-$(y)-$(x) {} }}}}",
      ".c-1-1-1-1 {}\n.c-2-1-1-1 {}\n.c-2-2-1-1 {}\n.c-2-2-2-1 {}\n.c-2-2-2-2 {}"
    );
  });

  it("it supports ranges with variables from any parent for loop with comma separated selectors", async function () {
    await test(
      "@for $w from 1 to 2 { @for $x from 1 to $w { @for $y from $x to $w { @for $z from $y to $w { .c-$(w)-$(z)-$(y)-$(x),.d-$(w)-$(z)-$(y)-$(x) {} }}}}",
      ".c-1-1-1-1,.d-1-1-1-1 {}\n.c-2-1-1-1,.d-2-1-1-1 {}\n.c-2-2-1-1,.d-2-2-1-1 {}\n.c-2-2-2-1,.d-2-2-2-1 {}\n.c-2-2-2-2,.d-2-2-2-2 {}"
    );
  });

  it("it supports locality of variables in nested for loops", async function () {
    await test(
      "@for $w from 1 to 2 { @for $x from 1 to $w { \n@for $y from 1 to 2 { @for $z from $y to $w { .c-$(w)-$(z)-$(y)-$(x) {} }}\n@for $y from 1 to 3 { @for $z from $y to $w { .d-$(w)-$(z)-$(y)-$(x) {} }}\n}}",
      ".c-1-1-1-1 {}\n.c-1-2-2-1 {}\n.c-1-1-2-1 {}\n.d-1-1-1-1 {}\n.d-1-2-2-1 {}\n.d-1-1-2-1 {}\n.d-1-3-3-1 {}\n.d-1-2-3-1 {}\n.d-1-1-3-1 {}\n.c-2-1-1-1 {}\n.c-2-2-1-1 {}\n.c-2-2-2-1 {}\n.d-2-1-1-1 {}\n.d-2-2-1-1 {}\n.d-2-2-2-1 {}\n.d-2-3-3-1 {}\n.d-2-2-3-1 {}\n.c-2-1-1-2 {}\n.c-2-2-1-2 {}\n.c-2-2-2-2 {}\n.d-2-1-1-2 {}\n.d-2-2-1-2 {}\n.d-2-2-2-2 {}\n.d-2-3-3-2 {}\n.d-2-2-3-2 {}"
    );
  });

  it("it supports locality of variables in nested for loops with comma separated selectors", async function () {
    await test(
      "@for $w from 1 to 2 { @for $x from 1 to $w { \n@for $y from 1 to 2 { @for $z from $y to $w { .c-$(w)-$(z)-$(y)-$(x),.e-$(w)-$(z)-$(y)-$(x) {} }}\n@for $y from 1 to 3 { @for $z from $y to $w { .d-$(w)-$(z)-$(y)-$(x),.f-$(w)-$(z)-$(y)-$(x) {} }}\n}}",
      ".c-1-1-1-1,.e-1-1-1-1 {}\n.c-1-2-2-1,.e-1-2-2-1 {}\n.c-1-1-2-1,.e-1-1-2-1 {}\n.d-1-1-1-1,.f-1-1-1-1 {}\n.d-1-2-2-1,.f-1-2-2-1 {}\n.d-1-1-2-1,.f-1-1-2-1 {}\n.d-1-3-3-1,.f-1-3-3-1 {}\n.d-1-2-3-1,.f-1-2-3-1 {}\n.d-1-1-3-1,.f-1-1-3-1 {}\n.c-2-1-1-1,.e-2-1-1-1 {}\n.c-2-2-1-1,.e-2-2-1-1 {}\n.c-2-2-2-1,.e-2-2-2-1 {}\n.d-2-1-1-1,.f-2-1-1-1 {}\n.d-2-2-1-1,.f-2-2-1-1 {}\n.d-2-2-2-1,.f-2-2-2-1 {}\n.d-2-3-3-1,.f-2-3-3-1 {}\n.d-2-2-3-1,.f-2-2-3-1 {}\n.c-2-1-1-2,.e-2-1-1-2 {}\n.c-2-2-1-2,.e-2-2-1-2 {}\n.c-2-2-2-2,.e-2-2-2-2 {}\n.d-2-1-1-2,.f-2-1-1-2 {}\n.d-2-2-1-2,.f-2-2-1-2 {}\n.d-2-2-2-2,.f-2-2-2-2 {}\n.d-2-3-3-2,.f-2-3-3-2 {}\n.d-2-2-3-2,.f-2-2-3-2 {}"
    );
  });

  it("it supports ranges with negative numbers", async function () {
    await test(
      "@for $i from -1 to 0 { .b-$i { width: $(i)px; } }",
      ".b--1 {\n    width: -1px\n}\n.b-0 {\n    width: 0px\n}"
    );
  });

  it("it supports :root selector", async function () {
    await test(
      ":root { \n@for $weight from 100 to 300 by 100 \n{ --foo-$(weight): $weight; }\n}\n.b { font-weight: var(--foo-200) }",
      ":root { \n--foo-100: 100;\n--foo-200: 200;\n--foo-300: 300;\n}\n.b { font-weight: var(--foo-200) }"
    );
  });

  it("it throws an error on wrong syntax", async function () {
    try {
      await test("@for $i since 1 until 3 { .b-$i { width: $(i)px; } }");
    } catch (err) {
      expect(err.message).to.equal(
        "utilitycss-postcss-for: <css input>:1:1: Error: Wrong loop syntax"
      );
    }
  });

  it("it throws an error on wrong range parameters", async function () {
    try {
      await test("@for $i from a to c { .b-$i { width: $(i)px; } }");
    } catch (err) {
      expect(err.message).to.equal(
        "utilitycss-postcss-for: <css input>:1:1: Error: Range parameter should be a number"
      );
    }
  });

  it("it throws an error if range parameter is an external variable", async function () {
    try {
      await test("@for $i from 1 to $columns { .b-$i { width: $(i)px; } }");
    } catch (err) {
      expect(err.message).to.equal(
        "utilitycss-postcss-for: <css input>:1:1: Error: External variable (not from a parent for loop) cannot be used as a range parameter"
      );
    }
  });

  it("it throws an error if range parameter is from a previous non-parent for loop", async function () {
    try {
      await test(
        "@for $w from 1 to 3 { @for $x from 1 to $w { \n@for $y from $x to $w { @for $z from $y to $w { .c-$(w)-$(z)-$(y)-$(x) {} }}\n@for $a from $y to $w { .d-$(w)-$(y)-$(a)-$(x) {} }}}"
      );
    } catch (err) {
      expect(err.message).to.equal(
        "utilitycss-postcss-for: <css input>: Error: External variable (not from a parent for loop) cannot be used as a range parameter"
      );
    }
  });

  it.skip("it doesn't retain the stack after exiting multiple layers and throws an error for bad range parameters", async function () {
    try {
      await test(
        "@for $w from 1 to 3 { @for $x from 1 to $w { @for $a from $x to $w { @for $b from $a to $w { .c-$(w)-$(b)-$(a)-$(x) {} }}}}\n@for $a from 1 to 3 { @for $b from $a to $w { .D-$(w)-$(b)-$(a)-$(x) {} }}"
      );
    } catch (err) {
      expect(err.message).to.equal(
        "utilitycss-postcss-for: <css input>: Error: External variable (not from a parent for loop) cannot be used as a range parameter"
      );
    }
  });
});
