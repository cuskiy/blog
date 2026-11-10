/** @type {import("stylelint").Config} */
export default {
  extends: ["stylelint-config-standard"],
  rules: {
    "color-hex-length": "long",
    // the token block groups its scales on purpose
    "custom-property-empty-line-before": null,
    // font family names and currentColor keep their usual spelling
    "value-keyword-case": null,
    // nesting flattens in an order this rule reads as descending
    "no-descending-specificity": null,
    // the longhand grid-template reads better than the shorthand here
    "declaration-block-no-redundant-longhand-properties": null,
  },
};
