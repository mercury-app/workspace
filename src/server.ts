import * as koa from "koa";
import * as bodyParser from "koa-bodyparser";
import * as compress from "koa-compress";
import * as cors from "@koa/cors";
import * as helmet from "koa-helmet";

import { jsonApiBody, jsonApiContent } from "./middleware";
import projects from "./routes/projects";

const server = new koa();
server
  .use(helmet())
  .use(compress())
  .use(cors())
  .use(bodyParser())
  .use(jsonApiContent)
  .use(jsonApiBody)
  .use(projects.middleware());

server.listen(4000);
