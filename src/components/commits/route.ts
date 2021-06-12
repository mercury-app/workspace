import * as router from "koa-joi-router";

import { UnprocessableEntityError } from "../../errors";
import commitsService from "./service";
import projectsService from "../projects/service";

const commits = router();

// The handler here executes whenever we have a path param in any of the routes
commits.param("project", async (id, ctx, next) => {
  const project = await projectsService.read(id);
  if (!project) return (ctx.status = 404);
  ctx["project"] = project;
  await next();
});

commits.param("commit", async (id, ctx, next) => {
  if (ctx.request.body["data"]["id"] !== id) {
    ctx.throw(409, "Conflict: request data ID does not match endpoint ID");
  }
  const commit = await commitsService.read(ctx["project"], id);
  if (!commit) return (ctx.status = 404);
  ctx["commit"] = commit;
  await next();
});

commits.get("/projects/:project/commits", async (ctx) => {
  const commits = await commitsService.readAll(ctx["project"]);
  ctx.body = { data: commits };
});

commits.post("/projects/:project/commits", async (ctx) => {
  const requestData = ctx.request.body["data"];
  if (requestData["type"] !== "commits") {
    ctx.throw(409, "Conflict: resource type does not match resource endpoint");
  }
  try {
    const commit = await commitsService.create(
      ctx["project"],
      requestData["attributes"]
    );
    ctx.body = { data: commit };
  } catch (error) {
    if (error instanceof UnprocessableEntityError) {
      ctx.throw(422, error.detail);
    }
  }
});

commits.get("/projects/:project/commits/:commit", async (ctx) => {
  ctx.body = { data: ctx.commit };
});
