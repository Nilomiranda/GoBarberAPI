import { Router } from 'express';
import multer from 'multer';
import multerConfig from './config/multer';

// controllers
import UserController from './app/controllers/UserController';
import SessionController from './app/controllers/SessionController';
import FileController from './app/controllers/FileController';
import ProviderController from './app/controllers/ProviderController';
import AppointmentController from './app/controllers/AppointmentController';
import ScheduleController from './app/controllers/ScheduleController';
import NotificationController from './app/controllers/NotificationController';

// middlewares
import authMiddleware from './app/middlewares/auth';

const router = new Router();
const upload = multer(multerConfig);

router.post('/users', UserController.store);

router.post('/sessions', SessionController.store);

router.use(authMiddleware);

router.put('/users', UserController.update);

router.post('/appointment', AppointmentController.store);
router.get('/appointment', AppointmentController.index);
router.delete('/appointment/:id', AppointmentController.delete);

router.get('/notifications', NotificationController.index);
router.put('/notifications/:id', NotificationController.update);

router.get('/schedule', ScheduleController.index);

router.post('/files', upload.single('file'), FileController.store);

router.get('/providers', ProviderController.index);

module.exports = router;
