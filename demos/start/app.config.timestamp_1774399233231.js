// app.config.ts
import { defineConfig } from "@tanstack/start/config";
import tailwindcss from "@tailwindcss/vite";
import { reactFlowmap } from "react-flowmap/vite";
var app_config_default = defineConfig({
  vite: {
    plugins: [
      tailwindcss(),
      reactFlowmap({
        enabled: process.env.NODE_ENV === "development"
      })
    ]
  }
});
export {
  app_config_default as default
};
