import { createApp } from "./src/server/app.ts";
import { logger } from "./src/server/utils/logger.ts";

async function startServer() {
  const app = await createApp();
  const PORT = Number(process.env.PORT || 3000);

  app.listen(PORT, "0.0.0.0", () => {
    logger.info(`Server running on http://0.0.0.0:${PORT}`);
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
