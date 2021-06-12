import * as router from "koa-joi-router";

import { UnprocessableEntityError } from "../../errors";
import { Project } from "../projects/model";
import projectsService from "../projects/service";
import commitsService from "./service";

const commits = router();

// The handler here executes whenever we have a path param in any of the routes
commits.param("project", async (id, ctx, next) => {
  const projectExists = await projectsService.exists(id);
  if (!projectExists) {
    ctx.throw(404, `Not Found: project with ID '${id}' does not exist`);
  }

  const project = await projectsService.read(id);
  ctx["project"] = project;
  await next();
});

commits.param("commit", async (id, ctx, next) => {
  if (ctx.request.body["data"]["id"] !== id) {
    ctx.throw(409, "Conflict: request data ID does not match endpoint ID");
  }

  const project = ctx["project"] as Project;
  const commitExists = await commitsService.exists(project, id);
  if (!commitExists) {
    ctx.throw(404, `Not Found: commit with ID '${id}' does not exist`);
  }

  const commit = await commitsService.read(project, id);
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
