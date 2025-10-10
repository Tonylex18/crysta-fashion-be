import { createServer } from "http";
import { config } from "./config/config";
import { app, port } from "./app";
import logger from "./utils/logging";

const server = createServer(app)


server.listen(port, () => {
    logger.general.info(`listening on ${config.apiEndPoint}.`);
});

