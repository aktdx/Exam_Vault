import { validate } from '../../src/server/middlewares/validate.ts';
import { createPaperSchema } from '../../src/server/validations/paper.validation.ts';
import { Request, Response, NextFunction } from 'express';
import { jest } from '@jest/globals';

describe('Validation Middleware', () => {
  it('strips unknown properties', async () => {
    const req = {
      body: {
        subjectId: 1,
        examTypeId: 2,
        year: 2023,
        session: 'Winter',
        unknownField: 'should be removed'
      },
      query: {},
      params: {}
    } as unknown as Request;
    
    const res = {} as Response;
    const next = jest.fn() as NextFunction;
    
    const middleware = validate(createPaperSchema);
    await middleware(req, res, next);
    
    expect(next).toHaveBeenCalledWith(); // No errors
    expect(req.body.unknownField).toBeUndefined(); // Stripped by Zod
    expect(req.body.subjectId).toBe(1);
  });

  it('fails on missing required properties', async () => {
    const req = {
      body: {
        subjectId: 1,
        // missing examTypeId
        year: 2023,
        session: 'Winter',
      },
      query: {},
      params: {}
    } as unknown as Request;
    
    const res = {} as Response;
    const next = jest.fn() as NextFunction;
    
    const middleware = validate(createPaperSchema);
    await middleware(req, res, next);
    
    expect(next).toHaveBeenCalled();
    const error = (next as jest.Mock).mock.calls[0][0] as any;
    expect(error.errorCode).toBe('VALIDATION_ERROR');
    expect(error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'body.examTypeId' })
      ])
    );
  });
});
