import { Router } from 'express';
import { AppointmentController } from '../controllers/AppointmentController';
import { authMiddleware, roleMiddleware } from '../middleware/auth';

const router = Router();

// All appointment routes require authentication
router.use(authMiddleware);

// GET routes (all authenticated users can view)
router.get('/', AppointmentController.getAll);
router.get('/calendar-events', AppointmentController.getCalendarEvents);
router.get('/:id', AppointmentController.getById);

// POST, PUT, DELETE routes (only admin can modify)
router.post('/', roleMiddleware(['admin']), AppointmentController.create);
router.put('/:id', roleMiddleware(['admin']), AppointmentController.update);
router.delete('/:id', roleMiddleware(['admin']), AppointmentController.delete);

export default router;
