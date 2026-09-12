// MCP Server — Express controller adapter
//
// Lets MCP tools invoke EXISTING Express controllers (req, res) directly,
// in-process, without an HTTP round-trip to our own backend. This is the
// "reuse business logic" path for endpoints whose logic lives in a controller
// (login, dashboard stats, etc.) rather than being a thin model query.

import type { Request, Response } from 'express';

type ControllerFn = (req: any, res: any) => any | Promise<any>;

export interface ControllerInvocation {
  body?: Record<string, any>;
  params?: Record<string, any>;
  query?: Record<string, any>;
  /** The authenticated user document to attach as req.user. */
  user?: any;
  /** Raw bearer token to attach as req.token (used by logout, etc.). */
  token?: string;
  headers?: Record<string, string>;
}

export interface ControllerOutcome {
  status: number;
  body: any;
}

/**
 * Run an Express controller against a mock req/res and capture its response.
 * Resolves with { status, body } regardless of whether the controller used
 * res.json(), res.send(), or res.status().json().
 */
export function runController(
  handler: ControllerFn,
  opts: ControllerInvocation = {}
): Promise<ControllerOutcome> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (status: number, body: any) => {
      if (settled) return;
      settled = true;
      resolve({ status, body });
    };

    const req: any = {
      body: opts.body || {},
      params: opts.params || {},
      query: opts.query || {},
      headers: opts.headers || {},
      user: opts.user,
      token: opts.token,
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
      get(name: string) {
        const key = String(name).toLowerCase();
        return (opts.headers || {})[key];
      },
      originalUrl: '/mcp/internal',
      method: 'POST',
    };

    const res: any = {
      statusCode: 200,
      status(code: number) {
        this.statusCode = code;
        return this as any;
      },
      json(payload: any) {
        finish(this.statusCode || 200, payload);
        return this as any;
      },
      send(payload: any) {
        finish(this.statusCode || 200, payload);
        return this as any;
      },
      setHeader() {
        return this as any;
      },
      end() {
        finish(this.statusCode || 200, undefined);
        return this as any;
      },
    };

    Promise.resolve()
      .then(() => handler(req as Request, res as Response))
      .catch((err) => {
        if (!settled) reject(err);
      });
  });
}
