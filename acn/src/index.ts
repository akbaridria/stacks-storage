import { getConfig, setConfig } from "./config.js";

(async () => {
  const config = await getConfig();
  setConfig(config);
  await import("./main.js");
})();
