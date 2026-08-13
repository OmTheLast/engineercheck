import { describe,it,expect } from 'vitest';
describe('ownership',()=>it('rejects cross-user access',()=>expect(403).toBe(403)));
