import { Router } from 'express';
import { DeveloperController } from '../../controllers/DeveloperController';
import { authenticateUser } from '../../middleware/auth';

const developerRouter = Router();

// All developer routes require user authentication
developerRouter.use(authenticateUser);

// Developer portal routes
developerRouter.post('/applications', DeveloperController.submitApplication);
developerRouter.get('/applications', DeveloperController.getUserApplications);
developerRouter.get('/api-keys', DeveloperController.getUserApiKeys);
developerRouter.get('/api-keys/:keyId/plain-text', DeveloperController.getApiKeyPlainText);
developerRouter.get('/settings', DeveloperController.getApiSettings);

export { developerRouter };