/** Entry point: start the blockchain HTTP server. */

import { createApp } from "./server";

const PORT = 5000;

createApp().listen(PORT, () => {
  console.log(`Starting ts-blockchain on http://localhost:${PORT}`);
});
