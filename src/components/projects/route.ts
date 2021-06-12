import * as router from "koa-joi-router";

import { ConflictError, ForbiddenError } from "../../errors";
import { Projects } from "./model";
import projectsService from "./service";

const projects = router();

// The handler here executes whenever we have a path param in any of the routes
projects.param("project", async (id, ctx, next) => {
  if (
    ctx.request.method !== "DELETE" &&
    ctx.request.body["data"]["id"] !== id
  ) {
    ctx.throw(409, "Conflict: request data ID does not match endpoint ID");
  }

  const projectExists = await projectsService.exists(id);
  if (!projectExists) {
    ctx.throw(404, `Not Found: project with ID '${id}' does not exist`);
  }

  const project = await projectsService.read(id);
  ctx["project"] = project;
  await next();
});

projects.get("/projects", async (ctx) => {
  const projects = await projectsService.readAll();
  ctx.body = { data: projects };
});

projects.post("/projects", async (ctx) => {
  if (ctx.request.body["data"]["type"] !== Projects.type) {
    ctx.throw(409, "Conflict: resource type does not match resource endpoint");
  }
  const project = await projectsService.create();
  ctx.body = { data: project };
});

projects.get("/projects/:project", async (ctx) => {
  ctx.body = { data: ctx.project };
});

projects.patch("/projects/:project", async (ctx) => {
  try {
    const project = await projectsService.update(
      ctx.project.id,
      ctx.request.body["data"]["attributes"]
    );
    ctx.body = { data: project };
  } catch (error) {
    if (error instanceof ConflictError) {
      ctx.throw(409, error.detail);
    }
    if (error instanceof ForbiddenError) {
      ctx.throw(403, error.detail);
    }
  }
});

projects.delete("/projects/:project", async (ctx) => {
  await projectsService.delete(ctx.project.id);
  ctx.status = 204;
});

export default projects;
