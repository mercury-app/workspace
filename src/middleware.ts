import * as router from "koa-joi-router";
import { Context, Next } from "koa";

const Joi = router.Joi;

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

export const jsonApiBody = async (ctx: Context, next: Next): Promise<void> => {
  let objectId = Joi.alternatives().try(Joi.string(), Joi.number()).required();
  if (ctx.method === "POST") {
    objectId = Joi.alternatives().try(Joi.string(), Joi.number());
  }

  let objectSchema = Joi.object({
    type: Joi.string().required(),
    id: objectId,
    attributes: Joi.object(),
    relationships: Joi.object(),
    links: Joi.object(),
    meta: Joi.object(),
  });
  if (ctx.method === "GET") {
    objectSchema = objectSchema.allow(null);
  }

  const metaSchema = Joi.object();

  const errorSchema = Joi.object({
    id: Joi.alternatives().try(Joi.string(), Joi.number()),
    links: Joi.object(),
    status: Joi.number().integer(),
    code: Joi.string(),
    title: Joi.string(),
    detail: Joi.string(),
    source: Joi.object(),
    meta: metaSchema,
  });

  const bodySchema = Joi.alternatives().try(
    Joi.object({
      data: Joi.alternatives()
        .try(objectSchema, Joi.array().items(objectSchema))
        .required(),
    }),
    Joi.object({
      errors: Joi.array().items(errorSchema).required(),
    }),
    Joi.object({
      meta: metaSchema.required(),
    })
  );

  // Validate request body if needed
  const requestBody = ctx.request.body as Record<string, unknown>;
  if (Object.entries(requestBody).length !== 0) {
    try {
      bodySchema.validate(requestBody);
    } catch (exception) {
      ctx.throw(422, "Request body not formatted as JSON:API document");
    }
  } else if (ctx.method === "POST" || ctx.method === "PATCH") {
    ctx.throw(422, "Request body must contain a JSON:API document");
  }

  await next();

  // Validate response body if set
  const responseBody = ctx.response.body as Record<string, unknown>;
  if (responseBody !== undefined) {
    try {
      bodySchema.validate(responseBody);
    } catch (exception) {
      ctx.throw(
        500,
        "Internal server error: response body not formatted as JSON:API document"
      );
    }
  }
};
