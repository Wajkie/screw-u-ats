import { Hono } from 'hono';
import * as controller from './candidates.controller.js';

const candidates = new Hono();

candidates.post('/', controller.createCandidate);
candidates.get('/', controller.listCandidates);
candidates.get('/:id', controller.getCandidate);
candidates.patch('/:id', controller.updateCandidate);
candidates.delete('/:id', controller.deleteCandidate);

export { candidates };
