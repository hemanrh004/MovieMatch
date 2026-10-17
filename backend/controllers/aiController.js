const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const { recommendFromMessage } = require('../services/aiService');

const recommend = asyncHandler(async (req, res) => {
  const data = await recommendFromMessage(req.body.message, req.user || null);
  return sendSuccess(res, data, 'AI recommendation generated');
});

module.exports = { recommend };
