import * as Koa from "koa";
import * as bodyParser from "koa-bodyparser";
import * as compress from "koa-compress";
import * as cors from "@koa/cors";
import * as helmet from "koa-helmet";

const server = new Koa();
server.use(helmet()).use(compress()).use(cors()).use(bodyParser());

server.listen(4000);
