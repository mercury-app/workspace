import * as router from "koa-joi-router";

import {
  readProjects,
  createProject,
  readProject,
  updateProject,
  deleteProject,
} from "../controllers/projects";

const projects = router();

// The handler here executes whenever we have a path param in any of the routes
projects.param("project", async (id, ctx, next) => {
  const project = await readProject(id);
  if (!project) return (ctx.status = 404);
  ctx["project"] = project;
  await next();
});

projects.get("/projects", async (ctx) => {
  const projects = await readProjects();
  ctx.body = { data: projects.map((project) => project.asJson()) };
});

projects.post("/projects/", async (ctx) => {
  const project = await createProject();
  ctx.body = { data: project.asJson() };
});

projects.get("/projects/:project", async (ctx) => {
  ctx.body = { data: ctx.project.asJson() };
});

projects.patch("/projects/:project", async (ctx) => {
  const project = await updateProject(ctx.project.id);
  ctx.body = { data: project.asJson() };
});

projects.delete("/projects/:project", async (ctx) => {
  await deleteProject(ctx.project.id);
});

export default projects;
