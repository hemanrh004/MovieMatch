const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const { getPagination } = require('../utils/pagination');
const { getRecommendations } = require('../services/recommendationService');

const getMyRecommendations = asyncHandler(async (req, res) => {
  const { page, limit } = getPagination(req.query, { defaultLimit: 20, maxLimit: 40 });
  const data = await getRecommendations(req.user._id, { page, limit });
  return sendSuccess(res, data, 'Recommendations generated');
});

module.exports = { getMyRecommendations };
