import { NextResponse } from "next/server";
import { ApiResponse } from "@/types/auth";
import { AppError, AppErrors } from "@/lib/errors/app-error";
import { ErrorLogger } from "@/lib/errors/logger";
import { ApplicationSource, StructuredErrorMetadata } from "@/lib/errors/types";

export function apiSuccess<T>(data: T, message?: string | number, status = 200) {
  let msgStr: string | undefined = undefined;
  if (typeof message === "number") {
    status = message;
  } else {
    msgStr = message;
  }

  const body: ApiResponse<T> = {
    success: true,
    data,
    ...(msgStr && { message: msgStr }),
  };
  return NextResponse.json(body, { status });
}

export function apiError(
  error: string | AppError | StructuredErrorMetadata,
  status = 400,
  details?: StructuredErrorMetadata
) {
  let errorMessage: string;
  let errorDetails: StructuredErrorMetadata | undefined = details;
  let statusCode = status;

  if (error instanceof AppError) {
    errorMessage = error.message;
    errorDetails = error.toMetadata();
    statusCode = error.statusCode || status;
  } else if (typeof error === "object" && error !== null && "errorId" in error) {
    errorMessage = (error as StructuredErrorMetadata).message;
    errorDetails = error as StructuredErrorMetadata;
    statusCode = (error as StructuredErrorMetadata).statusCode || status;
  } else {
    errorMessage = String(error || "An error occurred");
  }

  const body: ApiResponse = {
    success: false,
    error: errorMessage,
    ...(errorDetails && { errorDetails }),
  };
  return NextResponse.json(body, { status: statusCode });
}

export function apiUnauthorized(
  error = "Unauthorized access",
  status = 401,
  details?: StructuredErrorMetadata
) {
  return apiError(error, status, details);
}

export function apiForbidden(
  error = "Forbidden: Insufficient role permissions",
  status = 403,
  details?: StructuredErrorMetadata
) {
  return apiError(error, status, details);
}

export function apiBadRequest(
  error = "Invalid request payload",
  status = 400,
  details?: StructuredErrorMetadata
) {
  return apiError(error, status, details);
}

export function apiNotFound(
  error = "Resource not found",
  status = 404,
  details?: StructuredErrorMetadata
) {
  return apiError(error, status, details);
}

export function handleApiError(
  error: any,
  fallbackMessage = "An error occurred",
  defaultStatus = 400,
  context?: { route?: string; application?: ApplicationSource; userId?: string }
) {
  const appError =
    error instanceof AppError
      ? error
      : AppErrors.fromAny(error, {
          route: context?.route,
          application: context?.application || "api",
        });

  // Log error asynchronously without blocking
  ErrorLogger.log(appError, {
    route: context?.route || appError.route,
    application: context?.application || appError.application || "api",
    userId: context?.userId,
  }).catch(() => {});

  const metadata = appError.toMetadata();

  const body: ApiResponse = {
    success: false,
    error: appError.message,
    errorDetails: metadata,
  };

  return NextResponse.json(body, { status: appError.statusCode || defaultStatus });
}
