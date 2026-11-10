/** @type {import("prettier").Config} */
export default {
  printWidth: 120,
  quoteProps: "consistent",
  // the html`` templates are the output itself; formatting them would change the bytes
  embeddedLanguageFormatting: "off",
};
