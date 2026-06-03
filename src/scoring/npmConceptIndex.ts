// Maps npm package name fragments to concept token phrases added to the scoring haystack.
// Matching is substring: a dep qualifies if dep.includes(fragment).
// Token phrases must align with the vocabulary used in role concept labels (knowledge/roles/).

export const NPM_CONCEPT_INDEX: Record<string, string> = {
  // Client-side routing — explicit router libraries
  "react-router":       "client-side routing",
  "tanstack-router":    "client-side routing",
  "wouter":             "client-side routing",
  "reach-router":       "client-side routing",
  "vue-router":         "client-side routing",
  // Client-side routing — framework-native routing (file-based, no explicit router dep)
  "next":               "client-side routing",
  "@sveltejs/kit":      "client-side routing",
  "@remix-run":         "client-side routing",
  "gatsby":             "client-side routing",
  "astro":              "client-side routing",

  // State management
  "zustand":            "state management",
  "redux":              "state management",
  "jotai":              "state management",
  "recoil":             "state management",
  "mobx":               "state management",
  "nanostores":         "state management",
  "xstate":             "state management",
  "pinia":              "state management",

  // REST / HTTP / server state
  "axios":              "rest api integration",
  "swr":                "rest api integration",
  "react-query":        "rest api integration",
  "tanstack-query":     "rest api integration",
  "ky":                 "rest api integration",
  "ofetch":             "rest api integration",

  // Form libraries / validation
  "react-hook-form":    "form validation",
  "formik":             "form validation",
  "final-form":         "form validation",
  "zod":                "form validation",
  "yup":                "form validation",
  "valibot":            "form validation",

  // Build tooling
  "vite":               "build tooling",
  "webpack":            "build tooling",
  "esbuild":            "build tooling",
  "parcel":             "build tooling",
  "turbopack":          "build tooling",
  "rollup":             "build tooling",

  // Testing
  "vitest":             "testing",
  "jest":               "testing",
  "mocha":              "testing",
  "jasmine":            "testing",
  "cypress":            "testing",
  "playwright":         "testing",
  "testing-library":    "testing",

  // Utility-first CSS / CSS-in-JS
  "tailwindcss":        "utility-first css",
  "styled-components":  "utility-first css",
  "@emotion":           "utility-first css",
  "css-modules":        "utility-first css",

  // Accessibility
  "@axe-core":                        "accessibility fundamentals",
  "eslint-plugin-jsx-a11y":           "accessibility fundamentals",
  "eslint-plugin-vuejs-accessibility": "accessibility fundamentals",
  "@radix-ui":                        "accessibility fundamentals",
  "headlessui":                       "accessibility fundamentals",
  "reach-ui":                         "accessibility fundamentals",

  // Vue / Svelte (alternative frontend frameworks)
  "vue":        "vue svelte alternative",
  "svelte":     "vue svelte alternative",
  "nuxt":       "vue svelte alternative",
  "@sveltejs":  "vue svelte alternative",

  // CSS preprocessors (contributes to html/css concept)
  "sass":       "css",
  "postcss":    "css",
  "less":       "css",

  // C# / .NET (NuGet-sourced but some JS tooling references these)
  "aspnetcore": "csharp dotnet",
};
