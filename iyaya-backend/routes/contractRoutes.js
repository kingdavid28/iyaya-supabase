const express = require('express');
const router = express.Router();
const contractController = require('../controllers/contractController');
const { authenticate } = require('../middleware/auth');
const { checkUserType } = require('../middleware/authorization');
const {
  createContractValidator,
  clientIdValidator,
  contractIdValidator,
  statusUpdateValidator
} = require('../validators/contractValidators');
const rateLimit = require('express-rate-limit');

// Rate limiting for contract endpoints
const contractLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    error: 'Too many requests, please try again later',
    statusCode: 429
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * @swagger
 * tags:
 *   name: Contracts
 *   description: Contract management endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Contract:
 *       type: object
 *       required:
 *         - providerId
 *         - serviceId
 *         - terms
 *         - price
 *       properties:
 *         clientId:
 *           type: string
 *           description: ID of the client (auto-set from auth)
 *         providerId:
 *           type: string
 *           description: ID of the provider
 *         serviceId:
 *           type: string
 *           description: ID of the service
 *         terms:
 *           type: string
 *           description: Contract terms
 *         price:
 *           type: number
 *           format: float
 *           description: Agreed price
 *         startDate:
 *           type: string
 *           format: date
 *           description: Contract start date
 *         endDate:
 *           type: string
 *           format: date
 *           description: Contract end date
 *         status:
 *           type: string
 *           enum: [pending, active, completed, cancelled]
 *           default: pending
 *     ContractStatusUpdate:
 *       type: object
 *       required:
 *         - status
 *       properties:
 *         status:
 *           type: string
 *           enum: [approved, rejected, in_progress, completed, cancelled]
 *     ContractList:
 *       type: array
 *       items:
 *         $ref: '#/components/schemas/Contract'
 */

/**
 * @swagger
 * /api/contracts:
 *   post:
 *     summary: Create a new contract
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Contract'
 *     responses:
 *       201:
 *         description: Contract created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Contract'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (client access only)
 */
router.post(
  '/',
  authenticate,
  checkUserType('client'),
  contractLimiter,
  createContractValidator,
  contractController.createContract
);

/**
 * @swagger
 * /api/contracts/client/{clientId}:
 *   get:
 *     summary: Get contracts for a specific client
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: string
 *         description: Client ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, active, completed, cancelled]
 *         description: Filter by contract status
 *     responses:
 *       200:
 *         description: List of client contracts
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ContractList'
 *       400:
 *         description: Invalid client ID or status
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (can only view own contracts)
 */
router.get(
  '/client/:clientId',
  authenticate,
  contractLimiter,
  clientIdValidator,
  contractController.getClientContracts
);

/**
 * @swagger
 * /api/contracts/provider:
 *   get:
 *     summary: Get contracts for the current provider
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, active, completed, cancelled]
 *         description: Filter by contract status
 *     responses:
 *       200:
 *         description: List of provider contracts
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ContractList'
 *       400:
 *         description: Invalid status filter
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (provider access only)
 */
router.get(
  '/provider/:id',
  authenticate,
  checkUserType('provider'),
  contractLimiter,
  contractController.getProviderContracts
);

/**
 * @swagger
 * /api/contracts/{id}/status:
 *   put:
 *     summary: Update contract status
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Contract ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ContractStatusUpdate'
 *     responses:
 *       200:
 *         description: Contract status updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Contract'
 *       400:
 *         description: Invalid status update
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (only involved parties can update)
 *       404:
 *         description: Contract not found
 */
router.put(
  '/:id/status',
  authenticate,
  contractLimiter,
  contractIdValidator,
  statusUpdateValidator,
  contractController.updateContractStatus
);

module.exports = router;
