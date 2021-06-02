import { Context, Next } from "koa";

export const jsonApiContent = async (
  ctx: Context,
  next: Next
): Promise<void> => {
  if (
    Object.entries(ctx.request.body).length !== 0 &&
    !ctx.is("application/vnd.api+json")
  ) {
    ctx.throw(415, "Unsupported content type for JSON:API");
  }

  if (!ctx.accepts("application/vnd.api+json")) {
    ctx.throw(406, "JSON:API response type must be acceptable");
  }

  await next();

  if (ctx.response.body !== undefined) {
    ctx.type = "application/vnd.api+json";
  }
};
