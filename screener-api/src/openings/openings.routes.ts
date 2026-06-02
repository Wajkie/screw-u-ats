import { Hono } from 'hono';
import * as controller from './openings.controller.js';

const openings = new Hono();

openings.post('/batch', controller.batchOpenings);
openings.post('/', controller.createOpening);
openings.get('/', controller.listOpenings);
openings.get('/:id', controller.getOpening);
openings.patch('/:id', controller.updateOpening);
openings.delete('/:id', controller.deleteOpening);

export { openings };
