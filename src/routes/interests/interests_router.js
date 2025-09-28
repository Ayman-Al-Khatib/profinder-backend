const express = require('express');
const router = express.Router();
const interestsController = require('../../controllers/interests/interests_controller');
const accessControl = require('../../middleware/access_control_middleware');
const interestValidations = require('../../utils/validation/interests/interests_validation');

router.use(accessControl.protected(), accessControl.allowedTo(['user']));

router.post('/', interestValidations.createInterest, interestsController.addInterest);

router.get('/', interestsController.getInterest);

router.put('/', interestValidations.updateInterest, interestsController.updateInterest);

router.delete('/all', interestsController.removeAllInterests);

router.delete('/:interest', interestValidations.deleteInterest, interestsController.removeInterest);

module.exports = router;
