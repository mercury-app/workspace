import * as router from "koa-joi-router";

import projectsService from "./service";

const projects = router();

// The handler here executes whenever we have a path param in any of the routes
projects.param("project", async (id, ctx, next) => {
  const project = await projectsService.read(id);
  if (!project) return (ctx.status = 404);
  ctx["project"] = project;
  await next();
});

projects.get("/projects", async (ctx) => {
  const projects = await projectsService.readAll();
  ctx.body = { data: projects };
});

projects.post("/projects", async (ctx) => {
  const project = await projectsService.create();
  ctx.body = { data: project };
});

projects.get("/projects/:project", async (ctx) => {
  ctx.body = { data: ctx.project };
});

projects.patch("/projects/:project", async (ctx) => {
  const project = await projectsService.update(ctx.project.id);
  ctx.body = { data: project };
});

projects.delete("/projects/:project", async (ctx) => {
  await projectsService.delete(ctx.project.id);
  ctx.status = 204;
});

export default projects;
