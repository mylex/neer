import { Request, Response, NextFunction } from 'express';

// Error handling middleware
export const errorHandler = (
  error: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error('Error:', error);

  // Default error response
  let statusCode = 500;
  let message = 'Internal Server Error';

  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = error.message;
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  } else if (error.code === '23505') { // PostgreSQL unique constraint violation
    statusCode = 409;
    message = 'Resource already exists';
  } else if (error.message) {
    message = error.message;
  }

  res.status(statusCode).json({
    error: {
      message,
      status: statusCode,
      timestamp: new Date().toISOString()
    }
  });
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    error: {
      message: `Route ${req.method} ${req.path} not found`,
      status: 404,
      timestamp: new Date().toISOString()
    }
  });
};

// Request validation middleware
export const validatePagination = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const pageParam = req.query['page'] as string;
  const limitParam = req.query['limit'] as string;
  
  const page = pageParam ? parseInt(pageParam) : 1;
  const limit = limitParam ? parseInt(limitParam) : 20;

  // Validate pagination parameters
  if (page < 1) {
    res.status(400).json({
      error: {
        message: 'Page must be greater than 0',
        status: 400,
        timestamp: new Date().toISOString()
      }
    });
    return;
  }

  if (limit < 1 || limit > 100) {
    res.status(400).json({
      error: {
        message: 'Limit must be between 1 and 100',
        status: 400,
        timestamp: new Date().toISOString()
      }
    });
    return;
  }

  // Add validated pagination to request
  req.pagination = { page, limit };
  next();
};

// Extend Request interface to include pagination
declare global {
  namespace Express {
    interface Request {
      pagination?: {
        page: number;
        limit: number;
      };
    }
  }
}